// Materiais: o Mestre pede (só vira compra quando o Engenheiro aprova), o Engenheiro cadastra,
// edita, exclui e aprova; material com nota não se exclui. Roda pela camada de dados do mock.
import { acoesDoMaterial, camposDoFormulario, camposDoMaterial, materiaisParaChegar, resumoParaChegar, erroAoMudarSituacao, MSG_MATERIAL_COM_NOTA, MSG_PEDIDO_NAO_APROVADO, PEDIDO } from '../src/lib/materiais.js'
import * as dados from '../src/lib/dadosMock.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const eng = { id: 'p1', role: 'Engenheiro', ativo: true }
const mestre = { id: 'p2', role: 'Mestre', ativo: true }
const espera = { id: 'p9', role: 'Aguardando', ativo: true }
const form = { item: ' Cimento CP-II ', quantidade: '2,5', unidade: 'sc', frente_id: '', precisa_ate: '2026-11-30', situacao: 'Comprado', fornecedor: '  ', observacao: '' }

// 1. Formulário → linha.
conferir('engenheiro grava a situação escolhida, texto aparado, vírgula vira número, vazio vira null',
  camposDoMaterial(eng, form).campos,
  { item: 'Cimento CP-II', quantidade: 2.5, unidade: 'sc', frente_id: null, precisa_ate: '2026-11-30', situacao: 'Comprado', fornecedor: null, observacao: null })
conferir('mestre: o pedido nasce aguardando aprovação, mesmo mandando outra situação',
  camposDoMaterial(mestre, form).campos.situacao, PEDIDO)
conferir('engenheiro editando um pedido: continua aguardando (sai só pelo Aprovar)',
  camposDoMaterial(eng, form, { situacao: PEDIDO }).campos.situacao, PEDIDO)
conferir('a lista de situação do engenheiro não oferece Aguardando aprovação',
  camposDoFormulario(eng, { situacao: 'Comprado' }).find((c) => c.nome === 'situacao').opcoes.includes(PEDIDO), false)
conferir('rodapé do painel conta o que espera aprovação',
  resumoParaChegar([{ situacao: 'A comprar' }, { situacao: PEDIDO }, { situacao: 'Comprado' }]), '1 a comprar · 1 aguardando')
conferir('rodapé sem pedido não fala de aguardando', resumoParaChegar([{ situacao: 'A comprar' }]), '1 a comprar')
conferir('painel: pedido para daqui a 30 dias aparece; compra para daqui a 30 dias não',
  materiaisParaChegar([
    { id: 'longe', situacao: PEDIDO, precisa_ate: '2026-12-31' },
    { id: 'compra', situacao: 'A comprar', precisa_ate: '2026-12-31' },
  ], '2026-12-01').map((m) => m.id), ['longe'])
conferir('quantidade zero é recusada', camposDoMaterial(eng, { ...form, quantidade: '0' }).erro, 'Confira os campos marcados.')
conferir('sem item é recusado', camposDoMaterial(mestre, { ...form, item: ' ' }).erro, 'Confira os campos marcados.')
conferir('conta Aguardando não cadastra', camposDoMaterial(espera, form).erro, 'Sua conta não pode cadastrar material.')

// 2. Botões por perfil e situação.
conferir('engenheiro no pedido: aprovar, recusar, editar', acoesDoMaterial(eng, { situacao: PEDIDO }), ['aprovar', 'recusar', 'editar'])
conferir('mestre no pedido: nada (espera o engenheiro)', acoesDoMaterial(mestre, { situacao: PEDIDO }), [])
conferir('mestre em A comprar: só marcar entregue', acoesDoMaterial(mestre, { situacao: 'A comprar' }), ['entregue'])
conferir('engenheiro em A comprar', acoesDoMaterial(eng, { situacao: 'A comprar' }), ['comprado', 'entregue', 'nota', 'editar'])
conferir('mestre em Entregue: nada', acoesDoMaterial(mestre, { situacao: 'Entregue' }), [])
conferir('pedido não aprovado não se marca entregue', erroAoMudarSituacao(eng, { situacao: PEDIDO }, 'Entregue'), MSG_PEDIDO_NAO_APROVADO)
conferir('mestre não aprova', erroAoMudarSituacao(mestre, { situacao: PEDIDO }, 'A comprar'), 'Só o Engenheiro muda a situação do material.')

// 3. Pela camada de dados (mock), na obra 2 (sem material): o fluxo inteiro do pedido.
dados.definirObraAtual('o2')
const pedido = await dados.salvarMaterial(mestre, null, form)
conferir('mestre pede material', [pedido.erro, pedido.data.situacao, pedido.data.obra_id], [null, PEDIDO, 'o2'])
conferir('mestre não edita o pedido', (await dados.salvarMaterial(mestre, pedido.data.id, form)).erro, 'Só o Engenheiro edita materiais.')
conferir('mestre não marca entregue o pedido', (await dados.mudarSituacaoMaterial(mestre, pedido.data.id, 'Entregue')).erro, MSG_PEDIDO_NAO_APROVADO)
conferir('engenheiro aprova → A comprar', (await dados.mudarSituacaoMaterial(eng, pedido.data.id, 'A comprar')).data.situacao, 'A comprar')
conferir('agora o mestre marca entregue', (await dados.mudarSituacaoMaterial(mestre, pedido.data.id, 'Entregue')).data.situacao, 'Entregue')
conferir('engenheiro edita', (await dados.salvarMaterial(eng, pedido.data.id, { ...form, item: 'Cimento CP-III' })).data.item, 'Cimento CP-III')
conferir('mestre não exclui', (await dados.excluirMaterial(mestre, pedido.data.id)).erro, 'Só o Engenheiro exclui materiais.')
conferir('engenheiro exclui', (await dados.excluirMaterial(eng, pedido.data.id)).erro, null)
conferir('obra 2 volta a ficar sem material', (await dados.listarMateriais()).data.length, 0)

// 4. Multi-obra: material da obra 1 não se mexe com a obra 2 escolhida; nota impede excluir.
conferir('não edita material de outra obra', (await dados.salvarMaterial(eng, 'mt1', form)).erro, 'Este material não é da obra escolhida.')
dados.definirObraAtual('o1')
conferir('material com nota não se exclui', (await dados.excluirMaterial(eng, 'mt1')).erro, MSG_MATERIAL_COM_NOTA)

console.log(`${ok}/${tot} — materiais`)
process.exit(ok === tot ? 0 : 1)
