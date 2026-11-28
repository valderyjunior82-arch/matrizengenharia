// Financeiro e Contador (decisão do engenheiro em 27/11/2026): o dinheiro de todas as obras.
// Não têm Hoje, Frentes, Diário, Materiais, Obras nem Pessoas.
// O Financeiro lança (Lançar nota, Cadastros); o Contador só olha: as telas de gravar
// nem existem para ele, e as que sobram escondem os botões com mexeDinheiro().
import AppBase from './AppBase.jsx'
import Financeiro from '../screens/financeiro.jsx'
import LancarNota from '../screens/lancarNota.jsx'
import Caixa from '../screens/caixa.jsx'
import Cadastros from '../screens/cadastros.jsx'
import Perfil from '../screens/perfil.jsx'
import { mexeDinheiro } from '../lib/permissoes.js'

const FINANCEIRO = { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' }
const CAIXA = { id: 'caixa', rotulo: 'Caixa geral', icone: 'caixa' }
const CADASTROS = { id: 'cadastros', rotulo: 'Cadastros', icone: 'diario' }
const PERFIL = { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' }

const SEM_OBRA = { texto: 'Nenhuma obra em andamento. O Caixa geral continua mostrando todas.', botao: null }

const CONFIG_FINANCEIRO = {
  inicial: 'financeiro',
  telas: { financeiro: Financeiro, lancarNota: LancarNota, caixa: Caixa, cadastros: Cadastros, perfil: Perfil },
  barra: [FINANCEIRO, CAIXA, CADASTROS, PERFIL],
  lado: { principal: [FINANCEIRO], gestao: [CAIXA, CADASTROS] },
  fab: { rotulo: 'Lançar nota', tela: 'lancarNota' },
  semObra: SEM_OBRA,
}

const CONFIG_CONTADOR = {
  inicial: 'financeiro',
  telas: { financeiro: Financeiro, caixa: Caixa, perfil: Perfil },
  barra: [FINANCEIRO, CAIXA, PERFIL],
  lado: { principal: [FINANCEIRO], gestao: [CAIXA] },
  fab: null,
  semObra: SEM_OBRA,
}

export default function AppFinanceiro({ profile }) {
  return <AppBase profile={profile} config={mexeDinheiro(profile) ? CONFIG_FINANCEIRO : CONFIG_CONTADOR} />
}
