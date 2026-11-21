// Datas sempre como texto 'AAAA-MM-DD' (o mesmo formato da coluna `date` do banco).
// Toda conta é feita em UTC sobre esse texto, para o fuso do computador nunca
// "pular" um dia. "Hoje" é calculado no fuso do engenheiro (UTC−4): um diário
// lançado às 22h fica no mesmo dia, e não no seguinte.

const DIA_MS = 86400000
export const FUSO_HORAS = -4

export function hojeNoFuso(agora = new Date()) {
  return new Date(agora.getTime() + FUSO_HORAS * 3600000).toISOString().slice(0, 10)
}

export function paraMs(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

// Quantos dias de `de` até `ate` (positivo quando `ate` vem depois).
export function diasEntre(de, ate) {
  return Math.round((paraMs(ate) - paraMs(de)) / DIA_MS)
}

export function somarDias(iso, n) {
  return new Date(paraMs(iso) + n * DIA_MS).toISOString().slice(0, 10)
}

export function diaDaSemana(iso) {
  return new Date(paraMs(iso)).getUTCDay()
}

export function segundaDaSemana(iso) {
  return somarDias(iso, -((diaDaSemana(iso) + 6) % 7))
}
