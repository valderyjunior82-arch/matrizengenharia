// Contas do financeiro, com os lançamentos de exemplo ("hoje" = 23/11/2026).
import { caixaGeral, pagoDoContrato, resumoObra, situacaoParcela } from '../src/lib/financeiro.js'
import { mockLancamentos, mockObras } from '../src/lib/mockData.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-11-23'
const daObra = (id) => mockLancamentos.filter((l) => l.obra_id === id)
const r1 = resumoObra(daObra('o1'), HOJE)

conferir('recebido = entradas realizadas', r1.recebido, 66000)
conferir('a receber = parcelas previstas', r1.aReceber, 28500)
conferir('vencido = previstas com vencimento antes de hoje', r1.vencido, 4500)
conferir('gasto de ontem soma Engenheiro e Cliente', r1.gastoOntem, 1356.4)
conferir('gasto da semana começa na segunda (hoje é segunda)', r1.gastoSemana, 0)
conferir('nota paga pelo Cliente entra no gasto…', r1.gasto, 16706.4)
conferir('…mas não mexe no saldo', r1.saldo, 49480)
conferir('pago do contrato do forro', pagoDoContrato('c2', mockLancamentos), 9000)

conferir('parcela recebida', situacaoParcela({ situacao: 'Realizado' }, HOJE), 'Recebida')
conferir('parcela vencida', situacaoParcela({ situacao: 'Previsto', vencimento: '2026-11-20' }, HOJE), 'Vencida')
conferir('parcela a vencer', situacaoParcela({ situacao: 'Previsto', vencimento: '2026-12-01' }, HOJE), 'A vencer')

// Somar dinheiro em centavos: 0,1 + 0,2 tem que dar 0,3.
conferir('soma sem erro de centavo', resumoObra([
  { tipo: 'Saída', situacao: 'Realizado', valor: 0.1, data: HOJE, pago_por: 'Engenheiro' },
  { tipo: 'Saída', situacao: 'Realizado', valor: 0.2, data: HOJE, pago_por: 'Engenheiro' },
], HOJE).gasto, 0.3)

const caixa = caixaGeral(mockObras, mockLancamentos, HOJE, '2026-11')
conferir('caixa: o gasto da Empresa (sem obra) entra no saldo', caixa.saldoCaixa, 49480 + (20000 - 842.3) - 280)
conferir('caixa: uma linha por obra, inclusive a Empresa', caixa.porObra.length, 3)
conferir('caixa: parcelas vencidas de todas as obras', caixa.vencidas.map((l) => l.id), ['l7'])

console.log(`${ok}/${tot} — financeiro`)
process.exit(ok === tot ? 0 : 1)
