// Obras — cadastro das obras (só Engenheiro). Abrir obra nova é tela, não SQL.
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { listarPessoas } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { CAMPOS_OBRA } from '../lib/formularios.js'
import { dataCompleta } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Formulario, Icon, Vazio } from '../components/index.jsx'

const NIVEL_OBRA = { 'Em andamento': 'info', Parada: 'atencao', Concluída: 'ok' }
const ORDEM = ['Em andamento', 'Parada', 'Concluída']

export default function Obras() {
  const { todas, obraId, trocarObra } = useObra()
  const [aberta, setAberta] = useState(null) // obra | 'nova'
  const { carregando, erro, data: pessoas, recarregar } = useCarregar(listarPessoas)

  if (carregando && !pessoas) return <Carregando />
  if (erro) return <ErroCarga mensagem={erro} onTentar={recarregar} />

  const obras = todas.filter((o) => !o.interna).sort((a, b) => ORDEM.indexOf(a.situacao) - ORDEM.indexOf(b.situacao))
  const salvo = () => { setAberta(null); avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.') }
  const pessoasDa = (o) => pessoas.filter((p) => p.obras.includes(o.nome))

  return (
    <>
      <div className="titulo-tela">
        <div><div className="mono">Cadastro</div><h2>Obras</h2></div>
        <button className="btn dark" onClick={() => setAberta('nova')}><Icon nome="mais_um" tamanho={20} />Nova obra</button>
      </div>

      <Cartao titulo={`Obras · ${obras.length}`}>
        {obras.length ? obras.map((o) => (
          <button key={o.id} className="li" onClick={() => setAberta(o)}>
            <div className="b">
              <div className="t">{o.nome}</div>
              <div className="m">{o.codigo}{o.cliente_nome && ` · ${o.cliente_nome}`} · entrega {dataCompleta(o.data_meta_entrega)}</div>
            </div>
            <div className="r">
              <Chip nivel={NIVEL_OBRA[o.situacao]}>{o.situacao}</Chip>
              {o.id === obraId && <span className="s">aberta agora</span>}
            </div>
          </button>
        )) : <Vazio icone="obras" titulo="Nenhuma obra ainda." texto="Cadastre a primeira obra para começar." botao="Cadastrar obra" onBotao={() => setAberta('nova')} />}
      </Cartao>

      <div className="aviso">Gastos da empresa que não são de obra nenhuma (combustível, contador, ferramenta) ficam em “Empresa (sem obra)”, que só aparece no Caixa geral.</div>

      {aberta === 'nova' && (
        <Folha titulo="Nova obra" onFechar={() => setAberta(null)}>
          <Formulario campos={CAMPOS_OBRA} duasColunas onCancelar={() => setAberta(null)} onSalvar={salvo} />
        </Folha>
      )}
      {aberta && aberta !== 'nova' && (
        <Folha titulo={aberta.nome} onFechar={() => setAberta(null)}>
          <Formulario campos={CAMPOS_OBRA} inicial={aberta} duasColunas onCancelar={() => setAberta(null)} onSalvar={salvo} />
          <div className="ch"><span className="mono">Quem trabalha nesta obra</span>
            <button className="link" onClick={() => avisar('Adicionar pessoa entra na etapa do banco.')}>Adicionar pessoa</button></div>
          {pessoasDa(aberta).map((p) => (
            <div key={p.id} className="li" style={{ minHeight: 56 }}>
              <div className="b"><div className="t">{p.nome}</div><div className="m">{p.role}</div></div>
              <button className="btn sec" onClick={() => avisar('Remover pessoa entra na etapa do banco.')}>Remover</button>
            </div>
          ))}
          {aberta.situacao !== 'Concluída' && aberta.id !== obraId && (
            <div className="acoes um"><button className="btn pri" onClick={() => { trocarObra(aberta.id); setAberta(null); avisar(`Agora você está na obra ${aberta.nome}.`) }}>Abrir esta obra</button></div>
          )}
        </Folha>
      )}
    </>
  )
}
