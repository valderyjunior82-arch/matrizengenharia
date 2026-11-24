-- Consertos da revisão de código (23/11).
--
-- 1) O Mestre lia a linha inteira do perfil dos colegas (email e papel), e o PRD
--    diz que ele vê só o NOME de quem lançou. Agora a tabela profiles devolve só o
--    próprio perfil (ou todos, para o Engenheiro); os nomes dos colegas saem da
--    função nomes_visiveis(), que devolve id e nome e nada mais.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_engenheiro()));

create function public.nomes_visiveis() returns table (id uuid, nome text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nome from public.profiles p
  where p.id = (select auth.uid()) or public.eh_engenheiro() or p.id in (select public.colegas_visiveis())
$$;
revoke execute on function public.nomes_visiveis() from public, anon;
grant execute on function public.nomes_visiveis() to authenticated, service_role;

-- 2) Um Avanço lançado com data ANTIGA não pode desfazer o % mais novo da frente:
--    o percentual só muda quando o registro é o mais recente.
create or replace function public.diario_atualiza_frente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo = 'Avanço' and new.frente_id is not null then
    update public.frentes set
      percentual = case when new.data >= coalesce(ultimo_avanco_em, new.data)
                        then coalesce(new.percentual_novo, percentual) else percentual end,
      ultimo_avanco_em = greatest(coalesce(ultimo_avanco_em, new.data), new.data),
      situacao = case when situacao in ('Não iniciada', 'Parada') then 'Em andamento' else situacao end
    where id = new.frente_id;
  end if;
  return new;
end;
$$;
