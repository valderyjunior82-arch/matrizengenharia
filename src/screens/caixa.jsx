// Caixa geral — COMPARATIVO ENTRE OBRAS, por definição. É a única tela do app
// que mostra dados de mais de uma obra juntos, e diz isso no topo.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { hoje as hojeDe } from '../lib/config.js'
import { listarCaixaGeral } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { caixaGeral } from '../lib/financeiro.js'
import { diasEntre } from '../lib/datas.js'
import { brl, dataCompleta } from '../lib/formato.js'
import { Cartao, Carregando, ErroCarga, Vazio } from '../components/index.jsx'

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const nomeMes = (m) => `${NOMES_MES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`

export default function Caixa({ goto }) {
  const hoje = hojeDe()
  const { trocarObra } = useObra()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const { carregando, erro, data, recarregar } = useCarregar(listarCaixaGeral)

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />
  if (!data.lancamentos.length) {
    return <div className="card"><Vazio icone="caixa" titulo="Nenhum lançamento ainda." texto="Os números aparecem assim que você lançar a primeira nota ou parcela." /></div>
  }

  const c = caixaGeral(data.obras, data.lancamentos, hoje, mes)
  const meses = [...new Set([hoje.slice(0, 7), ...data.lancamentos.filter((l) => l.situacao === 'Realizado').map((l) => l.data.slice(0, 7))])].sort().reverse()
  const abrirObra = (id) => { trocarObra(id); goto('financeiro') }

  return (
    <>
      <div className="faixa"><b>Comparativo entre obras.</b> Esta tela junta todas as obras e não depende da obra escolhida no topo.</div>

      <div className="titulo-tela">
        <div><div className="rotulo">Caixa geral da empresa</div><h2 className={c.saldoCaixa < 0 ? 'txt-red' : ''}>{brl(c.saldoCaixa)}</h2></div>
        <div className="campo" style={{ minWidth: 170 }}>
          <label htmlFor="mes">Mês</label>
          <select id="mes" value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </div>
      </div>

      <Cartao titulo={`No mês · ${nomeMes(mes)}`}>
        <div className="fin">
          <div><div className="rotulo">Entrou</div><div className="v txt-grn">{brl(c.entrouMes)}</div></div>
          <div><div className="rotulo">Saiu (pago pelo engenheiro)</div><div className="v">{brl(c.saiuMes)}</div></div>
          <div><div className="rotulo">Resultado</div><div className={`v ${c.resultadoMes < 0 ? 'txt-red' : ''}`}>{brl(c.resultadoMes)}</div></div>
          <div><div className="rotulo">Parcelas vencidas</div><div className={`v ${c.vencidas.length ? 'txt-red' : ''}`}>{c.vencidas.length}</div></div>
        </div>
      </Cartao>

      <Cartao titulo="Por obra">
        {c.porObra.map(({ obra, recebido, gasto, saldo, aReceber }) => (
          <button key={obra.id} className="li" onClick={() => (obra.interna ? null : abrirObra(obra.id))} disabled={obra.interna}
            style={obra.interna ? { opacity: 1, cursor: 'default' } : null}>
            <div className="b">
              <div className="t">{obra.nome}</div>
              <div className="m">{obra.interna ? `gasto ${brl(gasto)}` : `recebido ${brl(recebido)} · gasto ${brl(gasto)} · a receber ${brl(aReceber)}`}</div>
            </div>
            {!obra.interna && <div className="r"><span className="muted pequeno">saldo</span><span className={`valor ${saldo < 0 ? 'txt-red' : ''}`}>{brl(saldo)}</span></div>}
          </button>
        ))}
      </Cartao>

      <Cartao titulo={`Parcelas vencidas · ${c.vencidas.length}`}>
        {c.vencidas.length ? c.vencidas.map((p) => (
          <button key={p.id} className="li critico" onClick={() => { trocarObra(p.obra_id); goto('financeiro', { aba: 'parcelas' }) }}>
            <div className="b"><div className="t">{p.descricao}</div><div className="m">{p.obra?.nome} · venceu {dataCompleta(p.vencimento)}</div></div>
            <div className="r"><span className="valor">{brl(p.valor)}</span><span className="s">há {diasEntre(p.vencimento, hoje)} dias</span></div>
          </button>
        )) : <div className="aviso">Nenhuma parcela vencida.</div>}
      </Cartao>
    </>
  )
}
