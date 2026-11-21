// Decide o que mostrar: login, conta pendente ou o app do perfil.
// O ObraProvider envolve o app inteiro: toda tela sabe em qual obra está.
import { SessaoProvider, useSessao } from './lib/SessaoContext.jsx'
import { ObraProvider } from './lib/ObraContext.jsx'
import { ehEngenheiro, ehMestre } from './lib/permissoes.js'
import { Avisos } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import AppEngenheiro from './pages/AppEngenheiro.jsx'
import AppMestre from './pages/AppMestre.jsx'

function Raiz() {
  const { profile } = useSessao()
  if (!profile) return <Login />
  if (!ehEngenheiro(profile) && !ehMestre(profile)) return <Aguardando />
  return (
    <ObraProvider key={profile.id} profile={profile}>
      {ehEngenheiro(profile) ? <AppEngenheiro profile={profile} /> : <AppMestre profile={profile} />}
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
