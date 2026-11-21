// Detalhe da frente: datas, situação e as abas Avanço · Fotos · Materiais · Contrato.
// O Mestre não vê a aba Contrato, nem Editar, nem Aprovar/Devolver.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import {
  aprovarFrente, devolverFrente, listarContratos, listarFotos, listarLancamentos,
  listarMateriais, listarRegistros, marcarFrentePronta, obterFrente,
} from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { diasSemAndar, nivelFrente, podeMarcarPronta, textoLimite } from '../lib/frentes.js'
import { pagoDoContrato } from '../lib/financeiro.js'
import { CAMPOS_CONTRATO, CAMPOS_FRENTE } from '../lib/formularios.js'
import { ehEngenheiro } from '../lib/permissoes.js'
import { brl, dataCompleta, diaRelativo } from '../lib/formato.js'
import { avisar, BotaoVoltar, Carregando, Chip, ErroCarga, Folha, Formulario, GradeFotos, Stat, Vazio } from '../components/index.jsx'
import { FolhaDevolver, LinhaMaterial, ReguaPrazo } from '../components/pecas.jsx'

const COR_TEXTO = { critico: 'var(--red-ink)', atencao: 'var(--amb-ink)', ok: 'inherit' }

export default function Frente({ goto, voltar: volta, params, profile }) {
  const hoje = hojeDe()
  const engenheiro = ehEngenheiro(profile)
  const [aba, setAba] = useState('avanco')
  const [folha, setFolha] = useState(null) // 'editar' | 'devolver' | 'pronta' | 'contrato'
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    frente: obterFrente(params.id),
    registros: listarRegistros(),
    fotos: listarFotos(),
    materiais: listarMateriais(),
    ...(engenheiro ? { contratos: listarContratos(), lancamentos: listarLancamentos() } : {}),
  }))

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !data) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  const f = data.frente
  const nivel = nivelFrente(f, hoje)
  const parada = diasSemAndar(f, hoje)
  const registros = data.registros.filter((r) => r.frente_id === f.id).sort((a, b) => (a.data < b.data ? 1 : -1))
  const fotos = data.fotos.filter((x) => x.frente_id === f.id)
  const materiais = data.materiais.filter((m) => m.frente_id === f.id)
  const contrato = engenheiro ? data.contratos.find((c) => c.frente_id === f.id) : null

  const agir = async (acao, mensagem) => {
    setFolha(null)
    const { erro: e } = await acao
    avisar(e || mensagem)
    recarregar()
  }

  const abas = [['avanco', 'Avanço'], ['fotos', 'Fotos'], ['materiais', 'Materiais'], ...(engenheiro ? [['contrato', 'Contrato']] : [])]

  let corpo
  if (aba === 'avanco') {
    corpo = registros.length ? registros.map((r) => (
      <div key={r.id} className="entry">
        <div className="m">{diaRelativo(r.data, hoje)} · {r.autor_nome}</div>
        <div className="tx">{r.texto}</div>
        {r.percentual_novo !== null && <div style={{ marginTop: 6 }}><Chip nivel="info">→ {r.percentual_novo}%</Chip></div>}
      </div>
    )) : <Vazio icone="diario" titulo="Nenhum avanço lançado nesta frente ainda." />
  } else if (aba === 'fotos') {
    corpo = fotos.length ? <GradeFotos fotos={fotos} rotulo={(x) => `${x.ambiente} · ${dataCompleta(x.data).slice(0, 5)}`} />
      : <Vazio icone="camera" titulo="Nenhuma foto desta frente ainda." texto="As fotos entram pelo diário." />
  } else if (aba === 'materiais') {
    corpo = materiais.length ? materiais.map((m) => <LinhaMaterial key={m.id} material={m} hoje={hoje} frente={f} />)
      : <Vazio icone="materiais" titulo="Nenhum material ligado a esta frente." />
  } else if (contrato) {
    const pago = pagoDoContrato(contrato.id, data.lancamentos)
    const pagamentos = data.lancamentos.filter((l) => l.contrato_empreiteiro_id === contrato.id && l.situacao === 'Realizado')
    corpo = (
      <>
        <div className="fin">
          <div><div className="rotulo">Empreiteiro</div><div className="v" style={{ fontSize: 17 }}>{contrato.empreiteiro}</div></div>
          <div><div className="rotulo">Contratado</div><div className="v">{brl(contrato.valor_contratado)}</div></div>
          <div><div className="rotulo">Já pago</div><div className="v">{brl(pago)}</div></div>
          <div><div className="rotulo">Falta pagar</div><div className="v">{brl(contrato.valor_contratado - pago)}</div></div>
        </div>
        {pagamentos.map((l) => (
          <div key={l.id} className="li" style={{ minHeight: 56 }}>
            <div className="b"><div className="t">{l.descricao}</div><div className="m">{dataCompleta(l.data)} · {l.forma_pagamento || '—'}</div></div>
            <span className="valor">{brl(l.valor)}</span>
          </div>
        ))}
        <div className="acoes um">
          <button className="btn pri" onClick={() => goto('lancarNota', { categoria: 'Mão de obra', frente_id: f.id, fornecedor: contrato.empreiteiro })}>Registrar pagamento</button>
        </div>
      </>
    )
  } else {
    corpo = <Vazio icone="financeiro" titulo="Nenhum contrato cadastrado para esta frente." botao="Cadastrar contrato" onBotao={() => setFolha('contrato')} />
  }

  return (
    <>
      {voltar}
      <div className="card">
        <div className="dhead">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <h2>{f.servico}</h2>
            <Chip nivel={f.situacao === 'Aguardando aprovação' ? 'info' : nivel}>{textoLimite(f, hoje).curto}</Chip>
          </div>
          <div className="m">{f.ambiente}{f.responsavel && ` · ${f.responsavel}`}</div>
          <ReguaPrazo frente={f} hoje={hoje} grande />
        </div>
        <div className="stats" style={{ padding: '0 16px 16px' }}>
          <Stat nivel="info" rotulo="Avanço" numero={`${f.percentual}%`} />
          <Stat nivel={parada !== null && parada >= 3 && nivel !== 'ok' ? 'atencao' : 'ok'} rotulo="Sem andar" numero={parada ?? '—'}
            rodape={parada === null ? 'ainda não começou' : parada === 1 ? 'dia' : 'dias'} />
          {/* Situação em cor neutra: o vermelho/âmbar é do prazo, e já está na etiqueta. */}
          <Stat rotulo="Situação" numero={<span style={{ fontSize: 16 }}>{f.situacao}</span>} />
        </div>
        {f.comentario_devolucao && <div className="devolucao"><b>Devolvida:</b> {f.comentario_devolucao}</div>}
        <div className="kv">
          <div><div className="rotulo">Início previsto</div><div className="v">{dataCompleta(f.data_inicio_prevista)}</div></div>
          <div><div className="rotulo">Término previsto</div><div className="v">{dataCompleta(f.data_termino_prevista)}</div></div>
          <div><div className="rotulo">Data limite de decisão</div><div className="v" style={{ color: COR_TEXTO[nivel] }}>{f.data_limite_decisao ? `${textoLimite(f, hoje).longo} (${dataCompleta(f.data_limite_decisao)})` : 'Sem data limite'}</div></div>
          <div><div className="rotulo">{f.data_conclusao ? 'Concluída em' : 'Último avanço'}</div><div className="v">{f.data_conclusao ? dataCompleta(f.data_conclusao) : f.ultimo_avanco_em ? diaRelativo(f.ultimo_avanco_em, hoje) : '—'}</div></div>
        </div>
        <div className="acoes">
          {f.situacao === 'Aguardando aprovação' && engenheiro && <>
            <button className="btn pri" onClick={() => agir(aprovarFrente(f.id), 'Frente aprovada.')}>Aprovar</button>
            <button className="btn sec" onClick={() => setFolha('devolver')}>Devolver</button>
          </>}
          {f.situacao === 'Aguardando aprovação' && !engenheiro && <div className="aviso" style={{ gridColumn: '1 / -1', padding: 0 }}>Pronta. Aguardando a aprovação do engenheiro.</div>}
          {podeMarcarPronta(f) && <button className="btn pri" style={engenheiro ? null : { gridColumn: '1 / -1' }} onClick={() => setFolha('pronta')}>Marcar como pronta</button>}
          {engenheiro && <button className="btn sec" style={f.situacao === 'Concluída' ? { gridColumn: '1 / -1' } : null} onClick={() => setFolha('editar')}>Editar</button>}
        </div>
      </div>

      <div className="card">
        <div className="seg">{abas.map(([id, rotulo]) => <button key={id} className={aba === id ? 'on' : ''} onClick={() => setAba(id)}>{rotulo}</button>)}</div>
        {corpo}
      </div>

      {folha === 'devolver' && <FolhaDevolver frente={f} onFechar={() => setFolha(null)} onConfirmar={(m) => agir(devolverFrente(f.id, m), 'Frente devolvida.')} />}
      {folha === 'pronta' && (
        <Folha titulo="Marcar como pronta" onFechar={() => setFolha(null)}>
          <div className="form">
            <p style={{ fontSize: 17 }}>Marcar esta frente como pronta? O engenheiro vai aprovar.</p>
            <div className="acoes" style={{ padding: 0 }}>
              <button className="btn sec" onClick={() => setFolha(null)}>Cancelar</button>
              <button className="btn pri" onClick={() => agir(marcarFrentePronta(f.id, profile), 'Marcada como pronta. Foi para aprovação.')}>Marcar pronta</button>
            </div>
          </div>
        </Folha>
      )}
      {folha === 'editar' && (
        <Folha titulo={`Editar · ${f.servico}`} onFechar={() => setFolha(null)}>
          <Formulario campos={CAMPOS_FRENTE} inicial={{ ...f, percentual: String(f.percentual) }} duasColunas onCancelar={() => setFolha(null)}
            onSalvar={() => { setFolha(null); avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.') }} />
        </Folha>
      )}
      {folha === 'contrato' && (
        <Folha titulo="Cadastrar contrato" onFechar={() => setFolha(null)}>
          <Formulario campos={CAMPOS_CONTRATO} onCancelar={() => setFolha(null)}
            onSalvar={() => { setFolha(null); avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.') }} />
        </Folha>
      )}
    </>
  )
}
