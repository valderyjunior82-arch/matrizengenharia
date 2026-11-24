// Hoje — o painel do dia do engenheiro, sempre da obra escolhida no topo.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { hoje as hojeDe } from '../lib/config.js'
import { aprovarFrente, devolverFrente, listarFrentes, listarLancamentos, listarMateriais, listarRegistros } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { avancoDaObra, frentesDoPainel, frentesParaAprovar, nivelFrente, prazoCorrido } from '../lib/frentes.js'
import { materiaisParaChegar, resumoParaChegar } from '../lib/materiais.js'
import { resumoObra } from '../lib/financeiro.js'
import { brl, dataCurta, diaRelativo } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Link, Stat, Vazio } from '../components/index.jsx'
import { FolhaDevolver, LinhaFrente, LinhaMaterial } from '../components/pecas.jsx'

const curto = (lista) => (lista.length ? lista.map((f) => f.servico.split(/[\s–]/)[0]).join(' · ') : 'nenhuma')

export default function Hoje({ goto, profile }) {
  const { obra } = useObra()
  const hoje = hojeDe()
  const [devolvendo, setDevolvendo] = useState(null)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    frentes: listarFrentes(), materiais: listarMateriais(), registros: listarRegistros(), lancamentos: listarLancamentos(),
  }))

  if (carregando && !data) return <Carregando blocos={4} />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { frentes, materiais, registros, lancamentos } = data
  const painel = frentesDoPainel(frentes, hoje)
  const aprovar = frentesParaAprovar(frentes)
  const criticas = painel.filter((f) => nivelFrente(f, hoje) === 'critico')
  const atencao = painel.filter((f) => nivelFrente(f, hoje) === 'atencao')
  const chegar = materiaisParaChegar(materiais, hoje)
  const fin = resumoObra(lancamentos, hoje)
  const avanco = avancoDaObra(frentes)
  const prazo = prazoCorrido(obra, hoje)
  const dias = [...new Set(registros.map((r) => r.data))].sort().reverse()
  const lancadoHoje = dias[0] === hoje
  const ultimoDia = dias.find((d) => d !== hoje)
  const frenteDe = (id) => frentes.find((f) => f.id === id)

  const agir = async (acao, mensagem) => {
    const { erro: e } = await acao
    avisar(e || mensagem)
    recarregar()
  }

  return (
    <>
      <div className="stats quatro">
        <Stat nivel="critico" rotulo="Atrasadas" numero={criticas.length} rodape={curto(criticas)} />
        <Stat nivel="atencao" rotulo="Atenção" numero={atencao.length} rodape={curto(atencao)} />
        <Stat nivel="info" rotulo="Para aprovar" numero={aprovar.length} rodape={curto(aprovar)} />
        <Stat rotulo="Material 7 dias" numero={chegar.length} rodape={resumoParaChegar(chegar)} onClick={() => goto('materiais')} />
      </div>

      <div className="cols">
        <div>
          {aprovar.length > 0 && (
            <Cartao className="aprovar" titulo={`Para aprovar · ${aprovar.length}`}>
              {aprovar.map((f) => (
                <div key={f.id} style={{ borderBottom: '1px solid var(--line2)' }}>
                  <div className="li" style={{ minHeight: 0, borderBottom: 0, paddingBottom: 4 }}>
                    <div className="b">
                      <div className="t">{f.servico}</div>
                      <div className="m">{f.ambiente} · pronta em {dataCurta(f.marcada_pronta_em?.slice(0, 10))}</div>
                    </div>
                    <Chip nivel="info">{f.percentual}%</Chip>
                  </div>
                  <div className="acoes">
                    <button className="btn pri" onClick={() => agir(aprovarFrente(profile, f.id), 'Frente aprovada. Saiu do painel.')}>Aprovar</button>
                    <button className="btn sec" onClick={() => setDevolvendo(f)}>Devolver</button>
                  </div>
                </div>
              ))}
            </Cartao>
          )}

          <Cartao className="principal" titulo={`Frentes de serviço · ${painel.length}`} acao={<Link onClick={() => goto('frentes')}>Ver todas</Link>}>
            {painel.length
              ? painel.map((f) => <LinhaFrente key={f.id} frente={f} hoje={hoje} onAbrir={(id) => goto('frente', { id })} />)
              : <Vazio titulo={frentes.length ? 'Nenhuma frente aberta.' : 'Nenhuma frente cadastrada nesta obra.'}
                  texto={frentes.length ? 'Tudo concluído ou aguardando aprovação.' : 'Comece criando as frentes de serviço.'}
                  botao={frentes.length ? null : 'Nova frente'} onBotao={() => goto('frentes', { nova: true })} />}
          </Cartao>
        </div>

        <div>
          <div className="card prog">
            <div className="row">
              <span className="mono" style={{ color: 'var(--slate)' }}>Avanço físico</span>
              {prazo !== null && <span className="mono" style={{ color: 'var(--slate)' }}>prazo corrido {prazo}%</span>}
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className="big">{avanco}%</span>
              {prazo !== null && (avanco < prazo - 10
                ? <Chip nivel="atencao">{prazo - avanco} pts atrás do prazo</Chip>
                : <Chip nivel="ok">no ritmo</Chip>)}
            </div>
            <div className="bar"><i style={{ width: `${avanco}%` }} />{prazo !== null && <b style={{ left: `${prazo}%` }} />}</div>
            <div className="legend mono">
              <span>Início {dataCurta(obra.data_inicio)}</span><span>▮ hoje</span><span>Entrega {dataCurta(obra.data_meta_entrega)}</span>
            </div>
          </div>

          <Cartao className="consulta" titulo={`Material para chegar · ${chegar.length}`} acao={<Link onClick={() => goto('materiais')}>Ver todos</Link>}>
            {chegar.length
              ? chegar.map((m) => <LinhaMaterial key={m.id} material={m} hoje={hoje} frente={frenteDe(m.frente_id)} />)
              : <div className="aviso">Nada para chegar nos próximos 7 dias.</div>}
          </Cartao>

          <div className="duo">
            <button className="card" onClick={() => (ultimoDia ? goto('dia', { data: ultimoDia }) : goto('diario'))}>
              <div className="rotulo">Último diário</div>
              <div className="v">{ultimoDia ? `${diaRelativo(ultimoDia, hoje).split(',')[0]} ${dataCurta(ultimoDia)} ›` : '—'}</div>
            </button>
            <button className="card" onClick={() => goto('diario')}>
              <div className="rotulo">Diário de hoje</div>
              <div className={`v ${lancadoHoje ? 'txt-grn' : 'txt-amb'}`}>{lancadoHoje ? 'Lançado ✓' : 'Pendente'}</div>
            </button>
          </div>

          <Cartao className="consulta" titulo="Financeiro da obra" acao={<Link onClick={() => goto('financeiro')}>Abrir</Link>}>
            {lancamentos.length ? (
              <div className="fin">
                <div><div className="rotulo">Gasto ontem</div><div className="v">{brl(fin.gastoOntem)}</div></div>
                <div><div className="rotulo">Gasto da semana</div><div className="v">{brl(fin.gastoSemana)}</div></div>
                <div><div className="rotulo">Saldo da obra</div><div className="v">{brl(fin.saldo)}</div></div>
                <div>
                  <div className="rotulo">A receber</div><div className="v">{brl(fin.aReceber)}</div>
                  {fin.vencido > 0 && <div className="x">{brl(fin.vencido)} vencido</div>}
                </div>
              </div>
            ) : <div className="aviso">Nenhum lançamento nesta obra ainda.</div>}
          </Cartao>
        </div>
      </div>

      {devolvendo && (
        <FolhaDevolver frente={devolvendo} onFechar={() => setDevolvendo(null)}
          onConfirmar={(motivo) => { setDevolvendo(null); agir(devolverFrente(profile, devolvendo.id, motivo), 'Frente devolvida para "Em andamento".') }} />
      )}
    </>
  )
}
