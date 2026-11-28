// Cliente (dono da reforma, decisão do engenheiro em 27/11/2026): só as obras em que foi colocado.
// Vê as frentes com a régua de prazo e o diário com fotos. NUNCA vê dinheiro nem materiais,
// e não lança nada: as telas de gravar não existem aqui, e o banco recusa (migration 13).
import AppBase from './AppBase.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Diario from '../screens/diario.jsx'
import Dia from '../screens/dia.jsx'
import Perfil from '../screens/perfil.jsx'

const ITENS = [
  { id: 'frentes', rotulo: 'Andamento', icone: 'frentes' },
  { id: 'diario', rotulo: 'Diário', icone: 'diario' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
]

const CONFIG = {
  inicial: 'frentes',
  telas: { frentes: Frentes, frente: Frente, diario: Diario, dia: Dia, perfil: Perfil },
  barra: ITENS,
  lado: { principal: ITENS.slice(0, 2), gestao: [] },
  fab: null,
  semObra: { texto: 'Sua obra ainda não foi liberada para você. Fale com o engenheiro.', botao: null },
}

export default function AppCliente({ profile }) {
  return <AppBase profile={profile} config={CONFIG} />
}
