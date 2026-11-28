-- 16: conserto da 15. frentes_da_obra só devolvia frentes das obras do canteiro (obras_visiveis),
-- e o Financeiro não está nelas: a lista Frente do Lançar nota ficou vazia e o Cadastrar contrato
-- recusava a frente (achado na Rodada 27). Agora a função segue a mesma regra da tabela:
-- quem grava dinheiro lê as frentes de qualquer obra; o comentário de devolução continua só para
-- quem lança no canteiro.
create or replace function public.frentes_da_obra(p_obra uuid) returns setof public.frentes
language sql stable security definer set search_path = '' as $$
  select f.id, f.obra_id, f.servico, f.ambiente, f.responsavel, f.data_inicio_prevista, f.data_termino_prevista,
    f.data_limite_decisao, f.situacao, f.percentual, f.ultimo_avanco_em, f.marcada_pronta_por, f.marcada_pronta_em,
    case when public.lanca_no_canteiro() then f.comentario_devolucao end,
    f.data_conclusao, f.created_at
  from public.frentes f
  where f.obra_id = p_obra
    and (public.mexe_dinheiro() or f.obra_id in (select public.obras_visiveis()))
$$;
