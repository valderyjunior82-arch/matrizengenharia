// Regras das frentes, com os dados de exemplo do PRD ("hoje" = 23/11/2026).
// Critério do PRD: frentes 2 e 7 vermelhas, 3 e 4 amarelas.
import { diasSemAndar, frentesDoPainel, nivelFrente, podeMarcarPronta, reguaDaFrente, textoLimite } from '../src/lib/frentes.js'
import { materiaisParaChegar } from '../src/lib/materiais.js'
import { mockFrentes, mockMateriais } from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-11-23'
const f = (id) => mockFrentes.find((x) => x.id === id)

conferir('Forro (limite 18/11 vencido) é vermelho', nivelFrente(f('f2'), HOJE), 'critico')
conferir('Pintura (limite 20/11 vencido) é vermelha', nivelFrente(f('f7'), HOJE), 'critico')
conferir('Porcelanato (limite em 2 dias) é âmbar', nivelFrente(f('f3'), HOJE), 'atencao')
conferir('Marcenaria (limite amanhã) é âmbar', nivelFrente(f('f4'), HOJE), 'atencao')
conferir('Bancadas (limite em 4 dias) é verde', nivelFrente(f('f5'), HOJE), 'ok')
conferir('3 dias sem andar, sem limite, acende âmbar',
  nivelFrente({ situacao: 'Em andamento', ultimo_avanco_em: '2026-11-20' }, HOJE), 'atencao')

conferir('dias sem andar conta do último avanço', diasSemAndar(f('f2'), HOJE), 6)
conferir('frente que ainda não começou não conta dias', diasSemAndar(f('f4'), HOJE), null)
conferir('sem avanço, conta da data de início', diasSemAndar({ data_inicio_prevista: '2026-11-20' }, HOJE), 3)

const obra1 = mockFrentes.filter((x) => x.obra_id === 'o1')
conferir('painel: vencidas no topo, depois a data limite mais próxima',
  frentesDoPainel(obra1, HOJE).map((x) => x.id), ['f2', 'f7', 'f4', 'f3', 'f5'])
conferir('painel não mostra concluída nem aguardando aprovação',
  frentesDoPainel(obra1, HOJE).some((x) => ['f1', 'f6'].includes(x.id)), false)
conferir('frente sem data limite vai para o fim',
  frentesDoPainel([{ id: 'a', situacao: 'Em andamento' }, { id: 'b', situacao: 'Em andamento', data_limite_decisao: '2026-12-01' }], HOJE).map((x) => x.id), ['b', 'a'])

conferir('texto da vencida', textoLimite(f('f2'), HOJE).longo, 'Vencida há 5 dias')
conferir('não marca pronta o que já aguarda aprovação', podeMarcarPronta(f('f6')), false)
conferir('marca pronta o que está em andamento', podeMarcarPronta(f('f3')), true)

// Régua de prazo
conferir('régua do porcelanato: hoje no meio, limite logo depois',
  reguaDaFrente(f('f3'), HOJE), { feito: 40, hoje: 52, limite: 60, passou: false })
conferir('régua do forro: hoje depois do término fica em 100 e avisa',
  reguaDaFrente(f('f2'), HOJE), { feito: 70, hoje: 100, limite: 83, passou: true })
conferir('régua da marcenaria: hoje antes do início fica em 0',
  reguaDaFrente(f('f4'), HOJE).hoje, 0)
conferir('concluída não avisa que passou', reguaDaFrente(f('f1'), HOJE).passou, false)
conferir('sem datas previstas, sem régua', reguaDaFrente({ percentual: 10 }, HOJE), null)

const mats1 =mockMateriais.filter((m) => m.obra_id === 'o1')
conferir('material para chegar: 7 dias, sem entregue, atrasado primeiro',
  materiaisParaChegar(mats1, HOJE).map((m) => m.id), ['mt3', 'mt1', 'mt2'])

console.log(`${ok}/${tot} — frentes e materiais`)
process.exit(ok === tot ? 0 : 1)
