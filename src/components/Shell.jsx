// A moldura do app: menu lateral (tela larga), barra inferior (celular),
// topo com o SELETOR DE OBRA e o botão flutuante. As telas entram no meio.
import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useObra } from '../lib/ObraContext.jsx'
import { dataCurta, iniciais } from '../lib/formato.js'
import { Folha, Icon, MarcaM } from './index.jsx'

const AbasCtx = createContext(null)

// Abas que a tela coloca dentro da faixa escura do topo (Dias/Fotos, A comprar/…).
export function AbasTopo({ abas, ativa, onTrocar }) {
  const alvo = useContext(AbasCtx)
  if (!alvo) return null
  return createPortal(
    abas.map((a) => (
      <button key={a.id} className={`tab ${ativa === a.id ? 'on' : ''}`} onClick={() => onTrocar(a.id)}>
        {a.rotulo}{a.n !== undefined && <span className="n">{a.n}</span>}
      </button>
    )),
    alvo,
  )
}

function SeletorObra({ onTrocar }) {
  const { obra, obras, obraId, carregando } = useObra()
  const [aberto, setAberto] = useState(false)
  if (!obra) return <div className="obra"><div className="rot mono">{carregando ? 'Carregando…' : 'Nenhuma obra'}</div><h1>Matriz Engenharia</h1></div>
  return (
    <>
      <div className="mark"><MarcaM tamanho={30} /></div>
      <div className="obra">
        <div className="rot mono">Obra · {obra.codigo}{obra.situacao === 'Concluída' && ' · Concluída'}</div>
        <h1>{obra.nome}</h1>
        <div className="sub">{[obra.cliente_nome, obra.data_meta_entrega && `entrega ${dataCurta(obra.data_meta_entrega)}`].filter(Boolean).join(' · ')}</div>
      </div>
      {/* Obra concluída aberta pelo Caixa geral não está na lista: o botão aparece para sair dela. */}
      {obras.some((o) => o.id !== obraId) && (
        <button className="trocar" onClick={() => setAberto(true)} aria-label="Trocar de obra">
          TROCAR <Icon nome="baixo" tamanho={14} />
        </button>
      )}
      {aberto && (
        <Folha titulo="Trocar de obra" onFechar={() => setAberto(false)}>
          {obras.map((o) => (
            <button key={o.id} className={`opt ${o.id === obraId ? 'on' : ''}`}
              onClick={() => { setAberto(false); if (o.id !== obraId) onTrocar(o.id) }}>
              <span className="dot" />
              <span>
                <b>{o.nome}</b>
                <div className="mono muted" style={{ marginTop: 4, fontSize: 11 }}>
                  {o.codigo}{o.cliente_nome && ` · ${o.cliente_nome}`}{o.situacao !== 'Em andamento' && ` · ${o.situacao}`}
                </div>
              </span>
            </button>
          ))}
        </Folha>
      )}
    </>
  )
}

// itensBarra: até 5 (o resto vai em "Mais"). itensLado: { principal: [], gestao: [] }.
export function Shell({ profile, itensBarra, itensLado, ativo, irPara, onTrocarObra, fab, children }) {
  const { obraId } = useObra()
  const [abasEl, setAbasEl] = useState(null)
  // Ao rolar, o topo encolhe (no celular): o nome da obra fica, a linha do cliente sai.
  // Entra acima de 64px e só volta abaixo de 8px, para não ficar piscando no limite.
  const [compacto, setCompacto] = useState(false)
  useEffect(() => {
    const aoRolar = () => setCompacto((c) => (c ? window.scrollY > 8 : window.scrollY > 64))
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])
  // Na barra do celular, telas que não estão nela (Financeiro, Obras…) acendem "Mais".
  const ativoBarra = itensBarra.some((i) => i.id === ativo) || !itensBarra.some((i) => i.id === 'mais') ? ativo : 'mais'

  const botaoLado = (i) => (
    <button key={i.id} className={`snav ${ativo === i.id ? 'on' : ''}`} onClick={() => irPara(i.id)}>
      <Icon nome={i.icone} tamanho={22} />{i.rotulo}
    </button>
  )

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><MarcaM tamanho={34} rotulo="Matriz Engenharia" /><span>MATRIZ<small>ENGENHARIA</small></span></div>
        {itensLado.principal.map(botaoLado)}
        {itensLado.gestao.length > 0 && <div className="slabel mono">Gestão</div>}
        {itensLado.gestao.map(botaoLado)}
        {fab && <button className="btn pri" onClick={fab.onClick}><Icon nome="camera" tamanho={20} />{fab.rotulo}</button>}
        <div className="grow" />
        <button className="me" onClick={() => irPara('perfil')} style={{ textAlign: 'left', color: 'inherit' }}>
          <div className="av">{iniciais(profile.nome)}</div>
          <div>{profile.nome}<small>{profile.role}</small></div>
        </button>
      </aside>

      <div className={`main ${fab ? '' : 'sem-fab'}`}>
        <header className={`top ${compacto ? 'compacta' : ''}`}>
          <div className="top-in"><SeletorObra onTrocar={onTrocarObra} /></div>
          <div className="tabs" ref={setAbasEl} />
        </header>
        <AbasCtx.Provider value={abasEl}>
          {/* key = obra: trocar de obra desmonta a tela inteira e monta de novo,
              sem sobrar nada da obra anterior (nem lista, nem formulário aberto). */}
          <main className="view" key={obraId ?? 'sem-obra'}>{children}</main>
        </AbasCtx.Provider>
      </div>

      <nav className="bnav" style={{ gridTemplateColumns: `repeat(${itensBarra.length}, 1fr)` }} aria-label="Menu">
        {itensBarra.map((i) => (
          <button key={i.id} className={ativoBarra === i.id ? 'on' : ''} onClick={() => irPara(i.id)}>
            <Icon nome={i.icone} />{i.rotulo}
          </button>
        ))}
      </nav>
      {fab && (
        <button className="fab" onClick={fab.onClick}><Icon nome="mais_um" tamanho={22} />{fab.rotulo}</button>
      )}
    </div>
  )
}
