// Lançar no diário — três botões grandes (Avanço · Equipe · Ocorrência) e o formulário.
import { useState } from 'react'
import { hoje as hojeDe } from '../lib/config.js'
import { listarFrentes } from '../lib/dados.js'
import { useCarregar } from '../lib/usarDados.js'
import { camposDiario } from '../lib/formularios.js'
import { TIPOS_REGISTRO } from '../lib/vocabulario.js'
import { diaRelativo } from '../lib/formato.js'
import { avisar, BotaoVoltar, Cartao, Carregando, ErroCarga, Formulario, Icon } from '../components/index.jsx'

const ICONE_TIPO = { Avanço: 'frentes', Equipe: 'equipe', Ocorrência: 'alerta' }

export default function LancarDiario({ goto, voltar: volta }) {
  const hoje = hojeDe()
  const [tipo, setTipo] = useState(null)
  const { carregando, erro, data: frentes, recarregar } = useCarregar(listarFrentes)

  const voltar = <BotaoVoltar voltar={volta} />
  if (carregando && !frentes) return <>{voltar}<Carregando /></>
  if (erro) return <>{voltar}<ErroCarga mensagem={erro} onTentar={recarregar} /></>

  const abertas = frentes.filter((f) => f.situacao !== 'Concluída')
  const listas = { frentes: abertas.map((f) => ({ valor: f.id, rotulo: `${f.servico} · ${f.ambiente} (hoje ${f.percentual}%)` })) }

  return (
    <>
      {voltar}
      <div className="titulo-tela"><div><div className="mono">Lançar no diário</div><h2>{diaRelativo(hoje, hoje)}</h2></div></div>
      <div className="tipos" role="group" aria-label="Tipo do registro">
        {TIPOS_REGISTRO.map((t) => (
          <button key={t} className={`tipo ${tipo === t ? 'on' : ''}`} onClick={() => setTipo(t)} aria-pressed={tipo === t}>
            <Icon nome={ICONE_TIPO[t]} tamanho={26} />{t}
          </button>
        ))}
      </div>
      {tipo && (
        <Cartao titulo={tipo === 'Avanço' ? 'Avanço de frente' : tipo === 'Equipe' ? 'Equipe presente' : 'Ocorrência'}>
          <div style={{ padding: '14px 14px 0' }}>
            <button className="foto-btn" onClick={() => avisar('A câmera entra junto com o Storage, na etapa do banco.')}>
              <Icon nome="camera" tamanho={30} />Tirar ou escolher fotos
            </button>
          </div>
          <Formulario key={tipo} campos={camposDiario(tipo)} listas={listas} onCancelar={volta.ir}
            onSalvar={() => { avisar('Campos conferidos. Gravar de verdade entra na etapa do banco.'); goto('diario') }} />
        </Cartao>
      )}
    </>
  )
}
