// Tradução dos erros do Supabase para a frase da tela (src/lib/errosBanco.js).
import { MSG_GENERICA, MSG_SEM_PERMISSAO, MSG_SEM_REDE, traduzirErro } from '../src/lib/errosBanco.js'
import { MSG_FRENTE_COM_REGISTROS } from '../src/lib/frentes.js'
import { MSG_OBRA_COM_REGISTROS } from '../src/lib/obras.js'

let ok = 0
let tot = 0
function conferir(nome, obtido, esperado) {
  tot++
  if (obtido === esperado) ok++
  else console.log(`✗ ${nome}\n  esperado: ${esperado}\n  obtido:   ${obtido}`)
}

conferir('internet caiu', traduzirErro(new TypeError('Failed to fetch')), MSG_SEM_REDE)
conferir('frase das funções do banco passa direto',
  traduzirErro({ code: 'P0001', message: 'Esta frente já está pronta.' }), 'Esta frente já está pronta.')
conferir('código de obra repetido',
  traduzirErro({ code: '23505', message: 'duplicate key value violates unique constraint "obras_codigo_unico"' }),
  'Já existe uma obra com este código. Escolha outro.')
conferir('segundo contrato na frente',
  traduzirErro({ code: '23505', message: 'duplicate key value violates unique constraint "contratos_empreiteiros_frente_id_key"' }),
  'Esta frente já tem contrato.')
conferir('apagar obra com frente',
  traduzirErro({ code: '23503', message: 'update or delete on table "obras" violates foreign key constraint "frentes_obra_id_fkey" on table "frentes"' }),
  MSG_OBRA_COM_REGISTROS)
conferir('apagar frente com contrato',
  traduzirErro({ code: '23503', message: 'update or delete on table "frentes" violates foreign key constraint "contratos_empreiteiros_frente_id_obra_id_fkey" on table "contratos_empreiteiros"' }),
  MSG_FRENTE_COM_REGISTROS)
conferir('RLS recusou', traduzirErro({ code: '42501', message: 'new row violates row-level security policy for table "obras"' }), MSG_SEM_PERMISSAO)
conferir('trava do papel em português passa direto',
  traduzirErro({ code: '42501', message: 'Ninguém muda o próprio acesso.' }), 'Ninguém muda o próprio acesso.')
conferir('erro desconhecido do banco não mostra inglês', traduzirErro({ code: 'XX000', message: 'internal error' }), MSG_GENERICA)
conferir('erro da própria camada passa direto', traduzirErro(new Error('Escolha uma obra no topo da tela.')), 'Escolha uma obra no topo da tela.')

console.log(`${ok}/${tot} — erros do banco`)
process.exit(ok === tot ? 0 : 1)
