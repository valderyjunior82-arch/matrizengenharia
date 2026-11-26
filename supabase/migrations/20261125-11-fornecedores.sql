-- Cadastro de fornecedores (25/11, decisão do engenheiro: cadastrar pelo app).
-- É cadastro da empresa, como `obras`: não tem obra_id, porque o mesmo fornecedor
-- atende várias obras. A nota e o material continuam guardando o NOME em texto
-- (lancamentos.fornecedor, materiais.fornecedor): apagar ou renomear o cadastro
-- não mexe em nota antiga, então não há chave estrangeira aqui.
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  documento text,
  telefone text,
  observacao text,
  created_at timestamptz not null default now()
);
-- "Leroy" e "leroy " são o mesmo fornecedor.
create unique index fornecedores_nome_unico on public.fornecedores (lower(btrim(nome)));

-- Só o Engenheiro: tem telefone e documento, e o Mestre não lança nota.
alter table public.fornecedores enable row level security;
create policy fornecedores_engenheiro on public.fornecedores for all to authenticated
  using ((select public.eh_engenheiro()))
  with check ((select public.eh_engenheiro()));
revoke all on public.fornecedores from anon;
grant select, insert, update, delete on public.fornecedores to authenticated;
grant select, insert, update, delete on public.fornecedores to service_role;
