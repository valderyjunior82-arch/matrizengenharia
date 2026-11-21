// Lançar nota — foto da nota primeiro, depois o formulário. Só Engenheiro.
// A obra vem preenchida com a do seletor; dá para escolher "Empresa (sem obra)".
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFrentes } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { CAMPOS_NOTA } from '../lib/formularios.js'
import { avisar, BotaoVoltar, Cartao, Carregando, ErroCarga, Formulario, Icon } from '../components/index.jsx'

export default function LancarNota({ goto, voltar: volta, params }) {
  const { obraId, todas } = useObra()
  const [obraEscolhida, setObraEscolhida] = useState(obraId)
  const [comFoto, setComFoto] = useState(false)
  const { carregando, erro, data: frentes, recarregar } = useCarregar(listarFrentes)

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !frentes) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  // As frentes listadas são sempre as da obra do seletor; nota de outra obra
  // (ou da Empresa) sai sem frente, e a lista some.
  const listas = {
    obras: todas.filter((o) => o.situacao !== 'Concluída').map((o) => ({ valor: o.id, rotulo: o.nome })),
    frentes: obraEscolhida === obraId ? frentes.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente}` })) : [],
  }
  const inicial = {
    obra_id: obraId, data: hojeDe(),
    ...(params.categoria && { categoria: params.categoria }),
    ...(params.frente_id && { frente_id: params.frente_id }),
    ...(params.fornecedor && { fornecedor: params.fornecedor }),
  }

  return (
    <>
      {voltar}
      <div className="titulo-tela"><div><div className="mono">Financeiro</div><h2>Lançar nota</h2></div></div>
      <button className="foto-btn" style={comFoto ? { borderStyle: 'solid', borderColor: 'var(--ouro)', color: 'var(--ouro-ink)' } : null}
        onClick={() => { setComFoto(true); avisar('A câmera entra junto com o Storage, na etapa do banco.') }}>
        <Icon nome={comFoto ? 'check' : 'camera'} tamanho={30} />{comFoto ? 'Foto da nota (exemplo)' : 'Foto da nota'}
      </button>
      <Cartao titulo="Dados da nota">
        <Formulario campos={CAMPOS_NOTA} inicial={inicial} listas={listas} duasColunas
          onMudar={(v) => setObraEscolhida(v.obra_id)}
          onCancelar={volta.ir}
          onSalvar={() => { avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.'); goto('financeiro') }} />
      </Cartao>
    </>
  )
}
