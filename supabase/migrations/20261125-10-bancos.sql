-- Banco de cada lançamento e saldo por banco (25/11, decisão do engenheiro).
-- A lista de bancos é a mesma de BANCOS em src/lib/vocabulario.js, com acento.
-- O saldo não é guardado pronto: sai de "saldo inicial + lançamentos + transferências".

-- 1) De qual banco saiu (ou em qual entrou). Nota paga pelo Cliente fica sem banco.
alter table public.lancamentos add column banco text
  check (banco in ('Dinheiro em espécie', 'Santander', 'Inter'));

-- 2) Saldo inicial e transferência entre bancos. Não são gasto nem receita de obra:
--    moram na obra interna "Empresa (sem obra)" (toda linha tem obra_id, sem exceção).
--    Saldo inicial = saldo no começo do dia `data` (pode ser 0 ou negativo).
create table public.movimentos_banco (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  tipo text not null check (tipo in ('Saldo inicial', 'Transferência')),
  data date not null,
  de_banco text check (de_banco in ('Dinheiro em espécie', 'Santander', 'Inter')),
  para_banco text not null check (para_banco in ('Dinheiro em espécie', 'Santander', 'Inter')),
  valor numeric(14, 2) not null,
  descricao text,
  autor_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  check ((tipo = 'Transferência' and de_banco is not null and de_banco <> para_banco and valor > 0)
      or (tipo = 'Saldo inicial' and de_banco is null))
);
create index movimentos_banco_obra on public.movimentos_banco (obra_id);
create index movimentos_banco_autor on public.movimentos_banco (autor_id);

-- Dinheiro: só o Engenheiro. E só na obra interna, para não cair numa obra de cliente.
alter table public.movimentos_banco enable row level security;
create policy movimentos_banco_engenheiro on public.movimentos_banco for all to authenticated
  using ((select public.eh_engenheiro()))
  with check ((select public.eh_engenheiro()) and obra_id in (select o.id from public.obras o where o.interna));
revoke all on public.movimentos_banco from anon;
grant select, insert, delete on public.movimentos_banco to authenticated;
grant select, insert, update, delete on public.movimentos_banco to service_role;
