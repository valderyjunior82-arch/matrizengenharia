-- O 01 foi aplicado com 'grant all' para o service_role; o check-grants reprova.
-- Este acerta o banco para o que o 01 já diz hoje: só os quatro comandos que o app usa.
revoke all on public.profiles from service_role;
grant select, insert, update, delete on public.profiles to service_role;
revoke all on public.obras from service_role;
grant select, insert, update, delete on public.obras to service_role;
revoke all on public.membros from service_role;
grant select, insert, update, delete on public.membros to service_role;
revoke all on public.frentes from service_role;
grant select, insert, update, delete on public.frentes to service_role;
revoke all on public.contratos_empreiteiros from service_role;
grant select, insert, update, delete on public.contratos_empreiteiros to service_role;
revoke all on public.registros_diario from service_role;
grant select, insert, update, delete on public.registros_diario to service_role;
revoke all on public.fotos from service_role;
grant select, insert, update, delete on public.fotos to service_role;
revoke all on public.materiais from service_role;
grant select, insert, update, delete on public.materiais to service_role;
revoke all on public.lancamentos from service_role;
grant select, insert, update, delete on public.lancamentos to service_role;
