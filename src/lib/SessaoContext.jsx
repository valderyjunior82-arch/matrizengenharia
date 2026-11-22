import { createContext, useContext, useState } from 'react'
import { criarConta as criarContaDados, entrar as entrarDados, obterPerfil } from './dados.js'

// Quem está usando o app. No mock, email e senha são conferidos em dados.js;
// na etapa do banco, isto passa a ouvir o login do Supabase.
const SessaoCtx = createContext(null)
const CHAVE = 'matriz:sessao'

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

  // Entrar e Criar conta devolvem { data, erro }: a tela mostra o erro.
  const comecar = async (pedido) => {
    const r = await pedido
    if (r.data) { guardar(r.data.id); setProfile(r.data) }
    return r
  }

  const valor = {
    profile,
    entrar: (valores) => comecar(entrarDados(valores)),
    criarConta: (valores) => comecar(criarContaDados(valores)),
    atualizarPerfil: setProfile,
    // Relê a conta: liberada, o App troca de tela sozinho; desativada, volta ao login.
    // shortcut: no mock o perfil vive na memória desta aba, então só muda de verdade com o banco.
    conferirConta: () => {
      if (!profile) return
      const p = obterPerfil(profile.id)
      if (!p) { guardar(null); setProfile(null) } else if (p.role !== profile.role) setProfile(p)
    },
    sair: () => { guardar(null); setProfile(null) },
  }
  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>
}

export const useSessao = () => useContext(SessaoCtx)
