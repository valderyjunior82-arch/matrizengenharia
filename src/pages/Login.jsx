// Login. Enquanto o banco não existe, entrar é escolher uma pessoa de teste:
// assim dá para ver o app como Engenheiro, como Mestre e como conta pendente.
import { useSessao } from '../lib/SessaoContext.jsx'
import { listarPessoasDeTeste } from '../lib/dados.js'
import { Icon, MarcaM } from '../components/index.jsx'

const DESCRICAO = {
  Engenheiro: 'Vê todas as obras e o dinheiro. Abre em Hoje.',
  Mestre: 'Só as obras dele, sem nenhum valor. Abre no Diário.',
  Aguardando: 'Conta nova, ainda não liberada.',
}

export default function Login() {
  const { entrar } = useSessao()
  const pessoas = listarPessoasDeTeste()
  return (
    <div className="entrada">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="marca"><MarcaM tamanho={64} rotulo="Matriz Engenharia" /><span>MATRIZ<br />ENGENHARIA</span></div>
        <div className="card">
          <div className="ch"><span className="mono">Entrar como (teste)</span></div>
          {pessoas.map((p) => (
            <button key={p.id} className="li" onClick={() => entrar(p.id)}>
              <div className="b">
                <div className="t">{p.nome}</div>
                <div className="m">{p.role} · {DESCRICAO[p.role]}</div>
              </div>
              <Icon nome="chev" tamanho={20} />
            </button>
          ))}
          <div className="aviso" style={{ borderTop: '1px solid var(--line2)', fontSize: 14 }}>
            Login com email e senha entra junto com o banco. Por enquanto, os dados são de exemplo e nada sai deste computador.
          </div>
        </div>
      </div>
    </div>
  )
}
