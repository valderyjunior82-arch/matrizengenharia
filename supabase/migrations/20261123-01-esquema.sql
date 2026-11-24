-- Matriz Engenharia — esquema inicial (PRD-BACKEND.md).
-- Multi-obra: toda tabela de lançamento tem obra_id not null, e TODA política
-- de linha de obra passa por uma função só: public.obras_visiveis().
-- Dinheiro (contratos_empreiteiros, lancamentos) só o Engenheiro lê.
-- Tabela nova nasce fechada: cada uma tem o seu GRANT escrito aqui, nada para anon.

-- "Hoje" no fuso do engenheiro (UTC−4, sem horário de verão). Nunca UTC.
create function public.hoje_obra() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Manaus')::date
$$;

-- ============ tabelas ============

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  email text not null unique,
  role text not null default 'Aguardando' check (role in ('Aguardando', 'Engenheiro', 'Mestre', 'Cliente')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  codigo text not null check (btrim(codigo) <> ''),
  endereco text,
  cliente_nome text,
  data_inicio date,
  data_meta_entrega date,
  situacao text not null default 'Em andamento' check (situacao in ('Em andamento', 'Parada', 'Concluída')),
  interna boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index obras_codigo_unico on public.obras (upper(codigo));

create table public.membros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (obra_id, profile_id)
);
create index membros_profile on public.membros (profile_id);

create table public.frentes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  servico text not null check (btrim(servico) <> ''),
  ambiente text not null check (btrim(ambiente) <> ''),
  responsavel text,
  data_inicio_prevista date,
  data_termino_prevista date,
  data_limite_decisao date,
  situacao text not null default 'Não iniciada'
    check (situacao in ('Não iniciada', 'Em andamento', 'Parada', 'Aguardando aprovação', 'Concluída')),
  percentual integer not null default 0 check (percentual between 0 and 100),
  ultimo_avanco_em date,
  marcada_pronta_por uuid references public.profiles (id),
  marcada_pronta_em timestamptz,
  comentario_devolucao text,
  data_conclusao date,
  created_at timestamptz not null default now(),
  -- (id, obra_id) único: as outras tabelas apontam para a dupla, e assim o banco
  -- garante que a frente de um lançamento é da MESMA obra dele.
  unique (id, obra_id),
  check (data_termino_prevista is null or data_inicio_prevista is null or data_termino_prevista >= data_inicio_prevista)
);
create index frentes_obra_situacao on public.frentes (obra_id, situacao);
create index frentes_obra_limite on public.frentes (obra_id, data_limite_decisao);
create index frentes_pronta_por on public.frentes (marcada_pronta_por);

create table public.contratos_empreiteiros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  frente_id uuid not null unique,
  empreiteiro text not null check (btrim(empreiteiro) <> ''),
  valor_contratado numeric(14, 2) not null check (valor_contratado > 0),
  observacao text,
  created_at timestamptz not null default now(),
  unique (id, obra_id),
  foreign key (frente_id, obra_id) references public.frentes (id, obra_id)
);
create index contratos_obra on public.contratos_empreiteiros (obra_id);

create table public.registros_diario (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  data date not null,
  tipo text not null check (tipo in ('Avanço', 'Equipe', 'Ocorrência')),
  frente_id uuid,
  texto text not null check (btrim(texto) <> ''),
  percentual_novo integer check (percentual_novo between 0 and 100),
  autor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (id, obra_id),
  foreign key (frente_id, obra_id) references public.frentes (id, obra_id),
  check (tipo <> 'Avanço' or frente_id is not null)
);
create index registros_obra_data on public.registros_diario (obra_id, data);
create index registros_frente_data on public.registros_diario (frente_id, data);
create index registros_autor on public.registros_diario (autor_id);

create table public.fotos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  registro_id uuid,
  frente_id uuid,
  ambiente text,
  data date not null,
  caminho text not null,
  autor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (registro_id, obra_id) references public.registros_diario (id, obra_id) on delete cascade,
  foreign key (frente_id, obra_id) references public.frentes (id, obra_id)
);
create index fotos_obra_data on public.fotos (obra_id, data);
create index fotos_obra_ambiente on public.fotos (obra_id, ambiente);
create index fotos_obra_frente on public.fotos (obra_id, frente_id);
create index fotos_registro on public.fotos (registro_id, obra_id);
create index fotos_autor on public.fotos (autor_id);

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  frente_id uuid,
  item text not null check (btrim(item) <> ''),
  quantidade numeric(12, 2) not null check (quantidade > 0),
  unidade text not null check (btrim(unidade) <> ''),
  precisa_ate date not null,
  situacao text not null default 'A comprar' check (situacao in ('A comprar', 'Comprado', 'Entregue')),
  fornecedor text,
  observacao text,
  created_at timestamptz not null default now(),
  unique (id, obra_id),
  foreign key (frente_id, obra_id) references public.frentes (id, obra_id)
);
create index materiais_obra_situacao on public.materiais (obra_id, situacao, precisa_ate);
create index materiais_frente on public.materiais (frente_id, obra_id);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  data date not null,
  vencimento date,
  tipo text not null check (tipo in ('Entrada', 'Saída')),
  categoria text not null check (categoria in ('Mão de obra', 'Material', 'Serviço terceirizado', 'Taxa', 'Recebimento do cliente', 'Outros')),
  situacao text not null default 'Realizado' check (situacao in ('Previsto', 'Realizado')),
  valor numeric(14, 2) not null check (valor > 0),
  descricao text,
  fornecedor text,
  frente_id uuid,
  material_id uuid,
  contrato_empreiteiro_id uuid,
  pago_por text check (pago_por in ('Engenheiro', 'Cliente')),
  forma_pagamento text check (forma_pagamento in ('Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência')),
  comprovante_caminho text,
  autor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  foreign key (frente_id, obra_id) references public.frentes (id, obra_id),
  foreign key (material_id, obra_id) references public.materiais (id, obra_id),
  foreign key (contrato_empreiteiro_id, obra_id) references public.contratos_empreiteiros (id, obra_id),
  check (tipo <> 'Saída' or pago_por is not null)
);
create index lancamentos_obra_data on public.lancamentos (obra_id, data);
create index lancamentos_obra_venc on public.lancamentos (obra_id, situacao, vencimento);
create index lancamentos_contrato on public.lancamentos (contrato_empreiteiro_id, obra_id);
create index lancamentos_frente on public.lancamentos (frente_id, obra_id);
create index lancamentos_material on public.lancamentos (material_id, obra_id);
create index lancamentos_autor on public.lancamentos (autor_id);

-- ============ quem é quem (as funções das políticas) ============

-- Engenheiro ATIVO. Lido da tabela, nunca do que a tela mandou.
create function public.eh_engenheiro() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'Engenheiro' and ativo
  )
$$;

-- A função ÚNICA do multi-obra: as obras que a pessoa logada enxerga.
-- Engenheiro ativo: todas. Mestre ativo: só as em que é membro (nunca a interna).
-- Aguardando, Cliente e desativado: nenhuma.
create function public.obras_visiveis() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select o.id from public.obras o where public.eh_engenheiro()
  union
  select m.obra_id
  from public.membros m
  join public.profiles p on p.id = m.profile_id
  join public.obras o on o.id = m.obra_id
  where m.profile_id = (select auth.uid()) and p.role = 'Mestre' and p.ativo and not o.interna
$$;

-- Quem trabalha nas minhas obras (o Mestre vê o nome de quem lançou).
create function public.colegas_visiveis() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.profile_id from public.membros m
  where m.obra_id in (select public.obras_visiveis())
$$;

revoke execute on function public.hoje_obra(), public.eh_engenheiro(), public.obras_visiveis(), public.colegas_visiveis() from public, anon;
grant execute on function public.hoje_obra(), public.eh_engenheiro(), public.obras_visiveis(), public.colegas_visiveis() to authenticated, service_role;

-- ============ conta nova (processo 2) ============
-- A primeira conta do sistema nasce Engenheiro; as outras, Aguardando.
-- O lock impede duas contas criadas no mesmo instante de virarem as duas "a primeira".
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('matriz_primeira_conta'));
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when exists (select 1 from public.profiles) then 'Aguardando' else 'Engenheiro' end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger ao_criar_conta after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trava do papel: pelo app, só o Engenheiro muda perfil/ativo dos OUTROS; ninguém o próprio.
-- auth.uid() nulo = painel ou SQL do agente: passa.
create function public.proteger_profiles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if new.role is distinct from old.role or new.ativo is distinct from old.ativo then
    if not public.eh_engenheiro() then
      raise exception 'Só o Engenheiro muda o perfil ou o acesso de alguém.' using errcode = '42501';
    end if;
    if old.id = (select auth.uid()) then
      raise exception 'Ninguém muda o próprio acesso.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.proteger_profiles() from public, anon, authenticated;
create trigger proteger_profiles before update on public.profiles
  for each row execute function public.proteger_profiles();

-- Quem cria a obra entra nela.
create function public.criador_entra_na_obra() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    insert into public.membros (obra_id, profile_id) values (new.id, (select auth.uid()))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.criador_entra_na_obra() from public, anon, authenticated;
create trigger criador_entra_na_obra after insert on public.obras
  for each row execute function public.criador_entra_na_obra();

-- Processo 1: um Avanço no diário atualiza a frente (com permissão do banco,
-- porque o Mestre não edita frente direto). Falhou aqui, o registro também não grava.
create function public.diario_atualiza_frente() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo = 'Avanço' and new.frente_id is not null then
    update public.frentes set
      ultimo_avanco_em = greatest(coalesce(ultimo_avanco_em, new.data), new.data),
      percentual = coalesce(new.percentual_novo, percentual),
      situacao = case when situacao in ('Não iniciada', 'Parada') then 'Em andamento' else situacao end
    where id = new.frente_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.diario_atualiza_frente() from public, anon, authenticated;
create trigger diario_atualiza_frente after insert on public.registros_diario
  for each row execute function public.diario_atualiza_frente();

-- Mestre: a ÚNICA mudança que ele faz numa frente.
create function public.marcar_frente_pronta(p_frente uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_situacao text;
begin
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

-- Mestre: a ÚNICA mudança que ele faz num material.
create function public.marcar_material_entregue(p_material uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.materiais set situacao = 'Entregue'
  where id = p_material and obra_id in (select public.obras_visiveis());
  if not found then raise exception 'Este material não é da obra escolhida.'; end if;
end;
$$;
revoke execute on function public.marcar_frente_pronta(uuid), public.marcar_material_entregue(uuid) from public, anon;
grant execute on function public.marcar_frente_pronta(uuid), public.marcar_material_entregue(uuid) to authenticated, service_role;

-- ============ RLS e GRANT, tabela por tabela ============

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_engenheiro()) or id in (select public.colegas_visiveis()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.eh_engenheiro()))
  with check (id = (select auth.uid()) or (select public.eh_engenheiro()));
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (nome, role, ativo) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

alter table public.obras enable row level security;
create policy obras_select on public.obras for select to authenticated
  using (id in (select public.obras_visiveis()));
create policy obras_insert on public.obras for insert to authenticated with check ((select public.eh_engenheiro()));
create policy obras_update on public.obras for update to authenticated
  using ((select public.eh_engenheiro())) with check ((select public.eh_engenheiro()));
create policy obras_delete on public.obras for delete to authenticated using ((select public.eh_engenheiro()));
revoke all on public.obras from anon;
grant select, insert, update, delete on public.obras to authenticated;
grant select, insert, update, delete on public.obras to service_role;

alter table public.membros enable row level security;
create policy membros_select on public.membros for select to authenticated
  using ((select public.eh_engenheiro()) or (profile_id = (select auth.uid()) and obra_id in (select public.obras_visiveis())));
create policy membros_insert on public.membros for insert to authenticated with check ((select public.eh_engenheiro()));
create policy membros_delete on public.membros for delete to authenticated using ((select public.eh_engenheiro()));
revoke all on public.membros from anon;
grant select, insert, delete on public.membros to authenticated;
grant select, insert, update, delete on public.membros to service_role;

alter table public.frentes enable row level security;
create policy frentes_select on public.frentes for select to authenticated
  using (obra_id in (select public.obras_visiveis()));
create policy frentes_insert on public.frentes for insert to authenticated with check ((select public.eh_engenheiro()));
create policy frentes_update on public.frentes for update to authenticated
  using ((select public.eh_engenheiro())) with check ((select public.eh_engenheiro()));
create policy frentes_delete on public.frentes for delete to authenticated using ((select public.eh_engenheiro()));
revoke all on public.frentes from anon;
grant select, insert, update, delete on public.frentes to authenticated;
grant select, insert, update, delete on public.frentes to service_role;

alter table public.contratos_empreiteiros enable row level security;
create policy contratos_engenheiro on public.contratos_empreiteiros for all to authenticated
  using ((select public.eh_engenheiro())) with check ((select public.eh_engenheiro()));
revoke all on public.contratos_empreiteiros from anon;
grant select, insert, update, delete on public.contratos_empreiteiros to authenticated;
grant select, insert, update, delete on public.contratos_empreiteiros to service_role;

alter table public.registros_diario enable row level security;
create policy registros_select on public.registros_diario for select to authenticated
  using (obra_id in (select public.obras_visiveis()));
create policy registros_insert on public.registros_diario for insert to authenticated
  with check (autor_id = (select auth.uid()) and obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or data = (select public.hoje_obra())));
create policy registros_update on public.registros_diario for update to authenticated
  using ((select public.eh_engenheiro()) or (autor_id = (select auth.uid()) and data = (select public.hoje_obra()) and obra_id in (select public.obras_visiveis())))
  with check ((select public.eh_engenheiro()) or (autor_id = (select auth.uid()) and data = (select public.hoje_obra()) and obra_id in (select public.obras_visiveis())));
create policy registros_delete on public.registros_diario for delete to authenticated
  using ((select public.eh_engenheiro()) or (autor_id = (select auth.uid()) and data = (select public.hoje_obra()) and obra_id in (select public.obras_visiveis())));
revoke all on public.registros_diario from anon;
grant select, insert, update, delete on public.registros_diario to authenticated;
grant select, insert, update, delete on public.registros_diario to service_role;

alter table public.fotos enable row level security;
create policy fotos_select on public.fotos for select to authenticated
  using (obra_id in (select public.obras_visiveis()));
create policy fotos_insert on public.fotos for insert to authenticated
  with check (autor_id = (select auth.uid()) and obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or data = (select public.hoje_obra())));
create policy fotos_delete on public.fotos for delete to authenticated
  using ((select public.eh_engenheiro()) or (autor_id = (select auth.uid()) and data = (select public.hoje_obra()) and obra_id in (select public.obras_visiveis())));
revoke all on public.fotos from anon;
grant select, insert, delete on public.fotos to authenticated;
grant select, insert, update, delete on public.fotos to service_role;

alter table public.materiais enable row level security;
create policy materiais_select on public.materiais for select to authenticated
  using (obra_id in (select public.obras_visiveis()));
create policy materiais_insert on public.materiais for insert to authenticated with check ((select public.eh_engenheiro()));
create policy materiais_update on public.materiais for update to authenticated
  using ((select public.eh_engenheiro())) with check ((select public.eh_engenheiro()));
create policy materiais_delete on public.materiais for delete to authenticated using ((select public.eh_engenheiro()));
revoke all on public.materiais from anon;
grant select, insert, update, delete on public.materiais to authenticated;
grant select, insert, update, delete on public.materiais to service_role;

alter table public.lancamentos enable row level security;
create policy lancamentos_engenheiro on public.lancamentos for all to authenticated
  using ((select public.eh_engenheiro())) with check ((select public.eh_engenheiro()));
revoke all on public.lancamentos from anon;
grant select, insert, update, delete on public.lancamentos to authenticated;
grant select, insert, update, delete on public.lancamentos to service_role;

-- A obra interna "Empresa (sem obra)": todo gasto tem obra_id, sem exceção.
insert into public.obras (nome, codigo, situacao, interna) values ('Empresa (sem obra)', 'EMPRESA', 'Em andamento', true);
