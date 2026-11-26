// Financeiro da obra (só Engenheiro): Painel · Lançamentos · Fluxo · DRE · Parcelas · Empreiteiros.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarContratos, listarFrentes, listarLancamentos, marcarParcelaRecebida, salvarParcela } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import {
  dre, filtrarLancamentos, fluxoDeCaixa, gastoPorConta, lancamentosRecentes, mesesDe, pagoDoContrato, parcelasDoCliente, resumoObra,
  situacaoParcela, ultimosMeses,
} from '../lib/financeiro.js'
import { CATEGORIAS } from '../lib/vocabulario.js'
import { CAMPOS_PARCELA, CAMPOS_RECEBIMENTO } from '../lib/formularios.js'
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

export default function Financeiro({ goto, params = {}, profile }) {
  const hoje = hojeDe()
  const [aba, setAba] = useState(params.aba || 'painel')
  const [filtro, setFiltro] = useState({ mes: '', categoria: '', frente_id: '' })
  const [modoFluxo, setModoFluxo] = useState('dia')
  const [mesDre, setMesDre] = useState(hoje.slice(0, 7))
  const [novaParcela, setNovaParcela] = useState(false)
  const [recebendo, setRecebendo] = useState(null)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    lancamentos: listarLancamentos(), contratos: listarContratos(), frentes: listarFrentes(),
  }))

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { lancamentos, contratos, frentes } = data
  const r = resumoObra(lancamentos, hoje)
  const parcelas = parcelasDoCliente(lancamentos)
  const meses = mesesDe(lancamentos, hoje)
  const servico = (id) => frentes.find((f) => f.id === id)?.servico
  const abrir = (l) => goto('lancarNota', { id: l.id })

  const criarParcela = async (valores) => {
    const { erro: e } = await salvarParcela(profile, valores)
    if (e) return avisar(e)
    setNovaParcela(false)
    avisar('Parcela cadastrada.')
    recarregar()
  }

  const receber = async (p, valores) => {
    setRecebendo(null)
    const { erro: e } = await marcarParcelaRecebida(p.id, valores)
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
          : <Vazio icone="financeiro" titulo="Nenhum lançamento nesta obra." botao="Lançar nota" onBotao={() => goto('lancarNota')} />}
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
                {sit !== 'Recebida' && <div style={{ marginTop: 10 }}><button className="btn sec" onClick={() => setRecebendo(p)}>Marcar recebida</button></div>}
              </div>
              <div className="r"><span className="valor">{brl(p.valor)}</span><Chip nivel={NIVEL_PARCELA[sit]}>{sit}</Chip></div>
            </div>
          )
        }) : <Vazio icone="financeiro" titulo="Nenhuma parcela cadastrada." texto="Cadastre a entrada e as quinzenas do contrato com o cliente." />}
        <div className="acoes um"><button className="btn dark" onClick={() => setNovaParcela(true)}><Icon nome="mais_um" tamanho={20} />Nova parcela</button></div>
      </div>
    )
  } else {
    corpo = (
      <div className="card">
        {contratos.length ? contratos.map((c) => {
          const pago = pagoDoContrato(c.id, lancamentos)
          return (
            <button key={c.id} className="li" onClick={() => goto('frente', { id: c.frente_id })}>
              <div className="b">
                <div className="t">{c.empreiteiro}</div>
                <div className="m">{servico(c.frente_id)} · contratado {brl(c.valor_contratado)} · pago {brl(pago)}</div>
              </div>
              <div className="r"><span className="muted pequeno">falta pagar</span><span className="valor">{brl(c.valor_contratado - pago)}</span></div>
            </button>
          )
        }) : <Vazio icone="financeiro" titulo="Nenhum contrato com empreiteiro." texto="Cadastre pelo detalhe da frente." />}
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
