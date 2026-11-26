// Vocabulário fechado do sistema. Cada lista aqui é IDÊNTICA ao CHECK do banco
// (com acento e maiúscula). Se uma divergir, o salvamento falha em silêncio.
// Dono único: nenhuma tela escreve estes textos à mão.

export const PAPEIS = ['Aguardando', 'Engenheiro', 'Mestre', 'Cliente']
// O que o Engenheiro pode escolher ao liberar alguém (Cliente entra na semana 2).
export const PAPEIS_DE_ACESSO = ['Engenheiro', 'Mestre']
export const SITUACOES_OBRA = ['Em andamento', 'Parada', 'Concluída']
export const SITUACOES_FRENTE = ['Não iniciada', 'Em andamento', 'Parada', 'Aguardando aprovação', 'Concluída']
export const TIPOS_REGISTRO = ['Avanço', 'Equipe', 'Ocorrência']
// Pedido do Mestre: só vira compra ('A comprar') quando o Engenheiro aprova (23/11/2026).
export const PEDIDO = 'Aguardando aprovação'
export const SITUACOES_MATERIAL = [PEDIDO, 'A comprar', 'Comprado', 'Entregue']
export const TIPOS_LANCAMENTO = ['Entrada', 'Saída']
// Plano de contas (o campo se chama "categoria" no banco). "Outros" vale nos dois lados.
// Combustível, Contador e Ferramenta entraram em 24/11 (migration 09), para os gastos da empresa.
export const CONTAS_ENTRADA = ['Recebimento do cliente', 'Outros']
export const CONTAS_SAIDA = ['Mão de obra', 'Material', 'Serviço terceirizado', 'Taxa', 'Combustível', 'Contador', 'Ferramenta', 'Outros']
export const CATEGORIAS = [...new Set([...CONTAS_ENTRADA, ...CONTAS_SAIDA])]
export const SITUACOES_LANCAMENTO = ['Previsto', 'Realizado']
export const PAGO_POR = ['Engenheiro', 'Cliente']
export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência']
// Onde o dinheiro está (decisão do engenheiro em 25/11). Mesmo texto do CHECK da migration 10.
export const BANCOS = ['Dinheiro em espécie', 'Santander', 'Inter']

// Réguas que o PLANO marcou como "descobrir no uso". Mudou de ideia? Muda aqui.
export const DIAS_SEM_ANDAR_ATENCAO = 3
export const DIAS_LIMITE_ATENCAO = 3
export const JANELA_MATERIAL_DIAS = 7
