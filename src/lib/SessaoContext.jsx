import { createContext, useContext, useState } from 'react'
import { obterPerfil } from './dados.js'

// Quem está usando o app. No mock, o "login" é escolher uma pessoa de teste;
// na etapa do banco, isto passa a ouvir o login do Supabase.
const SessaoCtx = createContext(null)
const CHAVE = 'matriz:pessoa-teste'

function lerGuardado() {
  try { return localStorage.getItem(CHAVE) } catch (_e) { return null }
}
function guardar(id) {
  try {
    if (id) localStorage.setItem(CHAVE, id)
    else localStorage.removeItem(CHAVE)
  } catch (_e) { /* navegador sem armazenamento: só não lembra */ }
}

export function SessaoProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    const id = lerGuardado()
    return id ? obterPerfil(id) : null
  })

  const entrar = (id) => { guardar(id); setProfile(obterPerfil(id)) }
  const sair = () => { guardar(null); setProfile(null) }

  return <SessaoCtx.Provider value={{ profile, entrar, sair }}>{children}</SessaoCtx.Provider>
}

export const useSessao = () => useContext(SessaoCtx)
