// Financeiro da obra (só Engenheiro): resumo e as abas Lançamentos · Parcelas do cliente · Empreiteiros.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarContratos, listarFrentes, listarLancamentos, marcarParcelaRecebida } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { lancamentosRecentes, pagoDoContrato, parcelasDoCliente, resumoObra, situacaoParcela } from '../lib/financeiro.js'
import { CAMPOS_PARCELA, CAMPOS_RECEBIMENTO } from '../lib/formularios.js'
import { brl, dataCompleta } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'

const NIVEL_PARCELA = { Recebida: 'ok', Vencida: 'critico', 'A vencer': 'neutro' }

export default function Financeiro({ goto, params }) {
  const hoje = hojeDe()
  const [aba, setAba] = useState(params.aba || 'lancamentos')
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
  const servico = (id) => frentes.find((f) => f.id === id)?.servico

  const receber = async (p, valores) => {
    setRecebendo(null)
    const { erro: e } = await marcarParcelaRecebida(p.id, valores)
    avisar(e || `${p.descricao} recebida. Entrou no saldo.`)
    recarregar()
  }

  let corpo
  if (aba === 'lancamentos') {
    const lista = lancamentosRecentes(lancamentos)
    corpo = lista.length ? lista.map((l) => (
      <button key={l.id} className="li" onClick={() => avisar('Abrir, editar e excluir lançamento entram na etapa do banco.')}>
        <div className="b">
          <div className="t">{l.descricao || l.categoria}</div>
          <div className="m">
            {dataCompleta(l.data)} · {l.categoria}{l.fornecedor && ` · ${l.fornecedor}`}{l.frente_id && ` · ${servico(l.frente_id)}`}
            {l.tipo === 'Saída' && ` · pago por ${l.pago_por}`}
          </div>
        </div>
        <div className="r">
          <span className={`valor ${l.tipo === 'Entrada' ? 'txt-grn' : ''}`}>{l.tipo === 'Entrada' ? '+' : '−'} {brl(l.valor)}</span>
          {l.comprovante_caminho && <Chip nivel="info">com nota</Chip>}
        </div>
      </button>
    )) : <Vazio icone="financeiro" titulo="Nenhum lançamento nesta obra." botao="Lançar nota" onBotao={() => goto('lancarNota')} />
  } else if (aba === 'parcelas') {
    corpo = (
      <>
        {parcelas.length ? parcelas.map((p) => {
          const sit = situacaoParcela(p, hoje)
          return (
            <div key={p.id} className={`li ${sit === 'Vencida' ? 'critico' : ''}`}>
              <div className="b">
                <div className="t">{p.descricao}</div>
                <div className="m">{sit === 'Recebida' ? `recebida ${dataCompleta(p.data)}` : `vence ${dataCompleta(p.vencimento)}`}</div>
                {sit !== 'Recebida' && <div style={{ marginTop: 10 }}><button className="btn sec" onClick={() => setRecebendo(p)}>Marcar recebida</button></div>}
              </div>
              <div className="r"><span className="valor">{brl(p.valor)}</span><Chip nivel={NIVEL_PARCELA[sit]}>{sit}</Chip></div>
            </div>
          )
        }) : <Vazio icone="financeiro" titulo="Nenhuma parcela cadastrada." texto="Cadastre a entrada e as quinzenas do contrato com o cliente." />}
        <div className="acoes um"><button className="btn dark" onClick={() => setNovaParcela(true)}><Icon nome="mais_um" tamanho={20} />Nova parcela</button></div>
      </>
    )
  } else {
    corpo = contratos.length ? contratos.map((c) => {
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
    }) : <Vazio icone="financeiro" titulo="Nenhum contrato com empreiteiro." texto="Cadastre pelo detalhe da frente." />
  }

  return (
    <>
      <AbasTopo ativa={aba} onTrocar={setAba} abas={[
        { id: 'lancamentos', rotulo: 'Lançamentos' }, { id: 'parcelas', rotulo: 'Parcelas do cliente' }, { id: 'empreiteiros', rotulo: 'Empreiteiros' },
      ]} />
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
      <div className="card">{corpo}</div>
      {recebendo && (
        <Folha titulo={`Receber · ${recebendo.descricao} · ${brl(recebendo.valor)}`} onFechar={() => setRecebendo(null)}>
          <Formulario campos={CAMPOS_RECEBIMENTO} inicial={{ data: hoje }} rotuloSalvar="Marcar recebida"
            onCancelar={() => setRecebendo(null)} onSalvar={(v) => receber(recebendo, v)} />
        </Folha>
      )}
      {novaParcela && (
        <Folha titulo="Nova parcela" onFechar={() => setNovaParcela(false)}>
          <Formulario campos={CAMPOS_PARCELA} onCancelar={() => setNovaParcela(false)}
            onSalvar={() => { setNovaParcela(false); avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.') }} />
        </Folha>
      )}
    </>
  )
}
