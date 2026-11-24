// Peças de domínio usadas em mais de uma tela. Desenham; quem decide cor,
// ordem e texto é a lib (frentes.js, materiais.js).
import { useState } from 'react'
import { diasSemAndar, nivelFrente, reguaDaFrente, textoLimite } from '../lib/frentes.js'
import { PEDIDO, textoPrazoMaterial, urgenciaMaterial } from '../lib/materiais.js'
import { dataCurta } from '../lib/formato.js'
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

export function LinhaMaterial({ material, hoje, frente, acoes }) {
  const urg = urgenciaMaterial(material, hoje)
  return (
    <div className={`li ${urg === 'critico' ? 'critico' : ''}`}>
      <div className="b">
        <div className="t">{material.item} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>· {String(material.quantidade).replace('.', ',')} {material.unidade}</span></div>
        <div className="m">{frente ? frente.servico : 'sem frente'} · {material.fornecedor || 'sem fornecedor'}</div>
        {acoes && <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>{acoes}</div>}
      </div>
      <div className="r">
        <Chip nivel={urg}>{textoPrazoMaterial(material, hoje)}</Chip>
        <Chip nivel={NIVEL_SITUACAO_MATERIAL[material.situacao]}>{material.situacao}</Chip>
      </div>
    </div>
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
