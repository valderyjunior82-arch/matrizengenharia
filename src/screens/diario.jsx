// Diário — cartão "Diário de hoje" e as abas Dias · Fotos. É a tela inicial do Mestre.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFotos, listarFrentes, listarRegistros } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { ambientesDe } from '../lib/frentes.js'
import { dataCurta, diaRelativo, diaSemanaCurto, plural } from '../lib/formato.js'
import { Cartao, Carregando, Chip, ErroCarga, GradeFotos, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'

export default function Diario({ goto }) {
  const hoje = hojeDe()
  const [aba, setAba] = useState('dias')
  const [filtro, setFiltro] = useState('todos')
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    registros: listarRegistros(), fotos: listarFotos(), frentes: listarFrentes(),
  }))

  if (carregando && !data) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const { registros, fotos, frentes } = data
  const dias = [...new Set(registros.map((r) => r.data))].sort().reverse()
  const deHoje = registros.filter((r) => r.data === hoje)
  const servico = (id) => frentes.find((f) => f.id === id)?.servico

  const cartaoHoje = (
    <div className="hoje">
      <div className="mono">Diário de hoje · {diaSemanaCurto(hoje)}, {dataCurta(hoje)}</div>
      <h2>{deHoje.length ? plural(deHoje.length, 'registro lançado', 'registros lançados') : 'Nada lançado ainda'}</h2>
      <p>{deHoje.length
        ? deHoje.map((r) => r.tipo + (r.frente_id ? `: ${servico(r.frente_id)}` : '')).join(' · ')
        : 'Registre o que cada frente fez, quem veio e o que deu errado. Foto ajuda a provar depois.'}</p>
      <button className="btn pri lg full" onClick={() => goto('lancarDiario')}><Icon nome="camera" tamanho={22} />Lançar no diário</button>
    </div>
  )

  const abas = <AbasTopo ativa={aba} onTrocar={setAba} abas={[{ id: 'dias', rotulo: 'Dias', n: dias.length }, { id: 'fotos', rotulo: 'Fotos', n: fotos.length }]} />

  if (!dias.length) {
    return <>{abas}{cartaoHoje}<div className="card"><Vazio icone="diario" titulo="Nenhum diário lançado nesta obra ainda." texto="Toque em Lançar no diário para registrar o dia de hoje." /></div></>
  }

  if (aba === 'fotos') {
    const ambientes = ambientesDe(fotos)
    const visiveis = fotos.filter((f) => filtro === 'todos' || f.ambiente === filtro || f.frente_id === filtro)
    const diasComFoto = [...new Set(visiveis.map((f) => f.data))].sort().reverse()
    const frentesComFoto = frentes.filter((fr) => fotos.some((f) => f.frente_id === fr.id))
    return (
      <>
        {abas}
        {fotos.length > 0 && (
          <div className="filters" role="group" aria-label="Filtrar fotos">
            <button className={`fchip ${filtro === 'todos' ? 'on' : ''}`} onClick={() => setFiltro('todos')}>Todas</button>
            {ambientes.map((a) => <button key={a} className={`fchip ${filtro === a ? 'on' : ''}`} onClick={() => setFiltro(a)}>{a}</button>)}
            {frentesComFoto.map((fr) => <button key={fr.id} className={`fchip ${filtro === fr.id ? 'on' : ''}`} onClick={() => setFiltro(fr.id)}>{fr.servico}</button>)}
          </div>
        )}
        {diasComFoto.length ? diasComFoto.map((d) => {
          const doDia = visiveis.filter((f) => f.data === d)
          return (
            <Cartao key={d} titulo={diaRelativo(d, hoje)} acao={<span className="muted pequeno">{plural(doDia.length, 'foto', 'fotos')}</span>}>
              <GradeFotos fotos={doDia} rotulo={(f) => `${f.ambiente} · ${servico(f.frente_id)?.split(/[\s–]/)[0] ?? ''}`} />
            </Cartao>
          )
        }) : <div className="card"><Vazio icone="camera" titulo="Nenhuma foto nesta obra ainda." texto="As fotos entram pelo diário." /></div>}
      </>
    )
  }

  return (
    <>
      {abas}
      {cartaoHoje}
      <Cartao titulo={`Dias com registro · ${dias.length}`}>
        {dias.map((d) => {
          const doDia = registros.filter((r) => r.data === d)
          const avancos = doDia.filter((r) => r.tipo === 'Avanço').length
          const ocorrencias = doDia.filter((r) => r.tipo === 'Ocorrência').length
          const nFotos = fotos.filter((f) => f.data === d).length
          return (
            <button key={d} className="li" onClick={() => goto('dia', { data: d })}>
              <div className="b">
                <div className="t">{diaRelativo(d, hoje)}</div>
                <div className="m">{doDia[0].autor_nome} · {plural(avancos, 'frente andou', 'frentes andaram')} · {plural(nFotos, 'foto', 'fotos')}</div>
              </div>
              <div className="r" style={{ flexDirection: 'row', alignItems: 'center' }}>
                {ocorrencias > 0 && <Chip nivel="atencao">{plural(ocorrencias, 'ocorrência', 'ocorrências')}</Chip>}
                <Icon nome="chev" tamanho={20} />
              </div>
            </button>
          )
        })}
      </Cartao>
    </>
  )
}
