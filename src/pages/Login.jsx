// Login e Criar conta. A primeira conta do sistema já entra como Engenheiro;
// as seguintes entram como Aguardando (regra em lib/pessoas.js).
import { useState } from 'react'
import { useSessao } from '../lib/SessaoContext.jsx'
import { contasDeExemplo } from '../lib/dados.js'
import { CAMPOS_CRIAR_CONTA, CAMPOS_ENTRAR } from '../lib/formularios.js'
import { Formulario, MarcaM } from '../components/index.jsx'

export default function Login() {
  const { entrar, criarConta } = useSessao()
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState(null)
  const exemplo = contasDeExemplo()

  const enviar = async (valores) => {
    setErro(null)
    const r = await (criando ? criarConta : entrar)(valores)
    if (r.erro) setErro(r.erro)
  }
  const trocar = () => { setCriando(!criando); setErro(null) }

  return (
    <div className="entrada">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="marca"><MarcaM tamanho={64} rotulo="Matriz Engenharia" /><span>MATRIZ<br />ENGENHARIA</span></div>
        <div className="card">
          <div className="ch"><span className="mono">{criando ? 'Criar conta' : 'Entrar'}</span></div>
          {erro && <div className="aviso erro" role="alert" style={{ color: 'var(--red-ink)', fontWeight: 600 }}>{erro}</div>}
          <Formulario key={criando ? 'criar' : 'entrar'} campos={criando ? CAMPOS_CRIAR_CONTA : CAMPOS_ENTRAR}
            rotuloSalvar={criando ? 'Criar conta' : 'Entrar'} onSalvar={enviar} />
          <div className="aviso" style={{ borderTop: '1px solid var(--line2)' }}>
            {criando ? 'Já tem conta? ' : 'Ainda não tem conta? '}
            <button className="link" onClick={trocar}>{criando ? 'Entrar' : 'Criar conta'}</button>
          </div>
          {exemplo && !criando && (
            <div className="aviso" style={{ borderTop: '1px solid var(--line2)', fontSize: 14 }}>
              Dados de exemplo (nada sai deste computador). Senha de teste de todas: <b>{exemplo.senha}</b>
              {exemplo.contas.map((c) => <div key={c.email}>{c.email} · {c.role}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
