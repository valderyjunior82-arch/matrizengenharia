// Obras — cadastro das obras (só Engenheiro). Abrir obra nova é tela, não SQL.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { adicionarNaObra, excluirObra, listarPessoas, removerDaObra, salvarObra } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { CAMPOS_OBRA } from '../lib/formularios.js'
import { obrasDoCadastro, pessoasDaObra, podeEntrarNaObra } from '../lib/obras.js'
import { obrasDoSeletor } from '../lib/escopo.js'
import { dataCompleta } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'


export default function Obras({ profile }) {
  const { todas, obraId, trocarObra, recarregarObras } = useObra()
  const [aberta, setAberta] = useState(null) // obra | 'nova'
  const { carregando, erro, data: pessoas, recarregar } = useCarregar(listarPessoas)

  if (carregando && !pessoas) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const obras = obrasDoCadastro(todas)
  const fechar = () => setAberta(null)

  // Gravou: fecha, avisa e atualiza a lista e o seletor do topo.
  const gravar = async (pedido, msg) => {
    const r = await pedido
    if (r.erro) { avisar(r.erro); return }
    fechar()
    avisar(msg)
    recarregarObras()
    recarregar()
  }

  return (
    <>
      <div className="titulo-tela">
        <div><div className="mono">Cadastro</div><h2>Obras</h2></div>
        <button className="btn dark" onClick={() => setAberta('nova')}><Icon nome="mais_um" tamanho={20} />Nova obra</button>
      </div>

      <Cartao titulo={`Obras · ${obras.length}`}>
        {obras.length ? obras.map((o) => (
          <button key={o.id} className="li" onClick={() => setAberta(o)}>
            <div className="b">
              <div className="t">{o.nome}</div>
              <div className="m">{o.codigo}{o.cliente_nome && ` · ${o.cliente_nome}`}{o.data_meta_entrega && ` · entrega ${dataCompleta(o.data_meta_entrega)}`}</div>
            </div>
            <div className="r">
              <Chip nivel="neutro">{o.situacao}</Chip>
              {o.id === obraId && <span className="s">aberta agora</span>}
            </div>
          </button>
        )) : <Vazio icone="obras" titulo="Nenhuma obra ainda." texto="Cadastre a primeira obra para começar." botao="Cadastrar obra" onBotao={() => setAberta('nova')} />}
      </Cartao>

      <div className="aviso">Gastos da empresa que não são de obra nenhuma (combustível, contador, ferramenta) ficam em “Empresa (sem obra)”, que só aparece no Caixa geral.</div>

      {aberta === 'nova' && (
        <Folha titulo="Nova obra" onFechar={fechar}>
          <Formulario campos={CAMPOS_OBRA} duasColunas rotuloSalvar="Cadastrar obra" onCancelar={fechar}
            onSalvar={(v) => gravar(salvarObra(profile, null, v), 'Obra cadastrada.')} />
        </Folha>
      )}
      {aberta && aberta !== 'nova' && (
        <FolhaObra obra={aberta} profile={profile} pessoas={pessoas} aberta={aberta.id === obraId}
          onFechar={fechar} onGravar={gravar} onPessoas={recarregar}
          onAbrir={() => { trocarObra(aberta.id); fechar(); avisar(`Agora você está na obra ${aberta.nome}.`) }} />
      )}
    </>
  )
}

function FolhaObra({ obra, profile, pessoas, aberta, onFechar, onGravar, onPessoas, onAbrir }) {
  const [quem, setQuem] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const daObra = pessoasDaObra(pessoas, obra.id)
  const candidatos = pessoas.filter((p) => podeEntrarNaObra(p, p.obra_ids, obra.id))

  // Adicionar e Remover deixam a folha aberta: só a lista de pessoas muda.
  const mexer = async (pedido, msg) => {
    setEnviando(true)
    const r = await pedido
    setEnviando(false)
    if (r.erro) { avisar(r.erro); return }
    setQuem('')
    avisar(msg)
    onPessoas()
  }

  return (
    <Folha titulo={obra.nome} onFechar={onFechar}>
      <Formulario campos={CAMPOS_OBRA} inicial={obra} duasColunas onCancelar={onFechar}
        onSalvar={(v) => onGravar(salvarObra(profile, obra.id, v), 'Obra salva.')} />

      <div className="ch"><span className="mono">Quem está nesta obra</span></div>
      {daObra.map((p) => (
        <div key={p.id} className="li" style={{ minHeight: 56 }}>
          <div className="b"><div className="t">{p.nome}</div><div className="m">{p.role}{!p.ativo && ' · desativado'}</div></div>
          <button className="btn sec" disabled={enviando} onClick={() => mexer(removerDaObra(profile, obra.id, p.id), `${p.nome} saiu desta obra.`)}>Remover</button>
        </div>
      ))}
      <div className="form">
        {!daObra.length && <div className="ajuda">Nenhum mestre ou cliente nesta obra ainda. Engenheiro, Financeiro e Contador veem todas as obras.</div>}
        {candidatos.length > 0 ? (
          <div className="campo">
            <label htmlFor="add-pessoa">Adicionar pessoa</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select id="add-pessoa" value={quem} onChange={(e) => setQuem(e.target.value)} style={{ flex: 1 }}>
                <option value="">Escolha a pessoa…</option>
                {candidatos.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.role}</option>)}
              </select>
              <button className="btn sec" disabled={!quem || enviando}
                onClick={() => mexer(adicionarNaObra(profile, obra.id, quem), `${candidatos.find((p) => p.id === quem)?.nome} entrou nesta obra.`)}>Adicionar</button>
            </div>
          </div>
        ) : <div className="ajuda">Todos os mestres e clientes ativos já estão nesta obra. Conta nova se libera em Pessoas.</div>}

        {obrasDoSeletor([obra]).length > 0 && !aberta && (
          <div className="acoes um" style={{ padding: 0 }}><button className="btn pri" onClick={onAbrir}>Abrir esta obra</button></div>
        )}
        <div className="acoes um" style={{ padding: 0 }}>
          {confirmando ? (
            <>
              <div className="ajuda" role="status">Excluir “{obra.nome}” de vez? Não dá para desfazer.</div>
              <button className="btn sec" disabled={enviando} onClick={() => setConfirmando(false)}>Não excluir</button>
              <button className="btn perigo" disabled={enviando} onClick={async () => {
                setEnviando(true)
                await onGravar(excluirObra(profile, obra.id), 'Obra excluída.')
                setEnviando(false)
                setConfirmando(false)
              }}>{enviando ? 'Excluindo…' : 'Sim, excluir'}</button>
            </>
          ) : <button className="btn perigo" onClick={() => setConfirmando(true)}>Excluir obra</button>}
        </div>
      </div>
    </Folha>
  )
}
