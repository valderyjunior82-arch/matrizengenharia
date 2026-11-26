// Peças de domínio usadas em mais de uma tela. Desenham; quem decide cor,
// ordem e texto é a lib (frentes.js, materiais.js).
import { useState } from 'react'
import { diasSemAndar, nivelFrente, reguaDaFrente, textoLimite } from '../lib/frentes.js'
import { PEDIDO, textoPrazoMaterial, urgenciaMaterial } from '../lib/materiais.js'
import { brl, dataCompleta, dataCurta, mesCurto, nomeMes, plural } from '../lib/formato.js'
import { Chip, Folha } from './index.jsx'

// Régua de prazo: o trilho vai do início ao término previstos, como uma trena.
// Preenchido = % feito. Traço escuro = hoje. Losango = data limite de decisão.
// Se o traço de hoje passou muito do preenchido, a frente está atrás do prazo.
export function ReguaPrazo({ frente, hoje, grande = false }) {
  const r = reguaDaFrente(frente, hoje)
  if (!r) return null
  const nivel = nivelFrente(frente, hoje)
  const descricao = `${r.feito}% feito. Prazo de ${dataCurta(frente.data_inicio_prevista)} a ${dataCurta(frente.data_termino_prevista)}`
    + (r.passou ? ', já passou do término.' : '.')
    + (frente.data_limite_decisao ? ` Data limite de decisão ${dataCurta(frente.data_limite_decisao)}.` : '')
  return (
    <div className={`regua ${grande ? 'grande' : ''}`} role="img" aria-label={descricao}>
      <div className="regua-trilho">
        <i className="regua-feito" style={{ width: `${r.feito}%` }} />
        {r.limite !== null && frente.situacao !== 'Concluída' && <b className={`regua-limite ${nivel}`} style={{ left: `${r.limite}%` }} />}
        {frente.situacao !== 'Concluída' && <b className="regua-hoje" style={{ left: `${r.hoje}%` }} />}
      </div>
      <div className="regua-datas">
        <span>{dataCurta(frente.data_inicio_prevista)}</span>
        <span className="feito">{r.feito}%</span>
        <span className={r.passou ? 'txt-red' : ''}>{dataCurta(frente.data_termino_prevista)}</span>
      </div>
    </div>
  )
}

export function TextoAndamento({ frente, hoje }) {
  if (frente.situacao === 'Concluída') return <span className="s">concluída {dataCurta(frente.data_conclusao)}</span>
  if (frente.situacao === 'Aguardando aprovação') return <span className="s">pronta, aguardando</span>
  const d = diasSemAndar(frente, hoje)
  if (d === null) return <span className="s">{frente.data_inicio_prevista ? `começa ${dataCurta(frente.data_inicio_prevista)}` : 'sem data de início'}</span>
  if (d === 0) return <span className="s"><strong>andou hoje</strong></span>
  return <span className="s"><strong>{d}</strong> {d === 1 ? 'dia' : 'dias'} sem andar</span>
}

export function LinhaFrente({ frente, hoje, onAbrir }) {
  const nivel = nivelFrente(frente, hoje)
  const nivelChip = frente.situacao === 'Aguardando aprovação' ? 'info' : nivel === 'ok' && !frente.data_limite_decisao ? 'neutro' : nivel
  return (
    <button className={`li ${nivel}`} onClick={() => onAbrir(frente.id)}>
      <div className="b">
        <div className="t">{frente.servico}</div>
        <div className="m">{frente.ambiente}{frente.responsavel && ` · ${frente.responsavel}`}</div>
        <ReguaPrazo frente={frente} hoje={hoje} />
      </div>
      <div className="r">
        <Chip nivel={nivelChip}>{textoLimite(frente, hoje).curto}</Chip>
        <TextoAndamento frente={frente} hoje={hoje} />
      </div>
    </button>
  )
}

const NIVEL_SITUACAO_MATERIAL = { [PEDIDO]: 'atencao', 'A comprar': 'atencao', Comprado: 'info', Entregue: 'ok' }

// onAbrir só sem `acoes`: botão dentro de botão não vale.
export function LinhaMaterial({ material, hoje, frente, acoes, onAbrir }) {
  const urg = urgenciaMaterial(material, hoje)
  const Linha = onAbrir ? 'button' : 'div'
  return (
    <Linha className={`li ${urg === 'critico' ? 'critico' : ''}`} onClick={onAbrir && (() => onAbrir(material))}>
      <div className="b">
        <div className="t">{material.item} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>· {String(material.quantidade).replace('.', ',')} {material.unidade}</span></div>
        <div className="m">{frente ? frente.servico : 'sem frente'} · {material.fornecedor || 'sem fornecedor'}</div>
        {acoes && <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>{acoes}</div>}
      </div>
      <div className="r">
        <Chip nivel={urg}>{textoPrazoMaterial(material, hoje)}</Chip>
        <Chip nivel={NIVEL_SITUACAO_MATERIAL[material.situacao]}>{material.situacao}</Chip>
      </div>
    </Linha>
  )
}

// Devolver uma frente pede o motivo, obrigatório.
export function FolhaDevolver({ frente, onConfirmar, onFechar }) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState(null)
  return (
    <Folha titulo={`Devolver · ${frente.servico}`} onFechar={onFechar}>
      <div className="form">
        <div className="campo">
          <label htmlFor="motivo">O que falta fazer?<span className="obr">*</span></label>
          <textarea id="motivo" value={texto} onChange={(e) => { setTexto(e.target.value); setErro(null) }} />
          {erro ? <div className="erro-campo">{erro}</div> : <div className="ajuda">A frente volta para “Em andamento” com este comentário.</div>}
        </div>
        <div className="acoes" style={{ padding: 0 }}>
          <button className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn pri" onClick={() => (texto.trim() ? onConfirmar(texto) : setErro('Escreva o motivo da devolução.'))}>Devolver</button>
        </div>
      </div>
    </Folha>
  )
}

// ---------- dinheiro (só telas do Engenheiro) ----------

// Painel: entrou × saiu do caixa, mês a mês. Altura de cada barra = valor / maior valor.
export function GraficoMeses({ meses }) {
  const maior = Math.max(1, ...meses.flatMap((m) => [m.entrou, m.saiu]))
  const resumo = meses.map((m) => `${nomeMes(m.mes)}: entrou ${brl(m.entrou)}, saiu ${brl(m.saiu)}`).join('; ')
  return (
    <div className="grafico" role="img" aria-label={resumo}>
      <div className="grafico-barras">
        {meses.map((m) => (
          <div key={m.mes} className="grafico-mes" title={`${nomeMes(m.mes)} · entrou ${brl(m.entrou)} · saiu ${brl(m.saiu)}`}>
            <div className="grafico-par">
              <span className="g-entrou" style={{ height: `${(m.entrou / maior) * 100}%` }} />
              <span className="g-saiu" style={{ height: `${(m.saiu / maior) * 100}%` }} />
            </div>
            <span className="grafico-rot">{mesCurto(m.mes)}</span>
          </div>
        ))}
      </div>
      <div className="grafico-legenda"><span><i className="g-entrou" />Entrou</span><span><i className="g-saiu" />Saiu (pago pelo engenheiro)</span></div>
    </div>
  )
}

const rotuloPeriodo = (p) => (p.length === 7 ? nomeMes(p) : dataCompleta(p))

// Fluxo de caixa: uma linha por dia ou mês, mais nova primeiro, com o saldo acumulado.
export function TabelaFluxo({ fluxo }) {
  if (!fluxo.realizado.length && !fluxo.previsto.length) return <div className="aviso">Nenhum dinheiro entrou ou saiu ainda.</div>
  return (
    <>
      {fluxo.realizado.map((l) => (
        <div key={l.periodo} className="li">
          <div className="b">
            <div className="t">{rotuloPeriodo(l.periodo)}</div>
            <div className="m">entrou <span className="txt-grn">{brl(l.entrou)}</span> · saiu {brl(l.saiu)}</div>
          </div>
          <div className="r"><span className="muted pequeno">saldo acumulado</span><span className={`valor ${l.acumulado < 0 ? 'txt-red' : ''}`}>{brl(l.acumulado)}</span></div>
        </div>
      ))}
      {fluxo.previsto.length > 0 && (
        <>
          <div className="dre-grupo"><span className="mono">A receber (previsto)</span></div>
          {fluxo.previsto.map((l) => (
            <div key={l.periodo} className="li">
              <div className="b"><div className="t">{rotuloPeriodo(l.periodo)}</div><div className="m">parcelas do cliente ainda não recebidas</div></div>
              <div className="r"><span className="valor muted">{brl(l.entrou)}</span></div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

// DRE: receitas e despesas por conta. Tocar numa conta mostra os lançamentos que formam o número;
// tocar num lançamento chama onAbrir (quando a tela permite abrir).
export function TabelaDRE({ d, onAbrir, obraDe }) {
  const [aberta, setAberta] = useState(null)
  if (!d.receitas.length && !d.despesas.length && !d.pagoPeloCliente.itens.length) {
    return <div className="aviso">Nenhum lançamento neste período.</div>
  }
  const linhaItem = (l) => (
    <button key={l.id} className="li dre-item" onClick={() => onAbrir?.(l)} disabled={!onAbrir}>
      <div className="b">
        <div className="t">{l.descricao || l.categoria}</div>
        <div className="m">{dataCurta(l.data)}{l.fornecedor && ` · ${l.fornecedor}`}{obraDe && ` · ${obraDe(l.obra_id)}`}</div>
      </div>
      <div className="r"><span className="valor">{brl(l.valor)}</span></div>
    </button>
  )
  const conta = (grupo, c) => {
    const chave = `${grupo}:${c.conta}`
    return (
      <div key={chave}>
        <button className="li" aria-expanded={aberta === chave} onClick={() => setAberta(aberta === chave ? null : chave)}>
          <div className="b"><div className="t">{c.conta}</div><div className="m">{plural(c.itens.length, 'lançamento', 'lançamentos')} · toque para ver</div></div>
          <div className="r"><span className="valor">{brl(c.total)}</span></div>
        </button>
        {aberta === chave && c.itens.map(linhaItem)}
      </div>
    )
  }
  return (
    <>
      <div className="dre-grupo"><span className="mono">Receitas</span><span className="valor txt-grn">{brl(d.totalReceitas)}</span></div>
      {d.receitas.map((c) => conta('r', c))}
      <div className="dre-grupo"><span className="mono">Despesas (pagas pelo engenheiro)</span><span className="valor">{brl(d.totalDespesas)}</span></div>
      {d.despesas.map((c) => conta('d', c))}
      <div className="dre-grupo dre-total"><span className="mono">Resultado</span><span className={`valor ${d.resultado < 0 ? 'txt-red' : 'txt-grn'}`}>{brl(d.resultado)}</span></div>
      {d.pagoPeloCliente.itens.length > 0 && (
        <>
          <div className="dre-grupo"><span className="mono">Pago direto pelo cliente</span><span className="valor muted">{brl(d.pagoPeloCliente.total)}</span></div>
          <div className="aviso">Entra no gasto da obra, mas não no resultado: o dinheiro não passou pelo seu caixa.</div>
          {conta('c', { conta: 'Notas pagas pelo cliente', total: d.pagoPeloCliente.total, itens: d.pagoPeloCliente.itens })}
        </>
      )}
    </>
  )
}
