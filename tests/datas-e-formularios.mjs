// "Hoje" no fuso do engenheiro e a validação dos formulários.
import { hojeNoFuso, segundaDaSemana } from '../src/lib/datas.js'
import { brl, diaRelativo } from '../src/lib/formato.js'
import { CAMPOS_NOTA, CAMPOS_OBRA, CAMPOS_RECEBIMENTO, CAMPOS_SALDO_BANCO, camposDiario, paraDinheiro, paraNumero, validar } from '../src/lib/formularios.js'
import { CATEGORIAS, SITUACOES_OBRA } from '../src/lib/vocabulario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// 22h de 23/11 no fuso UTC−4 = 02h de 24/11 em UTC. Tem que continuar 23/11.
conferir('diário lançado às 22h fica no mesmo dia', hojeNoFuso(new Date('2026-11-24T02:00:00Z')), '2026-11-23')
conferir('segunda da semana de um sábado', segundaDaSemana('2026-11-21'), '2026-11-16')
conferir('dinheiro no formato brasileiro', brl(1234.5), 'R$ 1.234,50')
conferir('ontem vira "Ontem"', diaRelativo('2026-11-22', '2026-11-23'), 'Ontem')
conferir('dia antigo vira dia da semana com data', diaRelativo('2026-11-21', '2026-11-23'), 'sábado, 21/11/2026')

conferir('situações da obra (pedido do engenheiro)', SITUACOES_OBRA, ['Em andamento', 'Parada', 'Concluída'])
conferir('obra sem nome e sem código não salva', Object.keys(validar(CAMPOS_OBRA, { situacao: 'Em andamento' })), ['nome', 'codigo'])
conferir('obra completa salva', validar(CAMPOS_OBRA, { nome: 'Casa 12', codigo: 'CASA-12', situacao: 'Em andamento' }), {})

const nota = { obra_id: 'o1', data: '2026-11-23', tipo: 'Saída', categoria: CATEGORIAS[1], pago_por: 'Engenheiro', banco: 'Santander' }
conferir('nota com valor zero é recusada', validar(CAMPOS_NOTA, { ...nota, valor: '0' }).valor, 'Precisa ser maior que zero.')
// Bug de 25/11: "12.000" virava 12 (o ponto era lido como decimal).
conferir('valor com ponto de milhar', ['12.000', '1.170', '1.234.567', 'R$ 12.000,50', '2.5', '2,5', '12', '-3.648,12', '-1.500'].map(paraDinheiro), [12000, 1170, 1234567, 12000.5, 2.5, 2.5, 12, -3648.12, -1500])
// Achado da revisão de 25/11: o milhar valia também em quantidade, e "1.500" kg virava 1500.
// Achado da revisão de 25/11: saldo de milhão sem centavos era recusado.
conferir('saldo do banco aceita milhar, zero e negativo', ['1.250.000', '0', '-3.648,12'].map((valor) => validar(CAMPOS_SALDO_BANCO, { para_banco: 'Inter', data: '2026-11-25', valor })), [{}, {}, {}])
conferir('quantidade com ponto continua decimal', ['1.500', '2.5', '1,5'].map(paraNumero), [1.5, 2.5, 1.5])
conferir('nota com valor em reais passa', validar(CAMPOS_NOTA, { ...nota, valor: '1.170,00' }), {})
conferir('saída sem "pago por" é recusada', validar(CAMPOS_NOTA, { ...nota, valor: '10', pago_por: '' }).pago_por, 'Preencha este campo.')
conferir('entrada não cobra "pago por"', validar(CAMPOS_NOTA, { ...nota, tipo: 'Entrada', valor: '10', pago_por: '' }), {})

conferir('marcar recebida sem forma e sem banco é recusado', Object.keys(validar(CAMPOS_RECEBIMENTO, { data: '2026-11-23' })), ['forma_pagamento', 'banco'])
conferir('marcar recebida com data, Pix e banco passa', validar(CAMPOS_RECEBIMENTO, { data: '2026-11-23', forma_pagamento: 'Pix', banco: 'Inter' }), {})
conferir('saída do engenheiro sem banco é recusada', validar(CAMPOS_NOTA, { ...nota, valor: '10', banco: '' }).banco, 'Preencha este campo.')
conferir('parcela ainda não recebida não cobra banco (achado 25/11)',
  validar(CAMPOS_NOTA, { ...nota, tipo: 'Entrada', categoria: 'Recebimento do cliente', valor: '10', banco: '', situacao: 'Previsto' }), {})
conferir('saída paga pelo cliente não cobra banco', validar(CAMPOS_NOTA, { ...nota, valor: '10', pago_por: 'Cliente', banco: '' }), {})

conferir('avanço sem frente é recusado', Object.keys(validar(camposDiario('Avanço'), { texto: 'Rodapé' })), ['frente_id'])
conferir('% acima de 100 é recusado', validar(camposDiario('Avanço'), { frente_id: 'f2', texto: 'x', percentual_novo: '120' }).percentual_novo, 'Máximo 100.')
conferir('equipe não pede frente', validar(camposDiario('Equipe'), { texto: 'Gesso 2' }), {})

console.log(`${ok}/${tot} — datas e formulários`)
process.exit(ok === tot ? 0 : 1)
