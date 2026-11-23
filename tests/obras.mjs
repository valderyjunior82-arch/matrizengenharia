// Cadastro de obras: ordem da lista, código repetido, exclusão e quem entra/sai.
import { codigoEmUso, erroAoRemover, mestresDaObra, obraTemRegistros, obrasDoCadastro, podeEntrarNaObra } from '../src/lib/obras.js'
import * as mock from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const obras = [
  { id: 'a', situacao: 'Concluída', codigo: 'A-1' },
  { id: 'e', situacao: 'Em andamento', codigo: 'EMPRESA', interna: true },
  { id: 'b', situacao: 'Parada', codigo: 'B-1' },
  { id: 'c', situacao: 'Em andamento', codigo: 'C-1' },
]
conferir('lista: ativas primeiro, concluída no fim, sem a Empresa', obrasDoCadastro(obras).map((o) => o.id), ['c', 'b', 'a'])

conferir('código repetido é pego mesmo com caixa e espaço diferentes', codigoEmUso(obras, ' c-1 '), true)
conferir('editar a própria obra não acusa o código dela', codigoEmUso(obras, 'C-1', 'c'), false)
conferir('código novo passa', codigoEmUso(obras, 'NOVA-1'), false)

const tabelas = { frentes: mock.mockFrentes, materiais: mock.mockMateriais, lancamentos: mock.mockLancamentos }
conferir('Apto 1802 tem registros: não exclui', obraTemRegistros('o1', tabelas), true)
conferir('obra recém-criada não tem registros: exclui', obraTemRegistros('nova', tabelas), false)

const mestre = { id: 'm', nome: 'Seu Antônio', role: 'Mestre', ativo: true }
conferir('Mestre fora da obra pode entrar', podeEntrarNaObra(mestre, ['o1'], 'o2'), true)
conferir('Mestre que já está não entra de novo (nada duplica)', podeEntrarNaObra(mestre, ['o1', 'o2'], 'o2'), false)
conferir('Mestre desativado não entra', podeEntrarNaObra({ ...mestre, ativo: false }, [], 'o2'), false)
conferir('Engenheiro não aparece para adicionar', podeEntrarNaObra({ ...mestre, role: 'Engenheiro' }, [], 'o2'), false)
conferir('conta Aguardando não aparece para adicionar', podeEntrarNaObra({ ...mestre, role: 'Aguardando' }, [], 'o2'), false)

conferir('lista da obra mostra só os Mestres dela',
  mestresDaObra([{ ...mestre, obra_ids: ['o1'] }, { id: 'x', role: 'Engenheiro', obra_ids: ['o1'] }, { id: 'y', role: 'Mestre', obra_ids: ['o2'] }], 'o1').map((p) => p.id), ['m'])

conferir('Mestre com duas obras sai de uma', erroAoRemover(mestre, ['o1', 'o2'], 'o2'), null)
conferir('única obra aberta do Mestre não sai (ele ficaria sem nada)', typeof erroAoRemover(mestre, ['o2'], 'o2'), 'string')
conferir('Mestre desativado sai até da última obra', erroAoRemover({ ...mestre, ativo: false }, ['o2'], 'o2'), null)
conferir('sair de obra concluída é livre', erroAoRemover(mestre, ['o1'], 'o-velha'), null)

console.log(`obras: ${ok}/${tot}`)
process.exit(ok === tot ? 0 : 1)
