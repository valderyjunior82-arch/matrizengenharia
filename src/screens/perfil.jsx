// Meu perfil — nome (editável), email, perfil e Sair.
import { useState } from 'react'
import { useSessao } from '../lib/SessaoContext.jsx'
import { salvarMeuNome } from '../lib/dados.js'
import { CAMPOS_MEU_NOME } from '../lib/formularios.js'
import { iniciais } from '../lib/formato.js'
import { avisar, Cartao, Folha, Formulario, Icon } from '../components/index.jsx'

export default function Perfil({ profile }) {
  const { sair, atualizarPerfil } = useSessao()
  const [editando, setEditando] = useState(false)

  const salvar = async ({ nome }) => {
    const r = await salvarMeuNome(profile, nome)
    if (r.erro) { avisar(r.erro); return }
    atualizarPerfil(r.data)
    setEditando(false)
    avisar('Salvo.')
  }

  return (
    <>
      <div className="titulo-tela"><div><div className="mono">Conta</div><h2>Meu perfil</h2></div></div>
      <Cartao>
        <div className="li" style={{ minHeight: 88 }}>
          <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontWeight: 600, flex: 'none' }}>{iniciais(profile.nome)}</div>
          <div className="b"><div className="t" style={{ fontSize: 19 }}>{profile.nome}</div><div className="m">{profile.email}</div></div>
        </div>
        <div className="kv">
          <div><div className="rotulo">Perfil</div><div className="v">{profile.role}</div></div>
          <div><div className="rotulo">Situação</div><div className="v">{profile.ativo ? 'Ativo' : 'Desativado'}</div></div>
        </div>
        <div className="acoes">
          <button className="btn sec" onClick={() => setEditando(true)}>Editar nome</button>
          <button className="btn perigo" onClick={sair}><Icon nome="sair" tamanho={20} />Sair</button>
        </div>
      </Cartao>
      {editando && (
        <Folha titulo="Editar nome" onFechar={() => setEditando(false)}>
          <Formulario campos={CAMPOS_MEU_NOME} inicial={{ nome: profile.nome }} onSalvar={salvar} onCancelar={() => setEditando(false)} />
        </Folha>
      )}
    </>
  )
}
