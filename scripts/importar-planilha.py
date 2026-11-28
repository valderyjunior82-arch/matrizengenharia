"""Importa a aba Lancamentos da planilha de controle do engenheiro para o banco.

Uso (precisa do openpyxl: python -m pip install --user openpyxl):
    python scripts/importar-planilha.py "<caminho da planilha .xlsm>" <pasta de saída>

Não grava nada: gera arquivos .sql na pasta de saída, que o agente aplica pelo execute_sql
do Supabase, na ordem do nome (00-..., 01-..., 99-verificacao.sql). Pode rodar de novo com a
planilha atualizada: cada linha tem um id estável (md5 do conteúdo), e o insert ignora o que já
existe, então só entra o que é novo. Se uma linha antiga foi EDITADA na planilha, ela vira uma
linha nova e a antiga fica: o 99-verificacao.sql acusa, porque o saldo dos bancos deixa de bater.

Desfazer tudo: delete from lancamentos where origem = 'planilha-2026'; idem em movimentos_banco.
As obras criadas não são apagadas por isso (podem ter frentes e diário depois).

Regras (decididas pelo engenheiro em 26/11; não mude sem ele):
- Centro de custo vira obra (OBRAS abaixo); ADM e Externo vão para a obra interna "Empresa (sem obra)".
- Conta do app pela Sub-Classificação (CONTA abaixo); o que não estiver lá vira "Outros".
- "Saldo Inicial" e depósito sem saída correspondente (transferência que entra sem sair de outro
  banco) viram entrada "Aporte de sócio"; os três bancos começam em zero no primeiro dia da planilha.
- Transferência com ida e volta (mesmo dia, mesmo valor, bancos diferentes) vira transferência entre bancos.
- Favorecido só vira fornecedor quando a planilha o marca Fornecedor ou Empreiteiro (ou o nome aparece
  assim em outra linha); funcionário e sócio vão para a descrição ("Pedreiro (Diarista) · Ney Roberto").
- Data = Data_Pagamento (é ela que mexe no banco). Descrição = descrição + "(Sub-Classificação)".
"""
import collections
import json
import pathlib
import sys

import openpyxl

ORIGEM = 'planilha-2026'
PREFIXO = 'matriz-import:planilha-2026:'
LINHAS_POR_ARQUIVO = 350  # cada arquivo cabe numa chamada do execute_sql

BANCO = {'Santander Banco': 'Santander', 'Inter Banco': 'Inter', 'Dinheiro': 'Dinheiro em espécie'}
EMPRESA = {'ADM', 'Externo'}
# centro de custo da planilha -> (nome da obra no app, código). Centro novo: acrescente aqui.
OBRAS = {
    'Casa Eldorado': ('Casa Eldorado', 'ELDORADO'),
    'Ocean Park - 1601': ('Ocean Park – 1601', 'OCEAN-1601'),
    'Alexandra - CS': ('Alexandra – CS', 'ALEXANDRA-CS'),
    'Fachada - Antonio': ('Fachada – Antonio', 'FACHADA-ANTONIO'),
    'Clinica Veterinária': ('Clínica Veterinária', 'CLINICA-VET'),
    'Buda': ('Buda', 'BUDA'),
}
CONTA = {
    'Produtos/serviços - Mat. Construção': 'Material', 'Produtos/serviços - Equipamentos': 'Ferramenta',
    'Manutenção Máquinas e Equipamentos': 'Ferramenta', 'Fardamento e EPI´S': 'Ferramenta',
    'Empreiteiro': 'Mão de obra', 'Diarista': 'Mão de obra', 'VT e VR': 'Mão de obra',
    'Frete': 'Serviço terceirizado', 'Contabilidade': 'Contador',
    'Gasolina / Combustível': 'Combustível', 'Estacionamento / Pedágios': 'Combustível',
    'CREA': 'Taxa', 'IPTU/Alvará': 'Taxa', 'Taxas Municipais/Estaduais/Orgãos': 'Taxa', 'Tarifas Bancárias': 'Taxa',
    'Outros custos com despesas financeiras': 'Taxa',
    'Reforma Residencial': 'Recebimento do cliente',
}
FORMA = {'Pix': 'Pix', 'Dinheiro': 'Dinheiro', 'Cartão de Débito': 'Cartão', 'Débito Automático': 'Débito automático',
         'Transferência': 'Transferência', 'Boleto / Parcelado': 'Boleto', 'Cartão de Crédito': 'Cartão', None: None}
TIPOS_FORNECEDOR = {'Fornecedor', 'Empreiteiro'}
MESMO_NOME = {'M&J GESSO': 'M J GESSO'}  # mesma loja escrita de dois jeitos


def q(v):
    return 'null' if v is None else "'" + str(v).replace("'", "''") + "'"


def ler(caminho):
    ws = openpyxl.load_workbook(caminho, data_only=True, read_only=True)['Lancamentos']
    linhas = list(ws.iter_rows(values_only=True))
    ini = next(i for i, r in enumerate(linhas) if r[0] == 'Data_Competência')
    cab = linhas[ini]
    out = []
    for r in linhas[ini + 1:]:
        if r[9] is None:
            continue
        l = dict(zip(cab, r))
        l['data'] = l['Data_Pagamento'].strftime('%Y-%m-%d')
        l['v'] = round(l['Valor_N'] * 100)  # centavos, com sinal
        l['desc'] = (l['Descrição/Histórico'] or '').strip()
        fav = (l['Favorecido'] or '').strip()
        l['fav'] = MESMO_NOME.get(fav, fav)
        if l['Conta-Bancária'] not in BANCO:
            sys.exit(f"Banco desconhecido: {l['Conta-Bancária']!r} (acrescente em BANCO)")
        c = l['Centro_De_Custo']
        if c not in EMPRESA and c not in OBRAS:
            sys.exit(f'Centro de custo novo: {c!r} (acrescente em OBRAS)')
        if l['Forma_De_Pagamento'] not in FORMA:
            sys.exit(f"Forma de pagamento nova: {l['Forma_De_Pagamento']!r} (acrescente em FORMA)")
        out.append(l)
    return out


def montar(L):
    transf_s = [l for l in L if l['Classificação'] == 'Tranferências_Saídas']
    transf_e = [l for l in L if l['Classificação'] == 'Tranferências_Entradas']
    pares, usadas = [], set()
    for s in transf_s:
        e = next((e for e in transf_e if id(e) not in usadas and e['data'] == s['data'] and e['v'] == -s['v']
                  and e['Conta-Bancária'] != s['Conta-Bancária']), None)
        if e is None:
            sys.exit(f"Transferência sem entrada correspondente: {s['data']} {s['v'] / 100}")
        usadas.add(id(e))
        pares.append((s, e))
    nomes_fornecedor = {l['fav'] for l in L if l['fav'] and l['Tipo_Favorecido'] in TIPOS_FORNECEDOR}
    subs = sorted({l['Sub-Classificação'] for l in L})
    centros = list(OBRAS)
    bancos = list(BANCO.values())
    formas = [f for f in FORMA.values() if f]

    lanc, vistos = [], collections.Counter()
    for l in L:
        cl = l['Classificação']
        if cl == 'Tranferências_Saídas' or (cl == 'Tranferências_Entradas' and id(l) in usadas):
            continue
        aporte = cl in ('Saldo Inicial', 'Tranferências_Entradas')
        obra = -1 if l['Centro_De_Custo'] in EMPRESA else centros.index(l['Centro_De_Custo'])
        banco = bancos.index(BANCO[l['Conta-Bancária']])
        sub = -1 if aporte else subs.index(l['Sub-Classificação'])
        forma = formas.index(FORMA[l['Forma_De_Pagamento']]) if FORMA[l['Forma_De_Pagamento']] else -1
        # Linhas iguais na planilha (mesmo dia, banco, obra, valor, descrição, favorecido) viram #1, #2...
        igual = (l['data'], banco, obra, l['v'], l['desc'], sub, l['fav'])
        vistos[igual] += 1
        lanc.append([obra, l['data'], l['v'], l['desc'], sub, l['fav'], int(l['fav'] in nomes_fornecedor), forma, banco, vistos[igual]])
    movs, vistos = [], collections.Counter()
    for s, e in pares:
        de, para = BANCO[s['Conta-Bancária']], BANCO[e['Conta-Bancária']]
        igual = (s['data'], de, para, -s['v'])
        vistos[igual] += 1
        movs.append((s['data'], de, para, -s['v'], s['desc'] or None, vistos[igual]))
    saldo_final = collections.Counter()
    for l in L:
        saldo_final[BANCO[l['Conta-Bancária']]] += l['v']
    inicio_obra = {}
    for l in L:
        c = l['Centro_De_Custo']
        if c in OBRAS:
            inicio_obra[c] = min(inicio_obra.get(c, '9999'), l['data'])
    return lanc, movs, subs, min(l['data'] for l in L), saldo_final, inicio_obra


ENG = "(select id from public.profiles where role = 'Engenheiro' order by created_at limit 1)"
EMP = '(select id from public.obras where interna)'
NL = ',\n'


def arr(lista):
    return 'array[' + ','.join(q(x) for x in lista) + ']'


def id_sql(chave_sql):
    return f"md5({q(PREFIXO)} || {chave_sql})::uuid"


# As regras de conta, descrição, fornecedor e id ficam aqui, num lugar só. Cada r da lista compacta é
# [obra (-1 = Empresa), data, centavos com sinal, descrição, sub (-1 = aporte), favorecido, é fornecedor, forma, banco, nº da repetição]
def sql_lancamentos(linhas, subs):
    contas = [CONTA.get(s, 'Outros') for s in subs]
    formas = [f for f in FORMA.values() if f]
    chave = "concat_ws('|', 'lanc', x.data, x.banco, x.obra, x.tipo, abs(x.centavos), x.descricao, x.fornecedor) || '#' || x.rep"
    dados = json.dumps(linhas, ensure_ascii=False, separators=(',', ':'))
    return f"""insert into public.lancamentos (id, obra_id, data, tipo, categoria, situacao, valor, descricao, fornecedor, pago_por, forma_pagamento, banco, autor_id, origem)
select {id_sql(chave)},
  case when x.obra = 'empresa' then {EMP} else {id_sql("'obra:' || x.obra")} end,
  x.data::date, x.tipo, x.conta, 'Realizado', abs(x.centavos) / 100.0, x.descricao, x.fornecedor,
  case x.tipo when 'Saída' then 'Engenheiro' end, x.forma, x.banco, {ENG}, {q(ORIGEM)}
from (
  select coalesce(({arr(OBRAS)})[(r->>0)::int + 1], 'empresa') obra, r->>1 data, (r->>2)::bigint centavos,
    case when (r->>2)::bigint > 0 then 'Entrada' else 'Saída' end tipo,
    case when (r->>4)::int < 0 then 'Aporte de sócio' else ({arr(contas)})[(r->>4)::int + 1] end conta,
    concat_ws(' · ',
      case when (r->>4)::int < 0 then coalesce(nullif(r->>3, ''), 'Depósito na conta (sem descrição na planilha)')
           when r->>3 = '' then ({arr(subs)})[(r->>4)::int + 1]
           else (r->>3) || ' (' || ({arr(subs)})[(r->>4)::int + 1] || ')' end,
      case when (r->>6)::int = 0 then nullif(r->>5, '') end) descricao,
    case when (r->>6)::int = 1 then nullif(r->>5, '') end fornecedor,
    ({arr(formas)})[nullif((r->>7)::int, -1) + 1] forma,
    ({arr(BANCO.values())})[(r->>8)::int + 1] banco, (r->>9)::int rep
  from jsonb_array_elements($j${dados}$j$::jsonb) r
) x
on conflict (id) do nothing;"""


def gerar(lanc, movs, subs, inicio, saldo_final, inicio_obra, pasta):
    pasta.mkdir(parents=True, exist_ok=True)
    cab = f'-- Gerado por scripts/importar-planilha.py ({ORIGEM}). Não edite à mão.'
    obra_id = lambda c: f"md5({q(PREFIXO + 'obra:' + c)})::uuid"  # noqa: E731
    obras = [f"({obra_id(c)}, {q(n)}, {q(cod)}, {q(inicio_obra[c])}::date)" for c, (n, cod) in OBRAS.items() if c in inicio_obra]
    movs_sql = [f"({id_sql(q('saldo:' + b))}, 'Saldo inicial', {q(inicio)}, null, {q(b)}, 0, 'Saldo de partida da planilha')" for b in BANCO.values()]
    movs_sql += [f"({id_sql(q('|'.join(['mov', d, de, para, str(c)]) + '#' + str(rep)))}, 'Transferência', {q(d)}, {q(de)}, {q(para)}, {c / 100}, {q(ds)})"
                 for d, de, para, c, ds, rep in movs]
    (pasta / '00-obras-saldos-transferencias.sql').write_text(f"""{cab}
insert into public.obras (id, nome, codigo, data_inicio) values
{NL.join(obras)}
on conflict (id) do nothing;
insert into public.membros (obra_id, profile_id)
select id, {ENG} from public.obras where id in ({', '.join(obra_id(c) for c in inicio_obra)})
on conflict do nothing;
insert into public.movimentos_banco (id, obra_id, tipo, data, de_banco, para_banco, valor, descricao, autor_id, origem)
select v.id, {EMP}, v.tipo, v.data::date, v.de, v.para, v.valor, v.descricao, {ENG}, {q(ORIGEM)}
from (values
{NL.join(movs_sql)}
) v(id, tipo, data, de, para, valor, descricao)
on conflict (id) do nothing;
""", encoding='utf-8')
    for n, i in enumerate(range(0, len(lanc), LINHAS_POR_ARQUIVO), start=1):
        (pasta / f'{n:02d}-lancamentos.sql').write_text(cab + '\n' + sql_lancamentos(lanc[i:i + LINHAS_POR_ARQUIVO], subs) + '\n', encoding='utf-8')
    # Conferência: o saldo de cada banco (mesma conta de saldosPorBanco) tem que ser o da planilha.
    esperado = ', '.join(f"({q(b)}, {saldo_final[b] / 100})" for b in BANCO.values())
    (pasta / '99-verificacao.sql').write_text(f"""-- Saldo final de cada banco no banco de dados x na planilha. Tem que dar zero linhas.
with esperado(banco, valor) as (values {esperado}),
inicio as (select e.banco, e.valor,
  (select m.valor from public.movimentos_banco m where m.tipo = 'Saldo inicial' and m.para_banco = e.banco order by m.data desc, m.created_at desc limit 1) saldo0,
  coalesce((select max(m.data) from public.movimentos_banco m where m.tipo = 'Saldo inicial' and m.para_banco = e.banco), '-infinity') desde
  from esperado e),
real as (select i.banco, i.valor, coalesce(i.saldo0, 0)
  + coalesce((select sum(case l.tipo when 'Entrada' then l.valor else -l.valor end) from public.lancamentos l
              where l.banco = i.banco and l.situacao = 'Realizado' and (l.tipo = 'Entrada' or l.pago_por = 'Engenheiro') and l.data >= i.desde), 0)
  + coalesce((select sum(t.valor) from public.movimentos_banco t where t.tipo = 'Transferência' and t.para_banco = i.banco and t.data >= i.desde), 0)
  - coalesce((select sum(t.valor) from public.movimentos_banco t where t.tipo = 'Transferência' and t.de_banco = i.banco and t.data >= i.desde), 0) no_banco
  from inicio i)
select banco, valor as planilha, no_banco from real where valor <> no_banco;
""", encoding='utf-8')
    return {'lancamentos': len(lanc), 'transferencias': len(movs), 'inicio': inicio,
            'saldo_final': {b: v / 100 for b, v in saldo_final.items()}}


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    L = ler(sys.argv[1])
    print(json.dumps(gerar(*montar(L), pathlib.Path(sys.argv[2])), ensure_ascii=False, indent=1))
