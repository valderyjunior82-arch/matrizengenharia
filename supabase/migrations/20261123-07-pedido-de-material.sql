-- Materiais: o Mestre pode pedir material, mas o pedido nasce "Aguardando aprovação"
-- e só vira compra ("A comprar") quando o Engenheiro aprova (decisão do engenheiro em 23/11/2026).
-- Recusar = o Engenheiro exclui o pedido.

alter table public.materiais drop constraint materiais_situacao_check;
alter table public.materiais add constraint materiais_situacao_check
  check (situacao in ('Aguardando aprovação', 'A comprar', 'Comprado', 'Entregue'));

-- Engenheiro grava qualquer situação; Mestre só insere pedido, e só em obra dele
-- (obras_visiveis já devolve nada para Aguardando, Cliente e desativado).
drop policy materiais_insert on public.materiais;
create policy materiais_insert on public.materiais for insert to authenticated
  with check (
    (select public.eh_engenheiro())
    or (situacao = 'Aguardando aprovação' and obra_id in (select public.obras_visiveis()))
  );

-- Pedido ainda não aprovado não pode ser marcado entregue (não houve compra).
create or replace function public.marcar_material_entregue(p_material uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_situacao text;
begin
  select situacao into v_situacao from public.materiais
  where id = p_material and obra_id in (select public.obras_visiveis())
  for update;
  if not found then raise exception 'Este material não é da obra escolhida.'; end if;
  if v_situacao = 'Aguardando aprovação' then raise exception 'Este pedido ainda não foi aprovado pelo Engenheiro.'; end if;
  update public.materiais set situacao = 'Entregue' where id = p_material;
end;
$$;
