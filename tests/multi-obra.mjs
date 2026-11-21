// MULTI-OBRA: uma obra nunca vê a outra. Se este teste falhar, pare tudo.
import { daObra, obraInicial, obrasDoSeletor, obrasVisiveis } from '../src/lib/escopo.js'
import * as mock from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// 1. Toda tabela de lançamento do mock tem obra_id preenchido e válido.
const obrasIds = new Set(mock.mockObras.map((o) => o.id))
const tabelas = { frentes: mock.mockFrentes, contratos: mock.mockContratos, registros: mock.mockRegistros, fotos: mock.mockFotos, materiais: mock.mockMateriais, lancamentos: mock.mockLancamentos, membros: mock.mockMembros }
for (const [nome, linhas] of Object.entries(tabelas)) {
  conferir(`${nome}: toda linha tem obra_id de uma obra que existe`, linhas.every((l) => obrasIds.has(l.obra_id)), true)
}

// 2. O filtro devolve só a obra pedida, e recusa quando não há obra.
for (const [nome, linhas] of Object.entries(tabelas)) {
  conferir(`${nome}: filtrar pela obra 2 não traz nada da obra 1`, daObra(linhas, 'o2').some((l) => l.obra_id !== 'o2'), false)
}
let recusou = false
try { daObra(mock.mockFrentes, null) } catch (_e) { recusou = true }
conferir('sem obra escolhida, o filtro recusa (não devolve tudo)', recusou, true)

// 3. As duas obras de exemplo são diferentes de propósito.
conferir('obra 2 não tem material (estado vazio)', daObra(mock.mockMateriais, 'o2').length, 0)
conferir('obra 1 tem material', daObra(mock.mockMateriais, 'o1').length > 0, true)

// 4. Quem enxerga o quê.
const [eng, mestre, aguardando] = mock.mockProfiles
conferir('Engenheiro vê todas, inclusive a Empresa', obrasVisiveis(mock.mockObras, mock.mockMembros, eng).length, 3)
conferir('Mestre vê só as obras em que é membro, sem a Empresa',
  obrasVisiveis(mock.mockObras, mock.mockMembros, mestre).map((o) => o.id), ['o1', 'o2'])
conferir('Mestre fora da obra 2 não a vê',
  obrasVisiveis(mock.mockObras, [{ obra_id: 'o1', profile_id: 'p2' }], mestre).map((o) => o.id), ['o1'])
conferir('Conta aguardando não vê obra nenhuma', obrasVisiveis(mock.mockObras, mock.mockMembros, aguardando).length, 0)
conferir('Pessoa desativada não vê obra nenhuma', obrasVisiveis(mock.mockObras, mock.mockMembros, { ...eng, ativo: false }).length, 0)

// 5. O seletor e a obra lembrada.
const seletor = obrasDoSeletor(mock.mockObras)
conferir('seletor não mostra a obra interna Empresa', seletor.some((o) => o.interna), false)
conferir('seletor não mostra obra concluída', obrasDoSeletor([{ id: 'x', situacao: 'Concluída' }]).length, 0)
conferir('volta na obra guardada', obraInicial(seletor, 'o2'), 'o2')
conferir('obra guardada que sumiu cai na primeira', obraInicial(seletor, 'apagada'), 'o1')
conferir('sem obras, nenhuma escolhida', obraInicial([], 'o1'), null)

console.log(`${ok}/${tot} — multi-obra`)
process.exit(ok === tot ? 0 : 1)
