// ============================================================
// CAMADA DE DADOS — versão de verdade, no Supabase (USAR_MOCK = false).
// Mesmas funções e mesmo { data, erro } de dadosMock.js; dados.js escolhe.
//
// MULTI-OBRA: a obra atual fica guardada AQUI e toda lista filtra por
// obra_id sozinha (as telas não passam obra_id). A tranca de verdade é a
// RLS do banco (supabase/migrations): este filtro é o que separa as telas,
// a RLS é o que impede alguém de ler a obra do vizinho pela API.
//
// O Supabase NÃO estoura exceção: devolve { error }. Toda chamada passa por
// `ok()`, que transforma o error em exceção, e `responder()` traduz.
// ============================================================
import { hoje } from './config.js'
import { supabase } from './supabase.js'
import { obrasDoSeletor } from './escopo.js'
import { normalizarEmail, obrasDoAcesso, podeGerenciar } from './pessoas.js'
import { CAMPOS_CONTRATO, CAMPOS_CRIAR_CONTA, CAMPOS_FRENTE, CAMPOS_OBRA, paraNumero, validar } from './formularios.js'
import { camposDaFrente, podeEditarFrente } from './frentes.js'
import { erroAoRemover, podeEntrarNaObra } from './obras.js'
import { ehEngenheiro, ehMestre } from './permissoes.js'
import { traduzirErro } from './errosBanco.js'

let obraAtualId = null
export function definirObraAtual(id) {
  obraAtualId = id
}

function exigirObra() {
  if (!obraAtualId) throw new Error('Escolha uma obra no topo da tela.')
  return obraAtualId
}

function banco() {
  if (!supabase) throw new Error('O banco não está configurado (faltam as chaves no .env.local).')
  return supabase
}

async function responder(fn) {
  try {
    return { data: await fn(), erro: null }
  } catch (e) {
    return { data: null, erro: traduzirErro(e) }
  }
}

function ok({ data, error }) {
  if (error) throw error
  return data
}

// O Supabase devolve no máximo 1.000 linhas por pedido, sem avisar.
// Aqui a lista vem inteira, de 1.000 em 1.000.
async function todas(montar) {
  const linhas = []
  for (let de = 0; ; de += 1000) {
    const parte = ok(await montar().order('created_at').order('id').range(de, de + 999))
    linhas.push(...parte)
    if (parte.length < 1000) return linhas
  }
}

const daObraAtual = (tabela) => todas(() => banco().from(tabela).select('*').eq('obra_id', exigirObra()))
// Nome de quem lançou: o Mestre não lê o perfil dos colegas (só o nome, por esta função do banco).
async function nomes() {
  const lista = ok(await banco().rpc('nomes_visiveis'))
  return (id) => lista.find((p) => p.id === id)?.nome ?? '—'
}
const comAutor = async (lista) => {
  const nomeDe = await nomes()
  return lista.map((x) => ({ ...x, autor_nome: nomeDe(x.autor_id) }))
}

function exigirEngenheiro(quem, oQue = 'cadastra obras') {
  if (!ehEngenheiro(quem)) throw new Error(`Só o Engenheiro ${oQue}.`)
}

// ---------- sessão ----------
export const contasDeExemplo = () => null

export async function obterPerfil(id) {
  const { data, error } = await banco().from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data?.ativo ? data : null
}

// O Supabase guarda a sessão sozinho no navegador; o id guardado pelo app não importa aqui.
export async function retomarSessao() {
  try {
    const { data } = await banco().auth.getSession()
    const id = data.session?.user?.id
    if (!id) return null
    const p = await obterPerfil(id)
    if (!p) await banco().auth.signOut()
    return p
  } catch (_e) {
    return null
  }
}

export const sairDaConta = async () => { await banco().auth.signOut() }

export const entrar = ({ email, senha }) => responder(async () => {
  const { data, error } = await banco().auth.signInWithPassword({ email: normalizarEmail(email), password: senha })
  if (error) {
    if (error.code === 'email_not_confirmed') throw new Error('Confirme seu email primeiro: abra o link que enviamos para a sua caixa de entrada.')
    if (error.status === 400) throw new Error('Email ou senha errados.')
    throw error
  }
  const p = ok(await banco().from('profiles').select('*').eq('id', data.user.id).maybeSingle())
  if (!p?.ativo) {
    await banco().auth.signOut()
    throw new Error('Esta conta foi desativada. Fale com o engenheiro.')
  }
  return p
})

export const criarConta = (valores) => responder(async () => {
  if (Object.keys(validar(CAMPOS_CRIAR_CONTA, valores)).length) throw new Error('Confira os campos marcados.')
  const { data, error } = await banco().auth.signUp({
    email: normalizarEmail(valores.email),
    password: valores.senha,
    options: { data: { nome: valores.nome.trim() } },
  })
  if (error) {
    if (error.code === 'user_already_exists') throw new Error('Já existe uma conta com este email. Use Entrar.')
    if (error.code === 'weak_password') throw new Error('Senha fraca. Use pelo menos 8 caracteres.')
    if (/failed to fetch/i.test(error.message)) throw error
    throw new Error('Não foi possível criar sua conta agora. Tente de novo em alguns minutos.')
  }
  // Com confirmação de email ligada, o Supabase não devolve sessão: a conta existe,
  // mas só entra depois do link. Email repetido volta sem identidades (proteção do Supabase).
  if (!data.user?.identities?.length) throw new Error('Já existe uma conta com este email. Use Entrar.')
  if (!data.session) throw new Error('Conta criada. Abra o link que enviamos para o seu email e depois clique em Entrar.')
  return ok(await banco().from('profiles').select('*').eq('id', data.user.id).single())
})

// ---------- obras ----------
// Todas as obras que a pessoa enxerga (a RLS decide: Engenheiro todas, Mestre as dele).
export const listarObras = () => responder(() => todas(() => banco().from('obras').select('*')))

async function obraDoCadastro(id) {
  const o = ok(await banco().from('obras').select('*').eq('id', id).eq('interna', false).maybeSingle())
  if (!o) throw new Error('Obra não encontrada.')
  return o
}

const obraIdsDe = async (profileId) =>
  (await todas(() => banco().from('membros').select('id, obra_id').eq('profile_id', profileId))).map((m) => m.obra_id)

// Nova obra (id = null) ou edição. Quem cria entra nela (gatilho no banco).
export const salvarObra = (quem, id, valores) => responder(async () => {
  exigirEngenheiro(quem)
  if (Object.keys(validar(CAMPOS_OBRA, valores)).length) throw new Error('Confira os campos marcados.')
  const campos = Object.fromEntries(CAMPOS_OBRA.map((c) => [c.nome, String(valores[c.nome] ?? '').trim() || null]))
  campos.codigo = campos.codigo.toUpperCase()
  if (id) {
    await obraDoCadastro(id)
    return ok(await banco().from('obras').update(campos).eq('id', id).select().single())
  }
  return ok(await banco().from('obras').insert({ ...campos, interna: false }).select().single())
})

export const excluirObra = (quem, id) => responder(async () => {
  exigirEngenheiro(quem)
  await obraDoCadastro(id)
  // Obra com frente, diário, nota… a chave estrangeira recusa (vira MSG_OBRA_COM_REGISTROS).
  const apagadas = ok(await banco().from('obras').delete().eq('id', id).select('id'))
  if (!apagadas.length) throw new Error('Obra não encontrada.')
  return { id }
})

export const adicionarNaObra = (quem, obraId, profileId) => responder(async () => {
  exigirEngenheiro(quem)
  await obraDoCadastro(obraId)
  const p = ok(await banco().from('profiles').select('*').eq('id', profileId).maybeSingle())
  if (!p || !podeEntrarNaObra(p, await obraIdsDe(profileId), obraId)) throw new Error('Esta pessoa não pode ser adicionada a esta obra.')
  ok(await banco().from('membros').insert({ obra_id: obraId, profile_id: profileId }))
  return { obraId, profileId }
})

export const removerDaObra = (quem, obraId, profileId) => responder(async () => {
  exigirEngenheiro(quem)
  const p = ok(await banco().from('profiles').select('*').eq('id', profileId).maybeSingle())
  if (!p) throw new Error('Pessoa não encontrada.')
  const obras = await todas(() => banco().from('obras').select('id, interna, situacao'))
  const abertas = obrasDoSeletor(obras).map((o) => o.id)
  const erro = erroAoRemover(p, (await obraIdsDe(profileId)).filter((id) => abertas.includes(id)), obraId)
  if (erro) throw new Error(erro)
  ok(await banco().from('membros').delete().eq('obra_id', obraId).eq('profile_id', profileId))
  return { obraId, profileId }
})

// ---------- frentes ----------
export const listarFrentes = () => responder(() => daObraAtual('frentes'))

async function frenteDaObra(id, colunas = '*') {
  const f = ok(await banco().from('frentes').select(colunas).eq('id', id).eq('obra_id', exigirObra()).maybeSingle())
  if (!f) throw new Error('Esta frente não é da obra escolhida.')
  return f
}

export const obterFrente = (id) => responder(async () => {
  const f = await frenteDaObra(id)
  return { ...f, marcada_pronta_por_nome: f.marcada_pronta_por ? (await nomes())(f.marcada_pronta_por) : null }
})

const gravarFrente = async (id, campos) =>
  ok(await banco().from('frentes').update(campos).eq('id', id).eq('obra_id', exigirObra()).select().single())

// Nova frente (id = null) ou edição. A obra é sempre a escolhida no topo.
export const salvarFrente = (quem, id, valores) => responder(async () => {
  exigirEngenheiro(quem, 'cadastra e edita frentes')
  const anterior = id ? await frenteDaObra(id) : null
  if (anterior && !podeEditarFrente(anterior)) throw new Error('Esta frente aguarda aprovação. Aprove ou devolva antes de editar.')
  if (Object.keys(validar(CAMPOS_FRENTE, valores)).length) throw new Error('Confira os campos marcados.')
  if (anterior) return gravarFrente(id, camposDaFrente(valores, anterior, hoje()))
  return ok(await banco().from('frentes').insert({ obra_id: exigirObra(), ...camposDaFrente(valores, null, hoje()) }).select().single())
})

export const excluirFrente = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'exclui frentes')
  await frenteDaObra(id)
  // Frente com diário, foto, material, contrato ou nota: a chave estrangeira recusa.
  const apagadas = ok(await banco().from('frentes').delete().eq('id', id).eq('obra_id', exigirObra()).select('id'))
  if (!apagadas.length) throw new Error('Esta frente não é da obra escolhida.')
  return { id }
})

export const aprovarFrente = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'aprova frentes')
  const f = await frenteDaObra(id)
  if (f.situacao !== 'Aguardando aprovação') throw new Error('Esta frente não está aguardando aprovação.')
  return gravarFrente(id, { situacao: 'Concluída', percentual: 100, data_conclusao: hoje(), comentario_devolucao: null })
})

export const devolverFrente = (quem, id, comentario) => responder(async () => {
  exigirEngenheiro(quem, 'devolve frentes')
  if (!comentario?.trim()) throw new Error('Escreva o motivo da devolução.')
  const f = await frenteDaObra(id)
  if (f.situacao !== 'Aguardando aprovação') throw new Error('Esta frente não está aguardando aprovação.')
  return gravarFrente(id, { situacao: 'Em andamento', comentario_devolucao: comentario.trim(), marcada_pronta_por: null, marcada_pronta_em: null })
})

// O Mestre não edita frente: a função do banco só muda a situação (e confere a obra).
export const marcarFrentePronta = (quem, id) => responder(async () => {
  if (!ehEngenheiro(quem) && !ehMestre(quem)) throw new Error('Sua conta não pode marcar frentes como prontas.')
  await frenteDaObra(id)
  ok(await banco().rpc('marcar_frente_pronta', { p_frente: id }))
  return frenteDaObra(id)
})

// ---------- diário e fotos ----------
export const listarRegistros = () => responder(async () => comAutor(await daObraAtual('registros_diario')))
export const listarFotos = () => responder(async () => comAutor(await daObraAtual('fotos')))

// ---------- materiais ----------
export const listarMateriais = () => responder(() => daObraAtual('materiais'))

// "Entregue" passa pela função do banco (é o que o Mestre pode); o resto, só o Engenheiro.
export const mudarSituacaoMaterial = (id, situacao) => responder(async () => {
  const m = ok(await banco().from('materiais').select('id').eq('id', id).eq('obra_id', exigirObra()).maybeSingle())
  if (!m) throw new Error('Este material não é da obra escolhida.')
  if (situacao === 'Entregue') ok(await banco().rpc('marcar_material_entregue', { p_material: id }))
  else {
    const mudou = ok(await banco().from('materiais').update({ situacao }).eq('id', id).eq('obra_id', exigirObra()).select('id'))
    if (!mudou.length) throw new Error('Sua conta não tem permissão para isso.')
  }
  return ok(await banco().from('materiais').select('*').eq('id', id).single())
})

// ---------- dinheiro (só o Engenheiro chega nas telas que chamam isto; a RLS garante) ----------
export const listarContratos = () => responder(() => daObraAtual('contratos_empreiteiros'))
export const listarLancamentos = () => responder(() => daObraAtual('lancamentos'))

// Um contrato por frente (é dele que sai o "falta pagar" do empreiteiro).
export const salvarContrato = (quem, frenteId, valores) => responder(async () => {
  exigirEngenheiro(quem, 'cadastra contratos')
  if (Object.keys(validar(CAMPOS_CONTRATO, valores)).length) throw new Error('Confira os campos marcados.')
  const f = await frenteDaObra(frenteId)
  return ok(await banco().from('contratos_empreiteiros').insert({
    obra_id: f.obra_id, frente_id: f.id,
    empreiteiro: valores.empreiteiro.trim(), valor_contratado: paraNumero(valores.valor_contratado),
    observacao: String(valores.observacao ?? '').trim() || null,
  }).select().single())
})

export const marcarParcelaRecebida = (id, { data, forma_pagamento }) => responder(async () => {
  if (!data || !forma_pagamento) throw new Error('Informe a data e a forma de pagamento.')
  const l = ok(await banco().from('lancamentos').update({ situacao: 'Realizado', data, forma_pagamento })
    .eq('id', id).eq('obra_id', exigirObra()).select().maybeSingle())
  if (!l) throw new Error('Esta parcela não é da obra escolhida.')
  return l
})

// ---------- comparativo entre obras ----------
// A ÚNICA busca que junta obras, porque o Caixa geral é, por definição,
// um comparativo. Nenhuma outra função daqui pode devolver duas obras.
export const listarCaixaGeral = () => responder(async () => ({
  obras: await todas(() => banco().from('obras').select('*')),
  lancamentos: await todas(() => banco().from('lancamentos').select('*')),
}))

// ---------- pessoas ----------
export const listarPessoas = () => responder(async () => {
  const [profiles, membros, obras] = await Promise.all([
    todas(() => banco().from('profiles').select('*')),
    todas(() => banco().from('membros').select('id, obra_id, profile_id')),
    todas(() => banco().from('obras').select('id, nome')),
  ])
  return profiles.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p) => {
    const obraIds = membros.filter((m) => m.profile_id === p.id).map((m) => m.obra_id)
    return { ...p, obra_ids: obraIds, obras: obraIds.map((id) => obras.find((o) => o.id === id)?.nome).filter(Boolean) }
  })
})

async function pessoaGerenciavel(quem, id) {
  const p = ok(await banco().from('profiles').select('*').eq('id', id).maybeSingle())
  if (!podeGerenciar(quem, p)) throw new Error('Você não pode mudar o acesso desta pessoa.')
  return p
}

// Liberar e Editar são a mesma coisa: perfil + obras (o Mestre só vê as obras marcadas).
// shortcut: perfil e obras gravam em passos separados (não é uma transação só); se a rede cair no
// meio, a tela avisa o erro e o Engenheiro salva de novo. Virar uma função do banco se isso incomodar.
export const salvarAcesso = (quem, id, { role, obraIds }) => responder(async () => {
  await pessoaGerenciavel(quem, id)
  const atuais = await obraIdsDe(id)
  const obras = await todas(() => banco().from('obras').select('id, interna, situacao'))
  const novo = obrasDoAcesso(atuais, role, obraIds, obrasDoSeletor(obras).map((o) => o.id))
  if (novo.erro) throw new Error(novo.erro)
  const p = ok(await banco().from('profiles').update({ role }).eq('id', id).select().single())
  const sair = atuais.filter((oid) => !novo.obraIds.includes(oid))
  const entrar = novo.obraIds.filter((oid) => !atuais.includes(oid))
  if (sair.length) ok(await banco().from('membros').delete().eq('profile_id', id).in('obra_id', sair))
  if (entrar.length) ok(await banco().from('membros').insert(entrar.map((obra_id) => ({ obra_id, profile_id: id }))))
  return p
})

// Desativar não apaga: o que a pessoa lançou continua com o nome dela.
export const definirAtivo = (quem, id, ativo) => responder(async () => {
  await pessoaGerenciavel(quem, id)
  return ok(await banco().from('profiles').update({ ativo: !!ativo }).eq('id', id).select().single())
})

export const salvarMeuNome = (quem, nome) => responder(async () => {
  if (!nome?.trim()) throw new Error('Preencha o nome.')
  const p = ok(await banco().from('profiles').update({ nome: nome.trim() }).eq('id', quem.id).select().maybeSingle())
  if (!p) throw new Error('Conta não encontrada. Saia e entre de novo.')
  return p
})
