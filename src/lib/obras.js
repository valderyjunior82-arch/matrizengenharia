// Regras do cadastro de obras. Sem React e sem banco: o teste alcança.
import { SITUACOES_OBRA } from './vocabulario.js'
import { precisaDeObra } from './pessoas.js'

// Lista da tela Obras: sem a interna "Empresa", ativas primeiro (na ordem do vocabulário).
export const obrasDoCadastro = (obras) =>
  obras.filter((o) => !o.interna).sort((a, b) => SITUACOES_OBRA.indexOf(a.situacao) - SITUACOES_OBRA.indexOf(b.situacao))

const normalizarCodigo = (c) => String(c ?? '').trim().toUpperCase()

// Dois códigos iguais confundem o seletor. `exceto` = a própria obra, na edição.
export const codigoEmUso = (obras, codigo, exceto = null) =>
  obras.some((o) => o.id !== exceto && normalizarCodigo(o.codigo) === normalizarCodigo(codigo))

// Excluir só obra limpa; com qualquer registro, o caminho é marcar Concluída.
// tabelas: { frentes, registros, ... } — toda lista com obra_id que não pode ficar órfã.
export const obraTemRegistros = (obraId, tabelas) =>
  Object.values(tabelas).some((linhas) => linhas.some((l) => l.obra_id === obraId))

export const MSG_OBRA_COM_REGISTROS = 'Esta obra já tem registros. Marque como Concluída em vez de excluir.'

// Quem pode entrar numa obra pelo botão "Adicionar pessoa": Mestre ou Cliente ativo que ainda não está nela.
// (Engenheiro, Financeiro e Contador já veem todas as obras; a conta Aguardando é liberada em Pessoas.)
export const podeEntrarNaObra = (pessoa, obraIdsDela, obraId) =>
  pessoa.ativo && precisaDeObra(pessoa.role) && !obraIdsDela.includes(obraId)

// A lista "Quem está nesta obra": Mestres e Clientes dela (os outros perfis já veem todas).
// pessoas: como listarPessoas devolve, com obra_ids.
export const pessoasDaObra = (pessoas, obraId) =>
  pessoas.filter((p) => precisaDeObra(p.role) && p.obra_ids.includes(obraId))

// Tirar um Mestre ou Cliente da obra. Devolve a mensagem do impedimento, ou null.
// obrasAbertasDele: as obras de trabalho (não concluídas) em que ele está hoje.
export function erroAoRemover(pessoa, obrasAbertasDele, obraId) {
  if (!precisaDeObra(pessoa.role)) return `O ${pessoa.role} vê todas as obras; não há o que remover.`
  // Desativado já não entra: tirar da última obra não deixa ninguém sem acesso.
  if (!pessoa.ativo || !obrasAbertasDele.includes(obraId)) return null
  if (obrasAbertasDele.length === 1) return `Esta é a única obra de ${pessoa.nome}. Para tirar o acesso, use Desativar em Pessoas.`
  return null
}
