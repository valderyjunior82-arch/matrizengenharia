// Contas do financeiro. Nada é guardado pronto: tudo sai dos lançamentos.
// Dinheiro somado em centavos, para 0,1 + 0,2 não virar 0,30000000000000004.
import { somarDias, segundaDaSemana } from './datas.js'

const centavos = (v) => Math.round(Number(v) * 100)
const soma = (lista) => lista.reduce((s, l) => s + centavos(l.valor), 0) / 100
const menos = (a, b) => (centavos(a) - centavos(b)) / 100
const ehEntrada = (l) => l.tipo === 'Entrada'
const ehSaidaRealizada = (l) => l.tipo === 'Saída' && l.situacao === 'Realizado'

export function resumoObra(lancamentos, hoje) {
  const entradas = lancamentos.filter(ehEntrada)
  const saidas = lancamentos.filter(ehSaidaRealizada)
  const ontem = somarDias(hoje, -1)
  const segunda = segundaDaSemana(hoje)
  const recebido = soma(entradas.filter((l) => l.situacao === 'Realizado'))
  return {
    contratado: soma(entradas.filter((l) => l.categoria === 'Recebimento do cliente')),
    recebido,
    aReceber: soma(entradas.filter((l) => l.situacao === 'Previsto')),
    vencido: soma(entradas.filter((l) => l.situacao === 'Previsto' && l.vencimento && l.vencimento < hoje)),
    gasto: soma(saidas),
    // Nota paga pelo Cliente conta no gasto da obra, mas não mexe no caixa.
    saldo: menos(recebido, soma(saidas.filter((l) => l.pago_por === 'Engenheiro'))),
    gastoOntem: soma(saidas.filter((l) => l.data === ontem)),
    gastoSemana: soma(saidas.filter((l) => l.data >= segunda && l.data <= hoje)),
  }
}

export function pagoDoContrato(contratoId, lancamentos) {
  return soma(lancamentos.filter((l) => l.contrato_empreiteiro_id === contratoId && ehSaidaRealizada(l)))
}

export function parcelasDoCliente(lancamentos) {
  const quando = (l) => l.vencimento || l.data
  return lancamentos
    .filter((l) => ehEntrada(l) && l.categoria === 'Recebimento do cliente')
    .sort((a, b) => (quando(a) < quando(b) ? -1 : quando(a) > quando(b) ? 1 : 0))
}

// 'Recebida' · 'Vencida' · 'A vencer'
export function situacaoParcela(p, hoje) {
  if (p.situacao === 'Realizado') return 'Recebida'
  if (p.vencimento && p.vencimento < hoje) return 'Vencida'
  return 'A vencer'
}

export function lancamentosRecentes(lancamentos) {
  return lancamentos
    .filter((l) => l.situacao === 'Realizado')
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
}

// Caixa geral: a ÚNICA conta que junta obras, porque a tela é um comparativo.
// `mes` no formato 'AAAA-MM'.
export function caixaGeral(obras, lancamentos, hoje, mes) {
  const doMes = (l) => l.data.slice(0, 7) === mes
  const realizadas = lancamentos.filter((l) => l.situacao === 'Realizado')
  const entradasReal = realizadas.filter(ehEntrada)
  const saidasEng = realizadas.filter((l) => l.tipo === 'Saída' && l.pago_por === 'Engenheiro')
  const entrouMes = soma(entradasReal.filter(doMes))
  const saiuMes = soma(saidasEng.filter(doMes))
  return {
    saldoCaixa: menos(soma(entradasReal), soma(saidasEng)),
    entrouMes,
    saiuMes,
    resultadoMes: menos(entrouMes, saiuMes),
    porObra: obras.map((o) => ({ obra: o, ...resumoObra(lancamentos.filter((l) => l.obra_id === o.id), hoje) })),
    vencidas: lancamentos
      .filter((l) => ehEntrada(l) && l.situacao === 'Previsto' && l.vencimento && l.vencimento < hoje)
      .map((l) => ({ ...l, obra: obras.find((o) => o.id === l.obra_id) })),
  }
}
