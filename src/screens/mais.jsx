// Mais — no celular, o que não cabe nos 5 itens da barra inferior.
import { Cartao, Icon } from '../components/index.jsx'

const ITENS = [
  { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro', sub: 'Lançamentos, parcelas e empreiteiros desta obra' },
  { id: 'caixa', rotulo: 'Caixa geral', icone: 'caixa', sub: 'Todas as obras juntas' },
  { id: 'obras', rotulo: 'Obras', icone: 'obras', sub: 'Cadastrar e editar obras' },
  { id: 'pessoas', rotulo: 'Pessoas', icone: 'pessoas', sub: 'Liberar contas e escolher as obras' },
  { id: 'perfil', rotulo: 'Meu perfil', icone: 'perfil', sub: 'Nome e sair' },
]

export default function Mais({ goto }) {
  return (
    <Cartao>
      {ITENS.map((i) => (
        <button key={i.id} className="li" onClick={() => goto(i.id)}>
          <span style={{ color: 'var(--slate)' }}><Icon nome={i.icone} /></span>
          <div className="b"><div className="t">{i.rotulo}</div><div className="m">{i.sub}</div></div>
          <Icon nome="chev" tamanho={20} />
        </button>
      ))}
    </Cartao>
  )
}
