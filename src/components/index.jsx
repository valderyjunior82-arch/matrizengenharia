// Peças reutilizáveis da interface. Nenhuma regra de negócio aqui: só desenho.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { camposVisiveis, validar, valoresIniciais } from '../lib/formularios.js'
import { dataCompleta } from '../lib/formato.js'

// ---------- ícones (SVG desenhado à mão; nada de emoji) ----------
const TRACOS = {
  hoje: <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z" />,
  frentes: <path d="M5 6h14M5 12h14M5 18h9" />,
  diario: <path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2zM6 18a2 2 0 0 1 2-2h10M10 8h5" />,
  materiais: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  mais: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
  financeiro: <path d="M4 7h16v11H4zM4 11h16M8 15h3" />,
  caixa: <path d="M4 20V10M10 20V5M16 20v-7M21 20H3" />,
  obras: <path d="M4 20V8l6-4 6 4v12M16 12h4v8M8 12h4M8 16h4" />,
  pessoas: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M21 20c0-2.6-1.6-4.8-4-5.6" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  chev: <path d="m9 6 6 6-6 6" />,
  voltar: <path d="m15 6-6 6 6 6" />,
  baixo: <path d="m6 9 6 6 6-6" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  mais_um: <path d="M12 5v14M5 12h14" />,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 5 5 9-10" />,
  alerta: <><path d="M12 4 2.5 20h19z" /><path d="M12 10v4M12 17v.5" /></>,
  relogio: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  sair: <path d="M14 5h5v14h-5M10 8l-4 4 4 4M6 12h10" />,
  equipe: <><circle cx="8" cy="9" r="2.5" /><circle cx="16" cy="9" r="2.5" /><path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M11 19c0-2.8 2.2-5 5-5s5 2.2 5 5" /></>,
}

export function Icon({ nome, tamanho = 24 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACOS[nome]}
    </svg>
  )
}

// ---------- marca da Matriz Engenharia ----------
// O "M" da logo, redesenhado em vetor e chapado (sem o brilho metálico do
// original, que some em tela pequena). Pega a cor de `color` (no app, o ouro).
// Original guardado em design/logo-matriz-engenharia.webp.
export function MarcaM({ tamanho = 28, rotulo }) {
  return (
    <svg width={tamanho} height={Math.round(tamanho * 0.875)} viewBox="0 0 64 56" fill="currentColor"
      role={rotulo ? 'img' : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : 'true'}>
      <rect x="10" y="6" width="7" height="42" />
      <rect x="47" y="6" width="7" height="42" />
      <rect x="6" y="46" width="15" height="4" />
      <rect x="43" y="46" width="15" height="4" />
      {/* As duas diagonais em formas separadas: juntas, o cruzamento ficaria vazado. */}
      <path d="M10 6h6.5l26 26.5-4.9 4.9L10 9.4z" />
      <path d="M54 6h-6.5l-26 26.5 4.9 4.9L54 9.4z" />
    </svg>
  )
}

// ---------- pequenos ----------
export const Chip = ({ nivel = 'neutro', children }) => <span className={`chip ${nivel}`}>{children}</span>

export function Stat({ rotulo, numero, rodape, nivel = '', onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat ${nivel}`} onClick={onClick}>
      <div className="mono">{rotulo}</div>
      <div className="num">{numero}</div>
      {rodape && <div className="ft">{rodape}</div>}
    </Tag>
  )
}

export function Cartao({ titulo, acao, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(titulo || acao) && (
        <div className="ch">
          <span className="mono">{titulo}</span>
          {acao}
        </div>
      )}
      {children}
    </div>
  )
}

// "Voltar" leva para a tela de onde a pessoa veio (quem sabe é o AppBase).
export const BotaoVoltar = ({ voltar }) => (
  <button className="voltar" onClick={voltar.ir}><Icon nome="voltar" tamanho={22} />{voltar.rotulo}</button>
)

export const Link = ({ onClick, children }) => <button className="link" onClick={onClick}>{children} ›</button>

// ---------- os três estados de toda tela que busca dado ----------
export function Vazio({ icone = 'frentes', titulo, texto, botao, onBotao }) {
  return (
    <div className="empty">
      <div className="ic"><Icon nome={icone} tamanho={34} /></div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {botao && <button className="btn pri lg" onClick={onBotao}><Icon nome="mais_um" tamanho={20} />{botao}</button>}
    </div>
  )
}

export function Carregando({ blocos = 3 }) {
  return (
    <div className="carregando" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: blocos }, (_, i) => <div key={i} className="esqueleto" />)}
    </div>
  )
}

export function ErroCarga({ mensagem, onTentar }) {
  return (
    <div className="card erro">
      <div className="empty">
        <div className="ic" style={{ background: 'var(--red-tint)', color: 'var(--red-ink)' }}><Icon nome="alerta" tamanho={34} /></div>
        <h3>Não foi possível carregar.</h3>
        <p>{mensagem}</p>
        {onTentar && <button className="btn sec" onClick={onTentar}>Tentar de novo</button>}
      </div>
    </div>
  )
}

// ---------- fotos: grade e foto grande ----------
// Foto sem arquivo (url null, as de exemplo) aparece como o quadro listrado.
export function GradeFotos({ fotos, rotulo }) {
  const [aberta, setAberta] = useState(null)
  const f = aberta !== null ? fotos[aberta] : null
  return (
    <div className="photos">
      {fotos.map((x, i) => (
        <button key={x.id} className={`ph t${(i % 3) + 1}`} aria-label={`Foto: ${rotulo(x)}`} onClick={() => setAberta(i)}>
          {x.url && <img src={x.url} alt="" loading="lazy" />}
          <span>{rotulo(x)}</span>
        </button>
      ))}
      {f && (
        <Folha titulo={`Foto ${aberta + 1} de ${fotos.length}`} onFechar={() => setAberta(null)}>
          <div style={{ padding: '0 16px' }}>
            {f.url ? <img className="foto-grande" src={f.url} alt={rotulo(f)} />
              : <div className="ph grande"><span>Foto de exemplo, sem arquivo</span></div>}
            <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>{dataCompleta(f.data)} · {rotulo(f)}</p>
            <p className="m" style={{ margin: 0 }}>Tirada por {f.autor_nome}</p>
            {fotos.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0' }}>
                <button className="btn sec" disabled={aberta === 0} onClick={() => setAberta(aberta - 1)}><Icon nome="voltar" />Anterior</button>
                <button className="btn sec" disabled={aberta === fotos.length - 1} onClick={() => setAberta(aberta + 1)}>Próxima<Icon nome="chev" /></button>
              </div>
            )}
          </div>
        </Folha>
      )}
    </div>
  )
}

// ---------- folha (sheet) que sobe de baixo ----------
export function Folha({ titulo, onFechar, children }) {
  const caixa = useRef(null)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    // Leva o foco para dentro da folha: primeiro campo; se não houver, o botão principal.
    // Ao fechar, devolve o foco para quem abriu.
    const quemAbriu = document.activeElement
    const alvo = caixa.current?.querySelector('input, select, textarea') ?? caixa.current?.querySelector('.btn.pri, .opt, .btn')
    alvo?.focus()
    return () => {
      window.removeEventListener('keydown', esc)
      if (quemAbriu?.isConnected) quemAbriu.focus()
    }
  }, [])
  return createPortal(
    <div className="veil" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={titulo} ref={caixa}>
        <div className="ch">
          <span className="mono">{titulo}</span>
          <button className="link" onClick={onFechar}>Fechar</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ---------- aviso rápido (toast) ----------
let ouvinte = null
export function avisar(texto) {
  if (ouvinte) ouvinte(texto)
}

export function Avisos() {
  const [texto, setTexto] = useState(null)
  useEffect(() => {
    let t
    ouvinte = (novo) => { setTexto(novo); clearTimeout(t); t = setTimeout(() => setTexto(null), 3200) }
    return () => { ouvinte = null; clearTimeout(t) }
  }, [])
  return texto ? <div className="toast" role="status">{texto}</div> : null
}

// ---------- formulário desenhado a partir de lib/formularios.js ----------
// `listas`: opções que dependem da obra, ex.: { frentes: [{ valor, rotulo }] }.
// Campo de lista sem opções e não obrigatório some (ex.: Frente na obra "Empresa").
export function Formulario({ campos, inicial, listas = {}, rotuloSalvar = 'Salvar', onSalvar, onCancelar, onMudar, duasColunas = false }) {
  const [valores, setValores] = useState(() => valoresIniciais(campos, inicial))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const mudar = (nome, valor) => {
    const novos = { ...valores, [nome]: valor }
    setValores(novos)
    if (erros[nome]) setErros({ ...erros, [nome]: undefined })
    if (onMudar) onMudar(novos)
  }

  const enviar = async (e) => {
    e.preventDefault()
    const achados = validar(campos, valores)
    setErros(achados)
    if (Object.keys(achados).length) return
    setSalvando(true)
    await onSalvar(valores)
    setSalvando(false)
  }

  const visiveis = camposVisiveis(campos, valores).filter((c) => !c.opcoesDe || c.obrigatorio || (listas[c.opcoesDe] || []).length)

  return (
    <form className={`form ${duasColunas ? 'duas' : ''}`} onSubmit={enviar} noValidate>
      {visiveis.map((c) => {
        const id = `campo-${c.nome}`
        const comum = { id, value: valores[c.nome] ?? '', onChange: (e) => mudar(c.nome, e.target.value), 'aria-invalid': !!erros[c.nome] }
        let entrada
        if (c.tipo === 'lista') {
          const opcoes = c.opcoesDe ? (listas[c.opcoesDe] || []) : c.opcoes.map((o) => ({ valor: o, rotulo: o }))
          entrada = (
            <select {...comum}>
              <option value="">{c.obrigatorio ? 'Escolha…' : '— nenhuma —'}</option>
              {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          )
        } else if (c.tipo === 'textoLongo') {
          entrada = <textarea {...comum} />
        } else {
          const tipoHtml = { data: 'date', email: 'email', senha: 'password', numero: 'text', dinheiro: 'text' }[c.tipo] || 'text'
          const teclado = c.tipo === 'numero' || c.tipo === 'dinheiro' ? 'decimal' : undefined
          entrada = <input {...comum} type={tipoHtml} inputMode={teclado} autoComplete={c.auto} list={c.sugestoesDe ? `${id}-sug` : undefined}
            placeholder={c.tipo === 'dinheiro' ? 'R$ 0,00' : undefined} />
        }
        return (
          <div key={c.nome} className={`campo ${c.inteiro || c.tipo === 'textoLongo' ? 'inteiro' : ''}`}>
            <label htmlFor={id}>{c.rotulo}{c.obrigatorio && <span className="obr">*</span>}</label>
            {entrada}
            {c.sugestoesDe && (
              <datalist id={`${id}-sug`}>{(listas[c.sugestoesDe] || []).map((s) => <option key={s} value={s} />)}</datalist>
            )}
            {erros[c.nome] ? <div className="erro-campo">{erros[c.nome]}</div> : c.ajuda && <div className="ajuda">{c.ajuda}</div>}
          </div>
        )
      })}
      {/* Fica grudado no rodapé no celular: Salvar sempre à mão, mesmo em formulário longo. */}
      <div className="acoes-form inteiro" style={onCancelar ? undefined : { gridTemplateColumns: '1fr' }}>
        {onCancelar && <button type="button" className="btn sec" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="btn pri" disabled={salvando}>{salvando ? 'Salvando…' : rotuloSalvar}</button>
      </div>
    </form>
  )
}
