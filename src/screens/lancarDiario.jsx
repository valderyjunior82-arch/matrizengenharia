// Lançar no diário — três botões grandes (Avanço · Equipe · Ocorrência), o formulário e as fotos.
// Com params.id, edita aquele registro (só texto, % e mais fotos; tipo e frente ficam).
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFrentes, listarRegistros, salvarRegistro } from '../lib/dados.js'
import { useCarregar, juntar } from '../lib/usarDados.js'
import { camposDiario } from '../lib/formularios.js'
import { TIPOS_REGISTRO } from '../lib/vocabulario.js'
import { diaRelativo } from '../lib/formato.js'
import { frentesParaAvanco } from '../lib/diario.js'
import { avisar, BotaoVoltar, comprimirFoto, Cartao, Carregando, ErroCarga, Formulario, Icon } from '../components/index.jsx'

const ICONE_TIPO = { Avanço: 'frentes', Equipe: 'equipe', Ocorrência: 'alerta' }
const TITULO_TIPO = { Avanço: 'Avanço de frente', Equipe: 'Equipe presente', Ocorrência: 'Ocorrência' }

export default function LancarDiario({ goto, voltar: volta, params = {}, profile }) {
  const hoje = hojeDe()
  const [tipoEscolhido, setTipo] = useState(null)
  const [fotos, setFotos] = useState([])
  const { carregando, erro, data, recarregar } = useCarregar(() => juntar({ frentes: listarFrentes(), registros: listarRegistros() }))

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !data) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  const registro = params.id ? data.registros.find((r) => r.id === params.id) : null
  if (params.id && !registro) return <>{voltar}<ErroCarga mensagem="Este registro não existe mais." onTentar={recarregar} /></>
  const tipo = registro?.tipo ?? tipoEscolhido

  const abertas = frentesParaAvanco(data.frentes, registro)
  const listas = { frentes: abertas.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente} (hoje ${f.percentual}%)` })) }
  const campos = registro ? camposDiario(tipo).filter((c) => c.nome !== 'frente_id') : camposDiario(tipo)
  const inicial = registro ? { texto: registro.texto, percentual_novo: registro.percentual_novo ?? '' } : undefined

  const escolherFotos = async (e) => {
    const arquivos = [...e.target.files]
    e.target.value = ''
    try {
      const novas = await Promise.all(arquivos.map(comprimirFoto))
      setFotos((atuais) => [...atuais, ...novas.map((n) => ({ ...n, id: crypto.randomUUID() }))])
    } catch {
      avisar('Não foi possível abrir esta foto. Tente outra.')
    }
  }

  const salvar = async (valores) => {
    const { erro: e } = await salvarRegistro(profile, registro?.id ?? null, tipo, valores, fotos)
    if (e) return avisar(e)
    avisar(registro ? 'Registro atualizado.' : 'Lançado no diário.')
    goto('diario')
  }

  return (
    <>
      {voltar}
      <div className="titulo-tela"><div>
        <div className="mono">{registro ? 'Editar registro' : 'Lançar no diário'}</div>
        <h2>{diaRelativo(registro?.data ?? hoje, hoje)}</h2>
      </div></div>
      {!registro && (
        <div className="tipos" role="group" aria-label="Tipo do registro">
          {TIPOS_REGISTRO.map((t) => (
            <button key={t} className={`tipo ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)} aria-pressed={tipo === t}>
              <Icon nome={ICONE_TIPO[t]} tamanho={26} />{t}
            </button>
          ))}
        </div>
      )}
      {tipo && (
        <Cartao titulo={TITULO_TIPO[tipo]}>
          <div style={{ padding: '14px 14px 0' }}>
            <label className="foto-btn">
              <Icon nome="camera" tamanho={30} />{fotos.length ? 'Mais fotos' : 'Tirar ou escolher fotos'}
              <input type="file" accept="image/*" multiple onChange={escolherFotos} style={{ display: 'none' }} />
            </label>
            {fotos.length > 0 && (
              <div className="miniaturas">
                {fotos.map((f) => (
                  <div key={f.id}>
                    <img src={f.previa} alt="Foto escolhida" />
                    <button type="button" aria-label="Tirar esta foto" onClick={() => setFotos(fotos.filter((x) => x !== f))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Formulario key={tipo} campos={campos} inicial={inicial} listas={listas} onCancelar={volta.ir}
            rotuloSalvar={fotos.length ? `Salvar com ${fotos.length} foto${fotos.length > 1 ? 's' : ''}` : 'Salvar'} onSalvar={salvar} />
        </Cartao>
      )}
    </>
  )
}
