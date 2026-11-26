// Fornecedores: o cadastro (tabela `fornecedores`) mais os nomes já digitados em notas e materiais.
// A nota guarda o nome em texto, então cadastrar, renomear ou excluir aqui não mexe em nota antiga.
import { CAMPOS_FORNECEDOR, validar } from './formularios.js'

export const MSG_NOME_EM_USO = 'Já existe um fornecedor com este nome.'

// "Leroy" e "leroy " são o mesmo fornecedor (o banco tem a mesma regra: fornecedores_nome_unico).
const chave = (nome) => String(nome ?? '').trim().toLowerCase()

// Nomes já usados, sem repetir, em ordem alfabética. `notas` conta só lançamentos (têm `tipo`).
export function fornecedoresDe(listas) {
  const vistos = new Map()
  for (const l of listas) {
    const nome = l.fornecedor?.trim()
    if (!nome) continue
    const v = vistos.get(chave(nome)) ?? { nome, notas: 0 }
    if (l.tipo) v.notas++
    vistos.set(chave(nome), v)
  }
  return [...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// A lista da tela: cadastrados e usados juntos, um por nome.
// `cadastro` = a linha da tabela (null = só digitado numa nota, ainda sem cadastro).
export function juntarFornecedores(cadastro, usados) {
  const porChave = new Map(usados.map((u) => [chave(u.nome), { nome: u.nome, notas: u.notas, cadastro: null }]))
  for (const c of cadastro) porChave.set(chave(c.nome), { nome: c.nome, notas: porChave.get(chave(c.nome))?.notas ?? 0, cadastro: c })
  return [...porChave.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export const nomeEmUso = (cadastro, nome, idAtual = null) => cadastro.some((c) => c.id !== idAtual && chave(c.nome) === chave(nome))

// Formulário → linha do banco: texto aparado, vazio vira null.
export function camposDoFornecedor(valores) {
  if (Object.keys(validar(CAMPOS_FORNECEDOR, valores)).length) return { erro: 'Preencha o nome do fornecedor.' }
  return { campos: Object.fromEntries(CAMPOS_FORNECEDOR.map((c) => [c.nome, String(valores[c.nome] ?? '').trim() || null])) }
}
