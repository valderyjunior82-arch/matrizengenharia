// Contas do financeiro. Nada é guardado pronto: tudo sai dos lançamentos.
// Dinheiro somado em centavos, para 0,1 + 0,2 não virar 0,30000000000000004.
import { somarDias, segundaDaSemana } from './datas.js'
import { BANCOS, CONTAS_ENTRADA, CONTAS_SAIDA, TIPOS_LANCAMENTO } from './vocabulario.js'
import { paraDinheiro } from './formularios.js'
import { brl } from './formato.js'

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

// Pagamento do empreiteiro = Saída realizada ligada ao contrato. A lista da aba Contrato e o "já pago" usam a mesma regra.
export const pagamentosDoContrato = (contratoId, lancamentos) =>
  lancamentos.filter((l) => l.contrato_empreiteiro_id === contratoId && ehSaidaRealizada(l))

export const pagoDoContrato = (contratoId, lancamentos) => soma(pagamentosDoContrato(contratoId, lancamentos))

// Contrato com nota ligada (paga ou prevista) não se apaga: a nota perderia o empreiteiro.
export const MSG_CONTRATO_COM_PAGAMENTO = 'Este contrato já tem pagamentos lançados. Exclua os pagamentos antes, ou só edite o contrato.'

// Editar o contrato: o valor não pode ficar abaixo do que já foi pago (decisão de 25/11: recusar com aviso).
export function erroValorDoContrato(valor, pago) {
  return centavos(valor) < centavos(pago) ? `O valor não pode ser menor que o já pago (${brl(pago)}).` : null
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

// ---------- Lançamentos: filtro, nota → linha do banco ----------

// Filtros da aba Lançamentos: mês ('AAAA-MM'), conta e frente. Vazio = sem filtro.
export function filtrarLancamentos(lista, { mes, categoria, frente_id } = {}) {
  return lista.filter((l) => (!mes || l.data.slice(0, 7) === mes)
    && (!categoria || l.categoria === categoria)
    && (!frente_id || l.frente_id === frente_id))
}

// Os meses que têm lançamento realizado, mais o de hoje, do mais novo para o mais velho.
export const mesesDe = (lancamentos, hoje) =>
  [...new Set([hoje.slice(0, 7), ...lancamentos.filter((l) => l.situacao === 'Realizado').map((l) => l.data.slice(0, 7))])].sort().reverse()

// Frente, material e contrato só valem na obra do seletor (as listas da tela são dela).
// Nota de outra obra, ou da Empresa, sai sem eles. A tela e camposDaNota usam esta mesma regra.
export const vinculosValem = (obraDaNota, obraAtualId) => obraDaNota === obraAtualId

// O formulário de Lançar nota vira a linha do banco. Entrada não tem "pago por".
// Frente, material e contrato só valem na obra do seletor (as listas são dela).
// Editar não muda a situação: parcela continua parcela.
export function camposDaNota(valores, obraAtualId, anterior = null) {
  const tipo = valores.tipo
  const contas = tipo === 'Entrada' ? CONTAS_ENTRADA : CONTAS_SAIDA
  if (!TIPOS_LANCAMENTO.includes(tipo)) return { erro: 'Escolha Entrada ou Saída.' }
  if (!contas.includes(valores.categoria)) return { erro: 'Escolha uma conta da lista.' }
  const valor = paraDinheiro(valores.valor)
  if (!(valor > 0)) return { erro: 'O valor precisa ser maior que zero.' }
  if (!valores.data) return { erro: 'Informe a data.' }
  const texto = (v) => String(v ?? '').trim() || null
  const daObra = vinculosValem(anterior?.obra_id ?? valores.obra_id, obraAtualId)
  const situacao = anterior?.situacao ?? 'Realizado'
  const pagoPor = tipo === 'Saída' ? (valores.pago_por || 'Engenheiro') : null
  // Banco só existe quando o dinheiro passou pelo seu caixa; parcela prevista ganha banco ao ser recebida.
  const temBanco = pagoPor !== 'Cliente'
  if (temBanco && situacao === 'Realizado' && !BANCOS.includes(valores.banco)) return { erro: 'Escolha o banco.' }
  return {
    campos: {
      data: valores.data, tipo, categoria: valores.categoria, valor,
      fornecedor: texto(valores.fornecedor), descricao: texto(valores.descricao),
      forma_pagamento: texto(valores.forma_pagamento),
      pago_por: pagoPor,
      banco: temBanco && BANCOS.includes(valores.banco) ? valores.banco : null,
      frente_id: daObra ? texto(valores.frente_id) : null,
      material_id: daObra ? texto(valores.material_id) : null,
      // Contrato de empreiteiro só em Saída: é pagamento dele.
      contrato_empreiteiro_id: daObra && tipo === 'Saída' ? texto(valores.contrato_empreiteiro_id) : null,
      situacao,
      // Parcela ainda não recebida: a data É o vencimento (como em camposDaParcela).
      ...(situacao === 'Previsto' && { vencimento: valores.data }),
    },
  }
}

// Nova parcela do cliente: Entrada · Recebimento do cliente · Previsto, data = vencimento.
export function camposDaParcela(valores) {
  const valor = paraDinheiro(valores.valor)
  if (!String(valores.descricao ?? '').trim()) return { erro: 'Preencha a descrição.' }
  if (!(valor > 0)) return { erro: 'O valor precisa ser maior que zero.' }
  if (!valores.vencimento) return { erro: 'Informe o vencimento.' }
  return {
    campos: {
      tipo: 'Entrada', categoria: 'Recebimento do cliente', situacao: 'Previsto',
      descricao: valores.descricao.trim(), valor, data: valores.vencimento, vencimento: valores.vencimento,
    },
  }
}

// Marcar parcela recebida: data, forma e o banco em que entrou.
export function camposDoRecebimento({ data, forma_pagamento, banco }) {
  if (!data || !forma_pagamento || !BANCOS.includes(banco)) return { erro: 'Informe a data, a forma de pagamento e o banco.' }
  return { campos: { situacao: 'Realizado', data, forma_pagamento, banco } }
}

// Transferência entre bancos e saldo inicial (o extrato no começo do dia).
// Não são gasto nem receita: só mexem no saldo de cada banco.
export function camposDoMovimento(tipo, valores) {
  const valor = paraDinheiro(valores.valor)
  if (!valores.data) return { erro: 'Informe a data.' }
  if (!BANCOS.includes(valores.para_banco)) return { erro: 'Escolha o banco.' }
  const base = { tipo, data: valores.data, para_banco: valores.para_banco, descricao: String(valores.descricao ?? '').trim() || null }
  if (tipo === 'Saldo inicial') {
    if (Number.isNaN(valor)) return { erro: 'Use só números no saldo.' }
    return { campos: { ...base, de_banco: null, valor } }
  }
  if (!BANCOS.includes(valores.de_banco)) return { erro: 'Escolha de qual banco sai.' }
  if (valores.de_banco === valores.para_banco) return { erro: 'Escolha dois bancos diferentes.' }
  if (!(valor > 0)) return { erro: 'O valor precisa ser maior que zero.' }
  return { campos: { ...base, de_banco: valores.de_banco, valor } }
}

// ---------- Fluxo de caixa, DRE e painel ----------
// Mexe no caixa: entrada realizada (+) e saída realizada paga pelo Engenheiro (−).
// Nota paga pelo Cliente fica fora, como no saldo.
const noCaixa = (l) => l.situacao === 'Realizado' && (ehEntrada(l) || l.pago_por === 'Engenheiro')
const chaveDe = (modo) => (l) => (modo === 'mes' ? l.data.slice(0, 7) : l.data)

// modo 'dia' ou 'mes'. Linhas do mais novo para o mais velho, com o saldo acumulado
// até aquele período. `previsto`: parcelas ainda não recebidas, pelo vencimento.
export function fluxoDeCaixa(lancamentos, modo) {
  const chave = chaveDe(modo)
  const grupos = new Map()
  for (const l of lancamentos.filter(noCaixa)) {
    const g = grupos.get(chave(l)) ?? { periodo: chave(l), entrou: 0, saiu: 0, itens: [] }
    if (ehEntrada(l)) g.entrou += centavos(l.valor)
    else g.saiu += centavos(l.valor)
    g.itens.push(l)
    grupos.set(chave(l), g)
  }
  let acumulado = 0
  const realizado = [...grupos.values()].sort((a, b) => (a.periodo < b.periodo ? -1 : 1)).map((g) => {
    acumulado += g.entrou - g.saiu
    return { ...g, entrou: g.entrou / 100, saiu: g.saiu / 100, saldo: (g.entrou - g.saiu) / 100, acumulado: acumulado / 100 }
  }).reverse()
  const previstos = new Map()
  for (const l of lancamentos.filter((x) => ehEntrada(x) && x.situacao === 'Previsto')) {
    const k = chave({ data: l.vencimento || l.data })
    previstos.set(k, (previstos.get(k) ?? 0) + centavos(l.valor))
  }
  const previsto = [...previstos].sort(([a], [b]) => (a < b ? -1 : 1)).map(([periodo, c]) => ({ periodo, entrou: c / 100 }))
  return { realizado, previsto }
}

// DRE do mês ('AAAA-MM'; null = desde o começo), só o que já aconteceu.
// Receitas e despesas por conta, cada uma com os lançamentos que formam o número.
// Despesa paga pelo Cliente aparece à parte: é custo da obra, mas não sai do resultado do engenheiro.
export function dre(lancamentos, mes) {
  const doPeriodo = lancamentos.filter((l) => l.situacao === 'Realizado' && (!mes || l.data.slice(0, 7) === mes))
  const porConta = (lista, ordem) => ordem
    .map((conta) => {
      const itens = lista.filter((l) => l.categoria === conta).sort((a, b) => (a.data < b.data ? 1 : -1))
      return { conta, total: soma(itens), itens }
    })
    .filter((c) => c.itens.length)
  const receitas = porConta(doPeriodo.filter(ehEntrada), CONTAS_ENTRADA)
  const saidas = doPeriodo.filter((l) => l.tipo === 'Saída')
  const despesas = porConta(saidas.filter((l) => l.pago_por === 'Engenheiro'), CONTAS_SAIDA)
  const doCliente = saidas.filter((l) => l.pago_por === 'Cliente')
  const totalReceitas = soma(receitas.flatMap((c) => c.itens))
  const totalDespesas = soma(despesas.flatMap((c) => c.itens))
  return {
    receitas, despesas, totalReceitas, totalDespesas,
    resultado: menos(totalReceitas, totalDespesas),
    pagoPeloCliente: { total: soma(doCliente), itens: doCliente },
  }
}

// Painel "Onde foi o dinheiro": todo o gasto realizado da obra por conta, do maior para o menor.
// Inclui a nota paga pelo Cliente, para fechar com o "Total gasto" do resumo (o DRE não inclui).
export function gastoPorConta(lancamentos) {
  const saidas = lancamentos.filter(ehSaidaRealizada)
  return CONTAS_SAIDA
    .map((conta) => {
      const itens = saidas.filter((l) => l.categoria === conta)
      return { conta, total: soma(itens), itens }
    })
    .filter((c) => c.itens.length)
    .sort((a, b) => b.total - a.total)
}

// Painel: entrou × saiu (do caixa) nos últimos `n` meses até o de hoje, mês sem lançamento = zero.
export function ultimosMeses(lancamentos, hoje, n = 6) {
  const meses = []
  let [a, m] = hoje.slice(0, 7).split('-').map(Number)
  for (let i = 0; i < n; i++) {
    meses.unshift(`${a}-${String(m).padStart(2, '0')}`)
    if (--m === 0) { m = 12; a-- }
  }
  const linhas = fluxoDeCaixa(lancamentos, 'mes').realizado
  return meses.map((mes) => {
    const l = linhas.find((x) => x.periodo === mes)
    return { mes, entrou: l?.entrou ?? 0, saiu: l?.saiu ?? 0 }
  })
}

// ---------- Saldo por banco (COMPARATIVO: junta todas as obras, porque o banco é um só) ----------
// Saldo = último saldo inicial do banco (no começo do dia `desde`) + o que entrou − o que saiu
// daquele dia em diante: lançamentos do caixa com aquele banco e transferências.
// Banco sem saldo inicial conta tudo desde sempre.
// `semBanco`: lançamentos do caixa sem banco, a partir do saldo inicial mais antigo em vigor (antes disso não importam).
export function saldosPorBanco(lancamentos, movimentos) {
  const iniciais = movimentos.filter((m) => m.tipo === 'Saldo inicial')
  const transf = movimentos.filter((m) => m.tipo === 'Transferência')
  const bancos = BANCOS.map((banco) => {
    // O mais recente vale; empate na data, o lançado por último (a lista vem na ordem de criação).
    const inicial = iniciais.filter((m) => m.para_banco === banco).reduce((a, m) => (!a || m.data >= a.data ? m : a), null)
    const desde = inicial?.data ?? null
    const conta = (data) => !desde || data >= desde
    let c = inicial ? centavos(inicial.valor) : 0
    for (const l of lancamentos) {
      if (l.banco === banco && noCaixa(l) && conta(l.data)) c += ehEntrada(l) ? centavos(l.valor) : -centavos(l.valor)
    }
    for (const t of transf) {
      if (!conta(t.data)) continue
      if (t.para_banco === banco) c += centavos(t.valor)
      if (t.de_banco === banco) c -= centavos(t.valor)
    }
    return { banco, saldo: c / 100, desde }
  })
  const primeiro = bancos.map((b) => b.desde).filter(Boolean).sort()[0]
  const semBanco = primeiro
    ? lancamentos.filter((l) => noCaixa(l) && !l.banco && l.data >= primeiro).sort((a, b) => (a.data < b.data ? 1 : -1))
    : []
  return { bancos, total: bancos.reduce((s, b) => s + centavos(b.saldo), 0) / 100, semBanco }
}
