import { useEffect, useState } from 'react'

// Busca dados ao abrir a tela e devolve os três estados: carregando, erro e dado.
// `buscar` é uma função que devolve { data, erro } (as funções de lib/dados.js).
export function useCarregar(buscar) {
  const [estado, setEstado] = useState({ carregando: true, data: null, erro: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let viva = true
    setEstado((e) => ({ ...e, carregando: true }))
    buscar().then((r) => {
      if (viva) setEstado({ carregando: false, data: r.data, erro: r.erro })
    })
    return () => { viva = false }
  }, [versao])

  return { ...estado, recarregar: () => setVersao((v) => v + 1) }
}

// Junta várias buscas numa só: { frentes: listarFrentes(), ... } → { data: { frentes, ... }, erro }
export async function juntar(buscas) {
  const nomes = Object.keys(buscas)
  const respostas = await Promise.all(nomes.map((n) => buscas[n]))
  const erro = respostas.find((r) => r.erro)?.erro ?? null
  if (erro) return { data: null, erro }
  return { data: Object.fromEntries(nomes.map((n, i) => [n, respostas[i].data])), erro: null }
}
