-- 14: o Contador não lê a tabela frentes (pedido do engenheiro em 27/11: "não vê frentes,
-- diário nem materiais"). A migration 13 tinha liberado frentes para quem vê dinheiro só para
-- o nome do serviço aparecer na nota e no contrato; agora esse nome vem desta função, que
-- devolve id, serviço e ambiente, e nada mais (sem responsável, datas, % ou comentário).
--
-- SECURITY DEFINER de propósito (sétimo aviso intencional do painel): devolve só o nome das
-- frentes, e só para quem já vê o dinheiro daquela obra (ve_dinheiro).

create function public.nomes_das_frentes(p_obra uuid) returns table (id uuid, servico text, ambiente text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.servico, f.ambiente from public.frentes f
  where f.obra_id = p_obra and public.ve_dinheiro()
  order by f.created_at, f.id
$$;

revoke execute on function public.nomes_das_frentes(uuid) from public, anon;
grant execute on function public.nomes_das_frentes(uuid) to authenticated, service_role;

-- A tabela frentes: o canteiro (obras_visiveis) e quem grava dinheiro (o Financeiro liga a nota
-- e o contrato à frente). O Contador fica de fora.
drop policy frentes_select on public.frentes;
create policy frentes_select on public.frentes for select to authenticated
  using ((select public.mexe_dinheiro()) or obra_id in (select public.obras_visiveis()));
