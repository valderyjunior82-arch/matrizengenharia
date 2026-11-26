// Cadastros gerais (só Engenheiro): o plano de contas e os fornecedores.
// O plano de contas é fixo (vocabulario.js e o CHECK do banco); conta nova = migration.
// Os fornecedores juntam TODAS as obras de propósito, mas só nome, contato e quantidade de notas.
import { useState } from 'react'
import { excluirFornecedor, listarFornecedores, salvarFornecedor } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { CONTAS_ENTRADA, CONTAS_SAIDA } from '../lib/vocabulario.js'
import { CAMPOS_FORNECEDOR } from '../lib/formularios.js'
import { plural } from '../lib/formato.js'
import { avisar, Cartao, Carregando, Chip, ErroCarga, Folha, Formulario, Icon } from '../components/index.jsx'

export default function Cadastros({ profile }) {
  const { carregando, erro, data, recarregar } = useCarregar(listarFornecedores)
  // { f: linha da lista (ou null = novo) } · { excluir: cadastro }
  const [folha, setFolha] = useState(null)

  const contas = (lista) => lista.map((c) => <div key={c} className="li" style={{ minHeight: 48 }}><div className="b"><div className="t">{c}</div></div></div>)

  const salvar = async (valores) => {
    const id = folha.f?.cadastro?.id ?? null
    const { erro: e } = await salvarFornecedor(profile, id, valores)
    if (e) return avisar(e)
    setFolha(null)
    avisar(id ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.')
    recarregar()
  }
  const excluir = async () => {
    const { erro: e } = await excluirFornecedor(profile, folha.excluir.id)
    setFolha(null)
    avisar(e || 'Cadastro excluído. As notas antigas continuam com o nome.')
    recarregar()
  }
  const detalhe = (f) => [
    f.cadastro?.telefone,
    f.notas ? plural(f.notas, 'lançamento', 'lançamentos') : f.cadastro ? 'nenhuma nota ainda' : 'só em materiais',
  ].filter(Boolean).join(' · ')

  return (
    <>
      <div className="titulo-tela"><div><div className="mono">Cadastros gerais</div><h2>Plano de contas e fornecedores</h2></div></div>
      <Cartao titulo="Contas de entrada">{contas(CONTAS_ENTRADA)}</Cartao>
      <Cartao titulo="Contas de saída">{contas(CONTAS_SAIDA)}</Cartao>
      <div className="aviso">Precisa de uma conta nova? Peça a inclusão: a lista é a mesma no app e no banco, para nenhuma nota cair numa conta digitada errado.</div>
      <Cartao titulo={`Fornecedores · todas as obras${data ? ` · ${data.length}` : ''}`}>
        {carregando && !data ? <Carregando blocos={2} />
          : erro ? <ErroCarga mensagem={erro} onTentar={recarregar} />
            : <>
              {data.length ? data.map((f) => (
                <button key={f.nome} className="li" onClick={() => setFolha({ f })}>
                  <div className="b"><div className="t">{f.nome}</div><div className="m">{detalhe(f)}</div></div>
                  {!f.cadastro && <div className="r"><Chip nivel="neutro">Sem cadastro</Chip></div>}
                </button>
              )) : <div className="aviso">Nenhum fornecedor ainda. Cadastre aqui, ou digite o nome numa nota ou num material.</div>}
              <div className="acoes um"><button className="btn dark" onClick={() => setFolha({ f: null })}><Icon nome="mais_um" tamanho={20} />Novo fornecedor</button></div>
            </>}
      </Cartao>

      {folha && 'f' in folha && (
        <Folha titulo={folha.f?.cadastro ? 'Editar fornecedor' : 'Cadastrar fornecedor'} onFechar={() => setFolha(null)}>
          {folha.f && !folha.f.cadastro && <div className="aviso">Este nome já aparece em notas ou materiais. Cadastre para guardar telefone e documento.</div>}
          {folha.f?.cadastro && <div className="aviso">Mudar o nome aqui não muda as notas antigas: elas continuam com o nome que foi digitado.</div>}
          <Formulario campos={CAMPOS_FORNECEDOR} inicial={folha.f?.cadastro ?? { nome: folha.f?.nome ?? '' }}
            rotuloSalvar={folha.f?.cadastro ? 'Salvar' : 'Cadastrar'} onCancelar={() => setFolha(null)} onSalvar={salvar} />
          {folha.f?.cadastro && (
            <div className="acoes um"><button className="btn perigo" onClick={() => setFolha({ excluir: folha.f.cadastro })}>Excluir cadastro</button></div>
          )}
        </Folha>
      )}
      {folha?.excluir && (
        <Folha titulo="Excluir cadastro" onFechar={() => setFolha(null)}>
          <div style={{ padding: 16 }}>{folha.excluir.nome}: some o telefone, o documento e a observação. As notas antigas continuam com o nome, e ele volta à lista como "Sem cadastro" se já foi usado.</div>
          <div className="acoes">
            <button className="btn sec" onClick={() => setFolha(null)}>Cancelar</button>
            <button className="btn perigo" onClick={excluir}>Excluir</button>
          </div>
        </Folha>
      )}
    </>
  )
}
