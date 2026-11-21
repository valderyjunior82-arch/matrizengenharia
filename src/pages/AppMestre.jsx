// Mestre (mestre de obra ou estagiário): entra no Diário de hoje.
// NUNCA vê valor em dinheiro: as telas de Financeiro, Caixa e Lançar nota
// nem existem neste perfil, e o detalhe da frente esconde a aba Contrato.
import AppBase from './AppBase.jsx'
import Diario from '../screens/diario.jsx'
import Dia from '../screens/dia.jsx'
import LancarDiario from '../screens/lancarDiario.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Materiais from '../screens/materiais.jsx'
import Perfil from '../screens/perfil.jsx'

const ITENS = [
  { id: 'diario', rotulo: 'Diário', icone: 'diario' },
  { id: 'frentes', rotulo: 'Frentes', icone: 'frentes' },
  { id: 'materiais', rotulo: 'Materiais', icone: 'materiais' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
]

const CONFIG = {
  inicial: 'diario',
  telas: { diario: Diario, dia: Dia, lancarDiario: LancarDiario, frentes: Frentes, frente: Frente, materiais: Materiais, perfil: Perfil },
  barra: ITENS,
  lado: { principal: ITENS.slice(0, 3), gestao: [] },
  fab: null,
  semObra: { texto: 'Você ainda não foi colocado em nenhuma obra. Fale com o engenheiro.', botao: null },
}

export default function AppMestre({ profile }) {
  return <AppBase profile={profile} config={CONFIG} />
}
