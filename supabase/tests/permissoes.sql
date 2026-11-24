-- Teste de permissões (RLS + GRANT). Rode depois de QUALQUER mudança de permissão.
-- Cria pessoas e obras de mentira, faz cada perfil tentar ler e gravar o seu e o
-- do vizinho, e no fim SEMPRE dá erro de propósito: o erro desfaz tudo (nada fica
-- no banco) e a mensagem traz o resultado ("TUDO CERTO" ou a lista do que falhou).
do $teste$
declare
  eng uuid := gen_random_uuid();
  mestre uuid := gen_random_uuid();   -- membro só da obra A
  espera uuid := gen_random_uuid();   -- Aguardando
  inativo uuid := gen_random_uuid();  -- Mestre desativado, membro da A
  obra_a uuid; obra_b uuid; frente_a uuid; frente_b uuid; mat_a uuid; mat_b uuid;
  falhas text[] := '{}';
  n int;
  ok boolean;
  obra_nova uuid; n_frente uuid;
begin
  -- pessoas (o gatilho cria os profiles; o primeiro do teste NÃO é o primeiro do sistema
  -- se já houver contas, então os papéis são acertados à mão logo depois)
  insert into auth.users (id, email, raw_user_meta_data) values
    (eng, 'teste-eng@exemplo.invalid', '{"nome":"Eng Teste"}'),
    (mestre, 'teste-mestre@exemplo.invalid', '{"nome":"Mestre Teste"}'),
    (espera, 'teste-espera@exemplo.invalid', '{"nome":"Espera Teste"}'),
    (inativo, 'teste-inativo@exemplo.invalid', '{"nome":"Inativo Teste"}');
  update public.profiles set role = 'Engenheiro' where id = eng;
  update public.profiles set role = 'Mestre' where id in (mestre, inativo);
  update public.profiles set role = 'Aguardando' where id = espera;
  update public.profiles set ativo = false where id = inativo;

  insert into public.obras (nome, codigo) values ('Teste A', 'TESTE-A-' || left(eng::text, 6)) returning id into obra_a;
  insert into public.obras (nome, codigo) values ('Teste B', 'TESTE-B-' || left(eng::text, 6)) returning id into obra_b;
  insert into public.membros (obra_id, profile_id) values (obra_a, mestre), (obra_a, inativo), (obra_a, eng), (obra_b, eng);
  insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_a, 'Gesso A', 'Sala', 'Em andamento') returning id into frente_a;
  insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_b, 'Gesso B', 'Sala', 'Em andamento') returning id into frente_b;
  insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate) values (obra_a, 'Cimento A', 1, 'sc', current_date) returning id into mat_a;
  insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate) values (obra_b, 'Cimento B', 1, 'sc', current_date) returning id into mat_b;
  insert into public.contratos_empreiteiros (obra_id, frente_id, empreiteiro, valor_contratado) values (obra_a, frente_a, 'Emp A', 100);
  insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', eng);
  insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_b, current_date, 'Equipe', 'B', eng);
  -- arquivos de foto (só a linha; o arquivo em si não importa para a regra), um em cada obra
  insert into storage.objects (bucket_id, name) values
    ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/a.jpg'),
    ('fotos-obra', obra_b || '/' || public.hoje_obra() || '/b.jpg');

  -- ================= MESTRE (só obra A) =================
  perform set_config('request.jwt.claims', json_build_object('sub', mestre, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 1 then falhas := falhas || format('Mestre vê %s obras de teste (esperado 1)', n); end if;
  select count(*) into n from public.frentes where obra_id = obra_b;
  if n <> 0 then falhas := falhas || 'Mestre lê frente da obra B'; end if;
  select count(*) into n from public.materiais where obra_id = obra_b;
  if n <> 0 then falhas := falhas || 'Mestre lê material da obra B'; end if;
  select count(*) into n from public.registros_diario where obra_id = obra_b;
  if n <> 0 then falhas := falhas || 'Mestre lê diário da obra B'; end if;
  select count(*) into n from public.frentes where obra_id = obra_a;
  if n <> 1 then falhas := falhas || 'Mestre NÃO lê a frente da obra A'; end if;
  select count(*) into n from public.contratos_empreiteiros;
  if n <> 0 then falhas := falhas || 'Mestre lê contratos (dinheiro)'; end if;
  select count(*) into n from public.lancamentos;
  if n <> 0 then falhas := falhas || 'Mestre lê lançamentos (dinheiro)'; end if;
  select count(*) into n from public.obras where interna;
  if n <> 0 then falhas := falhas || 'Mestre vê a obra interna Empresa'; end if;

  update public.frentes set percentual = 99 where id = frente_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || 'Mestre edita frente direto'; end if;
  update public.materiais set situacao = 'Comprado' where id = mat_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || 'Mestre edita material direto'; end if;

  begin perform public.marcar_frente_pronta(frente_a);
  exception when others then falhas := falhas || ('Mestre não consegue marcar pronta na A: ' || sqlerrm); end;
  ok := false;
  begin perform public.marcar_frente_pronta(frente_b); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre marca pronta frente da obra B'; end if;
  begin perform public.marcar_material_entregue(mat_a);
  exception when others then falhas := falhas || ('Mestre não consegue marcar entregue na A: ' || sqlerrm); end;
  ok := false;
  begin perform public.marcar_material_entregue(mat_b); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre marca entregue material da obra B'; end if;

  -- pedido de material (migration 07): o Mestre pede, só "Aguardando aprovação" e só na obra dele
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, 'Pedido A', 1, 'sc', current_date, 'Aguardando aprovação') returning id into mat_a;
  exception when others then falhas := falhas || ('Mestre não pede material na A: ' || sqlerrm); end;
  ok := false;
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, 'Compra direta', 1, 'sc', current_date, 'A comprar');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre cria material já "A comprar" (sem aprovação)'; end if;
  ok := false;
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_b, 'Pedido B', 1, 'sc', current_date, 'Aguardando aprovação');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre pede material na obra B'; end if;
  ok := false;
  begin perform public.marcar_material_entregue(mat_a); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre marca entregue um pedido não aprovado'; end if;
  delete from public.materiais where id = mat_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || 'Mestre apaga material'; end if;

  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'hoje', mestre);
  exception when others then falhas := falhas || ('Mestre não lança diário de hoje na A: ' || sqlerrm); end;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra() - 1, 'Equipe', 'ontem', mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre lança diário com data de ontem'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_b, public.hoje_obra(), 'Equipe', 'B', mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre lança diário na obra B'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'como outro', eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre lança diário em nome de outro'; end if;

  -- editar o % de um Avanço do dia atualiza a frente (gatilho da migration 05)
  begin
    insert into public.registros_diario (obra_id, data, tipo, frente_id, texto, percentual_novo, autor_id)
      values (obra_a, public.hoje_obra(), 'Avanço', frente_a, 'av', 30, mestre);
    update public.registros_diario set percentual_novo = 45 where autor_id = mestre and tipo = 'Avanço';
  exception when others then falhas := falhas || ('Mestre não lança/edita Avanço de hoje: ' || sqlerrm); end;
  select count(*) into n from public.frentes where id = frente_a and percentual = 45;
  if n <> 1 then falhas := falhas || 'Editar o % do Avanço não atualizou a frente'; end if;

  -- fotos no Storage: pasta 1 = obra, pasta 2 = data
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_b || '/%';
  if n <> 0 then falhas := falhas || 'Mestre lê foto da obra B no Storage'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_a || '/%';
  if n <> 1 then falhas := falhas || 'Mestre NÃO lê a foto da obra A no Storage'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/m.jpg', mestre::text);
  exception when others then falhas := falhas || ('Mestre não envia foto de hoje na A: ' || sqlerrm); end;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('fotos-obra', obra_a || '/' || (public.hoje_obra() - 1) || '/m.jpg');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre envia foto com data de ontem'; end if;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('fotos-obra', obra_b || '/' || public.hoje_obra() || '/m.jpg');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre envia foto na obra B'; end if;

  ok := false;
  begin update public.profiles set role = 'Engenheiro' where id = mestre; exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre se promove a Engenheiro'; end if;
  begin update public.profiles set nome = 'Mestre Novo Nome' where id = mestre;
  exception when others then falhas := falhas || ('Mestre não edita o próprio nome: ' || sqlerrm); end;
  ok := false;
  begin insert into public.obras (nome, codigo) values ('Invasora', 'INV-' || left(mestre::text, 6)); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre cria obra'; end if;
  ok := false;
  begin insert into public.membros (obra_id, profile_id) values (obra_b, mestre); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Mestre se põe na obra B'; end if;
  select count(*) into n from public.profiles where id = espera;
  if n <> 0 then falhas := falhas || 'Mestre lê perfil de quem não é da obra dele'; end if;
  select count(*) into n from public.profiles where id = eng;
  if n <> 0 then falhas := falhas || 'Mestre lê o perfil inteiro (email) do colega'; end if;
  select count(*) into n from public.nomes_visiveis() where id = eng and nome = 'Eng Teste';
  if n <> 1 then falhas := falhas || 'Mestre não vê o nome do colega da obra'; end if;
  select count(*) into n from public.nomes_visiveis() where id = espera;
  if n <> 0 then falhas := falhas || 'Mestre vê o nome de quem não é da obra dele'; end if;

  -- ================= MESTRE DESATIVADO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', inativo, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || 'Mestre desativado ainda lê frentes'; end if;

  -- ================= AGUARDANDO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', espera, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.obras;
  if n <> 0 then falhas := falhas || 'Aguardando vê obras'; end if;
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || 'Aguardando vê frentes'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra';
  if n <> 0 then falhas := falhas || 'Aguardando vê fotos no Storage'; end if;
  select count(*) into n from public.profiles;
  if n <> 1 then falhas := falhas || format('Aguardando vê %s perfis (esperado só o dele)', n); end if;
  ok := false;
  begin update public.profiles set role = 'Engenheiro' where id = espera; exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Aguardando se libera sozinho'; end if;

  -- ================= ENGENHEIRO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', eng, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_b || '/%';
  if n <> 1 then falhas := falhas || 'Engenheiro NÃO lê a foto da obra B'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos-obra', obra_b || '/' || (public.hoje_obra() - 5) || '/e.jpg', eng::text);
  exception when others then falhas := falhas || ('Engenheiro não envia foto de dia antigo: ' || sqlerrm); end;
  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 2 then falhas := falhas || 'Engenheiro não vê as duas obras'; end if;
  select count(*) into n from public.lancamentos where obra_id = obra_a;
  if n <> 1 then falhas := falhas || 'Engenheiro não lê lançamentos'; end if;
  begin update public.profiles set role = 'Mestre' where id = espera;
  exception when others then falhas := falhas || ('Engenheiro não libera outra pessoa: ' || sqlerrm); end;
  ok := false;
  begin update public.profiles set role = 'Mestre' where id = eng; exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Engenheiro muda o próprio perfil'; end if;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id, frente_id)
    values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', eng, frente_b);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Lançamento da obra A aceita frente da obra B'; end if;
  ok := false;
  begin insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_a, 'X', 'Y', 'Pronta'); exception when others then ok := true; end;
  if not ok then falhas := falhas || 'CHECK aceita situação inválida'; end if;
  ok := false;
  begin delete from public.frentes where id = frente_a; exception when others then ok := true; end;
  if not ok then falhas := falhas || 'Apagou frente com contrato'; end if;
  -- aprovar o pedido do Mestre (mat_a) e excluir um pedido recusado
  update public.materiais set situacao = 'A comprar' where id = mat_a and situacao = 'Aguardando aprovação';
  get diagnostics n = row_count;
  if n <> 1 then falhas := falhas || 'Engenheiro não aprova o pedido do Mestre'; end if;
  delete from public.materiais where id = mat_a;
  get diagnostics n = row_count;
  if n <> 1 then falhas := falhas || 'Engenheiro não exclui material'; end if;
  -- "returning" é o que o app faz (grava e pede a linha de volta); sem ele o teste não pegou o bug da Rodada 7.
  begin insert into public.obras (nome, codigo) values ('Nova', 'NOVA-' || left(eng::text, 6)) returning id into obra_nova;
  exception when others then falhas := falhas || ('Engenheiro não cria obra: ' || sqlerrm); end;
  begin insert into public.frentes (obra_id, servico, ambiente) values (obra_nova, 'Primeira', 'Sala') returning id into n_frente;
  exception when others then falhas := falhas || ('Engenheiro não cria frente na obra nova: ' || sqlerrm); end;
  select count(*) into n from public.membros m join public.obras o on o.id = m.obra_id where o.nome = 'Nova' and m.profile_id = eng;
  if n <> 1 then falhas := falhas || 'Quem cria a obra não entrou nela'; end if;

  -- ================= SEM LOGIN (anon) =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  ok := false;
  begin select count(*) into n from public.obras; exception when others then ok := true; end;
  if not ok and n > 0 then falhas := falhas || 'Sem login lê obras'; end if;

  perform set_config('role', 'postgres', true);
  if cardinality(falhas) = 0 then
    raise exception 'TUDO CERTO: nenhuma permissão vazou (o erro é de propósito, para desfazer o teste).';
  else
    raise exception 'FALHOU: %', array_to_string(falhas, ' | ');
  end if;
end
$teste$;
