// O app é MULTI-OBRA. Estas são as regras que impedem uma obra de ver a outra.

// Todo dado de lançamento passa por aqui: sem obra escolhida, não devolve nada.
export function daObra(lista, obraId) {
  if (!obraId) throw new Error('Nenhuma obra escolhida: todo dado precisa de obra_id.')
  return lista.filter((item) => item.obra_id === obraId)
}

// Quais obras a pessoa enxerga: o Engenheiro, todas; o Mestre, só as dele.
export function obrasVisiveis(obras, membros, profile) {
  if (!profile || !profile.ativo) return []
  if (profile.role === 'Engenheiro') return obras
  if (profile.role === 'Mestre') {
    const minhas = new Set(membros.filter((m) => m.profile_id === profile.id).map((m) => m.obra_id))
    return obras.filter((o) => minhas.has(o.id) && !o.interna)
  }
  return []
}

// O seletor do topo mostra as obras de trabalho: sem a obra interna
// "Empresa (sem obra)" e sem as concluídas (essas seguem no Caixa geral).
export function obrasDoSeletor(obras) {
  return obras.filter((o) => !o.interna && o.situacao !== 'Concluída')
}

// A obra interna "Empresa (sem obra)": nunca vira obra atual, mas recebe aporte e as notas sem obra.
export const idDaEmpresa = (obras) => obras.find((o) => o.interna)?.id ?? null

// Volta na obra guardada, se ela ainda estiver na lista; senão, a primeira.
export function obraInicial(lista, guardada) {
  if (guardada && lista.some((o) => o.id === guardada)) return guardada
  return lista[0]?.id ?? null
}
