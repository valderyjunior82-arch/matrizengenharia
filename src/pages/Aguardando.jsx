// Conta criada e ainda não liberada: não vê dado nenhum.
import { useEffect } from 'react'
import { useSessao } from '../lib/SessaoContext.jsx'
import { Icon, MarcaM } from '../components/index.jsx'

// De quanto em quanto tempo a tela pergunta se a conta já foi liberada.
const INTERVALO_MS = 15000

export default function Aguardando() {
  const { profile, sair, conferirConta } = useSessao()

  // "Assim que ele liberar, você entra direto": confere a cada 15 s e ao voltar para o app.
  useEffect(() => {
    const t = setInterval(conferirConta, INTERVALO_MS)
    window.addEventListener('focus', conferirConta)
    return () => { clearInterval(t); window.removeEventListener('focus', conferirConta) }
  }, [conferirConta])
  return (
    <div className="entrada">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="marca"><MarcaM tamanho={64} rotulo="Matriz Engenharia" /><span>MATRIZ<br />ENGENHARIA</span></div>
        <div className="card">
          <div className="empty">
            <div className="ic"><Icon nome="relogio" tamanho={34} /></div>
            <h3>Conta aguardando liberação do engenheiro.</h3>
            <p>Assim que ele liberar, você entra direto.</p>
            <p className="mono" style={{ fontSize: 11 }}>{profile.email}</p>
            <button className="btn sec" onClick={sair}><Icon nome="sair" tamanho={20} />Sair</button>
          </div>
        </div>
      </div>
    </div>
  )
}
