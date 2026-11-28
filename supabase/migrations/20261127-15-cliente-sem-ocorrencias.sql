-- 15: o Cliente não vê os problemas internos da obra (decisão do engenheiro em 27/11/2026).
--   1. Registro de diário do tipo Ocorrência, e as fotos e arquivos ligados a ele.
--   2. O comentário de devolução da frente (é do Engenheiro para o Mestre).
-- Quem lança no canteiro (Engenheiro e Mestre) continua vendo tudo, como antes.

-- ---------- 1. Ocorrências ----------
drop policy registros_select on public.registros_diario;
create policy registros_select on public.registros_diario for select to authenticated
  using (obra_id in (select public.obras_visiveis())
    and ((select public.lanca_no_canteiro()) or tipo <> 'Ocorrência'));

-- Foto de Ocorrência: o Cliente só vê foto de registro que ele pode ler (a subconsulta passa pela RLS acima).
drop policy fotos_select on public.fotos;
create policy fotos_select on public.fotos for select to authenticated
  using (obra_id in (select public.obras_visiveis())
    and ((select public.lanca_no_canteiro()) or registro_id in (select r.id from public.registros_diario r)));

-- O arquivo no Storage: sem isto o Cliente poderia listar a pasta da obra e abrir a foto da Ocorrência.
drop policy fotos_obra_select on storage.objects;
create policy fotos_obra_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos-obra'
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o)
    and ((select public.lanca_no_canteiro()) or name in (select f.caminho from public.fotos f)));

-- ---------- 2. Comentário de devolução ----------
-- A RLS esconde linha, não coluna. Então o Cliente deixa de ler a tabela frentes e lê por esta
-- função, que devolve a frente inteira com o comentário vazio para quem não lança no canteiro.
-- SECURITY DEFINER de propósito (oitavo aviso intencional do painel): devolve só as frentes das
-- obras que a pessoa já vê (obras_visiveis). Coluna nova em frentes: acrescente aqui também
-- (setof public.frentes recusa lista de colunas diferente, então o erro aparece na hora).
create function public.frentes_da_obra(p_obra uuid) returns setof public.frentes
language sql stable security definer set search_path = '' as $$
  select f.id, f.obra_id, f.servico, f.ambiente, f.responsavel, f.data_inicio_prevista, f.data_termino_prevista,
    f.data_limite_decisao, f.situacao, f.percentual, f.ultimo_avanco_em, f.marcada_pronta_por, f.marcada_pronta_em,
    case when public.lanca_no_canteiro() then f.comentario_devolucao end,
    f.data_conclusao, f.created_at
  from public.frentes f
  where f.obra_id = p_obra and f.obra_id in (select public.obras_visiveis())
$$;

revoke execute on function public.frentes_da_obra(uuid) from public, anon;
grant execute on function public.frentes_da_obra(uuid) to authenticated, service_role;

-- A tabela: quem lança no canteiro (nas obras dele) e quem grava dinheiro. O Cliente usa a função.
drop policy frentes_select on public.frentes;
create policy frentes_select on public.frentes for select to authenticated
  using ((select public.mexe_dinheiro())
    or ((select public.lanca_no_canteiro()) and obra_id in (select public.obras_visiveis())));
