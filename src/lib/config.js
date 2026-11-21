import { hojeNoFuso } from './datas.js'

// Chave Ãºnica que decide de onde vÃªm os dados.
// true  = dados de exemplo embutidos (src/lib/mockData.js), sem banco.
// false = Supabase (vira na etapa do banco; sÃ³ src/lib/dados.js muda).
export const USAR_MOCK = true

// Os dados de exemplo do PRD foram escritos com "hoje" = segunda, 23/11/2026.
// No mock o relÃ³gio fica parado nesse dia, para as cores e os prazos baterem.
export const HOJE_MOCK = '2026-11-23'

export function hoje() {
  return USAR_MOCK ? HOJE_MOCK : hojeNoFuso()
}
