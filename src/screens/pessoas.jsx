// Pessoas — quem aguarda liberação e quem já usa o app (só Engenheiro).
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { definirAtivo, listarPessoas, salvarAcesso } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { erroDeAcesso, podeGerenciar } from '../lib/pessoas.js'
import { obrasDoSeletor } from '../lib/escopo.js'
import { PAPEIS_DE_ACESSO } from '../lib/vocabulario.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Vazio } from '../components/index.jsx'

export default function Pessoas({ profile }) {
  const { todas } = useObra()
  const [aberta, setAberta] = useState(null)
  const { carregando, erro, data: pessoas, recarregar } = useCarregar(listarPessoas)

  if (carregando && !pessoas) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const aguardando = pessoas.filter((p) => p.role === 'Aguardando')
  const liberadas = pessoas.filter((p) => p.role !== 'Aguardando')
  const pronto = (msg) => { setAberta(null); avisar(msg); recarregar() }

  return (
    <>
      <div className="titulo-tela"><div><div className="mono">Cadastro</div><h2>Pessoas</h2></div></div>

      {aguardando.length > 0 && (
        <Cartao titulo={`Aguardando liberação · ${aguardando.length}`}>
          {aguardando.map((p) => (
            <div key={p.id} className="li atencao">
              <div className="b"><div className="t">{p.nome}</div><div className="m">{p.email}</div></div>
              <button className="btn pri" onClick={() => setAberta(p)}>Liberar</button>
            </div>
          ))}
        </Cartao>
      )}

      <Cartao titulo={`Com acesso · ${liberadas.length}`}>
        {liberadas.length > 1 ? liberadas.map((p) => {
          const miolo = (
            <>
              <div className="b">
                <div className="t">{p.nome}{p.id === profile.id && ' (você)'}</div>
                <div className="m">{p.email} · {p.role === 'Engenheiro' ? 'todas as obras' : p.obras.join(' · ') || 'nenhuma obra'}</div>
              </div>
              <div className="r">
                <Chip nivel={p.role === 'Engenheiro' ? 'info' : 'neutro'}>{p.role}</Chip>
                {!p.ativo && <Chip nivel="critico">Desativado</Chip>}
              </div>
            </>
          )
          return podeGerenciar(profile, p)
            ? <button key={p.id} className="li" onClick={() => setAberta(p)}>{miolo}</button>
            : <div key={p.id} className="li">{miolo}</div>
        }) : <Vazio icone="pessoas" titulo="Só você por enquanto." texto="Peça para o mestre criar a conta pelo link do sistema e libere aqui." />}
      </Cartao>

      {aberta && <FolhaAcesso pessoa={aberta} profile={profile} obras={obrasDoSeletor(todas)} onFechar={() => setAberta(null)} onPronto={pronto} />}
    </>
  )
}

// Liberar (quem está aguardando) e Editar (quem já entra) usam a mesma folha.
function FolhaAcesso({ pessoa, profile, obras, onFechar, onPronto }) {
  const liberando = pessoa.role === 'Aguardando'
  const [papel, setPapel] = useState(liberando ? 'Mestre' : pessoa.role)
  // Só as obras que aparecem para marcar: a concluída fica guardada sem contar (lib/pessoas.js).
  const [obraIds, setObraIds] = useState(() => pessoa.obra_ids.filter((id) => obras.some((o) => o.id === id)))
  const [enviando, setEnviando] = useState(false)
  const falta = erroDeAcesso(papel, obraIds)
  const marcar = (id) => setObraIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))

  const enviar = async (pedido, msg) => {
    setEnviando(true)
    const r = await pedido
    setEnviando(false)
    if (r.erro) avisar(r.erro)
    else onPronto(msg)
  }

  return (
    <Folha titulo={`${liberando ? 'Liberar' : 'Editar'} · ${pessoa.nome}`} onFechar={onFechar}>
      <div className="form">
        <div className="campo">
          <label htmlFor="papel">Perfil<span className="obr">*</span></label>
          <select id="papel" value={papel} onChange={(e) => setPapel(e.target.value)}>
            {PAPEIS_DE_ACESSO.map((p) => <option key={p}>{p}</option>)}
          </select>
          <div className="ajuda">{papel === 'Mestre' ? 'O Mestre nunca vê valor em dinheiro e só vê as obras marcadas.' : 'O Engenheiro vê todas as obras e o dinheiro.'}</div>
        </div>
        {papel === 'Mestre' && (
          <fieldset className="campo" style={{ border: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 6 }}>Em quais obras ele entra</legend>
            {obras.map((o) => (
              <label key={o.id} className="opt" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={obraIds.includes(o.id)} onChange={() => marcar(o.id)} style={{ width: 22, height: 22, minHeight: 0 }} />
                <span><b>{o.nome}</b><div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>{o.codigo}</div></span>
              </label>
            ))}
          </fieldset>
        )}
        {falta && <div className="ajuda" role="status">{falta}</div>}
        <div className="acoes" style={{ padding: 0 }}>
          <button className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn pri" disabled={!!falta || enviando}
            onClick={() => enviar(salvarAcesso(profile, pessoa.id, { role: papel, obraIds }), liberando ? `${pessoa.nome} liberado.` : 'Salvo.')}>
            {enviando ? 'Salvando…' : liberando ? 'Liberar' : 'Salvar'}
          </button>
        </div>
        {!liberando && (
          <div className="acoes um" style={{ padding: 0 }}>
            <button className={`btn ${pessoa.ativo ? 'perigo' : 'sec'}`} disabled={enviando}
              onClick={() => enviar(definirAtivo(profile, pessoa.id, !pessoa.ativo), pessoa.ativo ? `${pessoa.nome} não entra mais.` : `${pessoa.nome} voltou a entrar.`)}>
              {pessoa.ativo ? 'Desativar' : 'Reativar'}
            </button>
            {pessoa.ativo && <div className="ajuda">Desativado não entra mais, mas o que lançou continua com o nome dele.</div>}
          </div>
        )}
      </div>
    </Folha>
  )
}
