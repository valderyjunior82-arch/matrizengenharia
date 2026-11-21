// Quem pode o quê. As telas perguntam aqui; não decidem sozinhas.
// (A garantia de verdade será a RLS do banco. Isto só esconde o que não cabe.)

export const ehEngenheiro = (p) => !!p && p.ativo && p.role === 'Engenheiro'
export const ehMestre = (p) => !!p && p.ativo && p.role === 'Mestre'

// O Mestre nunca vê valor em dinheiro, em nenhuma tela.
export const veDinheiro = ehEngenheiro

export function telaInicial(p) {
  if (ehEngenheiro(p)) return 'hoje'
  if (ehMestre(p)) return 'diario'
  return 'aguardando'
}

// Registro do diário: Engenheiro edita qualquer um; Mestre só o próprio e só no dia.
export function podeEditarRegistro(p, registro, hoje) {
  if (ehEngenheiro(p)) return true
  return ehMestre(p) && registro.autor_id === p.id && registro.data === hoje
}
