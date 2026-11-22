// Regras de conta e de acesso. Sem React e sem banco: o teste alcança.
// (A garantia de verdade será a RLS do banco; isto decide o que a tela oferece.)
import { ehEngenheiro } from './permissoes.js'
import { PAPEIS_DE_ACESSO } from './vocabulario.js'

export const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase()

export const emailEmUso = (profiles, email) =>
  profiles.some((p) => normalizarEmail(p.email) === normalizarEmail(email))

// A primeira conta do sistema já nasce Engenheiro; sem isso ninguém libera ninguém.
export const papelDaNovaConta = (profiles) => (profiles.length ? 'Aguardando' : 'Engenheiro')

// Só o Engenheiro mexe no acesso dos outros, e ninguém mexe no próprio.
export const podeGerenciar = (quem, alvo) => ehEngenheiro(quem) && !!alvo && quem.id !== alvo.id

// Liberar ou editar alguém: a mensagem do que está errado, ou null.
export function erroDeAcesso(role, obraIds) {
  if (!PAPEIS_DE_ACESSO.includes(role)) return 'Escolha o perfil: Engenheiro ou Mestre.'
  if (role === 'Mestre' && !obraIds?.length) return 'Marque pelo menos uma obra para o Mestre.'
  return null
}

// Em quais obras a pessoa fica depois de salvar o acesso.
// atuais: as obras dela hoje · marcadas: o que a tela mandou · abertas: as que a tela oferece.
// O Engenheiro vê todas as obras: os vínculos dele (ex.: obra que criou) não mudam.
// Obra concluída ou interna não aparece para marcar, então o vínculo antigo com ela fica
// e não conta como "obra do Mestre".
export function obrasDoAcesso(atuais, role, marcadas, abertas) {
  if (role !== 'Mestre') return { erro: erroDeAcesso(role, []), obraIds: atuais }
  const escolhidas = [...new Set(marcadas)].filter((id) => abertas.includes(id))
  const fora = atuais.filter((id) => !abertas.includes(id))
  return { erro: erroDeAcesso(role, escolhidas), obraIds: [...fora, ...escolhidas] }
}
