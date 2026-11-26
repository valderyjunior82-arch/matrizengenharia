// Materiais — abas Aguardando aprovação · A comprar · Comprado · Entregue, o mais urgente primeiro.
// Engenheiro cadastra, edita, exclui e aprova o pedido do Mestre. O Mestre pede material
// (só vira compra quando o Engenheiro aprova) e marca entregue. Quem decide os botões é a lib.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { excluirMaterial, listarFrentes, listarMateriais, mudarSituacaoMaterial, salvarMaterial } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { acoesDoMaterial, camposDoFormulario, materiaisNaSituacao, PEDIDO } from '../lib/materiais.js'
import { SITUACOES_MATERIAL } from '../lib/vocabulario.js'
import { ehEngenheiro } from '../lib/permissoes.js'
import { plural } from '../lib/formato.js'
import { avisar, Carregando, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'
import { LinhaMaterial } from '../components/pecas.jsx'

const ROTULO_ABA = { [PEDIDO]: 'Aguardando' }

export default function Materiais({ goto, profile }) {
  const hoje = hojeDe()
  const engenheiro = ehEngenheiro(profile)
  const [aba, setAba] = useState('A comprar')
  // { tipo: 'novo' | 'editar' | 'entregue' | 'recusar' | 'excluir', m? }
  const [folha, setFolha] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({ materiais: listarMateriais(), frentes: listarFrentes() }))

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { materiais, frentes } = data
  const frenteDe = (id) => frentes.find((f) => f.id === id)
  const lista = materiaisNaSituacao(materiais, aba)
  const listas = { frentes: frentes.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente}` })) }
  const fechar = () => setFolha(null)

  // Roda a gravação; deu certo → fecha, avisa, recarrega e mostra a aba onde o material foi parar.
  const gravar = async (pedido, mensagem) => {
    setEnviando(true)
    const { data: m, erro: e } = await pedido
    setEnviando(false)
    if (e) return avisar(e)
    fechar()
    avisar(typeof mensagem === 'function' ? mensagem(m) : mensagem)
    if (m?.situacao) setAba(m.situacao)
    recarregar()
  }

  const mudar = (m, situacao, mensagem) => gravar(mudarSituacaoMaterial(profile, m.id, situacao), mensagem)

  const BOTOES = {
    aprovar: (m) => <button key="aprovar" className="btn pri" disabled={enviando} onClick={() => mudar(m, 'A comprar', `${m.item}: aprovado, foi para A comprar.`)}>Aprovar</button>,
    recusar: (m) => <button key="recusar" className="btn sec" onClick={() => setFolha({ tipo: 'recusar', m })}>Recusar</button>,
    comprado: (m) => <button key="comprado" className="btn sec" disabled={enviando} onClick={() => mudar(m, 'Comprado', `${m.item}: comprado.`)}>Marcar comprado</button>,
    entregue: (m) => <button key="entregue" className="btn pri" onClick={() => setFolha({ tipo: 'entregue', m })}>Marcar entregue</button>,
    nota: (m) => <button key="nota" className="btn sec" onClick={() => goto('lancarNota', { categoria: 'Material', frente_id: m.frente_id, fornecedor: m.fornecedor, material_id: m.id })}>Lançar nota</button>,
    editar: (m) => <button key="editar" className="btn sec" onClick={() => setFolha({ tipo: 'editar', m })}>Editar</button>,
  }
  const acoes = (m) => {
    const ids = acoesDoMaterial(profile, m)
    return ids.length ? ids.map((id) => BOTOES[id](m)) : null
  }

  const m = folha?.m
  const confirmar = (titulo, pergunta, rotulo, acao, perigo) => (
    <Folha titulo={titulo} onFechar={fechar}>
      <div className="form">
        <p style={{ fontSize: 17 }}>{pergunta}</p>
        <div className="acoes" style={{ padding: 0 }}>
          <button className="btn sec" disabled={enviando} onClick={fechar}>Cancelar</button>
          <button className={`btn ${perigo ? 'perigo' : 'pri'}`} disabled={enviando} onClick={acao}>{enviando ? 'Gravando…' : rotulo}</button>
        </div>
      </div>
    </Folha>
  )

  let folhaAberta = null
  if (folha?.tipo === 'novo') {
    folhaAberta = (
      <Folha titulo={engenheiro ? 'Novo material' : 'Pedir material'} onFechar={fechar}>
        {!engenheiro && <div className="aviso" style={{ margin: '0 16px' }}>O pedido vai para o Engenheiro aprovar antes da compra.</div>}
        <Formulario campos={camposDoFormulario(profile)} listas={listas} duasColunas onCancelar={fechar}
          rotuloSalvar={engenheiro ? 'Cadastrar material' : 'Enviar pedido'}
          onSalvar={(v) => gravar(salvarMaterial(profile, null, v), (x) => (x.situacao === PEDIDO ? `Pedido enviado: ${x.item}.` : `${x.item} cadastrado.`))} />
      </Folha>
    )
  } else if (folha?.tipo === 'editar') {
    folhaAberta = (
      <Folha titulo="Editar material" onFechar={fechar}>
        <Formulario campos={camposDoFormulario(profile, m)} listas={listas} duasColunas onCancelar={fechar}
          inicial={{ ...m, quantidade: String(m.quantidade).replace('.', ','), frente_id: m.frente_id ?? '', fornecedor: m.fornecedor ?? '', observacao: m.observacao ?? '' }}
          onSalvar={(v) => gravar(salvarMaterial(profile, m.id, v), 'Material salvo.')} />
        <div className="acoes"><button className="btn perigo" onClick={() => setFolha({ tipo: 'excluir', m })}>Excluir material</button></div>
      </Folha>
    )
  } else if (folha?.tipo === 'entregue') {
    folhaAberta = confirmar('Marcar entregue', <><b>{m.item}</b> chegou na obra?</>, 'Chegou', () => mudar(m, 'Entregue', `${m.item}: entregue.`))
  } else if (folha?.tipo === 'recusar') {
    folhaAberta = confirmar('Recusar pedido', <>Recusar o pedido de <b>{m.item}</b>? Ele sai da lista.</>, 'Sim, recusar',
      () => gravar(excluirMaterial(profile, m.id), `Pedido recusado: ${m.item}.`), true)
  } else if (folha?.tipo === 'excluir') {
    folhaAberta = confirmar('Excluir material', <>Excluir <b>{m.item}</b>? Não dá para desfazer.</>, 'Sim, excluir',
      () => gravar(excluirMaterial(profile, m.id), `${m.item} excluído.`), true)
  }

  const botaoNovo = (
    <button className="btn dark" onClick={() => setFolha({ tipo: 'novo' })}>
      <Icon nome="mais_um" tamanho={20} />{engenheiro ? 'Novo material' : 'Pedir material'}
    </button>
  )

  if (!materiais.length) {
    return (
      <>
        <div className="card">
          <Vazio icone="materiais" titulo="Nenhum material programado nesta obra."
            texto={engenheiro ? 'Cadastre o que precisa chegar (piso, tinta, argamassa) e o painel avisa antes de travar o serviço.' : 'Viu que vai faltar algo? Peça aqui: o Engenheiro aprova antes da compra.'}
            botao={engenheiro ? 'Cadastrar o primeiro material' : 'Pedir material'} onBotao={() => setFolha({ tipo: 'novo' })} />
        </div>
        {folhaAberta}
      </>
    )
  }

  return (
    <>
      <AbasTopo ativa={aba} onTrocar={setAba}
        abas={SITUACOES_MATERIAL.map((s) => ({ id: s, rotulo: ROTULO_ABA[s] ?? s, n: materiais.filter((x) => x.situacao === s).length }))} />
      <div className="titulo-tela">
        <div><div className="mono">Materiais · {aba}</div><h2>{plural(lista.length, 'item', 'itens')}</h2></div>
        {botaoNovo}
      </div>
      <div className="card">
        {lista.length
          ? lista.map((x) => <LinhaMaterial key={x.id} material={x} hoje={hoje} frente={frenteDe(x.frente_id)} acoes={acoes(x)} />)
          : <div className="aviso">Nenhum item em “{aba}”.</div>}
      </div>
      {folhaAberta}
    </>
  )
}
