-- Achados da revisão da importação da planilha (26/11), decisões do engenheiro:
--
-- 1) Conta de entrada "Aporte de sócio": dinheiro dos sócios entra no banco, mas não é receita
--    (o DRE deixa de fora; ver dre() em src/lib/financeiro.js). Lista = CATEGORIAS de vocabulario.js.
alter table public.lancamentos drop constraint lancamentos_categoria_check;
alter table public.lancamentos add constraint lancamentos_categoria_check check (categoria in (
  'Recebimento do cliente', 'Aporte de sócio', 'Mão de obra', 'Material', 'Serviço terceirizado', 'Taxa',
  'Combustível', 'Contador', 'Ferramenta', 'Outros'));

-- 2) Forma de pagamento "Débito automático" (tarifas, seguro). Lista = FORMAS_PAGAMENTO.
alter table public.lancamentos drop constraint lancamentos_forma_pagamento_check;
alter table public.lancamentos add constraint lancamentos_forma_pagamento_check check (forma_pagamento in (
  'Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Débito automático'));

-- 3) Marca de origem das linhas importadas ('planilha-2026'). O app não lê nem grava: serve para
--    desfazer uma importação inteira (delete ... where origem = '...') e conferir o que veio de onde.
alter table public.lancamentos add column origem text;
alter table public.movimentos_banco add column origem text;
