// Lançar nota — foto da nota primeiro, depois o formulário. Só Engenheiro.
// A obra vem preenchida com a do seletor; dá para escolher outra ou "Empresa (sem obra)".
// Com params.id, abre o lançamento: ver a foto, editar ou excluir (a obra não muda).
import { useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { hoje as hojeDe } from '../lib/config.js'
import {
  excluirLancamento, linkComprovante, listarContratos, listarFornecedores, listarFrentes, listarMateriais,
  obterLancamento, salvarLancamento,
} from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { CAMPOS_NOTA } from '../lib/formularios.js'
import { vinculosValem } from '../lib/financeiro.js'
import { brl } from '../lib/formato.js'
import { avisar, BotaoVoltar, Cartao, Carregando, comprimirFoto, ErroCarga, Folha, Formulario, Icon } from '../components/index.jsx'

const ATALHOS = ['categoria', 'frente_id', 'fornecedor', 'material_id', 'contrato_empreiteiro_id']

export default function LancarNota({ goto, voltar: volta, params = {}, profile }) {
  const { obraId, todas } = useObra()
  const [obraEscolhida, setObraEscolhida] = useState(obraId)
  const [foto, setFoto] = useState(null)
  const [salva, setSalva] = useState(null) // a nota nova que acabou de entrar
  const [rodada, setRodada] = useState(0) // "Lançar outra" remonta o formulário limpo
  const [fotoAberta, setFotoAberta] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({
    frentes: listarFrentes(), materiais: listarMateriais(), contratos: listarContratos(),
    fornecedores: listarFornecedores(),
    // Com id, o lançamento vem da obra do seletor ou da Empresa (que não tem seletor).
    anterior: params.id ? obterLancamento(params.id) : Promise.resolve({ data: null, erro: null }),
  }))

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !data) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  const { anterior } = data
  const daObra = vinculosValem(anterior?.obra_id ?? obraEscolhida, obraId)
  // Depois de editar ou excluir: nota desta obra volta para os Lançamentos; da Empresa, para onde veio (Caixa geral).
  const sair = () => (anterior.obra_id === obraId ? goto('financeiro', { aba: 'lancamentos' }) : volta.ir())
  const servico = (id) => data.frentes.find((f) => f.id === id)?.servico ?? ''
  const listas = {
    obras: todas.filter((o) => o.situacao !== 'Concluída').map((o) => ({ valor: o.id, rotulo: o.nome })),
    frentes: daObra ? data.frentes.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente}` })) : [],
    materiais: daObra ? data.materiais.map((m) => ({ valor: m.id, rotulo: m.item })) : [],
    contratos: daObra ? data.contratos.map((c) => ({ valor: c.id, rotulo: `${c.empreiteiro} · ${servico(c.frente_id)}` })) : [],
    fornecedores: data.fornecedores.map((f) => f.nome),
  }
  const campos = anterior ? CAMPOS_NOTA.filter((c) => c.nome !== 'obra_id') : CAMPOS_NOTA
  const inicial = anterior
    ? { ...anterior, valor: String(anterior.valor).replace('.', ',') }
    : { obra_id: salva?.obra_id ?? obraId, data: salva?.data ?? hojeDe(), ...(rodada === 0 && Object.fromEntries(ATALHOS.filter((k) => params[k]).map((k) => [k, params[k]]))) }

  const escolherFoto = async (e) => {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      setFoto(await comprimirFoto(arquivo))
    } catch {
      avisar('Não foi possível abrir esta foto. Tente outra.')
    }
  }

  const salvar = async (valores) => {
    const { data: l, erro: e } = await salvarLancamento(profile, anterior?.id ?? null, valores, foto)
    if (e) return avisar(e)
    if (anterior) {
      avisar('Lançamento atualizado.')
      return sair()
    }
    avisar('Nota lançada')
    setSalva(l)
  }

  const abrirFoto = async () => {
    const { data: url, erro: e } = await linkComprovante(anterior.comprovante_caminho)
    if (e) return avisar(e)
    if (!url) return avisar('Este lançamento de exemplo não tem o arquivo da foto.')
    setFotoAberta(url)
  }

  const excluir = async () => {
    setExcluindo(false)
    const { erro: e } = await excluirLancamento(profile, anterior.id)
    if (e) return avisar(e)
    avisar('Lançamento excluído.')
    sair()
  }

  if (salva) {
    const obra = todas.find((o) => o.id === salva.obra_id)
    return (
      <>
        {voltar}
        <Cartao titulo="Nota lançada">
          <div style={{ padding: 16 }}>
            <div className="t">{salva.descricao || salva.categoria} · {brl(salva.valor)}</div>
            <div className="m">{obra?.nome}{salva.comprovante_caminho ? ' · com foto da nota' : ' · sem foto'}</div>
          </div>
          <div className="acoes">
            <button className="btn pri" onClick={() => { setSalva(null); setFoto(null); setObraEscolhida(salva.obra_id); setRodada(rodada + 1) }}>Lançar outra</button>
            <button className="btn sec" onClick={() => goto('financeiro', { aba: 'lancamentos' })}>Ver lançamentos</button>
          </div>
        </Cartao>
      </>
    )
  }

  return (
    <>
      {voltar}
      <div className="titulo-tela"><div><div className="mono">Financeiro</div><h2>{anterior ? 'Lançamento' : 'Lançar nota'}</h2></div></div>
      {anterior?.comprovante_caminho && !foto && (
        <button className="btn sec" style={{ width: '100%' }} onClick={abrirFoto}><Icon nome="camera" tamanho={20} />Ver foto da nota</button>
      )}
      <label className="foto-btn" style={foto ? { borderStyle: 'solid', borderColor: 'var(--ouro)' } : null}>
        {foto ? <img src={foto.previa} alt="Foto da nota escolhida" style={{ maxHeight: 160, borderRadius: 8 }} /> : <Icon nome="camera" tamanho={30} />}
        {foto ? 'Trocar a foto' : anterior?.comprovante_caminho ? 'Trocar a foto da nota' : 'Foto da nota'}
        <input type="file" accept="image/*" onChange={escolherFoto} style={{ display: 'none' }} />
      </label>
      <Cartao titulo="Dados da nota">
        <Formulario key={rodada} campos={campos} inicial={inicial} listas={listas} duasColunas
          onMudar={(v) => setObraEscolhida(v.obra_id)} onCancelar={volta.ir} onSalvar={salvar} />
      </Cartao>
      {anterior && (
        <div className="acoes um"><button className="btn perigo" onClick={() => setExcluindo(true)}>Excluir lançamento</button></div>
      )}
      {excluindo && (
        <Folha titulo="Excluir lançamento" onFechar={() => setExcluindo(false)}>
          <div style={{ padding: 16 }}>{anterior.descricao || anterior.categoria} · {brl(anterior.valor)}. Some do financeiro e do caixa, junto com a foto da nota. Não dá para desfazer.</div>
          <div className="acoes">
            <button className="btn sec" onClick={() => setExcluindo(false)}>Cancelar</button>
            <button className="btn perigo" onClick={excluir}>Excluir</button>
          </div>
        </Folha>
      )}
      {fotoAberta && (
        <Folha titulo="Foto da nota" onFechar={() => setFotoAberta(null)}>
          <img src={fotoAberta} alt="Foto da nota" style={{ width: '100%', display: 'block' }} />
        </Folha>
      )}
    </>
  )
}
