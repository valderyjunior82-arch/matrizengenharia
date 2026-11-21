// ============================================================
// CAMADA DE DADOS — a única porta de entrada dos dados do app.
// Nenhuma tela lê mock nem chama o Supabase direto: tudo passa por aqui.
//
// MULTI-OBRA: a obra atual fica guardada AQUI (definirObraAtual) e toda
// função de lançamento filtra por ela sozinha. As telas não passam obra_id,
// então nenhuma tela consegue esquecer o filtro.
//
// Toda função devolve { data, erro }. A tela nunca vê o formato do banco.
// Hoje lê do mock (USAR_MOCK = true). Na etapa do banco, só o miolo daqui muda.
// ============================================================
import { USAR_MOCK, hoje } from './config.js'
import { daObra, obrasVisiveis } from './escopo.js'
import {
  mockProfiles, mockObras, mockMembros, mockFrentes, mockContratos,
  mockRegistros, mockFotos, mockMateriais, mockLancamentos,
} from './mockData.js'

// Cópia de trabalho: as ações (aprovar, marcar entregue…) mexem nela, e a
// tela vê o efeito enquanto o app estiver aberto. Recarregar a página zera.
const db = structuredClone({
  profiles: mockProfiles, obras: mockObras, membros: mockMembros, frentes: mockFrentes,
  contratos: mockContratos, registros: mockRegistros, fotos: mockFotos,
  materiais: mockMateriais, lancamentos: mockLancamentos,
})

let obraAtualId = null
export function definirObraAtual(id) {
  obraAtualId = id
}

function exigirObra() {
  if (!obraAtualId) throw new Error('Escolha uma obra no topo da tela.')
  return obraAtualId
}

// Uma pausa curta no mock, para o "carregando" aparecer como vai aparecer de verdade.
const pausa = () => new Promise((ok) => setTimeout(ok, 120))

async function responder(fn) {
  if (!USAR_MOCK) return { data: null, erro: 'O banco ainda não está ligado. Ele entra na etapa do Supabase.' }
  await pausa()
  try {
    return { data: structuredClone(fn()), erro: null }
  } catch (e) {
    return { data: null, erro: e.message }
  }
}

const nomeDe = (profileId) => db.profiles.find((p) => p.id === profileId)?.nome ?? '—'
const comAutor = (lista) => lista.map((x) => ({ ...x, autor_nome: nomeDe(x.autor_id) }))

// ---------- sessão (no mock, o "login" é escolher uma pessoa de teste) ----------
export const listarPessoasDeTeste = () => structuredClone(db.profiles)
export const obterPerfil = (id) => structuredClone(db.profiles.find((p) => p.id === id) ?? null)

// ---------- obras ----------
// Todas as obras que a pessoa enxerga (o Engenheiro vê também a interna "Empresa").
export const listarObras = (profile) => responder(() => obrasVisiveis(db.obras, db.membros, profile))

// ---------- frentes ----------
export const listarFrentes = () => responder(() => daObra(db.frentes, exigirObra()))

export const obterFrente = (id) => responder(() => {
  const f = daObra(db.frentes, exigirObra()).find((x) => x.id === id)
  if (!f) throw new Error('Esta frente não é da obra escolhida.')
  return { ...f, marcada_pronta_por_nome: f.marcada_pronta_por ? nomeDe(f.marcada_pronta_por) : null }
})

function frenteDaObra(id) {
  const f = daObra(db.frentes, exigirObra()).find((x) => x.id === id)
  if (!f) throw new Error('Esta frente não é da obra escolhida.')
  return f
}

export const aprovarFrente = (id) => responder(() => {
  const f = frenteDaObra(id)
  Object.assign(f, { situacao: 'Concluída', percentual: 100, data_conclusao: hoje(), comentario_devolucao: null })
  return f
})

export const devolverFrente = (id, comentario) => responder(() => {
  if (!comentario?.trim()) throw new Error('Escreva o motivo da devolução.')
  const f = frenteDaObra(id)
  Object.assign(f, { situacao: 'Em andamento', comentario_devolucao: comentario.trim(), marcada_pronta_por: null, marcada_pronta_em: null })
  return f
})

export const marcarFrentePronta = (id, profile) => responder(() => {
  const f = frenteDaObra(id)
  if (['Concluída', 'Aguardando aprovação'].includes(f.situacao)) throw new Error('Esta frente já está pronta.')
  Object.assign(f, { situacao: 'Aguardando aprovação', marcada_pronta_por: profile.id, marcada_pronta_em: new Date().toISOString() })
  return f
})

// ---------- diário e fotos ----------
export const listarRegistros = () => responder(() => comAutor(daObra(db.registros, exigirObra())))
export const listarFotos = () => responder(() => comAutor(daObra(db.fotos, exigirObra())))

// ---------- materiais ----------
export const listarMateriais = () => responder(() => daObra(db.materiais, exigirObra()))

export const mudarSituacaoMaterial = (id, situacao) => responder(() => {
  const m = daObra(db.materiais, exigirObra()).find((x) => x.id === id)
  if (!m) throw new Error('Este material não é da obra escolhida.')
  m.situacao = situacao
  return m
})

// ---------- dinheiro (só o Engenheiro chega nas telas que chamam isto) ----------
export const listarContratos = () => responder(() => daObra(db.contratos, exigirObra()))
export const listarLancamentos = () => responder(() => daObra(db.lancamentos, exigirObra()))

export const marcarParcelaRecebida = (id, { data, forma_pagamento }) => responder(() => {
  const l = daObra(db.lancamentos, exigirObra()).find((x) => x.id === id)
  if (!l) throw new Error('Esta parcela não é da obra escolhida.')
  if (!data || !forma_pagamento) throw new Error('Informe a data e a forma de pagamento.')
  Object.assign(l, { situacao: 'Realizado', data, forma_pagamento })
  return l
})

// ---------- comparativo entre obras ----------
// A ÚNICA busca que junta obras, porque o Caixa geral é, por definição,
// um comparativo. Nenhuma outra função daqui pode devolver duas obras.
export const listarCaixaGeral = () => responder(() => ({ obras: db.obras, lancamentos: db.lancamentos }))

// ---------- pessoas ----------
export const listarPessoas = () => responder(() => db.profiles.map((p) => ({
  ...p,
  obras: db.membros.filter((m) => m.profile_id === p.id).map((m) => db.obras.find((o) => o.id === m.obra_id)?.nome).filter(Boolean),
})))
