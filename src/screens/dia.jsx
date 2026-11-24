// Dia do diário — um dia inteiro, com setas para o anterior e o seguinte.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { excluirRegistro, listarFotos, listarFrentes, listarRegistros } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { podeEditarRegistro } from '../lib/permissoes.js'
import { dataCompleta, diaRelativo } from '../lib/formato.js'
import { rotuloFoto } from '../lib/diario.js'
import { avisar, BotaoVoltar, Cartao, Carregando, Chip, ErroCarga, Folha, GradeFotos, Icon, Vazio } from '../components/index.jsx'

export default function Dia({ goto, voltar: volta, params, profile }) {
  const hoje = hojeDe()
  const [apagar, setApagar] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    registros: listarRegistros(), fotos: listarFotos(), frentes: listarFrentes(),
  }))

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !data) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  const { registros, fotos, frentes } = data
  const dias = [...new Set(registros.map((r) => r.data))].sort()
  const dia = params.data
  const i = dias.indexOf(dia)
  const doDia = registros.filter((r) => r.data === dia)
  const servico = (id) => frentes.find((f) => f.id === id)?.servico ?? '—'
  const editar = (r) => podeEditarRegistro(profile, r, hoje) && (
    <span style={{ display: 'inline-flex', gap: 16, marginLeft: 8 }}>
      <button className="link" onClick={() => goto('lancarDiario', { id: r.id })}>Editar</button>
      <button className="link" onClick={() => setApagar(r)}>Excluir</button>
    </span>
  )
  const excluir = async () => {
    setEnviando(true)
    const { erro: e } = await excluirRegistro(profile, apagar.id)
    setEnviando(false)
    if (e) return avisar(e)
    setApagar(null)
    avisar('Registro excluído.')
    recarregar()
  }
  const nFotosDe = (r) => fotos.filter((f) => f.registro_id === r.id).length

  const bloco = (titulo, tipo, desenhar) => {
    const lista = doDia.filter((r) => r.tipo === tipo)
    return lista.length > 0 && <Cartao titulo={titulo}>{lista.map(desenhar)}</Cartao>
  }

  return (
    <>
      {voltar}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn" disabled={i <= 0} aria-label="Dia anterior" onClick={() => goto('dia', { data: dias[i - 1] }, { substituir: true })}><Icon nome="voltar" /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 19, fontWeight: 600 }}>{diaRelativo(dia, hoje).split(',')[0]}</div>
          <div className="muted pequeno">{dataCompleta(dia)}</div>
        </div>
        <button className="btn" disabled={i < 0 || i >= dias.length - 1} aria-label="Dia seguinte" onClick={() => goto('dia', { data: dias[i + 1] }, { substituir: true })}><Icon nome="chev" /></button>
      </div>

      {doDia.length === 0 && <div className="card"><Vazio icone="diario" titulo="Nada lançado neste dia." /></div>}

      {bloco('Equipe presente', 'Equipe', (r) => (
        <div key={r.id} className="entry"><div className="tx">{r.texto}</div><div className="m">{r.autor_nome} {editar(r)}</div></div>
      ))}
      {bloco('Avanço por frente', 'Avanço', (r) => (
        <div key={r.id} className="entry">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <b>{servico(r.frente_id)}</b>{r.percentual_novo !== null && <Chip nivel="info">→ {r.percentual_novo}%</Chip>}
          </div>
          <div className="tx">{r.texto}</div>
          <div className="m">{r.autor_nome} {editar(r)}</div>
        </div>
      ))}
      {bloco('Ocorrências', 'Ocorrência', (r) => (
        <div key={r.id} className="entry ocorrencia"><div className="tx">{r.texto}</div><div className="m">{r.autor_nome} {editar(r)}</div></div>
      ))}
      {fotos.some((f) => f.data === dia) && (
        <Cartao titulo="Fotos do dia">
          <GradeFotos fotos={fotos.filter((f) => f.data === dia)} rotulo={(f) => rotuloFoto(f, frentes)} />
        </Cartao>
      )}
      {apagar && (
        <Folha titulo="Excluir registro" onFechar={() => setApagar(null)}>
          <div style={{ padding: '0 16px 8px' }}>
            <p style={{ fontSize: 17 }}>Excluir este registro{nFotosDe(apagar) ? ` e ${nFotosDe(apagar) > 1 ? `as ${nFotosDe(apagar)} fotos dele` : 'a foto dele'}` : ''}? Não dá para desfazer.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn sec" disabled={enviando} onClick={() => setApagar(null)}>Não excluir</button>
              <button className="btn perigo" disabled={enviando} onClick={excluir}>{enviando ? 'Excluindo…' : 'Sim, excluir'}</button>
            </div>
          </div>
        </Folha>
      )}
    </>
  )
}
