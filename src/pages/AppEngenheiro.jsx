// Engenheiro: vê tudo, inclusive dinheiro. Entra em Hoje.
// Celular: Hoje · Frentes · Diário · Materiais · Mais. Botão "Lançar nota" em todas as telas.
import AppBase from './AppBase.jsx'
import Hoje from '../screens/hoje.jsx'
import Frentes from '../screens/frentes.jsx'
import Frente from '../screens/frente.jsx'
import Diario from '../screens/diario.jsx'
import Dia from '../screens/dia.jsx'
import LancarDiario from '../screens/lancarDiario.jsx'
import Materiais from '../screens/materiais.jsx'
import Financeiro from '../screens/financeiro.jsx'
import LancarNota from '../screens/lancarNota.jsx'
import Caixa from '../screens/caixa.jsx'
import Obras from '../screens/obras.jsx'
import Pessoas from '../screens/pessoas.jsx'
import Perfil from '../screens/perfil.jsx'
import Mais from '../screens/mais.jsx'
import Cadastros from '../screens/cadastros.jsx'

const CONFIG = {
  inicial: 'hoje',
  telas: { hoje: Hoje, frentes: Frentes, frente: Frente, diario: Diario, dia: Dia, lancarDiario: LancarDiario, materiais: Materiais, financeiro: Financeiro, lancarNota: LancarNota, caixa: Caixa, obras: Obras, pessoas: Pessoas, perfil: Perfil, mais: Mais, cadastros: Cadastros },
  barra: [
    { id: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
    { id: 'frentes', rotulo: 'Frentes', icone: 'frentes' },
    { id: 'diario', rotulo: 'Diário', icone: 'diario' },
    { id: 'materiais', rotulo: 'Materiais', icone: 'materiais' },
    { id: 'mais', rotulo: 'Mais', icone: 'mais' },
  ],
  lado: {
    principal: [
      { id: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
      { id: 'frentes', rotulo: 'Frentes', icone: 'frentes' },
      { id: 'diario', rotulo: 'Diário', icone: 'diario' },
      { id: 'materiais', rotulo: 'Materiais', icone: 'materiais' },
      { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
    ],
    gestao: [
      { id: 'caixa', rotulo: 'Caixa geral', icone: 'caixa' },
      { id: 'cadastros', rotulo: 'Cadastros', icone: 'diario' },
      { id: 'obras', rotulo: 'Obras', icone: 'obras' },
      { id: 'pessoas', rotulo: 'Pessoas', icone: 'pessoas' },
    ],
  },
  fab: { rotulo: 'Lançar nota', tela: 'lancarNota' },
  semObra: { texto: 'Cadastre a primeira obra para começar.', botao: 'Cadastrar obra' },
}

export default function AppEngenheiro({ profile }) {
  return <AppBase profile={profile} config={CONFIG} />
}
