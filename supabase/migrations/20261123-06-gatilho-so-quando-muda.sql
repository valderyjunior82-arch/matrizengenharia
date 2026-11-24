-- Conserto da revisão de código (23/11): o gatilho da migration 05 rodava em todo
-- update que citasse percentual_novo, mesmo sem mudar o valor. O app sempre manda a
-- coluna; então corrigir só o TEXTO de um Avanço antigo virava uma frente Parada em
-- Em andamento, ou baixava o % de uma frente Concluída. Agora: insert sempre, update
-- só quando o % muda de verdade.
drop trigger diario_atualiza_frente on public.registros_diario;
create trigger diario_atualiza_frente after insert on public.registros_diario
  for each row execute function public.diario_atualiza_frente();
create trigger diario_atualiza_frente_ao_editar after update of percentual_novo on public.registros_diario
  for each row when (old.percentual_novo is distinct from new.percentual_novo)
  execute function public.diario_atualiza_frente();
