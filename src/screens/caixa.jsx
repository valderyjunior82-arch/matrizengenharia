// Caixa geral — COMPARATIVO ENTRE OBRAS, por definição. É a única tela do app
// que mostra dados de mais de uma obra juntos, e diz isso no topo.
// O saldo por banco também mora aqui: o banco é um só para todas as obras.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { idDaEmpresa } from '../lib/escopo.js'
import { hoje as hojeDe } from '../lib/config.js'
import { excluirMovimentoBanco, listarCaixaGeral, salvarMovimentoBanco } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { caixaGeral, dre, mesesDe, saldosPorBanco } from '../lib/financeiro.js'
import { CAMPOS_SALDO_BANCO, CAMPOS_TRANSFERENCIA } from '../lib/formularios.js'
import { diasEntre } from '../lib/datas.js'
import { brl, dataCompleta, nomeMes, plural } from '../lib/formato.js'
import { avisar, Cartao, Carregando, ErroCarga, Folha, Formulario, Vazio } from '../components/index.jsx'
import { TabelaDRE } from '../components/pecas.jsx'

export default function Caixa({ goto, profile }) {
  const hoje = hojeDe()
  const { trocarObra } = useObra()
  const [mes, setMes] = useState(hoje.slice(0, 7))
  // 'Transferência' · 'Saldo inicial' (formulário) · { excluir: movimento }
  const [folha, setFolha] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const { carregando, erro, data, recarregar } = useCarregar(listarCaixaGeral)

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />
  // Sem lançamento, os bancos continuam: o saldo de partida se informa antes da primeira nota.
  const vazio = !data.lancamentos.length

  const c = caixaGeral(data.obras, data.lancamentos, hoje, mes)
  const sb = saldosPorBanco(data.lancamentos, data.movimentos)
  const movimentos = [...data.movimentos].reverse().sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
  const meses = mesesDe(data.lancamentos, hoje)
  const abrirObra = (id) => { trocarObra(id); goto('financeiro') }
  const obraDe = (id) => data.obras.find((o) => o.id === id)?.nome ?? ''
  // Abre o lançamento na obra dele. A "Empresa" não entra no seletor: a nota dela abre sem trocar de obra.
  const abrirLancamento = (l) => {
    if (l.obra_id !== idDaEmpresa(data.obras)) trocarObra(l.obra_id)
    goto('lancarNota', { id: l.id })
  }

  const salvarMovimento = async (valores) => {
    const { erro: e } = await salvarMovimentoBanco(profile, folha, valores)
    if (e) return avisar(e)
    avisar(folha === 'Transferência' ? 'Transferência registrada.' : 'Saldo informado.')
    setFolha(null)
    recarregar()
  }
  const excluirMovimento = async (m) => {
    if (excluindo) return
    setExcluindo(true)
    const { erro: e } = await excluirMovimentoBanco(profile, m.id)
    setExcluindo(false)
    setFolha(null)
    avisar(e || 'Excluído. O saldo foi refeito.')
    recarregar()
  }
  const nomeMovimento = (m) => (m.tipo === 'Transferência' ? `${m.de_banco} → ${m.para_banco}` : `Saldo do ${m.para_banco}`)

  return (
    <>
      <div className="faixa"><b>Comparativo entre obras.</b> Esta tela junta todas as obras e não depende da obra escolhida no topo.</div>

      <div className="titulo-tela">
        <div><div className="rotulo">Caixa geral da empresa · total nos bancos</div><h2 className={sb.total < 0 ? 'txt-red' : ''}>{brl(sb.total)}</h2></div>
        {!vazio && <div className="campo" style={{ minWidth: 168 }}>
          <label htmlFor="mes">Mês</label>
          <select id="mes" value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </div>}
      </div>

      <Cartao titulo="Saldo por banco · todas as obras">
        {sb.bancos.map(({ banco, saldo, desde }) => (
          <div key={banco} className="li">
            <div className="b">
              <div className="t">{banco}</div>
              <div className="m">{desde ? `desde o saldo de ${dataCompleta(desde)}` : 'sem saldo informado: conta só o que foi lançado'}</div>
            </div>
            <div className="r"><span className={`valor ${saldo < 0 ? 'txt-red' : ''}`}>{brl(saldo)}</span></div>
          </div>
        ))}
        <div className="li">
          <div className="b"><div className="t"><b>Total nos bancos</b></div></div>
          <div className="r"><span className={`valor ${sb.total < 0 ? 'txt-red' : ''}`}><b>{brl(sb.total)}</b></span></div>
        </div>
        {sb.semBanco.length > 0 && (
          <>
            <div className="aviso">{plural(sb.semBanco.length, 'lançamento está', 'lançamentos estão')} sem banco e {sb.semBanco.length === 1 ? 'fica' : 'ficam'} fora destes saldos. Toque para escolher o banco.</div>
            {sb.semBanco.map((l) => (
              <button key={l.id} className="li" onClick={() => abrirLancamento(l)}>
                <div className="b"><div className="t">{l.descricao || l.categoria}</div><div className="m">{obraDe(l.obra_id)} · {dataCompleta(l.data)}</div></div>
                <div className="r"><span className="valor">{l.tipo === 'Entrada' ? '+' : '−'} {brl(l.valor)}</span></div>
              </button>
            ))}
          </>
        )}
        <div className="acoes">
          <button className="btn sec" onClick={() => setFolha('Transferência')}>Transferir entre bancos</button>
          <button className="btn sec" onClick={() => setFolha('Saldo inicial')}>Informar saldo</button>
        </div>
      </Cartao>

      <Cartao titulo={`Transferências e saldos informados · ${movimentos.length}`}>
        {movimentos.length ? movimentos.map((m) => (
          <button key={m.id} className="li" onClick={() => setFolha({ excluir: m })}>
            <div className="b"><div className="t">{nomeMovimento(m)}</div><div className="m">{dataCompleta(m.data)}{m.descricao && ` · ${m.descricao}`}</div></div>
            <div className="r"><span className="valor">{brl(m.valor)}</span></div>
          </button>
        )) : <div className="aviso">Nada ainda. Comece por <b>Informar saldo</b>: o saldo de hoje de cada banco, como está no extrato.</div>}
      </Cartao>

      {vazio ? <div className="card"><Vazio icone="caixa" titulo="Nenhum lançamento ainda." texto="O resultado do mês, o DRE e as obras aparecem assim que você lançar a primeira nota ou parcela." /></div> : <>
      <Cartao titulo={`No mês · ${nomeMes(mes)}`}>
        <div className="fin">
          <div><div className="rotulo">Entrou</div><div className="v txt-grn">{brl(c.entrouMes)}</div></div>
          <div><div className="rotulo">Saiu (pago pelo engenheiro)</div><div className="v">{brl(c.saiuMes)}</div></div>
          <div><div className="rotulo">Resultado</div><div className={`v ${c.resultadoMes < 0 ? 'txt-red' : ''}`}>{brl(c.resultadoMes)}</div></div>
          <div><div className="rotulo">Parcelas vencidas</div><div className={`v ${c.vencidas.length ? 'txt-red' : ''}`}>{c.vencidas.length}</div></div>
        </div>
      </Cartao>

      <Cartao titulo={`DRE da empresa · ${nomeMes(mes)} · todas as obras`}>
        <TabelaDRE d={dre(data.lancamentos, mes)} onAbrir={abrirLancamento} obraDe={obraDe} />
      </Cartao>

      <Cartao titulo="Por obra">
        {c.porObra.map(({ obra, recebido, gasto, saldo, aReceber }) => (
          // A Empresa não vira obra atual (nada grava nela por engano): abre só a lista das notas dela (decisão do engenheiro em 27/11).
          <button key={obra.id} className="li" onClick={() => (obra.interna ? setFolha({ empresa: obra }) : abrirObra(obra.id))}>
            <div className="b">
              <div className="t">{obra.nome}</div>
              <div className="m">{obra.interna ? `gasto ${brl(gasto)}` : `recebido ${brl(recebido)} · gasto ${brl(gasto)} · a receber ${brl(aReceber)}`}</div>
            </div>
            {!obra.interna && <div className="r"><span className="muted pequeno">saldo</span><span className={`valor ${saldo < 0 ? 'txt-red' : ''}`}>{brl(saldo)}</span></div>}
          </button>
        ))}
      </Cartao>

      <Cartao titulo={`Parcelas vencidas · ${c.vencidas.length}`}>
        {c.vencidas.length ? c.vencidas.map((p) => (
          <button key={p.id} className="li critico" onClick={() => { trocarObra(p.obra_id); goto('financeiro', { aba: 'parcelas' }) }}>
            <div className="b"><div className="t">{p.descricao}</div><div className="m">{p.obra?.nome} · venceu {dataCompleta(p.vencimento)}</div></div>
            <div className="r"><span className="valor">{brl(p.valor)}</span><span className="s">há {diasEntre(p.vencimento, hoje)} dias</span></div>
          </button>
        )) : <div className="aviso">Nenhuma parcela vencida.</div>}
      </Cartao>
      </>}

      {(folha === 'Transferência' || folha === 'Saldo inicial') && (
        <Folha titulo={folha === 'Transferência' ? 'Transferir entre bancos' : 'Informar saldo do banco'} onFechar={() => setFolha(null)}>
          {folha === 'Saldo inicial' && <div className="aviso">Digite o saldo como está no extrato no começo do dia. Daí em diante o app soma e subtrai os lançamentos desse banco. Informar de novo corrige o saldo.</div>}
          <Formulario campos={folha === 'Transferência' ? CAMPOS_TRANSFERENCIA : CAMPOS_SALDO_BANCO} inicial={{ data: hoje }}
            rotuloSalvar={folha === 'Transferência' ? 'Transferir' : 'Salvar saldo'} onCancelar={() => setFolha(null)} onSalvar={salvarMovimento} />
        </Folha>
      )}
      {folha?.empresa && (
        <Folha titulo={`${folha.empresa.nome} · notas`} onFechar={() => setFolha(null)}>
          {!data.lancamentos.some((l) => l.obra_id === folha.empresa.id) && <div className="aviso">Nenhuma nota da empresa ainda. Em <b>Lançar nota</b>, escolha a obra <b>{folha.empresa.nome}</b>.</div>}
          {data.lancamentos.filter((l) => l.obra_id === folha.empresa.id).sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)).map((l) => (
            <button key={l.id} className="li" onClick={() => abrirLancamento(l)}>
              <div className="b"><div className="t">{l.descricao || l.categoria}</div><div className="m">{dataCompleta(l.data)} · {l.categoria}</div></div>
              <div className="r"><span className="valor">{l.tipo === 'Entrada' ? '+' : '−'} {brl(l.valor)}</span></div>
            </button>
          ))}
        </Folha>
      )}
      {folha?.excluir && (
        <Folha titulo="Excluir" onFechar={() => setFolha(null)}>
          <div style={{ padding: 16 }}>{nomeMovimento(folha.excluir)} · {brl(folha.excluir.valor)} · {dataCompleta(folha.excluir.data)}. O saldo dos bancos é refeito sem ele. Não dá para desfazer.</div>
          <div className="acoes">
            <button className="btn sec" onClick={() => setFolha(null)}>Cancelar</button>
            <button className="btn perigo" disabled={excluindo} onClick={() => excluirMovimento(folha.excluir)}>{excluindo ? 'Excluindo…' : 'Excluir'}</button>
          </div>
        </Folha>
      )}
    </>
  )
}
