-- Lançar nota e Lançamentos (24/11).
--
-- 1) Plano de contas: entram Combustível, Contador e Ferramenta (gastos da empresa).
--    A lista é a mesma de CATEGORIAS em src/lib/vocabulario.js, com acento.
alter table public.lancamentos drop constraint lancamentos_categoria_check;
alter table public.lancamentos add constraint lancamentos_categoria_check check (categoria in (
  'Recebimento do cliente', 'Mão de obra', 'Material', 'Serviço terceirizado', 'Taxa',
  'Combustível', 'Contador', 'Ferramenta', 'Outros'));

-- 2) A foto da nota: espaço privado, só JPEG (o celular comprime antes), no máximo 5 MB.
--    Caminho: <obra_id>/<id>.jpg. Dinheiro: só o Engenheiro lê, envia ou apaga.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['image/jpeg']);

create policy comprovantes_select on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (select public.eh_engenheiro())
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o));
create policy comprovantes_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (select public.eh_engenheiro())
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o));
create policy comprovantes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (select public.eh_engenheiro())
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o));
