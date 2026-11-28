// Roteamento por estado (sem endereço no navegador), igual para todos os perfis.
// Cada perfil (AppEngenheiro, AppMestre, AppFinanceiro, AppCliente) só diz quais telas e quais menus tem.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { Carregando, ErroCarga, Vazio } from '../components/index.jsx'
import { Shell } from '../components/Shell.jsx'

// Telas presas a um item da obra: ao trocar de obra, voltam para a lista.
// Materiais volta para si mesma sem a aba que veio do painel (era de um material da obra anterior).
const AO_TROCAR_OBRA = { frente: 'frentes', dia: 'diario', lancarDiario: 'diario', lancarNota: 'financeiro', materiais: 'materiais' }
// Qual item do menu fica aceso em cada tela.
const MENU_DA_TELA = { frente: 'frentes', dia: 'diario', lancarDiario: 'diario', lancarNota: 'financeiro' }
// Telas que funcionam mesmo sem nenhuma obra cadastrada.
const SEM_OBRA = ['caixa', 'obras', 'pessoas', 'perfil', 'mais']

// Para onde o "voltar" leva quando não há de onde voltar (ex.: app aberto direto no detalhe).
const VOLTA_PADRAO = { frente: 'frentes', dia: 'diario', lancarDiario: 'diario', lancarNota: 'financeiro' }
const NOME_TELA = {
  hoje: 'Hoje', frentes: 'Frentes', frente: 'Frente', diario: 'Diário', dia: 'Dia do diário',
  materiais: 'Materiais', financeiro: 'Financeiro', caixa: 'Caixa geral', obras: 'Obras',
}
// Telas de formulário: o botão flutuante sai da frente.
const SEM_FAB = ['lancarNota', 'lancarDiario']

export default function AppBase({ profile, config }) {
  const { carregando, erro, obra, trocarObra } = useObra()
  // `pilha` = de onde a pessoa veio, para o "voltar" levar de volta à tela de origem.
  const [rota, setRota] = useState({ tela: config.inicial, params: {}, pilha: [] })

  const topo = () => window.scrollTo(0, 0)
  // goto: navega guardando a tela atual. `substituir`: troca no lugar (setas do dia).
  const goto = (tela, params = {}, { substituir = false } = {}) => {
    if (!config.telas[tela]) return
    setRota((r) => ({ tela, params, pilha: substituir ? r.pilha : [...r.pilha, { tela: r.tela, params: r.params }] }))
    topo()
  }
  // Menu (barra e lateral): começa do zero, sem histórico.
  const irPara = (tela) => {
    if (!config.telas[tela]) return
    setRota({ tela, params: {}, pilha: [] })
    topo()
  }
  const anterior = rota.pilha[rota.pilha.length - 1] ?? { tela: VOLTA_PADRAO[rota.tela] ?? config.inicial, params: {} }
  const voltar = {
    rotulo: NOME_TELA[anterior.tela] ?? 'Voltar',
    ir: () => { setRota((r) => ({ ...anterior, pilha: r.pilha.slice(0, -1) })); topo() },
  }
  const aoTrocarObra = (id) => {
    trocarObra(id)
    if (AO_TROCAR_OBRA[rota.tela]) setRota({ tela: AO_TROCAR_OBRA[rota.tela], params: {}, pilha: [] })
    else setRota((r) => ({ ...r, pilha: [] }))
  }

  let corpo
  if (carregando) corpo = <Carregando />
  else if (erro) corpo = <ErroCarga mensagem={erro} />
  else if (!obra && !SEM_OBRA.includes(rota.tela)) {
    corpo = (
      <div className="card">
        <Vazio icone="obras" titulo="Nenhuma obra ainda." texto={config.semObra.texto}
          botao={config.semObra.botao} onBotao={() => goto('obras')} />
      </div>
    )
  } else {
    const Tela = config.telas[rota.tela]
    // temTela: a tela pergunta se um link leva a algum lugar neste perfil (ex.: o Contador não tem Lançar nota).
    corpo = <Tela goto={goto} temTela={(t) => !!config.telas[t]} voltar={voltar} params={rota.params} profile={profile} />
  }

  return (
    <Shell profile={profile} itensBarra={config.barra} itensLado={config.lado}
      ativo={MENU_DA_TELA[rota.tela] ?? rota.tela} irPara={irPara} onTrocarObra={aoTrocarObra}
      fab={config.fab && obra && !SEM_FAB.includes(rota.tela) ? { rotulo: config.fab.rotulo, onClick: () => goto(config.fab.tela) } : null}>
      {corpo}
    </Shell>
  )
}
