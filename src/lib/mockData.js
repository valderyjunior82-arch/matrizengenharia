// ============================================================
// DADOS DE EXEMPLO (de mentira), tirados do PRD-FRONTEND.md.
// Mesmos nomes de coluna das tabelas do PRD-BACKEND.md: na etapa
// do banco, isto vira a carga inicial (seed) sem tradução.
// "Hoje" no mock = segunda, 23/11/2026 (src/lib/config.js).
//
// DUAS OBRAS, e diferentes de propósito: a 1 cheia (sete frentes,
// diário, material, parcelas), a 2 magra (duas frentes e nenhum
// material). Tela testada só na 1 costuma quebrar na 2, e é agora
// que isso tem que aparecer.
//
// A obra "Empresa (sem obra)" é INTERNA: guarda os gastos da empresa
// que não são de obra nenhuma (combustível, contador, ferramenta),
// para todo lançamento ter obra_id. Não aparece no seletor do topo;
// só entra no Caixa geral.
// ============================================================

export const mockProfiles = [
  { id: 'p1', nome: 'Eng. Júnior', email: 'engenheiro@exemplo.com', role: 'Engenheiro', ativo: true },
  { id: 'p2', nome: 'Seu Antônio', email: 'antonio@exemplo.com', role: 'Mestre', ativo: true },
  { id: 'p3', nome: 'Lucas Ferreira (estagiário)', email: 'lucas@exemplo.com', role: 'Aguardando', ativo: true },
]

// Senha de mentira, só do mock: fica numa tabela à parte, como o login do
// Supabase guarda a senha fora de profiles. Some na etapa do banco.
export const SENHA_DE_TESTE = 'obra1234'
export const mockSenhas = { p1: SENHA_DE_TESTE, p2: SENHA_DE_TESTE, p3: SENHA_DE_TESTE }

export const mockObras = [
  {
    id: 'o1', nome: 'Apto 1802 – Ed. Jardins', codigo: 'JARDINS-1802',
    endereco: 'Rua das Acácias, 410, ap. 1802 – Jardim Paulista', cliente_nome: 'Dra. Helena Prado',
    data_inicio: '2026-10-01', data_meta_entrega: '2026-12-18', situacao: 'Em andamento', interna: false,
  },
  {
    id: 'o2', nome: 'Apto 501 – Ed. Mirante', codigo: 'MIRANTE-501',
    endereco: 'Av. Beira-Rio, 1200, ap. 501 – Centro', cliente_nome: 'Roberto e Clara',
    data_inicio: '2026-11-02', data_meta_entrega: '2027-01-29', situacao: 'Em andamento', interna: false,
  },
  {
    id: 'o-empresa', nome: 'Empresa (sem obra)', codigo: 'EMPRESA',
    endereco: null, cliente_nome: null, data_inicio: null, data_meta_entrega: null,
    situacao: 'Em andamento', interna: true,
  },
]

export const mockMembros = [
  { id: 'm1', obra_id: 'o1', profile_id: 'p1' },
  { id: 'm2', obra_id: 'o2', profile_id: 'p1' },
  { id: 'm3', obra_id: 'o1', profile_id: 'p2' },
  { id: 'm4', obra_id: 'o2', profile_id: 'p2' },
]

const frente = (f) => ({
  responsavel: null, data_inicio_prevista: null, data_termino_prevista: null, data_limite_decisao: null,
  ultimo_avanco_em: null, marcada_pronta_por: null, marcada_pronta_em: null, comentario_devolucao: null,
  data_conclusao: null, ...f,
})

export const mockFrentes = [
  // Obra 1 — Apto 1802
  frente({ id: 'f1', obra_id: 'o1', servico: 'Elétrica – infraestrutura', ambiente: 'Geral', responsavel: 'Eletro JR – Jefferson', data_inicio_prevista: '2026-10-06', data_termino_prevista: '2026-10-31', percentual: 100, situacao: 'Concluída', ultimo_avanco_em: '2026-10-30', data_conclusao: '2026-10-30' }),
  frente({ id: 'f2', obra_id: 'o1', servico: 'Forro de gesso', ambiente: 'Sala', responsavel: 'Gesso Forte – Carlos', data_inicio_prevista: '2026-11-03', data_termino_prevista: '2026-11-21', data_limite_decisao: '2026-11-18', percentual: 70, situacao: 'Em andamento', ultimo_avanco_em: '2026-11-17' }),
  frente({ id: 'f3', obra_id: 'o1', servico: 'Porcelanato 120×120', ambiente: 'Sala', responsavel: 'Pisos Prime – Marcos', data_inicio_prevista: '2026-11-10', data_termino_prevista: '2026-12-05', data_limite_decisao: '2026-11-25', percentual: 40, situacao: 'Em andamento', ultimo_avanco_em: '2026-11-21' }),
  frente({ id: 'f4', obra_id: 'o1', servico: 'Marcenaria – cozinha', ambiente: 'Cozinha', responsavel: 'Marcenaria Bela', data_inicio_prevista: '2026-12-01', data_termino_prevista: '2026-12-15', data_limite_decisao: '2026-11-24', percentual: 0, situacao: 'Não iniciada' }),
  frente({ id: 'f5', obra_id: 'o1', servico: 'Bancadas em quartzo', ambiente: 'Cozinha', responsavel: 'Marmoraria Ideal', data_inicio_prevista: '2026-12-08', data_termino_prevista: '2026-12-12', data_limite_decisao: '2026-11-27', percentual: 0, situacao: 'Não iniciada' }),
  frente({ id: 'f6', obra_id: 'o1', servico: 'Impermeabilização', ambiente: 'Banho suíte', responsavel: 'Seu Antônio (equipe própria)', data_inicio_prevista: '2026-11-09', data_termino_prevista: '2026-11-14', percentual: 100, situacao: 'Aguardando aprovação', ultimo_avanco_em: '2026-11-14', marcada_pronta_por: 'p2', marcada_pronta_em: '2026-11-22T17:40:00-04:00' }),
  frente({ id: 'f7', obra_id: 'o1', servico: 'Pintura', ambiente: 'Quartos', responsavel: 'Pinturas Silva', data_inicio_prevista: '2026-11-16', data_termino_prevista: '2026-11-28', data_limite_decisao: '2026-11-20', percentual: 20, situacao: 'Parada', ultimo_avanco_em: '2026-11-16' }),
  // Obra 2 — Apto 501
  frente({ id: 'f8', obra_id: 'o2', servico: 'Demolição de alvenaria', ambiente: 'Cozinha', responsavel: 'Seu Antônio (equipe própria)', data_inicio_prevista: '2026-11-03', data_termino_prevista: '2026-11-10', percentual: 100, situacao: 'Concluída', ultimo_avanco_em: '2026-11-10', data_conclusao: '2026-11-10' }),
  frente({ id: 'f9', obra_id: 'o2', servico: 'Hidráulica – prumadas', ambiente: 'Banho social', responsavel: 'Hidro Max', data_inicio_prevista: '2026-11-11', data_termino_prevista: '2026-11-28', data_limite_decisao: '2026-11-26', percentual: 50, situacao: 'Em andamento', ultimo_avanco_em: '2026-11-23' }),
]

export const mockContratos = [
  { id: 'c2', obra_id: 'o1', frente_id: 'f2', empreiteiro: 'Gesso Forte', valor_contratado: 18500, observacao: 'Forro da sala com tabica e sanca' },
  { id: 'c3', obra_id: 'o1', frente_id: 'f3', empreiteiro: 'Pisos Prime', valor_contratado: 22000, observacao: null },
  { id: 'c7', obra_id: 'o1', frente_id: 'f7', empreiteiro: 'Pinturas Silva', valor_contratado: 14800, observacao: 'Massa corrida e duas demãos' },
  { id: 'c9', obra_id: 'o2', frente_id: 'f9', empreiteiro: 'Hidro Max', valor_contratado: 9800, observacao: null },
]

export const mockRegistros = [
  { id: 'r1', obra_id: 'o1', data: '2026-11-21', tipo: 'Avanço', frente_id: 'f3', texto: 'Assentadas 18 m² na sala, faltam rodapés', percentual_novo: 40, autor_id: 'p2' },
  { id: 'r2', obra_id: 'o1', data: '2026-11-21', tipo: 'Equipe', frente_id: null, texto: 'Gesso 2, piso 3, pintura 0', percentual_novo: null, autor_id: 'p2' },
  { id: 'r3', obra_id: 'o1', data: '2026-11-21', tipo: 'Ocorrência', frente_id: null, texto: 'Faltou argamassa AC-III às 14h, piso parou 1h', percentual_novo: null, autor_id: 'p2' },
  { id: 'r4', obra_id: 'o1', data: '2026-11-17', tipo: 'Avanço', frente_id: 'f2', texto: 'Tabicas da sala fechadas', percentual_novo: 70, autor_id: 'p2' },
  { id: 'r5', obra_id: 'o1', data: '2026-11-16', tipo: 'Avanço', frente_id: 'f7', texto: 'Massa corrida no quarto 1', percentual_novo: 20, autor_id: 'p2' },
  { id: 'r6', obra_id: 'o2', data: '2026-11-23', tipo: 'Avanço', frente_id: 'f9', texto: 'Prumadas de água fria e esgoto do banho social trocadas até o shaft', percentual_novo: 50, autor_id: 'p2' },
  { id: 'r7', obra_id: 'o2', data: '2026-11-23', tipo: 'Equipe', frente_id: null, texto: 'Hidráulica 2, ajudante 1', percentual_novo: null, autor_id: 'p2' },
  { id: 'r8', obra_id: 'o2', data: '2026-11-10', tipo: 'Avanço', frente_id: 'f8', texto: 'Demolição concluída e entulho retirado', percentual_novo: 100, autor_id: 'p2' },
]

// `caminho` vazio = ainda sem arquivo de verdade (o Storage entra com o banco).
export const mockFotos = [
  { id: 'ft1', obra_id: 'o1', registro_id: 'r1', frente_id: 'f3', ambiente: 'Sala', data: '2026-11-21', caminho: '', autor_id: 'p2' },
  { id: 'ft2', obra_id: 'o1', registro_id: 'r1', frente_id: 'f3', ambiente: 'Sala', data: '2026-11-21', caminho: '', autor_id: 'p2' },
  { id: 'ft3', obra_id: 'o1', registro_id: 'r1', frente_id: 'f3', ambiente: 'Sala', data: '2026-11-21', caminho: '', autor_id: 'p2' },
  { id: 'ft4', obra_id: 'o1', registro_id: 'r3', frente_id: 'f3', ambiente: 'Sala', data: '2026-11-21', caminho: '', autor_id: 'p2' },
  { id: 'ft5', obra_id: 'o1', registro_id: 'r4', frente_id: 'f2', ambiente: 'Sala', data: '2026-11-17', caminho: '', autor_id: 'p2' },
  { id: 'ft6', obra_id: 'o1', registro_id: 'r4', frente_id: 'f2', ambiente: 'Sala', data: '2026-11-17', caminho: '', autor_id: 'p2' },
  { id: 'ft7', obra_id: 'o2', registro_id: 'r6', frente_id: 'f9', ambiente: 'Banho social', data: '2026-11-23', caminho: '', autor_id: 'p2' },
  { id: 'ft8', obra_id: 'o2', registro_id: 'r6', frente_id: 'f9', ambiente: 'Banho social', data: '2026-11-23', caminho: '', autor_id: 'p2' },
  { id: 'ft9', obra_id: 'o2', registro_id: 'r8', frente_id: 'f8', ambiente: 'Cozinha', data: '2026-11-10', caminho: '', autor_id: 'p2' },
]

// Obra 2 sem nenhum material, de propósito: é o estado vazio de Materiais.
export const mockMateriais = [
  { id: 'mt1', obra_id: 'o1', frente_id: 'f3', item: 'Argamassa AC-III', quantidade: 30, unidade: 'sc', precisa_ate: '2026-11-24', situacao: 'Comprado', fornecedor: 'Leroy Merlin', observacao: null },
  { id: 'mt2', obra_id: 'o1', frente_id: 'f3', item: 'Rodapé poliestireno 10 cm', quantidade: 42, unidade: 'm', precisa_ate: '2026-11-27', situacao: 'A comprar', fornecedor: null, observacao: null },
  { id: 'mt3', obra_id: 'o1', frente_id: 'f7', item: 'Tinta acrílica fosca branco', quantidade: 6, unidade: 'latas 18 L', precisa_ate: '2026-11-20', situacao: 'A comprar', fornecedor: null, observacao: null },
  { id: 'mt4', obra_id: 'o1', frente_id: 'f2', item: 'Perfil de gesso F530', quantidade: 60, unidade: 'un', precisa_ate: '2026-11-12', situacao: 'Entregue', fornecedor: 'Gesso Forte', observacao: null },
  { id: 'mt5', obra_id: 'o1', frente_id: 'f7', item: 'Massa corrida PVA', quantidade: 4, unidade: 'latas 25 kg', precisa_ate: '2026-11-26', situacao: 'Aguardando aprovação', fornecedor: null, observacao: 'Pedido do mestre: acabou no quarto 2' },
]

const lanc = (l) => ({
  vencimento: null, descricao: null, fornecedor: null, frente_id: null, material_id: null,
  contrato_empreiteiro_id: null, pago_por: null, forma_pagamento: null, comprovante_caminho: null,
  situacao: 'Realizado', autor_id: 'p1', ...l,
})
const parcela = (id, obra, venc, descricao, valor, situacao) =>
  lanc({ id, obra_id: obra, data: venc, vencimento: venc, tipo: 'Entrada', categoria: 'Recebimento do cliente', descricao, valor, situacao, forma_pagamento: situacao === 'Realizado' ? 'Transferência' : null })

export const mockLancamentos = [
  // Obra 1 — parcelas do cliente
  parcela('l1', 'o1', '2026-10-01', 'Entrada', 30000, 'Realizado'),
  parcela('l2', 'o1', '2026-10-15', 'Quinzena 1', 12000, 'Realizado'),
  parcela('l3', 'o1', '2026-11-01', 'Quinzena 2', 12000, 'Realizado'),
  parcela('l4', 'o1', '2026-11-15', 'Quinzena 3', 12000, 'Realizado'),
  parcela('l5', 'o1', '2026-12-01', 'Quinzena 4', 12000, 'Previsto'),
  parcela('l6', 'o1', '2026-12-15', 'Quinzena 5', 12000, 'Previsto'),
  parcela('l7', 'o1', '2026-11-20', 'Aditivo – forro extra', 4500, 'Previsto'),
  // Obra 1 — saídas
  lanc({ id: 'l8', obra_id: 'o1', data: '2026-11-22', tipo: 'Saída', categoria: 'Material', valor: 1170, descricao: 'Argamassa AC-III', fornecedor: 'Leroy Merlin', frente_id: 'f3', material_id: 'mt1', pago_por: 'Engenheiro', forma_pagamento: 'Pix', comprovante_caminho: 'mock' }),
  lanc({ id: 'l9', obra_id: 'o1', data: '2026-11-22', tipo: 'Saída', categoria: 'Material', valor: 186.4, descricao: 'Lixas e fita', fornecedor: 'Casa do Pintor', frente_id: 'f7', pago_por: 'Cliente' }),
  lanc({ id: 'l10', obra_id: 'o1', data: '2026-11-20', tipo: 'Saída', categoria: 'Mão de obra', valor: 4500, descricao: 'Medição 2 – forro', fornecedor: 'Gesso Forte', frente_id: 'f2', contrato_empreiteiro_id: 'c2', pago_por: 'Engenheiro', forma_pagamento: 'Transferência' }),
  lanc({ id: 'l11', obra_id: 'o1', data: '2026-11-19', tipo: 'Saída', categoria: 'Taxa', valor: 350, descricao: 'Taxa de mudança de entulho', fornecedor: 'Condomínio Ed. Jardins', pago_por: 'Engenheiro', forma_pagamento: 'Boleto' }),
  lanc({ id: 'l12', obra_id: 'o1', data: '2026-11-06', tipo: 'Saída', categoria: 'Mão de obra', valor: 4500, descricao: 'Medição 1 – forro', fornecedor: 'Gesso Forte', frente_id: 'f2', contrato_empreiteiro_id: 'c2', pago_por: 'Engenheiro', forma_pagamento: 'Pix' }),
  lanc({ id: 'l13', obra_id: 'o1', data: '2026-11-14', tipo: 'Saída', categoria: 'Mão de obra', valor: 6000, descricao: 'Adiantamento – porcelanato', fornecedor: 'Pisos Prime', frente_id: 'f3', contrato_empreiteiro_id: 'c3', pago_por: 'Engenheiro', forma_pagamento: 'Pix' }),
  // Empresa (sem obra)
  lanc({ id: 'l14', obra_id: 'o-empresa', data: '2026-11-21', tipo: 'Saída', categoria: 'Outros', valor: 280, descricao: 'Combustível', fornecedor: 'Posto Shell', pago_por: 'Engenheiro', forma_pagamento: 'Cartão' }),
  // Obra 2 — Apto 501
  parcela('l15', 'o2', '2026-11-02', 'Entrada', 20000, 'Realizado'),
  parcela('l16', 'o2', '2026-12-01', 'Quinzena 1', 9000, 'Previsto'),
  lanc({ id: 'l17', obra_id: 'o2', data: '2026-11-18', tipo: 'Saída', categoria: 'Material', valor: 842.3, descricao: 'Tubos e conexões PVC', fornecedor: 'Casa Hidráulica', frente_id: 'f9', pago_por: 'Engenheiro', forma_pagamento: 'Pix' }),
]
