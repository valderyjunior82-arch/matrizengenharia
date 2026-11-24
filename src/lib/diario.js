// Regras do diário e das fotos. Puro: mock, banco e telas perguntam aqui.
import { camposDiario, paraNumero, validar } from './formularios.js'

// Onde a foto mora no Storage. A pasta da data é o que separa as fotos por dia
// (e é o que a regra do banco lê para deixar o Mestre enviar só no dia de hoje).
export const caminhoFoto = (obraId, data, id) => `${obraId}/${data}/${id}.jpg`

// Fotos agrupadas por dia, o mais recente primeiro; dentro do dia, na ordem em que entraram.
export function fotosPorDia(fotos) {
  const dias = [...new Set(fotos.map((f) => f.data))].sort().reverse()
  return dias.map((data) => ({ data, fotos: fotos.filter((f) => f.data === data) }))
}

// "Sala · Porcelanato" — ambiente e a primeira palavra do serviço; foto sem frente vira "Geral".
export function rotuloFoto(foto, frentes) {
  const servico = frentes.find((f) => f.id === foto.frente_id)?.servico?.split(/[\s–]/)[0]
  return [foto.ambiente, servico].filter(Boolean).join(' · ') || 'Geral'
}

// O que o formulário vira na tabela. Frente e % só existem no Avanço.
// Devolve { erro } se faltar campo, para mock e banco recusarem do mesmo jeito.
export function camposDoRegistro(tipo, valores) {
  if (Object.keys(validar(camposDiario(tipo), valores)).length) return { erro: 'Confira os campos marcados.' }
  const avanco = tipo === 'Avanço'
  const pct = String(valores.percentual_novo ?? '').trim()
  return {
    campos: {
      tipo,
      frente_id: avanco ? valores.frente_id : null,
      texto: valores.texto.trim(),
      percentual_novo: avanco && pct !== '' ? Math.round(paraNumero(pct)) : null,
    },
  }
}

// Frentes que aceitam Avanço: as não concluídas; na edição, também a do próprio registro.
export const frentesParaAvanco = (frentes, registro) =>
  frentes.filter((f) => f.situacao !== 'Concluída' || f.id === registro?.frente_id)

// Registro novo sempre mexe na frente; a edição só se o % mudou (o gatilho de update tem o mesmo WHEN, migration 06).
export const mexeNaFrente = (anterior, campos) => !anterior || anterior.percentual_novo !== campos.percentual_novo

// O que um Avanço faz na frente — espelho do gatilho diario_atualiza_frente (migrations 04 e 05),
// para o mock se comportar como o banco. Avanço de data antiga não desfaz o % mais novo.
export function frenteAposAvanco(frente, registro) {
  if (registro.tipo !== 'Avanço' || registro.frente_id !== frente.id) return frente
  const maisNovo = !frente.ultimo_avanco_em || registro.data >= frente.ultimo_avanco_em
  return {
    ...frente,
    percentual: maisNovo && registro.percentual_novo != null ? registro.percentual_novo : frente.percentual,
    ultimo_avanco_em: maisNovo ? registro.data : frente.ultimo_avanco_em,
    situacao: ['Não iniciada', 'Parada'].includes(frente.situacao) ? 'Em andamento' : frente.situacao,
  }
}
