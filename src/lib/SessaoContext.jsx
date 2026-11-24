import { createContext, useContext, useEffect, useState } from 'react'
import {
  criarConta as criarContaDados, entrar as entrarDados, obterPerfil, retomarSessao, sairDaConta,
} from './dados.js'

// Quem está usando o app. No banco, o login do Supabase guarda a sessão sozinho;
// no mock, guardamos o id aqui (o mock não tem login de verdade).
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
  const [estado, setEstado] = useState({ carregando: true, profile: null })
  const setProfile = (profile) => setEstado({ carregando: false, profile })

  // Reabriu o app: volta logado, se a sessão ainda vale e a conta segue ativa.
  useEffect(() => { retomarSessao(lerGuardado()).then(setProfile) }, [])

  // Entrar e Criar conta devolvem { data, erro }: a tela mostra o erro.
  const comecar = async (pedido) => {
    const r = await pedido
    if (r.data) { guardar(r.data.id); setProfile(r.data) }
    return r
  }

  const sair = async () => {
    await sairDaConta()
    guardar(null)
    setProfile(null)
  }

  const valor = {
    profile: estado.profile,
    carregando: estado.carregando,
    entrar: (valores) => comecar(entrarDados(valores)),
    criarConta: (valores) => comecar(criarContaDados(valores)),
    atualizarPerfil: setProfile,
    // Relê a conta: liberada, o App troca de tela sozinho; desativada, volta ao login.
    // Falha de rede não desloga: só tenta de novo na próxima conferida.
    conferirConta: async () => {
      if (!estado.profile) return
      let p
      try { p = await obterPerfil(estado.profile.id) } catch (_e) { return }
      if (!p) await sair()
      else if (p.role !== estado.profile.role) setProfile(p)
    },
    sair,
  }
  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>
}

export const useSessao = () => useContext(SessaoCtx)
