// Quem pode o quê (lib/permissoes.js): o mesmo que a migration 13 garante no banco.
import { ehEngenheiro, lancaNoCanteiro, mexeDinheiro, podeEditarRegistro, temAcesso, veDinheiro } from '../src/lib/permissoes.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}
     esperado: ${JSON.stringify(esperado)}
     veio:     ${JSON.stringify(real)}`)
}

const p = (role, ativo = true) => ({ id: role, role, ativo })
const PAPEIS = ['Engenheiro', 'Mestre', 'Financeiro', 'Contador', 'Cliente', 'Aguardando']
const quem = (f) => PAPEIS.filter((r) => f(p(r)))

conferir('vê dinheiro: Engenheiro, Financeiro e Contador', quem(veDinheiro), ['Engenheiro', 'Financeiro', 'Contador'])
conferir('grava dinheiro: Engenheiro e Financeiro (o Contador só olha)', quem(mexeDinheiro), ['Engenheiro', 'Financeiro'])
conferir('lança no canteiro: Engenheiro e Mestre (o Cliente só olha)', quem(lancaNoCanteiro), ['Engenheiro', 'Mestre'])
conferir('entra no app: todos menos Aguardando', quem(temAcesso), ['Engenheiro', 'Mestre', 'Financeiro', 'Contador', 'Cliente'])
conferir('desativado não entra nem vê dinheiro', [temAcesso(p('Financeiro', false)), veDinheiro(p('Contador', false))], [false, false])
conferir('só o Engenheiro é Engenheiro', quem(ehEngenheiro), ['Engenheiro'])
conferir('perfil inventado não ganha nada', [temAcesso(p('Dono')), veDinheiro(p('Dono')), lancaNoCanteiro(p('Dono'))], [false, false, false])
conferir('sem conta não ganha nada', [temAcesso(null), veDinheiro(undefined)], [false, false])

const reg = { autor_id: 'Cliente', data: '2026-11-23' }
conferir('Cliente não edita registro do diário, nem um "dele"', podeEditarRegistro(p('Cliente'), reg, '2026-11-23'), false)
conferir('Financeiro não edita registro do diário', podeEditarRegistro(p('Financeiro'), reg, '2026-11-23'), false)

console.log(`${ok}/${tot} — permissoes`)
process.exit(ok === tot ? 0 : 1)
