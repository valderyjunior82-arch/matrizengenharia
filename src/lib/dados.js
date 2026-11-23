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
import { daObra, obrasDoSeletor, obrasVisiveis } from './escopo.js'
import { emailEmUso, normalizarEmail, obrasDoAcesso, papelDaNovaConta, podeGerenciar } from './pessoas.js'
import { CAMPOS_CONTRATO, CAMPOS_CRIAR_CONTA, CAMPOS_FRENTE, CAMPOS_OBRA, paraNumero, validar } from './formularios.js'
import { camposDaFrente, frenteTemRegistros, MSG_FRENTE_COM_REGISTROS, podeEditarFrente, podeMarcarPronta } from './frentes.js'
import { codigoEmUso, erroAoRemover, MSG_OBRA_COM_REGISTROS, obraTemRegistros, podeEntrarNaObra } from './obras.js'
import { ehEngenheiro, ehMestre } from './permissoes.js'
import {
  mockProfiles, mockSenhas, SENHA_DE_TESTE, mockObras, mockMembros, mockFrentes, mockContratos,
  mockRegistros, mockFotos, mockMateriais, mockLancamentos,
} from './mockData.js'

// Cópia de trabalho: as ações (aprovar, marcar entregue…) mexem nela, e a
// tela vê o efeito enquanto o app estiver aberto. Recarregar a página zera.
const db = structuredClone({
  profiles: mockProfiles, senhas: mockSenhas, obras: mockObras, membros: mockMembros, frentes: mockFrentes,
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

// ---------- sessão (no mock, email e senha conferidos aqui; no banco, supabase.auth) ----------
// Só no mock: as contas de exemplo e a senha de teste, para o rodapé do login.
export const contasDeExemplo = () =>
  USAR_MOCK ? { contas: db.profiles.map(({ nome, email, role }) => ({ nome, email, role })), senha: SENHA_DE_TESTE } : null

// Sessão lembrada no navegador: conta desativada (ou que sumiu no F5 do mock) volta ao login.
export const obterPerfil = (id) => {
  const p = db.profiles.find((x) => x.id === id)
  return p?.ativo ? structuredClone(p) : null
}

export const entrar = ({ email, senha }) => responder(() => {
  const p = db.profiles.find((x) => normalizarEmail(x.email) === normalizarEmail(email))
  if (!p || db.senhas[p.id] !== senha) throw new Error('Email ou senha errados.')
  if (!p.ativo) throw new Error('Esta conta foi desativada. Fale com o engenheiro.')
  return p
})

export const criarConta = (valores) => responder(() => {
  if (Object.keys(validar(CAMPOS_CRIAR_CONTA, valores)).length) throw new Error('Confira os campos marcados.')
  if (emailEmUso(db.profiles, valores.email)) throw new Error('Já existe uma conta com este email. Use Entrar.')
  const p = {
    id: crypto.randomUUID(), nome: valores.nome.trim(), email: normalizarEmail(valores.email),
    role: papelDaNovaConta(db.profiles), ativo: true,
  }
  db.profiles.push(p)
  db.senhas[p.id] = valores.senha
  return p
})

// ---------- obras ----------
// Todas as obras que a pessoa enxerga (o Engenheiro vê também a interna "Empresa").
export const listarObras = (profile) => responder(() => obrasVisiveis(db.obras, db.membros, profile))

function exigirEngenheiro(quem, oQue = 'cadastra obras') {
  if (!ehEngenheiro(quem)) throw new Error(`Só o Engenheiro ${oQue}.`)
}

function obraDoCadastro(id) {
  const o = db.obras.find((x) => x.id === id && !x.interna)
  if (!o) throw new Error('Obra não encontrada.')
  return o
}

const obraIdsDe = (profileId) => db.membros.filter((m) => m.profile_id === profileId).map((m) => m.obra_id)

// Nova obra (id = null) ou edição. Quem cria entra nela.
export const salvarObra = (quem, id, valores) => responder(() => {
  exigirEngenheiro(quem)
  if (Object.keys(validar(CAMPOS_OBRA, valores)).length) throw new Error('Confira os campos marcados.')
  if (codigoEmUso(db.obras, valores.codigo, id)) throw new Error('Já existe uma obra com este código. Escolha outro.')
  const campos = Object.fromEntries(CAMPOS_OBRA.map((c) => [c.nome, String(valores[c.nome] ?? '').trim() || null]))
  campos.codigo = campos.codigo.toUpperCase()
  if (id) return Object.assign(obraDoCadastro(id), campos)
  const o = { id: crypto.randomUUID(), ...campos, interna: false }
  db.obras.push(o)
  db.membros.push({ id: crypto.randomUUID(), obra_id: o.id, profile_id: quem.id })
  return o
})

export const excluirObra = (quem, id) => responder(() => {
  exigirEngenheiro(quem)
  obraDoCadastro(id)
  const { frentes, contratos, registros, fotos, materiais, lancamentos } = db
  if (obraTemRegistros(id, { frentes, contratos, registros, fotos, materiais, lancamentos })) throw new Error(MSG_OBRA_COM_REGISTROS)
  db.obras = db.obras.filter((o) => o.id !== id)
  db.membros = db.membros.filter((m) => m.obra_id !== id)
  return { id }
})

export const adicionarNaObra = (quem, obraId, profileId) => responder(() => {
  exigirEngenheiro(quem)
  obraDoCadastro(obraId)
  const p = db.profiles.find((x) => x.id === profileId)
  if (!p || !podeEntrarNaObra(p, obraIdsDe(profileId), obraId)) throw new Error('Esta pessoa não pode ser adicionada a esta obra.')
  db.membros.push({ id: crypto.randomUUID(), obra_id: obraId, profile_id: profileId })
  return { obraId, profileId }
})

export const removerDaObra = (quem, obraId, profileId) => responder(() => {
  exigirEngenheiro(quem)
  const p = db.profiles.find((x) => x.id === profileId)
  if (!p) throw new Error('Pessoa não encontrada.')
  const abertas = obrasDoSeletor(db.obras).map((o) => o.id)
  const erro = erroAoRemover(p, obraIdsDe(profileId).filter((id) => abertas.includes(id)), obraId)
  if (erro) throw new Error(erro)
  db.membros = db.membros.filter((m) => !(m.obra_id === obraId && m.profile_id === profileId))
  return { obraId, profileId }
})

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

// Nova frente (id = null) ou edição. A obra é sempre a escolhida no topo.
export const salvarFrente = (quem, id, valores) => responder(() => {
  exigirEngenheiro(quem, 'cadastra e edita frentes')
  const anterior = id ? frenteDaObra(id) : null
  if (anterior && !podeEditarFrente(anterior)) throw new Error('Esta frente aguarda aprovação. Aprove ou devolva antes de editar.')
  if (Object.keys(validar(CAMPOS_FRENTE, valores)).length) throw new Error('Confira os campos marcados.')
  if (anterior) return Object.assign(anterior, camposDaFrente(valores, anterior, hoje()))
  const f = {
    id: crypto.randomUUID(), obra_id: exigirObra(), ultimo_avanco_em: null,
    marcada_pronta_por: null, marcada_pronta_em: null, comentario_devolucao: null,
    ...camposDaFrente(valores, null, hoje()),
  }
  db.frentes.push(f)
  return f
})

export const excluirFrente = (quem, id) => responder(() => {
  exigirEngenheiro(quem, 'exclui frentes')
  frenteDaObra(id)
  const { registros, fotos, materiais, contratos, lancamentos } = db
  if (frenteTemRegistros(id, { registros, fotos, materiais, contratos, lancamentos })) throw new Error(MSG_FRENTE_COM_REGISTROS)
  db.frentes = db.frentes.filter((f) => f.id !== id)
  return { id }
})

export const aprovarFrente = (quem, id) => responder(() => {
  exigirEngenheiro(quem, 'aprova frentes')
  const f = frenteDaObra(id)
  if (f.situacao !== 'Aguardando aprovação') throw new Error('Esta frente não está aguardando aprovação.')
  Object.assign(f, { situacao: 'Concluída', percentual: 100, data_conclusao: hoje(), comentario_devolucao: null })
  return f
})

export const devolverFrente = (quem, id, comentario) => responder(() => {
  exigirEngenheiro(quem, 'devolve frentes')
  if (!comentario?.trim()) throw new Error('Escreva o motivo da devolução.')
  const f = frenteDaObra(id)
  if (f.situacao !== 'Aguardando aprovação') throw new Error('Esta frente não está aguardando aprovação.')
  Object.assign(f, { situacao: 'Em andamento', comentario_devolucao: comentario.trim(), marcada_pronta_por: null, marcada_pronta_em: null })
  return f
})

export const marcarFrentePronta = (quem, id) => responder(() => {
  if (!ehEngenheiro(quem) && !ehMestre(quem)) throw new Error('Sua conta não pode marcar frentes como prontas.')
  const f = frenteDaObra(id)
  if (!podeMarcarPronta(f)) throw new Error('Esta frente já está pronta.')
  Object.assign(f, { situacao: 'Aguardando aprovação', marcada_pronta_por: quem.id, marcada_pronta_em: new Date().toISOString() })
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

// Um contrato por frente (é dele que sai o "falta pagar" do empreiteiro).
export const salvarContrato = (quem, frenteId, valores) => responder(() => {
  exigirEngenheiro(quem, 'cadastra contratos')
  if (Object.keys(validar(CAMPOS_CONTRATO, valores)).length) throw new Error('Confira os campos marcados.')
  const f = frenteDaObra(frenteId)
  if (db.contratos.some((c) => c.frente_id === f.id)) throw new Error('Esta frente já tem contrato.')
  const c = {
    id: crypto.randomUUID(), obra_id: f.obra_id, frente_id: f.id,
    empreiteiro: valores.empreiteiro.trim(), valor_contratado: paraNumero(valores.valor_contratado),
    observacao: String(valores.observacao ?? '').trim() || null,
  }
  db.contratos.push(c)
  return c
})

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
export const listarPessoas = () => responder(() => db.profiles.map((p) => {
  const obraIds = db.membros.filter((m) => m.profile_id === p.id).map((m) => m.obra_id)
  return { ...p, obra_ids: obraIds, obras: obraIds.map((id) => db.obras.find((o) => o.id === id)?.nome).filter(Boolean) }
}))

function pessoaGerenciavel(quem, id) {
  const p = db.profiles.find((x) => x.id === id)
  if (!podeGerenciar(quem, p)) throw new Error('Você não pode mudar o acesso desta pessoa.')
  return p
}

// Liberar e Editar são a mesma coisa: perfil + obras (o Mestre só vê as obras marcadas).
export const salvarAcesso = (quem, id, { role, obraIds }) => responder(() => {
  const p = pessoaGerenciavel(quem, id)
  const atuais = db.membros.filter((m) => m.profile_id === id).map((m) => m.obra_id)
  const abertas = obrasDoSeletor(db.obras).map((o) => o.id)
  const novo = obrasDoAcesso(atuais, role, obraIds, abertas)
  if (novo.erro) throw new Error(novo.erro)
  p.role = role
  db.membros = db.membros.filter((m) => m.profile_id !== id || novo.obraIds.includes(m.obra_id))
  novo.obraIds.filter((oid) => !atuais.includes(oid)).forEach((obra_id) => db.membros.push({ id: crypto.randomUUID(), obra_id, profile_id: id }))
  return p
})

// Desativar não apaga: o que a pessoa lançou continua com o nome dela.
export const definirAtivo = (quem, id, ativo) => responder(() => {
  const p = pessoaGerenciavel(quem, id)
  p.ativo = !!ativo
  return p
})

export const salvarMeuNome = (quem, nome) => responder(() => {
  if (!nome?.trim()) throw new Error('Preencha o nome.')
  const p = db.profiles.find((x) => x.id === quem.id)
  p.nome = nome.trim()
  return p
})
