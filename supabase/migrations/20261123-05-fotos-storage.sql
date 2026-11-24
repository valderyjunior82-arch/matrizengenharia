-- Diário e fotos (23/11).
--
-- 1) O espaço das fotos no Storage: privado (abre só por link temporário),
--    só JPEG (o celular comprime antes de subir), no máximo 5 MB por arquivo.
--    Caminho: <obra_id>/<data>/<id>.jpg — é a data do diário que separa as fotos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-obra', 'fotos-obra', false, 5242880, array['image/jpeg']);

-- As mesmas regras da tabela fotos, lidas do caminho do arquivo:
-- pasta 1 = a obra (tem que ser visível), pasta 2 = a data (o Mestre só no dia de hoje).
create policy fotos_obra_select on storage.objects for select to authenticated
  using (bucket_id = 'fotos-obra'
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o));
create policy fotos_obra_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-obra'
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o)
    and ((select public.eh_engenheiro()) or (storage.foldername(name))[2] = (select public.hoje_obra())::text));
create policy fotos_obra_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-obra'
    and (storage.foldername(name))[1] in (select o::text from public.obras_visiveis() o)
    and ((select public.eh_engenheiro())
      or (owner_id = (select auth.uid())::text and (storage.foldername(name))[2] = (select public.hoje_obra())::text)));

-- 2) Editar o % de um Avanço (no mesmo dia) também atualiza a frente.
--    A função é a mesma do insert (migration 04); só o gatilho passa a ouvir o update.
drop trigger diario_atualiza_frente on public.registros_diario;
create trigger diario_atualiza_frente after insert or update of percentual_novo on public.registros_diario
  for each row execute function public.diario_atualiza_frente();
