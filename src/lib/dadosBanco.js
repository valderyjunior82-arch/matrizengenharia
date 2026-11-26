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
import { CAMPOS_CONTRATO, CAMPOS_CRIAR_CONTA, CAMPOS_FRENTE, CAMPOS_OBRA, paraDinheiro, validar } from './formularios.js'
import { camposDaFrente, podeEditarFrente } from './frentes.js'
import { erroAoRemover, podeEntrarNaObra } from './obras.js'
import { ehEngenheiro, ehMestre, podeEditarRegistro } from './permissoes.js'
import { MSG_SEM_PERMISSAO, traduzirErro } from './errosBanco.js'
import { caminhoFoto, camposDoRegistro } from './diario.js'
import { camposDoMaterial, erroAoMudarSituacao } from './materiais.js'
import { camposDaNota, camposDaParcela, camposDoMovimento, camposDoRecebimento } from './financeiro.js'
import { camposDoFornecedor, fornecedoresDe, juntarFornecedores } from './fornecedores.js'

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

const FOTOS = 'fotos-obra'
// As fotos são privadas: cada uma abre por um link que vale 1 hora.
// Foto sem arquivo (as de exemplo da carga) fica com url null e a tela mostra o quadro cinza.
export const listarFotos = () => responder(async () => {
  const fotos = await comAutor(await daObraAtual('fotos'))
  const caminhos = fotos.map((f) => f.caminho).filter(Boolean)
  const links = caminhos.length ? ok(await banco().storage.from(FOTOS).createSignedUrls(caminhos, 3600)) : []
  return fotos.map((f) => ({ ...f, url: links.find((l) => l.path === f.caminho)?.signedUrl ?? null }))
})

async function registroDaObra(id) {
  const r = ok(await banco().from('registros_diario').select('*').eq('id', id).eq('obra_id', exigirObra()).maybeSingle())
  if (!r) throw new Error('Este registro não é da obra escolhida.')
  return r
}

// Novo registro (id = null, sempre com a data de hoje) ou edição (só texto e %).
// `fotos` = arquivos JPEG novos ({ blob }), que entram com a data do registro.
// Ordem: arquivos → registro → linhas das fotos (de uma vez). Os arquivos sobem antes porque
// o registro novo já mexe na frente (gatilho do banco): se uma foto falhar, nada foi gravado
// e os arquivos que subiram são removidos.
export const salvarRegistro = (quem, id, tipo, valores, fotos = []) => responder(async () => {
  if (!ehEngenheiro(quem) && !ehMestre(quem)) throw new Error('Sua conta não pode lançar no diário.')
  const obraId = exigirObra()
  const anterior = id ? await registroDaObra(id) : null
  if (anterior && !podeEditarRegistro(quem, anterior, hoje())) throw new Error('Este registro não pode mais ser editado por você.')
  const { campos, erro } = camposDoRegistro(anterior?.tipo ?? tipo, anterior ? { ...valores, frente_id: anterior.frente_id } : valores)
  if (erro) throw new Error(erro)
  const registroId = anterior?.id ?? crypto.randomUUID()
  const data = anterior?.data ?? hoje()
  const ambiente = campos.frente_id ? (await frenteDaObra(campos.frente_id, 'ambiente')).ambiente : null

  const linhas = []
  let inserido = false
  try {
    for (const foto of fotos) {
      const fotoId = crypto.randomUUID()
      const caminho = caminhoFoto(obraId, data, fotoId)
      ok(await banco().storage.from(FOTOS).upload(caminho, foto.blob, { contentType: 'image/jpeg' }))
      linhas.push({ id: fotoId, obra_id: obraId, registro_id: registroId, frente_id: campos.frente_id, ambiente, data, caminho, autor_id: quem.id })
    }
    const r = anterior
      ? ok(await banco().from('registros_diario').update({ texto: campos.texto, percentual_novo: campos.percentual_novo })
        .eq('id', id).eq('obra_id', obraId).select().single())
      : ok(await banco().from('registros_diario').insert({ id: registroId, ...campos, obra_id: obraId, data, autor_id: quem.id }).select().single())
    inserido = !anterior
    if (linhas.length) ok(await banco().from('fotos').insert(linhas))
    return r
  } catch (e) {
    // Registro novo que entrou sem as fotos sai de novo: senão a tela diz "não salvou", a pessoa
    // tenta outra vez e o registro duplica. (O % que o gatilho já pôs na frente fica.)
    if (inserido) await banco().from('registros_diario').delete().eq('id', registroId)
    if (linhas.length) await banco().storage.from(FOTOS).remove(linhas.map((l) => l.caminho))
    throw e
  }
})

// Apaga o registro (as linhas das fotos vão junto, pela chave do banco) e depois os arquivos.
export const excluirRegistro = (quem, id) => responder(async () => {
  const r = await registroDaObra(id)
  if (!podeEditarRegistro(quem, r, hoje())) throw new Error('Este registro não pode mais ser apagado por você.')
  const caminhos = (await todas(() => banco().from('fotos').select('id, caminho').eq('registro_id', id))).map((f) => f.caminho).filter(Boolean)
  const apagados = ok(await banco().from('registros_diario').delete().eq('id', id).eq('obra_id', exigirObra()).select('id'))
  if (!apagados.length) throw new Error(MSG_SEM_PERMISSAO)
  // shortcut: se apagar o arquivo falhar, ele fica sem ninguém apontar (ninguém vê); limpar à mão se o Storage encher.
  if (caminhos.length) await banco().storage.from(FOTOS).remove(caminhos)
  return { id }
})

// ---------- materiais ----------
export const listarMateriais = () => responder(() => daObraAtual('materiais'))

async function materialDaObra(id) {
  const m = ok(await banco().from('materiais').select('*').eq('id', id).eq('obra_id', exigirObra()).maybeSingle())
  if (!m) throw new Error('Este material não é da obra escolhida.')
  return m
}

// Novo (id = null) ou edição. Mestre só cria pedido (a RLS só deixa "Aguardando aprovação"); editar, só o Engenheiro.
export const salvarMaterial = (quem, id, valores) => responder(async () => {
  if (id) exigirEngenheiro(quem, 'edita materiais')
  const atual = id ? await materialDaObra(id) : null
  const { campos, erro } = camposDoMaterial(quem, valores, atual)
  if (erro) throw new Error(erro)
  if (id) {
    return ok(await banco().from('materiais').update(campos).eq('id', id).eq('obra_id', exigirObra()).select().single())
  }
  return ok(await banco().from('materiais').insert({ obra_id: exigirObra(), ...campos }).select().single())
})

// Material com nota ligada: a chave estrangeira recusa (errosBanco traduz).
export const excluirMaterial = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'exclui materiais')
  await materialDaObra(id)
  const apagados = ok(await banco().from('materiais').delete().eq('id', id).eq('obra_id', exigirObra()).select('id'))
  if (!apagados.length) throw new Error(MSG_SEM_PERMISSAO)
  return { id }
})

// "Entregue" passa pela função do banco (é o que o Mestre pode); o resto, só o Engenheiro.
export const mudarSituacaoMaterial = (quem, id, situacao) => responder(async () => {
  const m = await materialDaObra(id)
  const erro = erroAoMudarSituacao(quem, m, situacao)
  if (erro) throw new Error(erro)
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
    empreiteiro: valores.empreiteiro.trim(), valor_contratado: paraDinheiro(valores.valor_contratado),
    observacao: String(valores.observacao ?? '').trim() || null,
  }).select().single())
})

export const marcarParcelaRecebida = (id, valores) => responder(async () => {
  const { campos, erro } = camposDoRecebimento(valores)
  if (erro) throw new Error(erro)
  const l = ok(await banco().from('lancamentos').update(campos)
    .eq('id', id).eq('obra_id', exigirObra()).select().maybeSingle())
  if (!l) throw new Error('Esta parcela não é da obra escolhida.')
  return l
})

const COMPROVANTES = 'comprovantes'

const idDaEmpresa = async () => ok(await banco().from('obras').select('id').eq('interna', true).limit(1).single()).id

// Lançamento da obra do seletor ou da "Empresa (sem obra)": a Empresa não entra no seletor,
// então a nota dela abre de qualquer obra. Só ela; outra obra de cliente continua fechada.
async function lancamentoDaObra(id) {
  const obras = [exigirObra(), await idDaEmpresa()]
  const l = ok(await banco().from('lancamentos').select('*').eq('id', id).in('obra_id', obras).maybeSingle())
  if (!l) throw new Error('Este lançamento não existe mais nesta obra.')
  return l
}

export const obterLancamento = (id) => responder(() => lancamentoDaObra(id))

// Nota nova (id = null) ou edição. Nota nova pode ir para outra obra ou para a "Empresa"
// (valores.obra_id); edição fica na obra dela. `foto` = { blob } JPEG, opcional.
// Ordem: arquivo → linha. Se a linha falhar, o arquivo que subiu é removido.
export const salvarLancamento = (quem, id, valores, foto = null) => responder(async () => {
  exigirEngenheiro(quem, 'lança notas')
  const anterior = id ? await lancamentoDaObra(id) : null
  const { campos, erro } = camposDaNota(valores, exigirObra(), anterior)
  if (erro) throw new Error(erro)
  const obraId = anterior?.obra_id ?? valores.obra_id
  if (!obraId) throw new Error('Escolha a obra.')
  const caminho = foto ? `${obraId}/${crypto.randomUUID()}.jpg` : null
  if (caminho) ok(await banco().storage.from(COMPROVANTES).upload(caminho, foto.blob, { contentType: 'image/jpeg' }))
  try {
    const linha = caminho ? { ...campos, comprovante_caminho: caminho } : campos
    const l = anterior
      ? ok(await banco().from('lancamentos').update(linha).eq('id', id).eq('obra_id', obraId).select().single())
      : ok(await banco().from('lancamentos').insert({ ...linha, obra_id: obraId, autor_id: quem.id }).select().single())
    // Foto trocada: a antiga sai. shortcut: se apagar falhar, o arquivo velho fica sem ninguém apontar.
    if (caminho && anterior?.comprovante_caminho) await banco().storage.from(COMPROVANTES).remove([anterior.comprovante_caminho])
    return l
  } catch (e) {
    if (caminho) await banco().storage.from(COMPROVANTES).remove([caminho])
    throw e
  }
})

export const salvarParcela = (quem, valores) => responder(async () => {
  exigirEngenheiro(quem, 'cadastra parcelas')
  const { campos, erro } = camposDaParcela(valores)
  if (erro) throw new Error(erro)
  return ok(await banco().from('lancamentos').insert({ ...campos, obra_id: exigirObra(), autor_id: quem.id }).select().single())
})

// Apaga a linha e depois a foto da nota.
export const excluirLancamento = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'exclui lançamentos')
  const l = await lancamentoDaObra(id)
  const apagados = ok(await banco().from('lancamentos').delete().eq('id', id).eq('obra_id', l.obra_id).select('id'))
  if (!apagados.length) throw new Error(MSG_SEM_PERMISSAO)
  if (l.comprovante_caminho) await banco().storage.from(COMPROVANTES).remove([l.comprovante_caminho])
  return { id }
})

// A foto da nota abre por um link que vale 1 hora. Nota de exemplo sem arquivo: null.
export const linkComprovante = (caminho) => responder(async () => {
  const { data, error } = await banco().storage.from(COMPROVANTES).createSignedUrl(caminho, 3600)
  if (error) return null
  return data.signedUrl
})

// COMPARATIVO entre obras (só nomes): o cadastro mais os nomes já usados em notas e materiais de TODAS as obras.
// Junta obras de propósito, mas devolve só nome e quantidade de notas, sem valor.
export const listarFornecedores = () => responder(async () => juntarFornecedores(
  await todas(() => banco().from('fornecedores').select('*')),
  fornecedoresDe([
    ...await todas(() => banco().from('lancamentos').select('id, fornecedor, tipo')),
    ...await todas(() => banco().from('materiais').select('id, fornecedor')),
  ]),
))

// Nome repetido: o índice fornecedores_nome_unico recusa, e errosBanco.js traduz.
export const salvarFornecedor = (quem, id, valores) => responder(async () => {
  exigirEngenheiro(quem, 'cadastra fornecedores')
  const { campos, erro } = camposDoFornecedor(valores)
  if (erro) throw new Error(erro)
  const f = id
    ? ok(await banco().from('fornecedores').update(campos).eq('id', id).select().maybeSingle())
    : ok(await banco().from('fornecedores').insert(campos).select().single())
  if (!f) throw new Error('Este fornecedor não existe mais.')
  return f
})

// Nota antiga guarda o nome em texto: excluir o cadastro não mexe nela.
export const excluirFornecedor = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'cadastra fornecedores')
  const apagados = ok(await banco().from('fornecedores').delete().eq('id', id).select('id'))
  if (!apagados.length) throw new Error(MSG_SEM_PERMISSAO)
  return { id }
})

// ---------- comparativo entre obras ----------
// As buscas que juntam obras, de propósito: esta (Caixa geral, com o saldo por banco)
// e listarFornecedores (só nomes). Nenhuma outra função daqui pode devolver duas obras.
export const listarCaixaGeral = () => responder(async () => ({
  obras: await todas(() => banco().from('obras').select('*')),
  lancamentos: await todas(() => banco().from('lancamentos').select('*')),
  movimentos: await todas(() => banco().from('movimentos_banco').select('*')),
}))

// Saldo inicial e transferência entre bancos: da empresa, não de obra (vão na obra interna;
// a política do banco recusa qualquer outra).
export const salvarMovimentoBanco = (quem, tipo, valores) => responder(async () => {
  exigirEngenheiro(quem, 'mexe no saldo dos bancos')
  const { campos, erro } = camposDoMovimento(tipo, valores)
  if (erro) throw new Error(erro)
  return ok(await banco().from('movimentos_banco').insert({ ...campos, obra_id: await idDaEmpresa(), autor_id: quem.id }).select().single())
})

export const excluirMovimentoBanco = (quem, id) => responder(async () => {
  exigirEngenheiro(quem, 'mexe no saldo dos bancos')
  const apagados = ok(await banco().from('movimentos_banco').delete().eq('id', id).select('id'))
  if (!apagados.length) throw new Error(MSG_SEM_PERMISSAO)
  return { id }
})

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
