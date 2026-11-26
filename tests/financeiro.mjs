// Contas do financeiro, com os lançamentos de exemplo ("hoje" = 23/11/2026).
import {
  caixaGeral, camposDaNota, gastoPorConta, camposDaParcela, camposDoMovimento, camposDoRecebimento, saldosPorBanco, dre, filtrarLancamentos, fluxoDeCaixa, pagoDoContrato, resumoObra,
  situacaoParcela, ultimosMeses,
} from '../src/lib/financeiro.js'
import { fornecedoresDe, juntarFornecedores, nomeEmUso, camposDoFornecedor } from '../src/lib/fornecedores.js'
import { mockLancamentos, mockObras, mockProfiles } from '../src/lib/mockData.js'
import * as mock from '../src/lib/dadosMock.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-11-23'
const daObra = (id) => mockLancamentos.filter((l) => l.obra_id === id)
const r1 = resumoObra(daObra('o1'), HOJE)

conferir('recebido = entradas realizadas', r1.recebido, 66000)
conferir('a receber = parcelas previstas', r1.aReceber, 28500)
conferir('vencido = previstas com vencimento antes de hoje', r1.vencido, 4500)
conferir('gasto de ontem soma Engenheiro e Cliente', r1.gastoOntem, 1356.4)
conferir('gasto da semana começa na segunda (hoje é segunda)', r1.gastoSemana, 0)
conferir('nota paga pelo Cliente entra no gasto…', r1.gasto, 16706.4)
conferir('…mas não mexe no saldo', r1.saldo, 49480)
conferir('pago do contrato do forro', pagoDoContrato('c2', mockLancamentos), 9000)

conferir('parcela recebida', situacaoParcela({ situacao: 'Realizado' }, HOJE), 'Recebida')
conferir('parcela vencida', situacaoParcela({ situacao: 'Previsto', vencimento: '2026-11-20' }, HOJE), 'Vencida')
conferir('parcela a vencer', situacaoParcela({ situacao: 'Previsto', vencimento: '2026-12-01' }, HOJE), 'A vencer')

// Somar dinheiro em centavos: 0,1 + 0,2 tem que dar 0,3.
conferir('soma sem erro de centavo', resumoObra([
  { tipo: 'Saída', situacao: 'Realizado', valor: 0.1, data: HOJE, pago_por: 'Engenheiro' },
  { tipo: 'Saída', situacao: 'Realizado', valor: 0.2, data: HOJE, pago_por: 'Engenheiro' },
], HOJE).gasto, 0.3)

const caixa = caixaGeral(mockObras, mockLancamentos, HOJE, '2026-11')
conferir('caixa: o gasto da Empresa (sem obra) entra no saldo', caixa.saldoCaixa, 49480 + (20000 - 842.3) - 280)
conferir('caixa: uma linha por obra, inclusive a Empresa', caixa.porObra.length, 3)
conferir('caixa: parcelas vencidas de todas as obras', caixa.vencidas.map((l) => l.id), ['l7'])


// ---------- fluxo de caixa ----------
const fm = fluxoDeCaixa(daObra('o1'), 'mes')
conferir('fluxo mensal: mais novo primeiro', fm.realizado.map((l) => l.periodo), ['2026-11', '2026-10'])
conferir('fluxo de novembro: entrou, saiu (só pago pelo engenheiro), acumulado = saldo', [fm.realizado[0].entrou, fm.realizado[0].saiu, fm.realizado[0].acumulado], [24000, 16520, 49480])
conferir('fluxo: parcelas previstas pelo vencimento', fm.previsto, [{ periodo: '2026-11', entrou: 4500 }, { periodo: '2026-12', entrou: 24000 }])
const fd = fluxoDeCaixa(daObra('o1'), 'dia')
conferir('fluxo diário: dia 22 tem a nota do engenheiro, sem a do cliente', fd.realizado.find((l) => l.periodo === '2026-11-22').saiu, 1170)
conferir('fluxo de obra sem lançamento é vazio', fluxoDeCaixa([], 'dia'), { realizado: [], previsto: [] })

// ---------- DRE ----------
const d = dre(daObra('o1'), '2026-11')
conferir('DRE: receitas por conta', d.receitas.map((c) => [c.conta, c.total]), [['Recebimento do cliente', 24000]])
conferir('DRE: despesas por conta, na ordem do plano', d.despesas.map((c) => [c.conta, c.total]), [['Mão de obra', 15000], ['Material', 1170], ['Taxa', 350]])
conferir('DRE: resultado = receitas − despesas do engenheiro', d.resultado, 7480)
conferir('DRE: nota paga pelo cliente fica à parte', d.pagoPeloCliente.total, 186.4)
conferir('DRE: cada conta traz os lançamentos que a formam', d.despesas[0].itens.map((l) => l.id), ['l10', 'l13', 'l12'])
conferir('DRE desde o começo soma outubro também', dre(daObra('o1'), null).totalReceitas, 66000)
conferir('DRE da empresa junta todas as obras (Combustível da Empresa)', dre(mockLancamentos, '2026-11').despesas.find((c) => c.conta === 'Combustível').total, 280)

// Achado da revisão de 25/11: "Onde foi o dinheiro" deixava de fora a nota paga pelo Cliente.
const gpc = gastoPorConta(daObra('o1'))
conferir('onde foi o dinheiro fecha com o total gasto', Math.round(gpc.reduce((s, c) => s + c.total * 100, 0)) / 100, r1.gasto)
conferir('onde foi o dinheiro: maior conta primeiro, nota do cliente em Material', [gpc[0].conta, gpc.find((c) => c.conta === 'Material').total], ['Mão de obra', 1356.4])

const um = ultimosMeses(daObra('o1'), HOJE)
conferir('painel: 6 meses até o de hoje', um.map((m) => m.mes), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
conferir('painel: mês sem lançamento é zero', um[0], { mes: '2026-06', entrou: 0, saiu: 0 })
conferir('painel: virada de ano', ultimosMeses([], '2026-02-10', 3).map((m) => m.mes), ['2025-12', '2026-01', '2026-02'])

conferir('filtro por conta e mês', filtrarLancamentos(daObra('o1'), { mes: '2026-11', categoria: 'Taxa' }).map((l) => l.id), ['l11'])

// ---------- nota → linha do banco ----------
const nota = { obra_id: 'o1', data: HOJE, tipo: 'Saída', categoria: 'Material', valor: '1.170,50', pago_por: 'Cliente', frente_id: 'f3', fornecedor: '  Leroy  ' }
const n1 = camposDaNota(nota, 'o1').campos
conferir('nota: valor em reais vira número, texto aparado', [n1.valor, n1.fornecedor, n1.pago_por, n1.situacao], [1170.5, 'Leroy', 'Cliente', 'Realizado'])
conferir('nota de entrada não tem "pago por"', camposDaNota({ ...nota, tipo: 'Entrada', categoria: 'Recebimento do cliente', banco: 'Inter' }, 'o1').campos.pago_por, null)
conferir('conta de saída numa entrada é recusada', camposDaNota({ ...nota, tipo: 'Entrada' }, 'o1').erro, 'Escolha uma conta da lista.')
conferir('nota de outra obra sai sem a frente da obra do seletor', camposDaNota({ ...nota, obra_id: 'o-empresa' }, 'o1').campos.frente_id, null)
conferir('valor zero é recusado', camposDaNota({ ...nota, valor: '0' }, 'o1').erro, 'O valor precisa ser maior que zero.')
conferir('editar uma parcela não muda a situação', camposDaNota({ ...nota, tipo: 'Entrada', categoria: 'Recebimento do cliente' }, 'o1', { obra_id: 'o1', situacao: 'Previsto' }).campos.situacao, 'Previsto')
// ---------- bancos ----------
conferir('entrada sem banco não salva', camposDaNota({ ...nota, tipo: 'Entrada', categoria: 'Recebimento do cliente' }, 'o1').erro, 'Escolha o banco.')
conferir('saída paga pelo engenheiro sem banco não salva', camposDaNota({ ...nota, pago_por: 'Engenheiro' }, 'o1').erro, 'Escolha o banco.')
conferir('saída paga pelo engenheiro guarda o banco', camposDaNota({ ...nota, pago_por: 'Engenheiro', banco: 'Santander' }, 'o1').campos.banco, 'Santander')
conferir('nota paga pelo cliente fica sem banco', camposDaNota({ ...nota, banco: 'Santander' }, 'o1').campos.banco, null)
conferir('banco fora da lista não salva', camposDaNota({ ...nota, pago_por: 'Engenheiro', banco: 'Itaú' }, 'o1').erro, 'Escolha o banco.')
conferir('editar parcela prevista não exige banco', camposDaNota({ ...nota, tipo: 'Entrada', categoria: 'Recebimento do cliente' }, 'o1', { obra_id: 'o1', situacao: 'Previsto' }).campos.banco, null)
conferir('receber sem banco não salva', camposDoRecebimento({ data: HOJE, forma_pagamento: 'Pix' }).erro, 'Informe a data, a forma de pagamento e o banco.')
conferir('receber guarda o banco', camposDoRecebimento({ data: HOJE, forma_pagamento: 'Pix', banco: 'Inter' }).campos.banco, 'Inter')
conferir('transferência para o mesmo banco é recusada', camposDoMovimento('Transferência', { data: HOJE, de_banco: 'Inter', para_banco: 'Inter', valor: '10' }).erro, 'Escolha dois bancos diferentes.')
conferir('transferência de 1.500', camposDoMovimento('Transferência', { data: HOJE, de_banco: 'Santander', para_banco: 'Dinheiro em espécie', valor: '1.500' }).campos,
  { tipo: 'Transferência', data: HOJE, para_banco: 'Dinheiro em espécie', descricao: null, de_banco: 'Santander', valor: 1500 })
conferir('saldo inicial pode ser negativo', camposDoMovimento('Saldo inicial', { data: HOJE, para_banco: 'Inter', valor: '-250,10' }).campos.valor, -250.1)
conferir('saldo inicial pode ser zero', camposDoMovimento('Saldo inicial', { data: HOJE, para_banco: 'Inter', valor: '0' }).campos.valor, 0)
{
  const L = (data, tipo, valor, banco, extra = {}) => ({ data, tipo, valor, banco, situacao: 'Realizado', pago_por: tipo === 'Saída' ? 'Engenheiro' : null, ...extra })
  const lanc = [
    L('2026-11-01', 'Saída', 999, 'Santander'),                       // antes do saldo inicial: não conta
    L('2026-11-10', 'Entrada', 1000.1, 'Santander'),                  // no dia do saldo inicial: conta (começo do dia)
    L('2026-11-11', 'Saída', 200.2, 'Santander'),
    L('2026-11-12', 'Saída', 50, 'Santander', { pago_por: 'Cliente' }), // pago pelo cliente: não mexe
    L('2026-11-12', 'Entrada', 300, 'Santander', { situacao: 'Previsto' }), // previsto: não mexe
    L('2026-11-13', 'Saída', 30, 'Dinheiro em espécie'),
    L('2026-11-14', 'Saída', 7, null),                                // sem banco: vai para o aviso
    L('2026-11-02', 'Saída', 8, null),                                // sem banco, mas antes do primeiro saldo: ignorado
  ]
  const mov = [
    { tipo: 'Saldo inicial', data: '2026-11-01', para_banco: 'Santander', valor: 5 },   // velho: vale o mais novo
    { tipo: 'Saldo inicial', data: '2026-11-10', para_banco: 'Santander', valor: 500 },
    { tipo: 'Saldo inicial', data: '2026-11-10', para_banco: 'Dinheiro em espécie', valor: 0 },
    { tipo: 'Transferência', data: '2026-11-12', de_banco: 'Santander', para_banco: 'Dinheiro em espécie', valor: 100 },
    { tipo: 'Transferência', data: '2026-11-05', de_banco: 'Santander', para_banco: 'Inter', valor: 40 }, // antes do saldo do Santander; o Inter não tem saldo inicial e conta
  ]
  const s = saldosPorBanco(lanc, mov)
  conferir('saldo por banco', s.bancos.map((b) => [b.banco, b.saldo, b.desde]),
    [['Dinheiro em espécie', 70, '2026-11-10'], ['Santander', 1199.9, '2026-11-10'], ['Inter', 40, null]])
  conferir('total dos bancos', s.total, 1309.9)
  conferir('sem banco: só depois do primeiro saldo informado', s.semBanco.map((l) => l.valor), [7])
  conferir('sem saldo inicial nenhum, não avisa', saldosPorBanco(lanc, []).semBanco, [])
}
conferir('parcela nova: entrada prevista com vencimento', camposDaParcela({ descricao: ' Quinzena 6 ', valor: '12.000', vencimento: '2027-01-01' }).campos,
  { tipo: 'Entrada', categoria: 'Recebimento do cliente', situacao: 'Previsto', descricao: 'Quinzena 6', valor: 12000, data: '2027-01-01', vencimento: '2027-01-01' })
conferir('fornecedores sem repetir (maiúscula não conta)', fornecedoresDe([{ fornecedor: 'Leroy', tipo: 'Saída' }, { fornecedor: 'leroy ', tipo: 'Saída' }, { fornecedor: 'Bravo' }, { fornecedor: '' }]),
  [{ nome: 'Bravo', notas: 0 }, { nome: 'Leroy', notas: 2 }])
conferir('fornecedor cadastrado e usado aparece uma vez, com o cadastro e as notas',
  juntarFornecedores([{ id: 'x', nome: 'Leroy Merlin' }], [{ nome: 'leroy merlin ', notas: 3 }, { nome: 'Bravo', notas: 1 }]).map((f) => [f.nome, f.notas, f.cadastro?.id ?? null]),
  [['Bravo', 1, null], ['Leroy Merlin', 3, 'x']])
conferir('nome de fornecedor repetido (maiúscula e espaço não contam)', nomeEmUso([{ id: 'x', nome: 'Leroy Merlin' }], ' leroy merlin'), true)
conferir('editar o próprio fornecedor não é repetido', nomeEmUso([{ id: 'x', nome: 'Leroy Merlin' }], 'LEROY MERLIN', 'x'), false)
conferir('fornecedor sem nome é recusado', camposDoFornecedor({ nome: '  ' }).erro, 'Preencha o nome do fornecedor.')
conferir('fornecedor: texto aparado, vazio vira null', camposDoFornecedor({ nome: ' Bravo ', telefone: '' }).campos, { nome: 'Bravo', documento: null, telefone: null, observacao: null })

// ---------- camada de dados (mock): cada obra só mexe no que é dela ----------
const eng = mockProfiles.find((p) => p.role === 'Engenheiro')
const mestre = mockProfiles.find((p) => p.role === 'Mestre')
mock.definirObraAtual('o2')
conferir('Apto 501 não exclui lançamento do Apto 1802', (await mock.excluirLancamento(eng, 'l8')).erro, 'Este lançamento não existe mais nesta obra.')
conferir('Apto 501 não edita lançamento do Apto 1802', (await mock.salvarLancamento(eng, 'l8', nota)).erro, 'Este lançamento não existe mais nesta obra.')
conferir('nota no Apto 501 com frente do Apto 1802 é recusada', (await mock.salvarLancamento(eng, null, { ...nota, obra_id: 'o2' })).erro, 'A frente escolhida não é desta obra.')
conferir('Mestre não lança nota', (await mock.salvarLancamento(mestre, null, { ...nota, obra_id: 'o2', frente_id: '' })).erro, 'Só o Engenheiro lança notas.')
const nova = (await mock.salvarParcela(eng, { descricao: 'Quinzena 2', valor: '9.000', vencimento: '2026-12-15' })).data
conferir('parcela nova entra na obra do seletor', nova.obra_id, 'o2')
conferir('a lista do Apto 501 não traz nada do Apto 1802', (await mock.listarLancamentos()).data.every((l) => l.obra_id === 'o2'), true)
// Achado da revisão de 25/11: a nota da Empresa não abria de lugar nenhum.
conferir('nota da Empresa abre com outra obra no seletor', (await mock.obterLancamento('l14')).data?.obra_id, 'o-empresa')
conferir('nota do Apto 1802 continua fechada no Apto 501', (await mock.obterLancamento('l8')).erro, 'Este lançamento não existe mais nesta obra.')
const empEditada = (await mock.salvarLancamento(eng, 'l14', { tipo: 'Saída', categoria: 'Combustível', valor: '300', data: '2026-11-21', pago_por: 'Engenheiro', banco: 'Inter' })).data
conferir('nota da Empresa se edita e continua na Empresa', [empEditada?.obra_id, empEditada?.valor, empEditada?.banco], ['o-empresa', 300, 'Inter'])
const fNovo = (await mock.salvarFornecedor(eng, null, { nome: 'Casa Nova Tintas', telefone: '(11) 5555-0199' })).data
conferir('fornecedor novo entra na lista sem nota', (await mock.listarFornecedores()).data.find((f) => f.nome === 'Casa Nova Tintas')?.cadastro?.id, fNovo.id)
conferir('fornecedor com nome repetido é recusado', (await mock.salvarFornecedor(eng, null, { nome: 'leroy merlin' })).erro, 'Já existe um fornecedor com este nome.')
conferir('Mestre não cadastra fornecedor', (await mock.salvarFornecedor(mestre, null, { nome: 'Qualquer' })).erro, 'Só o Engenheiro cadastra fornecedores.')
await mock.excluirFornecedor(eng, 'fo1')
conferir('excluir o cadastro não some com o nome das notas', (await mock.listarFornecedores()).data.find((f) => f.nome === 'Leroy Merlin')?.cadastro, null)
conferir('nota da Empresa se exclui', (await mock.excluirLancamento(eng, 'l14')).erro, null)
// Achado da revisão de 25/11: nota já excluída dizia "não é da obra escolhida".
conferir('nota já excluída diz que não existe mais', (await mock.obterLancamento('l14')).erro, 'Este lançamento não existe mais nesta obra.')

console.log(`${ok}/${tot} — financeiro`)
process.exit(ok === tot ? 0 : 1)
