// Os campos de cada formulário, tirados do PRD-FRONTEND.md, e a validação deles.
// O componente <Formulario> desenha a partir daqui; a regra de "o que é válido"
// mora aqui para o teste alcançar.
//
// tipo: texto | textoLongo | email | senha | numero | dinheiro | data | lista
// naoAntesDe: nome de outro campo data; esta data não pode ser anterior a ele.
// visivel(valores): o campo só aparece (e só é cobrado) quando devolve true.
// opcoesDe: nome da lista que a tela injeta (ex.: as frentes da obra atual).
import {
  SITUACOES_OBRA, SITUACOES_FRENTE, SITUACOES_MATERIAL, TIPOS_LANCAMENTO,
  CATEGORIAS, PAGO_POR, FORMAS_PAGAMENTO,
} from './vocabulario.js'

export const CAMPOS_OBRA = [
  { nome: 'nome', rotulo: 'Nome da obra', tipo: 'texto', obrigatorio: true, ajuda: 'Ex.: Apto 1802 – Ed. Jardins' },
  { nome: 'codigo', rotulo: 'Código / apelido', tipo: 'texto', obrigatorio: true, ajuda: 'Curto, para achar rápido. Ex.: JARDINS-1802' },
  { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto', inteiro: true },
  { nome: 'cliente_nome', rotulo: 'Cliente', tipo: 'texto' },
  { nome: 'situacao', rotulo: 'Situação', tipo: 'lista', opcoes: SITUACOES_OBRA, obrigatorio: true, padrao: 'Em andamento' },
  { nome: 'data_inicio', rotulo: 'Data de início', tipo: 'data' },
  { nome: 'data_meta_entrega', rotulo: 'Data-meta de entrega', tipo: 'data' },
]

export const CAMPOS_FRENTE = [
  { nome: 'servico', rotulo: 'Serviço', tipo: 'texto', obrigatorio: true, ajuda: 'Ex.: Forro de gesso' },
  { nome: 'ambiente', rotulo: 'Ambiente', tipo: 'texto', obrigatorio: true, sugestoesDe: 'ambientes', ajuda: 'Ex.: Sala, Cozinha, Banho suíte' },
  { nome: 'responsavel', rotulo: 'Responsável', tipo: 'texto', ajuda: 'Empresa ou pessoa' },
  { nome: 'situacao', rotulo: 'Situação', tipo: 'lista', opcoes: SITUACOES_FRENTE, obrigatorio: true, padrao: 'Não iniciada' },
  { nome: 'data_inicio_prevista', rotulo: 'Início previsto', tipo: 'data' },
  { nome: 'data_termino_prevista', rotulo: 'Término previsto', tipo: 'data', naoAntesDe: 'data_inicio_prevista' },
  { nome: 'data_limite_decisao', rotulo: 'Data limite de decisão', tipo: 'data', ajuda: 'Se nada for decidido até esta data, a obra atrasa.' },
  { nome: 'percentual', rotulo: '% de avanço', tipo: 'numero', min: 0, max: 100, obrigatorio: true, padrao: '0' },
]

export const CAMPOS_CONTRATO = [
  { nome: 'empreiteiro', rotulo: 'Empreiteiro', tipo: 'texto', obrigatorio: true },
  { nome: 'valor_contratado', rotulo: 'Valor contratado', tipo: 'dinheiro', obrigatorio: true },
  { nome: 'observacao', rotulo: 'Observação', tipo: 'textoLongo', inteiro: true },
]

export const CAMPOS_MATERIAL = [
  { nome: 'item', rotulo: 'Item', tipo: 'texto', obrigatorio: true, inteiro: true },
  { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'numero', min: 0.01, obrigatorio: true },
  { nome: 'unidade', rotulo: 'Unidade', tipo: 'texto', obrigatorio: true, ajuda: 'm², sc, un, m, lata' },
  { nome: 'frente_id', rotulo: 'Frente', tipo: 'lista', opcoesDe: 'frentes' },
  { nome: 'precisa_ate', rotulo: 'Precisa estar na obra até', tipo: 'data', obrigatorio: true },
  { nome: 'situacao', rotulo: 'Situação', tipo: 'lista', opcoes: SITUACOES_MATERIAL, obrigatorio: true, padrao: 'A comprar' },
  { nome: 'fornecedor', rotulo: 'Fornecedor', tipo: 'texto' },
  { nome: 'observacao', rotulo: 'Observação', tipo: 'texto', inteiro: true },
]

export const CAMPOS_PARCELA = [
  { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true, ajuda: 'Ex.: Entrada, Quinzena 3' },
  { nome: 'valor', rotulo: 'Valor', tipo: 'dinheiro', obrigatorio: true },
  { nome: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true },
]

// "Marcar recebida": a data do recebimento (padrão hoje) e a forma de pagamento.
export const CAMPOS_RECEBIMENTO = [
  { nome: 'data', rotulo: 'Data do recebimento', tipo: 'data', obrigatorio: true },
  { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'lista', opcoes: FORMAS_PAGAMENTO, obrigatorio: true },
]

const ehSaida = (v) => v.tipo === 'Saída'

export const CAMPOS_NOTA = [
  { nome: 'obra_id', rotulo: 'Obra', tipo: 'lista', opcoesDe: 'obras', obrigatorio: true },
  { nome: 'data', rotulo: 'Data', tipo: 'data', obrigatorio: true },
  { nome: 'tipo', rotulo: 'Tipo', tipo: 'lista', opcoes: TIPOS_LANCAMENTO, obrigatorio: true, padrao: 'Saída' },
  { nome: 'categoria', rotulo: 'Categoria', tipo: 'lista', opcoes: CATEGORIAS, obrigatorio: true },
  { nome: 'valor', rotulo: 'Valor', tipo: 'dinheiro', obrigatorio: true },
  { nome: 'fornecedor', rotulo: 'Fornecedor', tipo: 'texto' },
  // Some sozinha quando a obra não tem frentes (ex.: "Empresa (sem obra)").
  { nome: 'frente_id', rotulo: 'Frente', tipo: 'lista', opcoesDe: 'frentes' },
  { nome: 'pago_por', rotulo: 'Pago por', tipo: 'lista', opcoes: PAGO_POR, obrigatorio: true, padrao: 'Engenheiro', visivel: ehSaida },
  { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'lista', opcoes: FORMAS_PAGAMENTO },
  { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto', inteiro: true },
]

// ---------- conta ----------
export const CAMPOS_ENTRAR = [
  { nome: 'email', rotulo: 'Email', tipo: 'email', obrigatorio: true, auto: 'email' },
  { nome: 'senha', rotulo: 'Senha', tipo: 'senha', obrigatorio: true, auto: 'current-password' },
]

export const CAMPOS_CRIAR_CONTA = [
  { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, auto: 'name' },
  { nome: 'email', rotulo: 'Email', tipo: 'email', obrigatorio: true, auto: 'email' },
  { nome: 'senha', rotulo: 'Senha', tipo: 'senha', obrigatorio: true, minCaracteres: 8, auto: 'new-password', ajuda: 'Mínimo 8 caracteres.' },
]

export const CAMPOS_MEU_NOME = [
  { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, auto: 'name' },
]

export function camposDiario(tipo) {
  const campos = []
  if (tipo === 'Avanço') campos.push({ nome: 'frente_id', rotulo: 'Frente', tipo: 'lista', opcoesDe: 'frentes', obrigatorio: true })
  campos.push({
    nome: 'texto',
    rotulo: tipo === 'Equipe' ? 'Quem veio hoje' : tipo === 'Ocorrência' ? 'O que aconteceu' : 'O que foi feito',
    tipo: 'textoLongo',
    obrigatorio: true,
    ajuda: tipo === 'Equipe' ? 'Ex.: Gesso 2, piso 3, pintura 0' : undefined,
  })
  if (tipo === 'Avanço') campos.push({ nome: 'percentual_novo', rotulo: 'Novo % de avanço', tipo: 'numero', min: 0, max: 100 })
  return campos
}

export function camposVisiveis(campos, valores) {
  return campos.filter((c) => !c.visivel || c.visivel(valores))
}

export function valoresIniciais(campos, extra = {}) {
  const v = {}
  for (const c of campos) v[c.nome] = c.padrao ?? ''
  return { ...v, ...extra }
}

// "1.170,50" → 1170.5 · "2,5" → 2.5 · "2.5" → 2.5 (sem vírgula, o ponto é decimal).
export function paraNumero(texto) {
  const s = String(texto).trim().replace(/^R\$\s*/, '')
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
}

// Devolve { campo: 'mensagem' } só com o que está errado. Vazio = pode salvar.
export function validar(campos, valores) {
  const erros = {}
  for (const c of camposVisiveis(campos, valores)) {
    const bruto = valores[c.nome]
    const vazio = bruto === undefined || bruto === null || String(bruto).trim() === ''
    if (vazio) {
      if (c.obrigatorio) erros[c.nome] = 'Preencha este campo.'
      continue
    }
    if (c.tipo === 'numero' || c.tipo === 'dinheiro') {
      const n = paraNumero(bruto)
      if (Number.isNaN(n)) erros[c.nome] = 'Use só números.'
      else if (c.tipo === 'dinheiro' && n <= 0) erros[c.nome] = 'Precisa ser maior que zero.'
      else if (c.min !== undefined && n < c.min) erros[c.nome] = `Mínimo ${String(c.min).replace('.', ',')}.`
      else if (c.max !== undefined && n > c.max) erros[c.nome] = `Máximo ${c.max}.`
    }
    if (c.tipo === 'lista' && c.opcoes && !c.opcoes.includes(bruto)) erros[c.nome] = 'Escolha uma opção da lista.'
    if (c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(bruto).trim())) erros[c.nome] = 'Email inválido. Ex.: nome@gmail.com'
    if (c.minCaracteres && String(bruto).length < c.minCaracteres) erros[c.nome] = `Mínimo ${c.minCaracteres} caracteres.`
    const antes = c.naoAntesDe && valores[c.naoAntesDe]
    if (antes && String(bruto) < String(antes)) {
      erros[c.nome] = `Não pode ser antes de: ${campos.find((x) => x.nome === c.naoAntesDe)?.rotulo ?? c.naoAntesDe}.`
    }
  }
  return erros
}
