import { diasEntre } from './datas.js'
import { JANELA_MATERIAL_DIAS } from './vocabulario.js'

const porData = (a, b) => (a.precisa_ate < b.precisa_ate ? -1 : a.precisa_ate > b.precisa_ate ? 1 : 0)

// O que precisa estar na obra nos próximos N dias (ou já passou) e não chegou.
export function materiaisParaChegar(materiais, hoje, janela = JANELA_MATERIAL_DIAS) {
  return materiais
    .filter((m) => m.situacao !== 'Entregue' && diasEntre(hoje, m.precisa_ate) <= janela)
    .sort(porData)
}

export function materiaisNaSituacao(materiais, situacao) {
  return materiais.filter((m) => m.situacao === situacao).sort(porData)
}

// 'critico' (já passou) · 'atencao' (até 2 dias) · 'neutro' · 'ok' (entregue)
export function urgenciaMaterial(m, hoje) {
  if (m.situacao === 'Entregue') return 'ok'
  const x = diasEntre(hoje, m.precisa_ate)
  if (x < 0) return 'critico'
  if (x <= 2) return 'atencao'
  return 'neutro'
}

export function textoPrazoMaterial(m, hoje) {
  if (m.situacao === 'Entregue') return 'entregue'
  const x = diasEntre(hoje, m.precisa_ate)
  if (x < 0) return `atrasado ${-x}d`
  if (x === 0) return 'hoje'
  if (x === 1) return 'amanhã'
  const [, mes, dia] = m.precisa_ate.split('-')
  return `até ${dia}/${mes}`
}
