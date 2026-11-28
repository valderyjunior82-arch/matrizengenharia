// Decide o que mostrar: login, conta pendente ou o app do perfil.
// O ObraProvider envolve o app inteiro: toda tela sabe em qual obra está.
import { SessaoProvider, useSessao } from './lib/SessaoContext.jsx'
import { ObraProvider } from './lib/ObraContext.jsx'
import { temAcesso } from './lib/permissoes.js'
import { Avisos } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppMestre from './pages/AppMestre.jsx'
import AppFinanceiro from './pages/AppFinanceiro.jsx'
import AppCliente from './pages/AppCliente.jsx'

// Um app por perfil; cada um só diz quais telas e quais menus tem (AppBase faz o resto).
// Financeiro e Contador usam o mesmo app: o Contador só não grava (AppFinanceiro decide).
const APP_DO_PAPEL = {
  Engenheiro: AppEngenheiro, Mestre: AppMestre, Financeiro: AppFinanceiro, Contador: AppFinanceiro, Cliente: AppCliente,
}

function Raiz() {
  const { profile, carregando } = useSessao()
  if (carregando) return <div className="entrada"><div className="aviso">Carregando…</div></div>
  if (!profile) return <Login />
  if (!temAcesso(profile)) return <Aguardando />
  const AppDoPerfil = APP_DO_PAPEL[profile.role]
  // key com o papel: trocar o perfil de alguém remonta o app inteiro (menus e tela inicial novos).
  return (
    <ObraProvider key={`${profile.id}:${profile.role}`} profile={profile}>
      <AppDoPerfil profile={profile} />
    </ObraProvider>
  )
}

export default function App() {
  return (
    <SessaoProvider>
      <Raiz />
      <Avisos />
    </SessaoProvider>
  )
}
