import { hojeNoFuso } from './datas.js'

// Chave única que decide de onde vêm os dados.
// true  = dados de exemplo embutidos (src/lib/mockData.js), sem banco.
// false = Supabase (src/lib/dadosBanco.js).
export const USAR_MOCK = false

// Os dados de exemplo do PRD foram escritos com "hoje" = segunda, 23/11/2026.
// No mock o relógio fica parado nesse dia, para as cores e os prazos baterem.
export const HOJE_MOCK = '2026-11-23'

export function hoje() {
  return USAR_MOCK ? HOJE_MOCK : hojeNoFuso()
}
