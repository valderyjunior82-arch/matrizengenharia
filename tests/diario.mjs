// Diário e fotos: fotos separadas por data, quem lança e edita, e a frente que anda.
// "Hoje": nas regras puras, datas fixas; pela camada de dados, o hoje() do app.
import { caminhoFoto, camposDoRegistro, fotosPorDia, frenteAposAvanco, frentesParaAvanco, mexeNaFrente, rotuloFoto } from '../src/lib/diario.js'
import { mockFotos, mockFrentes, mockProfiles } from '../src/lib/mockData.js'
import * as dados from '../src/lib/dadosMock.js'
import { hoje } from '../src/lib/config.js'

// O mock grava com o hoje() do app (data parada só com USAR_MOCK; senão, a de verdade).
const HOJE = hoje()
let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const [eng, mestre] = mockProfiles

// 1. Fotos separadas por data (o que não pode faltar).
const daObra1 = mockFotos.filter((f) => f.obra_id === 'o1')
conferir('fotos agrupadas por dia, o mais recente primeiro',
  fotosPorDia(daObra1).map((d) => [d.data, d.fotos.length]), [['2026-11-21', 4], ['2026-11-17', 2]])
conferir('cada grupo só tem foto daquele dia',
  fotosPorDia(daObra1).every((d) => d.fotos.every((f) => f.data === d.data)), true)
conferir('sem fotos, nenhum grupo', fotosPorDia([]), [])
conferir('o caminho no Storage tem a obra e a data', caminhoFoto('o1', '2026-11-23', 'x'), 'o1/2026-11-23/x.jpg')

// 2. Rótulo da foto.
conferir('rótulo: ambiente e serviço', rotuloFoto(mockFotos[0], mockFrentes), 'Sala · Porcelanato')
conferir('foto sem frente nem ambiente vira Geral', rotuloFoto({ frente_id: null, ambiente: null }, mockFrentes), 'Geral')

// 3. O formulário vira registro.
conferir('Avanço sem frente é recusado', camposDoRegistro('Avanço', { texto: 'x' }).erro, 'Confira os campos marcados.')
conferir('texto vazio é recusado', camposDoRegistro('Equipe', { texto: '  ' }).erro, 'Confira os campos marcados.')
conferir('% acima de 100 é recusado', camposDoRegistro('Avanço', { frente_id: 'f3', texto: 'x', percentual_novo: '120' }).erro, 'Confira os campos marcados.')
conferir('Equipe não guarda frente nem %',
  camposDoRegistro('Equipe', { frente_id: 'f3', texto: ' Gesso 2 ', percentual_novo: '50' }).campos,
  { tipo: 'Equipe', frente_id: null, texto: 'Gesso 2', percentual_novo: null })
conferir('Avanço sem % guarda null', camposDoRegistro('Avanço', { frente_id: 'f3', texto: 'x', percentual_novo: '' }).campos.percentual_novo, null)

// 4. O Avanço mexe na frente (espelho do gatilho do banco).
const parada = { id: 'a', situacao: 'Parada', percentual: 10, ultimo_avanco_em: '2026-11-20' }
conferir('Avanço novo: % e último avanço mudam, Parada vira Em andamento',
  frenteAposAvanco(parada, { tipo: 'Avanço', frente_id: 'a', data: '2026-11-23', percentual_novo: 30 }),
  { id: 'a', situacao: 'Em andamento', percentual: 30, ultimo_avanco_em: '2026-11-23' })
conferir('Avanço de data antiga não desfaz o % mais novo',
  frenteAposAvanco(parada, { tipo: 'Avanço', frente_id: 'a', data: '2026-11-01', percentual_novo: 5 }).percentual, 10)
conferir('Ocorrência não mexe na frente', frenteAposAvanco(parada, { tipo: 'Ocorrência', frente_id: null, data: '2026-11-23' }), parada)

conferir('lista do Avanço não traz frente concluída',
  frentesParaAvanco(mockFrentes.filter((f) => f.obra_id === 'o2'), null).map((f) => f.id), ['f9'])
conferir('na edição, a frente do próprio registro aparece mesmo concluída',
  frentesParaAvanco(mockFrentes.filter((f) => f.obra_id === 'o2'), { frente_id: 'f8' }).map((f) => f.id), ['f8', 'f9'])

// 5. Lançar, editar e apagar no mock (mesmas regras do banco).
dados.definirObraAtual('o2')
const novo = await dados.salvarRegistro(mestre, null, 'Avanço',
  { frente_id: 'f9', texto: 'Ramal da cozinha', percentual_novo: '60' }, [{ previa: 'blob:a' }, { previa: 'blob:b' }])
conferir('Mestre lança na obra dele, com a data de hoje', [novo.erro, novo.data?.data, novo.data?.autor_id], [null, HOJE, 'p2'])
const fotos2 = (await dados.listarFotos()).data.filter((f) => f.registro_id === novo.data.id)
conferir('as 2 fotos entram com a data e o ambiente do registro',
  fotos2.map((f) => [f.data, f.ambiente, f.caminho.startsWith(`o2/${HOJE}/`)]), [[HOJE, 'Banho social', true], [HOJE, 'Banho social', true]])
conferir('a frente recebe o novo %', (await dados.obterFrente('f9')).data.percentual, 60)

const editado = await dados.salvarRegistro(mestre, novo.data.id, null, { texto: 'Ramal da cozinha e lavanderia', percentual_novo: '65' })
conferir('Mestre edita o próprio registro de hoje', [editado.erro, editado.data?.texto], [null, 'Ramal da cozinha e lavanderia'])
conferir('editar o % atualiza a frente', (await dados.obterFrente('f9')).data.percentual, 65)

const antigo = await dados.salvarRegistro(mestre, 'r8', null, { texto: 'mudei' })
conferir('Mestre não edita registro de outro dia', antigo.erro, 'Este registro não pode mais ser editado por você.')
conferir('Engenheiro edita registro de outro dia', (await dados.salvarRegistro(eng, 'r8', null, { texto: 'Demolição concluída' })).erro, null)

// Corrigir só o texto de um Avanço não pode mexer na frente (bug da revisão de 23/11:
// uma frente Parada voltava para Em andamento, uma Concluída perdia os 100%).
conferir('registro novo mexe na frente', mexeNaFrente(null, { percentual_novo: null }), true)
conferir('editar só o texto não mexe na frente', mexeNaFrente({ percentual_novo: 70 }, { percentual_novo: 70 }), false)
conferir('editar o % mexe na frente', mexeNaFrente({ percentual_novo: 70 }, { percentual_novo: 80 }), true)

conferir('Mestre não edita registro de outra obra', (await dados.salvarRegistro(mestre, 'r1', null, { texto: 'x' })).erro, 'Este registro não é da obra escolhida.')
conferir('frente de outra obra é recusada',
  (await dados.salvarRegistro(mestre, null, 'Avanço', { frente_id: 'f3', texto: 'x' })).erro, 'Esta frente não é da obra escolhida.')
conferir('conta Aguardando não lança',
  (await dados.salvarRegistro(mockProfiles[2], null, 'Equipe', { texto: 'x' })).erro, 'Sua conta não pode lançar no diário.')

conferir('Mestre não apaga registro de outro dia', (await dados.excluirRegistro(mestre, 'r8')).erro, 'Este registro não pode mais ser apagado por você.')
conferir('Mestre apaga o próprio registro de hoje', (await dados.excluirRegistro(mestre, novo.data.id)).erro, null)
conferir('apagar o registro leva as fotos dele', (await dados.listarFotos()).data.some((f) => f.registro_id === novo.data.id), false)

// 6. Uma obra não vê o diário da outra.
dados.definirObraAtual('o1')
conferir('obra 1 não vê registro nem foto da obra 2',
  [(await dados.listarRegistros()).data.some((r) => r.obra_id !== 'o1'), (await dados.listarFotos()).data.some((f) => f.obra_id !== 'o1')], [false, false])

console.log(`${ok}/${tot} — diário e fotos`)
process.exit(ok === tot ? 0 : 1)
