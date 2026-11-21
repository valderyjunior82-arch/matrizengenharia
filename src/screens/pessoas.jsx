// Pessoas — quem aguarda liberação e quem já usa o app (só Engenheiro).
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarPessoas } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Vazio } from '../components/index.jsx'

export default function Pessoas({ profile }) {
  const { todas } = useObra()
  const [liberando, setLiberando] = useState(null)
  const [papel, setPapel] = useState('Mestre')
  const [obrasMarcadas, setObrasMarcadas] = useState([])
  const { carregando, erro, data: pessoas, recarregar } = useCarregar(listarPessoas)

  if (carregando && !pessoas) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const aguardando = pessoas.filter((p) => p.role === 'Aguardando')
  const liberadas = pessoas.filter((p) => p.role !== 'Aguardando')
  const obras = todas.filter((o) => !o.interna && o.situacao !== 'Concluída')
  const marcar = (id) => setObrasMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  return (
    <>
      <div className="titulo-tela"><div><div className="mono">Cadastro</div><h2>Pessoas</h2></div></div>

      {aguardando.length > 0 && (
        <Cartao titulo={`Aguardando liberação · ${aguardando.length}`}>
          {aguardando.map((p) => (
            <div key={p.id} className="li atencao">
              <div className="b"><div className="t">{p.nome}</div><div className="m">{p.email}</div></div>
              <button className="btn pri" onClick={() => { setLiberando(p); setPapel('Mestre'); setObrasMarcadas([]) }}>Liberar</button>
            </div>
          ))}
        </Cartao>
      )}

      <Cartao titulo={`Com acesso · ${liberadas.length}`}>
        {liberadas.length > 1 ? liberadas.map((p) => (
          <button key={p.id} className="li" onClick={() => avisar('Editar e desativar pessoa entram na etapa do banco.')}>
            <div className="b">
              <div className="t">{p.nome}{p.id === profile.id && ' (você)'}</div>
              <div className="m">{p.email} · {p.role === 'Engenheiro' ? 'todas as obras' : p.obras.join(' · ') || 'nenhuma obra'}</div>
            </div>
            <Chip nivel={p.role === 'Engenheiro' ? 'info' : 'neutro'}>{p.role}</Chip>
          </button>
        )) : <Vazio icone="pessoas" titulo="Só você por enquanto." texto="Peça para o mestre criar a conta pelo link do sistema e libere aqui." />}
      </Cartao>

      {liberando && (
        <Folha titulo={`Liberar · ${liberando.nome}`} onFechar={() => setLiberando(null)}>
          <div className="form">
            <div className="campo">
              <label htmlFor="papel">Perfil<span className="obr">*</span></label>
              <select id="papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
                <option>Mestre</option><option>Engenheiro</option>
              </select>
              <div className="ajuda">O Mestre nunca vê valor em dinheiro.</div>
            </div>
            {papel === 'Mestre' && (
              <fieldset className="campo" style={{ border: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: 6 }}>Em quais obras ele entra</legend>
                {obras.map((o) => (
                  <label key={o.id} className="opt" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={obrasMarcadas.includes(o.id)} onChange={() => marcar(o.id)} style={{ width: 22, height: 22, minHeight: 0 }} />
                    <span><b>{o.nome}</b><div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>{o.codigo}</div></span>
                  </label>
                ))}
              </fieldset>
            )}
            <div className="acoes" style={{ padding: 0 }}>
              <button className="btn sec" onClick={() => setLiberando(null)}>Cancelar</button>
              <button className="btn pri" disabled={papel === 'Mestre' && !obrasMarcadas.length}
                onClick={() => { setLiberando(null); avisar('Liberar de verdade entra na etapa do banco.') }}>Liberar</button>
            </div>
          </div>
        </Folha>
      )}
    </>
  )
}
