import { diasEntre, diaDaSemana } from './datas.js'

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function brl(valor) {
  const n = Number(valor) || 0
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function dataCurta(iso) {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function dataCompleta(iso) {
  if (!iso) return '—'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// "Hoje", "Ontem", "Amanhã" ou "sábado, 21/11/2026".
export function diaRelativo(iso, hoje) {
  const n = diasEntre(hoje, iso)
  if (n === 0) return 'Hoje'
  if (n === -1) return 'Ontem'
  if (n === 1) return 'Amanhã'
  return `${SEMANA[diaDaSemana(iso)]}, ${dataCompleta(iso)}`
}

export function diaSemanaCurto(iso) {
  return SEMANA[diaDaSemana(iso)].slice(0, 3)
}

export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`
}

export function iniciais(nome = '') {
  return nome.replace(/^(Eng\.|Seu|Dona|Dra?\.)\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}
