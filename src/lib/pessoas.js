// Regras de conta e de acesso. Sem React e sem banco: o teste alcança.
// (A garantia de verdade será a RLS do banco; isto decide o que a tela oferece.)
import { ehEngenheiro } from './permissoes.js'
import { PAPEIS_COM_OBRA, PAPEIS_DE_ACESSO } from './vocabulario.js'

export const normalizarEmail = (email) => String(email ?? '').trim().toLowerCase()

export const emailEmUso = (profiles, email) =>
  profiles.some((p) => normalizarEmail(p.email) === normalizarEmail(email))

// A primeira conta do sistema já nasce Engenheiro; sem isso ninguém libera ninguém.
export const papelDaNovaConta = (profiles) => (profiles.length ? 'Aguardando' : 'Engenheiro')

// Só o Engenheiro mexe no acesso dos outros, e ninguém mexe no próprio.
export const podeGerenciar = (quem, alvo) => ehEngenheiro(quem) && !!alvo && quem.id !== alvo.id

// Mestre e Cliente só entram nas obras marcadas; os outros perfis veem todas.
export const precisaDeObra = (role) => PAPEIS_COM_OBRA.includes(role)

// O que o perfil pode, numa linha, para quem está liberando a conta escolher certo.
export const DESCRICAO_DO_PAPEL = {
  Engenheiro: 'Vê e mexe em tudo, de todas as obras, inclusive o dinheiro e as pessoas.',
  Mestre: 'Lança o diário e pede material nas obras marcadas. Nunca vê dinheiro.',
  Financeiro: 'Vê e lança o dinheiro de todas as obras (notas, parcelas, Caixa geral, Cadastros). Não mexe no canteiro.',
  Contador: 'Só olha o dinheiro de todas as obras (Financeiro, DRE, Caixa geral). Não grava nada.',
  Cliente: 'Só olha as obras marcadas: frentes, prazo e o diário com fotos. Nunca vê dinheiro.',
}

// Na lista de Pessoas: em que obras a pessoa entra.
export const obrasDaPessoa = (p) => (precisaDeObra(p.role) ? p.obras.join(' · ') || 'nenhuma obra' : 'todas as obras')

// Liberar ou editar alguém: a mensagem do que está errado, ou null.
export function erroDeAcesso(role, obraIds) {
  if (!PAPEIS_DE_ACESSO.includes(role)) return 'Escolha o perfil.'
  if (precisaDeObra(role) && !obraIds?.length) return `Marque pelo menos uma obra para o ${role}.`
  return null
}

// Em quais obras a pessoa fica depois de salvar o acesso.
// atuais: as obras dela hoje · marcadas: o que a tela mandou · abertas: as que a tela oferece.
// Quem vê todas as obras (Engenheiro, Financeiro, Contador): os vínculos (ex.: obra que criou) não mudam.
// Obra concluída ou interna não aparece para marcar, então o vínculo antigo com ela fica
// e não conta como "obra do Mestre/Cliente".
export function obrasDoAcesso(atuais, role, marcadas, abertas) {
  if (!precisaDeObra(role)) return { erro: erroDeAcesso(role, []), obraIds: atuais }
  const escolhidas = [...new Set(marcadas)].filter((id) => abertas.includes(id))
  const fora = atuais.filter((id) => !abertas.includes(id))
  return { erro: erroDeAcesso(role, escolhidas), obraIds: [...fora, ...escolhidas] }
}
