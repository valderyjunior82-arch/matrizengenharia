-- Conserto (Rodada 7, item 8): "Nova obra" dava "Sua conta não tem permissão para isso".
-- O app grava e pede a linha de volta (insert ... returning). A política de leitura
-- usava só obras_visiveis(), que é STABLE e enxerga as obras do INÍCIO do comando:
-- a obra recém-criada não estava lá, o banco recusou a devolução e desfez o insert.
-- O Engenheiro vê todas as obras de qualquer jeito; dizer isso direto resolve.
-- (As outras tabelas não têm o problema: a obra delas já existia antes do insert.)
drop policy obras_select on public.obras;
create policy obras_select on public.obras for select to authenticated
  using ((select public.eh_engenheiro()) or id in (select public.obras_visiveis()));
