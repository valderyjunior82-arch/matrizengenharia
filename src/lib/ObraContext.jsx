import { createContext, useContext, useEffect, useState } from 'react'
import { definirObraAtual, listarObras } from './dados.js'
import { obraInicial, obrasDoSeletor } from './escopo.js'

// A obra escolhida no seletor do topo. Fica guardada por pessoa no navegador:
// fechou e abriu o app, volta na mesma obra.
const ObraCtx = createContext(null)
const chave = (profileId) => `matriz:obra:${profileId}`

function lerGuardada(profileId) {
  try { return localStorage.getItem(chave(profileId)) } catch (_e) { return null }
}
function guardar(profileId, obraId) {
  try { localStorage.setItem(chave(profileId), obraId) } catch (_e) { /* sem armazenamento: só não lembra */ }
}

export function ObraProvider({ profile, children }) {
  const [estado, setEstado] = useState({ carregando: true, erro: null, todas: [], obraId: null })

  // Avisa a camada de dados ANTES de a tela nova montar: assim a primeira
  // busca da tela já sai filtrada pela obra certa.
  const aplicar = (todas, obraId) => {
    definirObraAtual(obraId)
    if (obraId) guardar(profile.id, obraId)
    setEstado({ carregando: false, erro: null, todas, obraId })
  }

  useEffect(() => {
    listarObras(profile).then(({ data, erro }) => {
      if (erro) { setEstado({ carregando: false, erro, todas: [], obraId: null }); return }
      aplicar(data, obraInicial(obrasDoSeletor(data), lerGuardada(profile.id)))
    })
  }, [profile.id])

  const obras = obrasDoSeletor(estado.todas)
  const valor = {
    ...estado,
    obras,
    obra: estado.todas.find((o) => o.id === estado.obraId) ?? null,
    trocarObra: (id) => aplicar(estado.todas, id),
  }
  return <ObraCtx.Provider value={valor}>{children}</ObraCtx.Provider>
}

export const useObra = () => useContext(ObraCtx)
