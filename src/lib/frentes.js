// Regras das frentes de serviço: "dias sem andar", cor da linha, ordem do painel.
// Tudo puro (sem React, sem banco): é o que os testes em tests/frentes.mjs conferem.
import { diasEntre } from './datas.js'
import { DIAS_LIMITE_ATENCAO, DIAS_SEM_ANDAR_ATENCAO } from './vocabulario.js'

const FORA_DO_PAINEL = ['Concluída', 'Aguardando aprovação']
const ORDEM_GRUPOS = ['Aguardando aprovação', 'Em andamento', 'Parada', 'Não iniciada', 'Concluída']

// null = ainda não começou (a data de início prevista não chegou) ou não tem data.
export function diasSemAndar(f, hoje) {
  if (f.ultimo_avanco_em) return diasEntre(f.ultimo_avanco_em, hoje)
  if (!f.data_inicio_prevista) return null
  if (diasEntre(hoje, f.data_inicio_prevista) > 0) return null
  return diasEntre(f.data_inicio_prevista, hoje)
}

// 'critico' (vermelho) · 'atencao' (âmbar) · 'ok' (verde)
export function nivelFrente(f, hoje) {
  if (FORA_DO_PAINEL.includes(f.situacao)) return 'ok'
  if (f.data_limite_decisao) {
    const faltam = diasEntre(hoje, f.data_limite_decisao)
    if (faltam < 0) return 'critico'
    if (faltam <= DIAS_LIMITE_ATENCAO) return 'atencao'
  }
  const parada = diasSemAndar(f, hoje)
  if (parada !== null && parada >= DIAS_SEM_ANDAR_ATENCAO) return 'atencao'
  return 'ok'
}

// Painel do dia: sem as concluídas e sem as que aguardam aprovação (essas
// aparecem no bloco "Para aprovar"). Data limite mais próxima primeiro, as
// vencidas no topo, sem data limite no fim; empate, a mais parada primeiro.
export function frentesDoPainel(frentes, hoje) {
  return frentes
    .filter((f) => !FORA_DO_PAINEL.includes(f.situacao))
    .sort((a, b) => {
      const la = a.data_limite_decisao
      const lb = b.data_limite_decisao
      if (la !== lb) {
        if (!la) return 1
        if (!lb) return -1
        return la < lb ? -1 : 1
      }
      return (diasSemAndar(b, hoje) ?? -1) - (diasSemAndar(a, hoje) ?? -1)
    })
}

export function frentesParaAprovar(frentes) {
  return frentes.filter((f) => f.situacao === 'Aguardando aprovação')
}

export function agruparPorSituacao(frentes) {
  return ORDEM_GRUPOS
    .map((situacao) => ({ situacao, frentes: frentes.filter((f) => f.situacao === situacao) }))
    .filter((g) => g.frentes.length > 0)
}

export function ambientesDe(frentes) {
  return [...new Set(frentes.map((f) => f.ambiente))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Texto da data limite: curto (etiqueta) e longo (detalhe).
export function textoLimite(f, hoje) {
  if (f.situacao === 'Aguardando aprovação') return { curto: 'aprovar', longo: 'Aguardando aprovação' }
  if (f.situacao === 'Concluída') return { curto: 'concluída', longo: 'Concluída' }
  if (!f.data_limite_decisao) return { curto: 'sem limite', longo: 'Sem data limite' }
  const x = diasEntre(hoje, f.data_limite_decisao)
  if (x < 0) return { curto: `vencida ${-x}d`, longo: `Vencida há ${-x} ${-x === 1 ? 'dia' : 'dias'}` }
  if (x === 0) return { curto: 'vence hoje', longo: 'Vence hoje' }
  if (x === 1) return { curto: 'amanhã', longo: 'Vence amanhã' }
  return { curto: `em ${x} dias`, longo: `Vence em ${x} dias` }
}

export function podeMarcarPronta(f) {
  return !FORA_DO_PAINEL.includes(f.situacao)
}

// Régua de prazo de uma frente: posições de 0 a 100 entre o início e o
// término previstos. `feito` é o % de avanço; `hoje` e `limite` são marcas
// na régua. Hoje antes do início fica em 0, depois do término fica em 100
// (e `passou` avisa). Sem as duas datas previstas, não há régua (null).
export function reguaDaFrente(f, hoje) {
  const ini = f.data_inicio_prevista
  const fim = f.data_termino_prevista
  if (!ini || !fim) return null
  const total = diasEntre(ini, fim)
  if (total <= 0) return null
  const pos = (iso) => Math.max(0, Math.min(100, Math.round((diasEntre(ini, iso) / total) * 100)))
  return {
    feito: f.percentual || 0,
    hoje: pos(hoje),
    limite: f.data_limite_decisao ? pos(f.data_limite_decisao) : null,
    passou: f.situacao !== 'Concluída' && diasEntre(fim, hoje) > 0,
  }
}

// Avanço físico da obra = média simples do % das frentes.
export function avancoDaObra(frentes) {
  if (!frentes.length) return 0
  return Math.round(frentes.reduce((s, f) => s + (f.percentual || 0), 0) / frentes.length)
}

// Quanto do prazo da obra já passou, de 0 a 100.
export function prazoCorrido(obra, hoje) {
  if (!obra.data_inicio || !obra.data_meta_entrega) return null
  const total = diasEntre(obra.data_inicio, obra.data_meta_entrega)
  if (total <= 0) return 100
  return Math.max(0, Math.min(100, Math.round((diasEntre(obra.data_inicio, hoje) / total) * 100)))
}
