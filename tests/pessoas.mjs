// Login e pessoas: regras puras (lib/pessoas.js) e o fluxo pela camada de dados (mock).
import { DESCRICAO_DO_PAPEL, emailEmUso, erroDeAcesso, obrasDaPessoa, obrasDoAcesso, papelDaNovaConta, podeGerenciar } from '../src/lib/pessoas.js'
import { PAPEIS_DE_ACESSO } from '../src/lib/vocabulario.js'
import { CAMPOS_CRIAR_CONTA, validar } from '../src/lib/formularios.js'
import * as dados from '../src/lib/dadosMock.js'
import { SENHA_DE_TESTE } from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const eng = { id: 'p1', role: 'Engenheiro', ativo: true }
const mestre = { id: 'p2', role: 'Mestre', ativo: true }

// Regras puras
conferir('primeira conta do sistema é Engenheiro', papelDaNovaConta([]), 'Engenheiro')
conferir('as seguintes entram como Aguardando', papelDaNovaConta([eng]), 'Aguardando')
conferir('email repetido ignora maiúscula e espaço', emailEmUso([{ email: 'a@b.com' }], ' A@B.com '), true)
conferir('Engenheiro gerencia outra pessoa', podeGerenciar(eng, mestre), true)
conferir('ninguém mexe no próprio acesso', podeGerenciar(eng, eng), false)
conferir('Mestre não gerencia ninguém', podeGerenciar(mestre, eng), false)
conferir('Engenheiro desativado não gerencia', podeGerenciar({ ...eng, ativo: false }, mestre), false)
conferir('Mestre sem obra é recusado', !!erroDeAcesso('Mestre', []), true)
conferir('Mestre com obra passa', erroDeAcesso('Mestre', ['o1']), null)
conferir('Engenheiro não precisa de obra', erroDeAcesso('Engenheiro', []), null)
conferir('perfil fora da lista é recusado', !!erroDeAcesso('Dono', ['o1']), true)
conferir('Aguardando não é perfil de acesso', !!erroDeAcesso('Aguardando', []), true)
conferir('Cliente sem obra é recusado, com o nome dele', erroDeAcesso('Cliente', []), 'Marque pelo menos uma obra para o Cliente.')
conferir('Cliente com obra passa', erroDeAcesso('Cliente', ['o1']), null)
conferir('Financeiro e Contador não precisam de obra', [erroDeAcesso('Financeiro', []), erroDeAcesso('Contador', [])], [null, null])
conferir('todo perfil de acesso tem descrição', PAPEIS_DE_ACESSO.every((r) => !!DESCRICAO_DO_PAPEL[r]), true)
conferir('Contador aparece com todas as obras', obrasDaPessoa({ role: 'Contador', obras: [] }), 'todas as obras')
conferir('Cliente aparece com as obras dele', obrasDaPessoa({ role: 'Cliente', obras: ['Apto 501'] }), 'Apto 501')
conferir('Cliente sem obra aparece assim', obrasDaPessoa({ role: 'Cliente', obras: [] }), 'nenhuma obra')

// Obras ao salvar o acesso (abertas = as que a tela oferece para marcar)
conferir('Engenheiro mantém as obras que já tinha', obrasDoAcesso(['o1', 'o2'], 'Engenheiro', [], ['o1', 'o2']), { erro: null, obraIds: ['o1', 'o2'] })
conferir('obra concluída escondida não conta como obra do Mestre', !!obrasDoAcesso(['o1', 'o2'], 'Mestre', ['o1'], ['o2']).erro, true)
conferir('vínculo com obra concluída fica guardado', obrasDoAcesso(['o1', 'o2'], 'Mestre', ['o2'], ['o2']).obraIds, ['o1', 'o2'])
conferir('Financeiro mantém os vínculos que tinha (vê todas)', obrasDoAcesso(['o1'], 'Financeiro', ['o2'], ['o1', 'o2']), { erro: null, obraIds: ['o1'] })
conferir('Cliente fica só com a obra marcada', obrasDoAcesso([], 'Cliente', ['o2', 'o2'], ['o1', 'o2']).obraIds, ['o2'])
conferir('Mestre troca de obra aberta', obrasDoAcesso(['o2'], 'Mestre', ['o3'], ['o2', 'o3']).obraIds, ['o3'])

// Validação do Criar conta
const errosDe = (v) => Object.keys(validar(CAMPOS_CRIAR_CONTA, v))
conferir('senha com 7 caracteres é recusada', errosDe({ nome: 'X', email: 'x@y.com', senha: '1234567' }), ['senha'])
conferir('email sem @ é recusado', errosDe({ nome: 'X', email: 'xy.com', senha: '12345678' }), ['email'])
conferir('tudo vazio cobra os três', errosDe({}), ['nome', 'email', 'senha'])
conferir('conta válida passa', errosDe({ nome: 'X', email: 'x@y.com', senha: '12345678' }), [])

// Fluxo pela camada de dados
conferir('senha errada não entra', (await dados.entrar({ email: 'engenheiro@exemplo.com', senha: 'errada00' })).erro, 'Email ou senha errados.')
conferir('email com maiúscula entra', (await dados.entrar({ email: 'Engenheiro@Exemplo.com', senha: SENHA_DE_TESTE })).data?.role, 'Engenheiro')

const nova = await dados.criarConta({ nome: ' Ana ', email: 'Ana@Exemplo.com', senha: '12345678' })
conferir('conta nova nasce Aguardando, nome e email limpos', [nova.data?.role, nova.data?.nome, nova.data?.email], ['Aguardando', 'Ana', 'ana@exemplo.com'])
conferir('mesmo email de novo é recusado', !!(await dados.criarConta({ nome: 'Ana', email: 'ana@exemplo.com', senha: '12345678' })).erro, true)

const id = nova.data.id
conferir('Mestre não consegue liberar', !!(await dados.salvarAcesso(mestre, id, { role: 'Mestre', obraIds: ['o1'] })).erro, true)
conferir('obra interna não conta como obra do Mestre', !!(await dados.salvarAcesso(eng, id, { role: 'Mestre', obraIds: ['o-empresa'] })).erro, true)
await dados.salvarAcesso(eng, id, { role: 'Mestre', obraIds: ['o2', 'o2'] })
const ana = (await dados.listarPessoas()).data.find((p) => p.id === id)
conferir('liberada como Mestre só na obra 2, sem duplicar', [ana.role, ana.obra_ids], ['Mestre', ['o2']])
const obrasAna = (await dados.listarObras(ana)).data.map((o) => o.id)
conferir('Mestre liberado vê só a obra marcada', obrasAna, ['o2'])

await dados.definirAtivo(eng, id, false)
conferir('desativada não entra', (await dados.entrar({ email: 'ana@exemplo.com', senha: '12345678' })).erro, 'Esta conta foi desativada. Fale com o engenheiro.')
conferir('sessão lembrada de desativada volta ao login', await dados.obterPerfil(id), null)
conferir('Engenheiro não se desativa', !!(await dados.definirAtivo(eng, 'p1', false)).erro, true)

await dados.salvarAcesso(eng, 'p2', { role: 'Engenheiro', obraIds: [] })
const antonio = (await dados.listarPessoas()).data.find((p) => p.id === 'p2')
conferir('virar Engenheiro não apaga as obras da pessoa', [antonio.role, antonio.obra_ids], ['Engenheiro', ['o1', 'o2']])

console.log(`pessoas: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
