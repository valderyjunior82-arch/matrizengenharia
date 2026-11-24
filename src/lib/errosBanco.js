// Traduz o erro do Supabase para a frase que a tela mostra.
// Puro (sem rede): o teste em tests/erros-banco.mjs confere cada caso.
import { MSG_FRENTE_COM_REGISTROS } from './frentes.js'
import { MSG_OBRA_COM_REGISTROS } from './obras.js'

export const MSG_SEM_REDE = 'Sem conexão com a internet. Nada foi salvo: confira a rede e tente de novo.'
export const MSG_SEM_PERMISSAO = 'Sua conta não tem permissão para isso.'
export const MSG_GENERICA = 'Não foi possível salvar. Tente de novo.'

// Restrição única violada (23505) → frase de quem usa o app.
const UNICOS = {
  obras_codigo_unico: 'Já existe uma obra com este código. Escolha outro.',
  contratos_empreiteiros_frente_id_key: 'Esta frente já tem contrato.',
  membros_obra_id_profile_id_key: 'Esta pessoa já está nesta obra.',
}

// Chave estrangeira impedindo apagar (23503) → depende de quem estava sendo apagado.
const APAGAR = { obras: MSG_OBRA_COM_REGISTROS, frentes: MSG_FRENTE_COM_REGISTROS }

export function traduzirErro(e) {
  if (!e) return null
  const texto = String(e.message ?? e)
  if (/failed to fetch|networkerror|load failed|fetch failed/i.test(texto)) return MSG_SEM_REDE
  switch (e.code) {
    case 'P0001': return texto // frase em português escrita nas funções do banco
    case '23505': return UNICOS[Object.keys(UNICOS).find((k) => texto.includes(k))] ?? 'Já existe um cadastro igual a este.'
    case '23503': {
      const tabela = Object.keys(APAGAR).find((t) => texto.includes(`on table "${t}"`))
      return APAGAR[tabela] ?? 'Este cadastro está ligado a outro registro.'
    }
    case '23514': return 'Algum campo tem um valor que o sistema não aceita. Confira e tente de novo.'
    case '42501':
      // As travas do banco (ex.: "Ninguém muda o próprio acesso.") já vêm em português.
      return /permission denied|row-level security|violates/i.test(texto) ? MSG_SEM_PERMISSAO : texto
    default:
      // Erro lançado pela própria camada de dados (new Error('...')) já é a frase final.
      return e.code ? MSG_GENERICA : texto
  }
}
