// Quem pode o quê. As telas perguntam aqui; não decidem sozinhas.
// A garantia de verdade é a RLS do banco (migration 13 tem as mesmas três perguntas:
// ve_dinheiro, mexe_dinheiro e lanca_no_canteiro). Isto só esconde o que não cabe.

const tem = (p, ...papeis) => !!p && p.ativo && papeis.includes(p.role)

export const ehEngenheiro = (p) => tem(p, 'Engenheiro')
export const ehMestre = (p) => tem(p, 'Mestre')

// Dinheiro: o Contador só olha; o Financeiro olha e grava. O Mestre e o Cliente nunca veem valor.
export const veDinheiro = (p) => tem(p, 'Engenheiro', 'Financeiro', 'Contador')
export const mexeDinheiro = (p) => tem(p, 'Engenheiro', 'Financeiro')

// Canteiro: lançar diário e foto, pedir material, marcar frente pronta. O Cliente só olha.
export const lancaNoCanteiro = (p) => tem(p, 'Engenheiro', 'Mestre')

// Conta liberada (qualquer perfil menos Aguardando): entra no app do seu perfil.
export const temAcesso = (p) => tem(p, 'Engenheiro', 'Mestre', 'Financeiro', 'Contador', 'Cliente')

// Registro do diário: Engenheiro edita qualquer um; Mestre só o próprio e só no dia.
export function podeEditarRegistro(p, registro, hoje) {
  if (ehEngenheiro(p)) return true
  return ehMestre(p) && registro.autor_id === p.id && registro.data === hoje
}
