import { diasEntre } from './datas.js'
import { JANELA_MATERIAL_DIAS, PEDIDO } from './vocabulario.js'
import { CAMPOS_MATERIAL, CAMPOS_PEDIDO_MATERIAL, paraNumero, validar } from './formularios.js'
import { ehEngenheiro, ehMestre } from './permissoes.js'

export { PEDIDO }
export const MSG_MATERIAL_COM_NOTA = 'Este material tem nota lançada no Financeiro. Exclua a nota antes de excluir o material.'
export const MSG_PEDIDO_NAO_APROVADO = 'Este pedido ainda não foi aprovado pelo Engenheiro.'

// Engenheiro cadastra com a situação que escolher; Mestre só pede (nasce aguardando aprovação).
// Editar um pedido não mexe na situação: ele só sai da fila pelo Aprovar (ou Recusar).
const continuaPedido = (quem, atual) => !ehEngenheiro(quem) || atual?.situacao === PEDIDO
export const camposDoFormulario = (quem, atual) => (continuaPedido(quem, atual) ? CAMPOS_PEDIDO_MATERIAL : CAMPOS_MATERIAL)

// Formulário → linha da tabela (atual = o material, na edição). Devolve { campos } ou { erro }.
export function camposDoMaterial(quem, valores, atual) {
  if (!ehEngenheiro(quem) && !ehMestre(quem)) return { erro: 'Sua conta não pode cadastrar material.' }
  if (Object.keys(validar(camposDoFormulario(quem, atual), valores)).length) return { erro: 'Confira os campos marcados.' }
  const textoOuNulo = (v) => String(v ?? '').trim() || null
  return {
    campos: {
      item: valores.item.trim(),
      quantidade: paraNumero(valores.quantidade),
      unidade: valores.unidade.trim(),
      frente_id: valores.frente_id || null,
      precisa_ate: valores.precisa_ate,
      situacao: continuaPedido(quem, atual) ? PEDIDO : valores.situacao,
      fornecedor: textoOuNulo(valores.fornecedor),
      observacao: textoOuNulo(valores.observacao),
    },
  }
}

// Os botões de cada material, por perfil e situação. O Mestre só marca entregue (o que já foi aprovado).
export function acoesDoMaterial(quem, m) {
  const eng = ehEngenheiro(quem)
  if (m.situacao === PEDIDO) return eng ? ['aprovar', 'recusar', 'editar'] : []
  return [
    ...(eng && m.situacao === 'A comprar' ? ['comprado'] : []),
    ...(m.situacao !== 'Entregue' && (eng || ehMestre(quem)) ? ['entregue'] : []),
    ...(eng ? ['nota', 'editar'] : []),
  ]
}

// Espelho da regra do banco (RLS + marcar_material_entregue). null = pode.
export function erroAoMudarSituacao(quem, m, situacao) {
  if (situacao === 'Entregue') {
    if (!ehEngenheiro(quem) && !ehMestre(quem)) return 'Sua conta não pode marcar material como entregue.'
    if (m.situacao === PEDIDO) return MSG_PEDIDO_NAO_APROVADO
    return null
  }
  return ehEngenheiro(quem) ? null : 'Só o Engenheiro muda a situação do material.'
}

// Rodapé do cartão do painel: o que falta comprar e o que espera aprovação.
export function resumoParaChegar(lista) {
  const n = (s) => lista.filter((m) => m.situacao === s).length
  return [`${n('A comprar')} a comprar`, ...(n(PEDIDO) ? [`${n(PEDIDO)} aguardando`] : [])].join(' · ')
}

export const materialTemNota = (id, lancamentos) => lancamentos.some((l) => l.material_id === id)

const porData = (a, b) => (a.precisa_ate < b.precisa_ate ? -1 : a.precisa_ate > b.precisa_ate ? 1 : 0)

// O que precisa estar na obra nos próximos N dias (ou já passou) e não chegou.
// Pedido do Mestre entra sempre, seja qual for a data: é o único lugar em que o Engenheiro fica sabendo dele.
export function materiaisParaChegar(materiais, hoje, janela = JANELA_MATERIAL_DIAS) {
  return materiais
    .filter((m) => m.situacao === PEDIDO || (m.situacao !== 'Entregue' && diasEntre(hoje, m.precisa_ate) <= janela))
    .sort(porData)
}

export function materiaisNaSituacao(materiais, situacao) {
  return materiais.filter((m) => m.situacao === situacao).sort(porData)
}

// 'critico' (já passou) · 'atencao' (até 2 dias) · 'neutro' · 'ok' (entregue)
export function urgenciaMaterial(m, hoje) {
  if (m.situacao === 'Entregue') return 'ok'
  const x = diasEntre(hoje, m.precisa_ate)
  if (x < 0) return 'critico'
  if (x <= 2) return 'atencao'
  return 'neutro'
}

export function textoPrazoMaterial(m, hoje) {
  if (m.situacao === 'Entregue') return 'entregue'
  const x = diasEntre(hoje, m.precisa_ate)
  if (x < 0) return `atrasado ${-x}d`
  if (x === 0) return 'hoje'
  if (x === 1) return 'amanhã'
  const [, mes, dia] = m.precisa_ate.split('-')
  return `até ${dia}/${mes}`
}
