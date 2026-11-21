// Materiais — abas A comprar · Comprado · Entregue, o mais urgente primeiro.
// O Mestre vê tudo (inclusive fornecedor) e só tem a ação "Marcar entregue".
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFrentes, listarMateriais, mudarSituacaoMaterial } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { materiaisNaSituacao } from '../lib/materiais.js'
import { CAMPOS_MATERIAL } from '../lib/formularios.js'
import { SITUACOES_MATERIAL } from '../lib/vocabulario.js'
import { ehEngenheiro } from '../lib/permissoes.js'
import { plural } from '../lib/formato.js'
import { avisar, Carregando, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'
import { LinhaMaterial } from '../components/pecas.jsx'

export default function Materiais({ goto, profile }) {
  const hoje = hojeDe()
  const engenheiro = ehEngenheiro(profile)
  const [aba, setAba] = useState('A comprar')
  const [criando, setCriando] = useState(false)
  const [confirmar, setConfirmar] = useState(null)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({ materiais: listarMateriais(), frentes: listarFrentes() }))

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { materiais, frentes } = data
  const frenteDe = (id) => frentes.find((f) => f.id === id)
  const lista = materiaisNaSituacao(materiais, aba)
  const listas = { frentes: frentes.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente}` })) }

  const mudar = async (m, situacao) => {
    setConfirmar(null)
    const { erro: e } = await mudarSituacaoMaterial(m.id, situacao)
    avisar(e || `${m.item}: ${situacao.toLowerCase()}.`)
    recarregar()
  }

  const acoes = (m) => {
    if (m.situacao === 'Entregue') return null
    return (
      <>
        {engenheiro && m.situacao === 'A comprar' && <button className="btn sec" onClick={() => mudar(m, 'Comprado')}>Marcar comprado</button>}
        <button className="btn pri" onClick={() => setConfirmar(m)}>Marcar entregue</button>
        {engenheiro && (
          <button className="btn sec" onClick={() => goto('lancarNota', { categoria: 'Material', frente_id: m.frente_id, fornecedor: m.fornecedor })}>Lançar nota</button>
        )}
      </>
    )
  }

  const formulario = criando && (
    <Folha titulo="Novo material" onFechar={() => setCriando(false)}>
      <Formulario campos={CAMPOS_MATERIAL} listas={listas} duasColunas onCancelar={() => setCriando(false)}
        onSalvar={() => { setCriando(false); avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.') }} />
    </Folha>
  )

  if (!materiais.length) {
    return (
      <>
        <div className="card">
          <Vazio icone="materiais" titulo="Nenhum material programado nesta obra."
            texto="Cadastre o que precisa chegar (piso, tinta, argamassa) e o painel avisa antes de travar o serviço."
            botao={engenheiro ? 'Cadastrar o primeiro material' : null} onBotao={() => setCriando(true)} />
        </div>
        {formulario}
      </>
    )
  }

  return (
    <>
      <AbasTopo ativa={aba} onTrocar={setAba}
        abas={SITUACOES_MATERIAL.map((s) => ({ id: s, rotulo: s, n: materiais.filter((m) => m.situacao === s).length }))} />
      <div className="titulo-tela">
        <div><div className="mono">Materiais · {aba}</div><h2>{plural(lista.length, 'item', 'itens')}</h2></div>
        {engenheiro && <button className="btn dark" onClick={() => setCriando(true)}><Icon nome="mais_um" tamanho={20} />Novo material</button>}
      </div>
      <div className="card">
        {lista.length
          ? lista.map((m) => <LinhaMaterial key={m.id} material={m} hoje={hoje} frente={frenteDe(m.frente_id)} acoes={acoes(m)} />)
          : <div className="aviso">Nenhum item em “{aba}”.</div>}
      </div>
      {formulario}
      {confirmar && (
        <Folha titulo="Marcar entregue" onFechar={() => setConfirmar(null)}>
          <div className="form">
            <p style={{ fontSize: 17 }}><b>{confirmar.item}</b> chegou na obra?</p>
            <div className="acoes" style={{ padding: 0 }}>
              <button className="btn sec" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button className="btn pri" onClick={() => mudar(confirmar, 'Entregue')}>Chegou</button>
            </div>
          </div>
        </Folha>
      )}
    </>
  )
}
