// Meu perfil — nome, email, perfil e Sair.
import { useSessao } from '../lib/SessaoContext.jsx'
import { USAR_MOCK } from '../lib/config.js'
import { iniciais } from '../lib/formato.js'
import { avisar, Cartao, Icon } from '../components/index.jsx'

export default function Perfil({ profile }) {
  const { sair } = useSessao()
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
          <button className="btn sec" onClick={() => avisar('Editar o nome entra na etapa do banco.')}>Editar nome</button>
          <button className="btn perigo" onClick={sair}><Icon nome="sair" tamanho={20} />{USAR_MOCK ? 'Trocar pessoa' : 'Sair'}</button>
        </div>
      </Cartao>
    </>
  )
}
