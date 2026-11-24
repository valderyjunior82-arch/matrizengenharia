-- Achado da revisão de código (24/11/2026): a política de insert de materiais deixava o
-- Engenheiro passar só por eh_engenheiro(), sem obras_visiveis(). Toda política de linha de
-- obra passa por obras_visiveis() (para o Engenheiro ela devolve todas as obras, então nada
-- muda hoje; a regra fica num lugar só).

drop policy materiais_insert on public.materiais;
create policy materiais_insert on public.materiais for insert to authenticated
  with check (
    obra_id in (select public.obras_visiveis())
    and ((select public.eh_engenheiro()) or situacao = 'Aguardando aprovação')
  );
