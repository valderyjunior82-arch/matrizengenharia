// Financeiro da obra (Engenheiro, Financeiro e Contador): Painel · Lançamentos · Fluxo · DRE · Parcelas · Empreiteiros.
// O Contador só olha: sem os botões de gravar, e o lançamento abre numa folha só de leitura.
// O Financeiro (que não tem o detalhe da frente) cuida do contrato do empreiteiro na aba Empreiteiros.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import {
  excluirContrato, linkComprovante, listarContratos, listarLancamentos, listarNomesDasFrentes, marcarParcelaRecebida, salvarContrato, salvarParcela,
} from '../lib/dados.js'
import { mexeDinheiro } from '../lib/permissoes.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import {
  dre, filtrarLancamentos, fluxoDeCaixa, frentesSemContrato, gastoPorConta, lancamentosRecentes, mesesDe, pagoDoContrato, parcelasDoCliente, resumoObra,
  situacaoParcela, ultimosMeses,
} from '../lib/financeiro.js'
import { CATEGORIAS } from '../lib/vocabulario.js'
import { CAMPOS_CONTRATO, CAMPOS_CONTRATO_NOVO, CAMPOS_PARCELA, CAMPOS_RECEBIMENTO } from '../lib/formularios.js'
import { brl, dataCompleta, nomeMes, plural } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'
import { GraficoMeses, TabelaDRE, TabelaFluxo } from '../components/pecas.jsx'

const NIVEL_PARCELA = { Recebida: 'ok', Vencida: 'critico', 'A vencer': 'neutro' }

function Selecao({ id, rotulo, valor, onMudar, opcoes }) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} value={valor} onChange={(e) => onMudar(e.target.value)}>
        {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
    </div>
  )
}

// Lançamento só para ler (Contador): os dados da nota e a foto, sem editar.
export function FolhaNota({ nota, onFechar }) {
  const [foto, setFoto] = useState(null)
  const abrirFoto = async () => {
    const { data: url, erro } = await linkComprovante(nota.comprovante_caminho)
    if (erro) return avisar(erro)
    if (!url) return avisar('Este lançamento de exemplo não tem o arquivo da foto.')
    setFoto(url)
  }
  const linha = (rotulo, valor) => valor ? <div><div className="rotulo">{rotulo}</div><div className="v" style={{ fontSize: 16 }}>{valor}</div></div> : null
  return (
    <Folha titulo={`${nota.descricao || nota.categoria} · ${brl(nota.valor)}`} onFechar={onFechar}>
      {foto ? <img src={foto} alt="Foto da nota" style={{ width: '100%', display: 'block' }} /> : <>
        <div className="kv">
          {linha('Data', dataCompleta(nota.data))}
          {linha('Tipo', nota.tipo)}
          {linha('Conta', nota.categoria)}
          {linha('Valor', brl(nota.valor))}
          {linha('Situação', nota.situacao)}
          {linha('Fornecedor', nota.fornecedor)}
          {nota.tipo === 'Saída' && linha('Pago por', nota.pago_por)}
          {linha('Forma de pagamento', nota.forma_pagamento)}
          {linha('Banco', nota.banco)}
          {linha('Vencimento', nota.vencimento && dataCompleta(nota.vencimento))}
        </div>
        {nota.comprovante_caminho && <div className="acoes um"><button className="btn sec" onClick={abrirFoto}><Icon nome="camera" tamanho={20} />Ver foto da nota</button></div>}
      </>}
    </Folha>
  )
}

export default function Financeiro({ goto, temTela, params = {}, profile }) {
  const hoje = hojeDe()
  const [aba, setAba] = useState(params.aba || 'painel')
  const [filtro, setFiltro] = useState({ mes: '', categoria: '', frente_id: '' })
  const [modoFluxo, setModoFluxo] = useState('dia')
  const [mesDre, setMesDre] = useState(hoje.slice(0, 7))
  const [novaParcela, setNovaParcela] = useState(false)
  const [recebendo, setRecebendo] = useState(null)
  const [lendo, setLendo] = useState(null) // lançamento aberto só para ler (Contador)
  const [contrato, setContrato] = useState(null) // 'novo' | { c, excluir? } — aba Empreiteiros
  const [enviando, setEnviando] = useState(false)
  const grava = mexeDinheiro(profile)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    // Só o nome das frentes: o Contador não lê a tabela frentes (migration 14).
    lancamentos: listarLancamentos(), contratos: listarContratos(), frentes: listarNomesDasFrentes(),
  }))

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { lancamentos, contratos, frentes } = data
  const r = resumoObra(lancamentos, hoje)
  const parcelas = parcelasDoCliente(lancamentos)
  const meses = mesesDe(lancamentos, hoje)
  const servico = (id) => frentes.find((f) => f.id === id)?.servico
  const abrir = (l) => (temTela('lancarNota') ? goto('lancarNota', { id: l.id }) : setLendo(l))

  const criarParcela = async (valores) => {
    const { erro: e } = await salvarParcela(profile, valores)
    if (e) return avisar(e)
    setNovaParcela(false)
    avisar('Parcela cadastrada.')
    recarregar()
  }

  // Com erro, a folha fica aberta para corrigir.
  const gravarContrato = async (pedido, mensagem) => {
    setEnviando(true)
    const { erro: e } = await pedido
    setEnviando(false)
    if (e) return avisar(e)
    setContrato(null)
    avisar(mensagem)
    recarregar()
  }

  const receber = async (p, valores) => {
    setRecebendo(null)
    const { erro: e } = await marcarParcelaRecebida(profile, p.id, valores)
    avisar(e || `${p.descricao} recebida. Entrou no saldo.`)
    recarregar()
  }

  let corpo
  if (aba === 'painel') {
    const onde = gastoPorConta(lancamentos)
    corpo = (
      <>
        <Cartao titulo="Resumo da obra">
          <div className="fin">
            <div><div className="rotulo">Contratado com o cliente</div><div className="v">{brl(r.contratado)}</div></div>
            <div><div className="rotulo">Recebido</div><div className="v">{brl(r.recebido)}</div></div>
            <div><div className="rotulo">A receber</div><div className="v">{brl(r.aReceber)}</div>{r.vencido > 0 && <div className="x">{brl(r.vencido)} vencido</div>}</div>
            <div><div className="rotulo">Total gasto</div><div className="v">{brl(r.gasto)}</div></div>
            <div><div className="rotulo">Saldo da obra</div><div className={`v ${r.saldo < 0 ? 'txt-red' : ''}`}>{brl(r.saldo)}</div></div>
            <div><div className="rotulo">Gasto da semana</div><div className="v">{brl(r.gastoSemana)}</div></div>
          </div>
        </Cartao>
        <Cartao titulo="Entrou × saiu · últimos 6 meses"><GraficoMeses meses={ultimosMeses(lancamentos, hoje)} /></Cartao>
        <Cartao titulo="Onde foi o dinheiro · desde o começo">
          {onde.length ? onde.map((c) => (
            <button key={c.conta} className="li" onClick={() => { setFiltro({ mes: '', categoria: c.conta, frente_id: '' }); setAba('lancamentos') }}>
              <div className="b"><div className="t">{c.conta}</div><div className="m">{plural(c.itens.length, 'lançamento', 'lançamentos')}</div></div>
              <div className="r"><span className="valor">{brl(c.total)}</span></div>
            </button>
          )) : <div className="aviso">Nenhuma despesa ainda.</div>}
        </Cartao>
      </>
    )
  } else if (aba === 'lancamentos') {
    const lista = filtrarLancamentos(lancamentosRecentes(lancamentos), filtro)
    const mudar = (campo) => (v) => setFiltro({ ...filtro, [campo]: v })
    corpo = (
      <div className="card">
        <div className="filtros">
          <Selecao id="f-mes" rotulo="Período" valor={filtro.mes} onMudar={mudar('mes')} opcoes={[['', 'Todos os meses'], ...meses.map((m) => [m, nomeMes(m)])]} />
          <Selecao id="f-conta" rotulo="Conta" valor={filtro.categoria} onMudar={mudar('categoria')} opcoes={[['', 'Todas'], ...CATEGORIAS.map((c) => [c, c])]} />
          <Selecao id="f-frente" rotulo="Frente" valor={filtro.frente_id} onMudar={mudar('frente_id')} opcoes={[['', 'Todas'], ...frentes.map((f) => [f.id, `${f.servico} · ${f.ambiente}`])]} />
        </div>
        {lista.length ? lista.map((l) => (
          <button key={l.id} className="li" onClick={() => abrir(l)}>
            <div className="b">
              <div className="t">{l.descricao || l.categoria}</div>
              <div className="m">
                {dataCompleta(l.data)} · {l.categoria}{l.fornecedor && ` · ${l.fornecedor}`}{l.frente_id && ` · ${servico(l.frente_id)}`}
                {l.tipo === 'Saída' && ` · pago por ${l.pago_por}`}{l.forma_pagamento && ` · ${l.forma_pagamento}`}{l.banco && ` · ${l.banco}`}
              </div>
            </div>
            <div className="r">
              <span className={`valor ${l.tipo === 'Entrada' ? 'txt-grn' : ''}`}>{l.tipo === 'Entrada' ? '+' : '−'} {brl(l.valor)}</span>
              {l.comprovante_caminho && <Chip nivel="info">com nota</Chip>}
            </div>
          </button>
        )) : lancamentos.length
          ? <div className="aviso">Nenhum lançamento com estes filtros.</div>
          : <Vazio icone="financeiro" titulo="Nenhum lançamento nesta obra." botao={grava ? 'Lançar nota' : null} onBotao={() => goto('lancarNota')} />}
      </div>
    )
  } else if (aba === 'fluxo') {
    corpo = (
      <div className="card">
        <div className="seg" role="group" aria-label="Fluxo por">
          {[['dia', 'Diário'], ['mes', 'Mensal']].map(([v, rot]) => (
            <button key={v} className={modoFluxo === v ? 'on' : ''} aria-pressed={modoFluxo === v} onClick={() => setModoFluxo(v)}>{rot}</button>
          ))}
        </div>
        <div className="aviso">Só o que passou pelo seu caixa: notas pagas pelo cliente ficam fora.</div>
        <TabelaFluxo fluxo={fluxoDeCaixa(lancamentos, modoFluxo)} />
      </div>
    )
  } else if (aba === 'dre') {
    corpo = (
      <div className="card">
        <div className="filtros">
          <Selecao id="dre-mes" rotulo="Período" valor={mesDre} onMudar={setMesDre} opcoes={[...meses.map((m) => [m, nomeMes(m)]), ['', 'Desde o começo']]} />
        </div>
        <TabelaDRE d={dre(lancamentos, mesDre || null)} onAbrir={abrir} />
      </div>
    )
  } else if (aba === 'parcelas') {
    corpo = (
      <div className="card">
        {parcelas.length ? parcelas.map((p) => {
          const sit = situacaoParcela(p, hoje)
          return (
            <div key={p.id} className={`li ${sit === 'Vencida' ? 'critico' : ''}`}>
              <div className="b">
                <button className="tocar" onClick={() => abrir(p)}>
                  <div className="t">{p.descricao}</div>
                  <div className="m">{sit === 'Recebida' ? `recebida ${dataCompleta(p.data)}` : `vence ${dataCompleta(p.vencimento)}`}</div>
                </button>
                {grava && sit !== 'Recebida' && <div style={{ marginTop: 10 }}><button className="btn sec" onClick={() => setRecebendo(p)}>Marcar recebida</button></div>}
              </div>
              <div className="r"><span className="valor">{brl(p.valor)}</span><Chip nivel={NIVEL_PARCELA[sit]}>{sit}</Chip></div>
            </div>
          )
        }) : <Vazio icone="financeiro" titulo="Nenhuma parcela cadastrada." texto={grava ? 'Cadastre a entrada e as quinzenas do contrato com o cliente.' : null} />}
        {grava && <div className="acoes um"><button className="btn dark" onClick={() => setNovaParcela(true)}><Icon nome="mais_um" tamanho={20} />Nova parcela</button></div>}
      </div>
    )
  } else {
    corpo = (
      <div className="card">
        {contratos.length ? contratos.map((c) => {
          const pago = pagoDoContrato(c.id, lancamentos)
          const miolo = (
            <>
              <div className="b">
                <div className="t">{c.empreiteiro}</div>
                <div className="m">{servico(c.frente_id)} · contratado {brl(c.valor_contratado)} · pago {brl(pago)}</div>
              </div>
              <div className="r"><span className="muted pequeno">falta pagar</span><span className="valor">{brl(c.valor_contratado - pago)}</span></div>
            </>
          )
          // O Engenheiro abre a frente (onde está o contrato com os pagamentos); o Financeiro edita aqui; o Contador só lê.
          if (temTela('frente')) return <button key={c.id} className="li" onClick={() => goto('frente', { id: c.frente_id })}>{miolo}</button>
          if (grava) return <button key={c.id} className="li" onClick={() => setContrato({ c })}>{miolo}</button>
          return <div key={c.id} className="li">{miolo}</div>
        }) : <Vazio icone="financeiro" titulo="Nenhum contrato com empreiteiro." texto={grava ? 'Toque em Cadastrar contrato e escolha a frente.' : null} />}
        {grava && frentesSemContrato(frentes, contratos).length > 0 && (
          <div className="acoes um"><button className="btn dark" onClick={() => setContrato('novo')}><Icon nome="mais_um" tamanho={20} />Cadastrar contrato</button></div>
        )}
      </div>
    )
  }

  return (
    <>
      <AbasTopo ativa={aba} onTrocar={setAba} abas={[
        { id: 'painel', rotulo: 'Painel' }, { id: 'lancamentos', rotulo: 'Lançamentos' }, { id: 'fluxo', rotulo: 'Fluxo' },
        { id: 'dre', rotulo: 'DRE' }, { id: 'parcelas', rotulo: 'Parcelas' }, { id: 'empreiteiros', rotulo: 'Empreiteiros' },
      ]} />
      {corpo}
      {lendo && <FolhaNota nota={lendo} onFechar={() => setLendo(null)} />}
      {contrato === 'novo' && (
        <Folha titulo="Cadastrar contrato" onFechar={() => setContrato(null)}>
          <Formulario campos={CAMPOS_CONTRATO_NOVO} rotuloSalvar="Cadastrar contrato" onCancelar={() => setContrato(null)}
            listas={{ frentes: frentesSemContrato(frentes, contratos).map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente}` })) }}
            onSalvar={(v) => gravarContrato(salvarContrato(profile, v.frente_id, v), 'Contrato cadastrado.')} />
        </Folha>
      )}
      {contrato?.c && !contrato.excluir && (
        <Folha titulo={`Contrato · ${servico(contrato.c.frente_id) ?? ''}`} onFechar={() => setContrato(null)}>
          <Formulario campos={CAMPOS_CONTRATO} inicial={{ ...contrato.c, valor_contratado: String(contrato.c.valor_contratado).replace('.', ',') }}
            onCancelar={() => setContrato(null)} onSalvar={(v) => gravarContrato(salvarContrato(profile, contrato.c.frente_id, v, contrato.c.id), 'Contrato salvo.')} />
          <div className="acoes um"><button className="btn perigo" onClick={() => setContrato({ ...contrato, excluir: true })}>Excluir contrato</button></div>
        </Folha>
      )}
      {contrato?.excluir && (
        <Folha titulo="Excluir contrato" onFechar={() => setContrato(null)}>
          <div className="form">
            <p style={{ fontSize: 17 }}>Excluir o contrato com <b>{contrato.c.empreiteiro}</b>? Não dá para desfazer.</p>
            <div className="acoes" style={{ padding: 0 }}>
              <button className="btn sec" disabled={enviando} onClick={() => setContrato(null)}>Não excluir</button>
              <button className="btn perigo" disabled={enviando} onClick={() => gravarContrato(excluirContrato(profile, contrato.c.id), 'Contrato excluído.')}>{enviando ? 'Excluindo…' : 'Sim, excluir'}</button>
            </div>
          </div>
        </Folha>
      )}
      {recebendo && (
        <Folha titulo={`Receber · ${recebendo.descricao} · ${brl(recebendo.valor)}`} onFechar={() => setRecebendo(null)}>
          <Formulario campos={CAMPOS_RECEBIMENTO} inicial={{ data: hoje }} rotuloSalvar="Marcar recebida"
            onCancelar={() => setRecebendo(null)} onSalvar={(v) => receber(recebendo, v)} />
        </Folha>
      )}
      {novaParcela && (
        <Folha titulo="Nova parcela" onFechar={() => setNovaParcela(false)}>
          <Formulario campos={CAMPOS_PARCELA} onCancelar={() => setNovaParcela(false)} onSalvar={criarParcela} />
        </Folha>
      )}
    </>
  )
}
