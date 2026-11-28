// Frentes — todas as frentes da obra, agrupadas por situação, com filtro por ambiente.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFrentes, salvarFrente } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { agruparPorSituacao, ambientesDe } from '../lib/frentes.js'
import { CAMPOS_FRENTE } from '../lib/formularios.js'
import { ehEngenheiro } from '../lib/permissoes.js'
import { plural } from '../lib/formato.js'
import { avisar, Carregando, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'
import { AbasTopo } from '../components/Shell.jsx'
import { LinhaFrente } from '../components/pecas.jsx'

export default function Frentes({ goto, params, profile }) {
  const hoje = hojeDe()
  const [ambiente, setAmbiente] = useState('todos')
  const [criando, setCriando] = useState(!!params.nova)
  const { carregando, erro, data: frentes, recarregar } = useCarregar(listarFrentes)
  const engenheiro = ehEngenheiro(profile)

  if (carregando && !frentes) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const ambientes = ambientesDe(frentes)
  const lista = frentes.filter((f) => ambiente === 'todos' || f.ambiente === ambiente)
  const abrir = (id) => goto('frente', { id })

  return (
    <>
      {ambientes.length > 1 && (
        <AbasTopo ativa={ambiente} onTrocar={setAmbiente}
          abas={[{ id: 'todos', rotulo: 'Todos' }, ...ambientes.map((a) => ({ id: a, rotulo: a }))]} />
      )}

      <div className="titulo-tela">
        <div><div className="mono">Frentes de serviço</div><h2>{plural(lista.length, 'frente', 'frentes')}</h2></div>
        {engenheiro && frentes.length > 0 && <button className="btn dark" onClick={() => setCriando(true)}><Icon nome="mais_um" tamanho={20} />Nova frente</button>}
      </div>

      {frentes.length === 0 ? (
        <div className="card">
          <Vazio titulo="Nenhuma frente ainda." texto={engenheiro ? 'Cadastre as frentes de serviço da obra: elétrica, gesso, marcenaria…' : 'O engenheiro ainda não cadastrou as frentes desta obra.'}
            botao={engenheiro ? 'Cadastrar a primeira frente' : null} onBotao={() => setCriando(true)} />
        </div>
      ) : agruparPorSituacao(lista).map((g) => (
        <details key={g.situacao} className="card grupo" open={g.situacao !== 'Concluída'}>
          <summary><div className="ch"><span className="mono">{g.situacao} · {g.frentes.length}</span><span className="caret"><Icon nome="chev" tamanho={18} /></span></div></summary>
          {g.frentes.map((f) => <LinhaFrente key={f.id} frente={f} hoje={hoje} onAbrir={abrir} />)}
        </details>
      ))}

      {criando && (
        <Folha titulo="Nova frente" onFechar={() => setCriando(false)}>
          <Formulario campos={CAMPOS_FRENTE} listas={{ ambientes }} duasColunas onCancelar={() => setCriando(false)}
            rotuloSalvar="Cadastrar frente" onSalvar={async (v) => {
              const r = await salvarFrente(profile, null, v)
              if (r.erro) { avisar(r.erro); return }
              setCriando(false)
              avisar('Frente cadastrada.')
              recarregar()
            }} />
        </Folha>
      )}
    </>
  )
}
