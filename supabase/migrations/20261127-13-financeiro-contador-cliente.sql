-- 13: três tipos de usuário novos (decisão do engenheiro em 27/11/2026).
--   Financeiro: vê e mexe em todo o dinheiro, de todas as obras. Não mexe no canteiro.
--   Contador:   só olha o dinheiro de todas as obras. Não grava nada e não vê o diário.
--   Cliente:    só a obra em que for colocado (membros): frentes e diário com fotos.
--               Sem dinheiro, sem materiais, sem lançar nada.
-- Quem decide o tipo continua sendo só o Engenheiro, em Pessoas (proteger_profiles).
--
-- Três perguntas novas, cada uma numa função só (as políticas não repetem listas de papéis):
--   ve_dinheiro()       Engenheiro, Financeiro, Contador   → lê dinheiro e todas as obras
--   mexe_dinheiro()     Engenheiro, Financeiro             → grava dinheiro
--   lanca_no_canteiro() Engenheiro, Mestre                 → diário, foto, pedido, marcar pronta/entregue
-- São SECURITY INVOKER de propósito: leem só o próprio profile, que a RLS já deixa ler.
-- Assim não somam aos 6 avisos "SECURITY DEFINER executável" do painel.

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('Aguardando', 'Engenheiro', 'Mestre', 'Cliente', 'Financeiro', 'Contador'));

create function public.ve_dinheiro() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and ativo and role in ('Engenheiro', 'Financeiro', 'Contador'))
$$;

create function public.mexe_dinheiro() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and ativo and role in ('Engenheiro', 'Financeiro'))
$$;

create function public.lanca_no_canteiro() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = (select auth.uid()) and ativo and role in ('Engenheiro', 'Mestre'))
$$;

revoke execute on function public.ve_dinheiro(), public.mexe_dinheiro(), public.lanca_no_canteiro() from public, anon;
grant execute on function public.ve_dinheiro(), public.mexe_dinheiro(), public.lanca_no_canteiro() to authenticated, service_role;

-- Obra de canteiro: o Cliente entra pela mesma porta do Mestre (membros).
-- Financeiro e Contador NÃO entram aqui: não leem diário nem fotos.
create or replace function public.obras_visiveis() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select o.id from public.obras o where public.eh_engenheiro()
  union
  select m.obra_id
  from public.membros m
  join public.profiles p on p.id = m.profile_id
  join public.obras o on o.id = m.obra_id
  where m.profile_id = (select auth.uid()) and p.role in ('Mestre', 'Cliente') and p.ativo and not o.interna
$$;

-- ---------- leitura ----------
-- Quem vê dinheiro vê todas as obras (o Caixa geral junta todas, inclusive a Empresa).
drop policy obras_select on public.obras;
create policy obras_select on public.obras for select to authenticated
  using ((select public.ve_dinheiro()) or id in (select public.obras_visiveis()));

-- O Financeiro mostra o serviço da frente no lançamento e no contrato do empreiteiro.
drop policy frentes_select on public.frentes;
create policy frentes_select on public.frentes for select to authenticated
  using ((select public.ve_dinheiro()) or obra_id in (select public.obras_visiveis()));

-- O Lançar nota liga a nota a um material: quem grava dinheiro lê todos.
-- No canteiro, só quem lança (o Cliente não vê materiais, decisão de 27/11).
drop policy materiais_select on public.materiais;
create policy materiais_select on public.materiais for select to authenticated
  using ((select public.mexe_dinheiro()) or ((select public.lanca_no_canteiro()) and obra_id in (select public.obras_visiveis())));

-- ---------- canteiro: o Cliente lê, mas não grava ----------
-- (update/delete do diário e da foto já exigem ser o autor; o Cliente nunca é.)
drop policy registros_insert on public.registros_diario;
create policy registros_insert on public.registros_diario for insert to authenticated
  with check ((select public.lanca_no_canteiro()) and autor_id = (select auth.uid()) and obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or data = (select public.hoje_obra())));

drop policy fotos_insert on public.fotos;
create policy fotos_insert on public.fotos for insert to authenticated
  with check ((select public.lanca_no_canteiro()) and autor_id = (select auth.uid()) and obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or data = (select public.hoje_obra())));

drop policy materiais_insert on public.materiais;
create policy materiais_insert on public.materiais for insert to authenticated
  with check ((select public.lanca_no_canteiro()) and obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or situacao = 'Aguardando aprovação'));

drop policy fotos_obra_insert on storage.objects;
create policy fotos_obra_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-obra' and (select public.lanca_no_canteiro())
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o)
    and ((select public.eh_engenheiro()) or (storage.foldername(name))[2] = (select public.hoje_obra())::text));

create or replace function public.marcar_frente_pronta(p_frente uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_situacao text;
begin
  if not public.lanca_no_canteiro() then raise exception 'Sua conta não pode marcar frentes como prontas.' using errcode = '42501'; end if;
  select situacao into v_situacao from public.frentes
  where id = p_frente and obra_id in (select public.obras_visiveis())
  for update;
  if not found then raise exception 'Esta frente não é da obra escolhida.'; end if;
  if v_situacao in ('Concluída', 'Aguardando aprovação') then raise exception 'Esta frente já está pronta.'; end if;
  update public.frentes
  set situacao = 'Aguardando aprovação', marcada_pronta_por = (select auth.uid()), marcada_pronta_em = now()
  where id = p_frente;
end;
$$;

create or replace function public.marcar_material_entregue(p_material uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_situacao text;
begin
  if not public.lanca_no_canteiro() then raise exception 'Sua conta não pode marcar material como entregue.' using errcode = '42501'; end if;
  select situacao into v_situacao from public.materiais
  where id = p_material and obra_id in (select public.obras_visiveis())
  for update;
  if not found then raise exception 'Este material não é da obra escolhida.'; end if;
  if v_situacao = 'Aguardando aprovação' then raise exception 'Este pedido ainda não foi aprovado pelo Engenheiro.'; end if;
  update public.materiais set situacao = 'Entregue' where id = p_material;
end;
$$;

-- ---------- dinheiro: lê quem vê, grava quem mexe ----------
drop policy contratos_engenheiro on public.contratos_empreiteiros;
create policy contratos_select on public.contratos_empreiteiros for select to authenticated using ((select public.ve_dinheiro()));
create policy contratos_insert on public.contratos_empreiteiros for insert to authenticated with check ((select public.mexe_dinheiro()));
create policy contratos_update on public.contratos_empreiteiros for update to authenticated
  using ((select public.mexe_dinheiro())) with check ((select public.mexe_dinheiro()));
create policy contratos_delete on public.contratos_empreiteiros for delete to authenticated using ((select public.mexe_dinheiro()));

drop policy lancamentos_engenheiro on public.lancamentos;
create policy lancamentos_select on public.lancamentos for select to authenticated using ((select public.ve_dinheiro()));
create policy lancamentos_insert on public.lancamentos for insert to authenticated with check ((select public.mexe_dinheiro()));
create policy lancamentos_update on public.lancamentos for update to authenticated
  using ((select public.mexe_dinheiro())) with check ((select public.mexe_dinheiro()));
create policy lancamentos_delete on public.lancamentos for delete to authenticated using ((select public.mexe_dinheiro()));

drop policy fornecedores_engenheiro on public.fornecedores;
create policy fornecedores_select on public.fornecedores for select to authenticated using ((select public.ve_dinheiro()));
create policy fornecedores_insert on public.fornecedores for insert to authenticated with check ((select public.mexe_dinheiro()));
create policy fornecedores_update on public.fornecedores for update to authenticated
  using ((select public.mexe_dinheiro())) with check ((select public.mexe_dinheiro()));
create policy fornecedores_delete on public.fornecedores for delete to authenticated using ((select public.mexe_dinheiro()));

-- Saldo inicial e transferência moram sempre na obra interna (regra da migration 10, mantida).
drop policy movimentos_banco_engenheiro on public.movimentos_banco;
create policy movimentos_banco_select on public.movimentos_banco for select to authenticated using ((select public.ve_dinheiro()));
create policy movimentos_banco_insert on public.movimentos_banco for insert to authenticated
  with check ((select public.mexe_dinheiro()) and obra_id in (select o.id from public.obras o where o.interna));
create policy movimentos_banco_update on public.movimentos_banco for update to authenticated
  using ((select public.mexe_dinheiro()))
  with check ((select public.mexe_dinheiro()) and obra_id in (select o.id from public.obras o where o.interna));
create policy movimentos_banco_delete on public.movimentos_banco for delete to authenticated using ((select public.mexe_dinheiro()));

-- Foto da nota: pasta 1 = uma obra existente (a leitura de obras já passa pela RLS acima).
drop policy comprovantes_select on storage.objects;
create policy comprovantes_select on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (select public.ve_dinheiro())
    and (storage.foldername(name))[1] in (select o.id::text from public.obras o));
drop policy comprovantes_insert on storage.objects;
create policy comprovantes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (select public.mexe_dinheiro())
    and (storage.foldername(name))[1] in (select o.id::text from public.obras o));
drop policy comprovantes_delete on storage.objects;
create policy comprovantes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (select public.mexe_dinheiro())
    and (storage.foldername(name))[1] in (select o.id::text from public.obras o));
