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
  fin uuid := gen_random_uuid();      -- Financeiro (migration 13)
  conta uuid := gen_random_uuid();    -- Contador
  cliente uuid := gen_random_uuid();  -- Cliente, membro só da obra A
  obra_a uuid; obra_b uuid; frente_a uuid; frente_b uuid; mat_a uuid; mat_b uuid;
  falhas text[] := '{}';
  n int;
  ok boolean;
  obra_nova uuid; n_frente uuid;
  reg_eq uuid; reg_oc uuid;  -- um registro de Equipe e uma Ocorrência na obra A, com foto (migration 15)
  emp uuid;  -- a obra interna "Empresa (sem obra)", que já existe no banco
begin
  -- pessoas (o gatilho cria os profiles; o primeiro do teste NÃO é o primeiro do sistema
  -- se já houver contas, então os papéis são acertados à mão logo depois)
  insert into auth.users (id, email, raw_user_meta_data) values
    (eng, 'teste-eng@exemplo.invalid', '{"nome":"Eng Teste"}'),
    (mestre, 'teste-mestre@exemplo.invalid', '{"nome":"Mestre Teste"}'),
    (espera, 'teste-espera@exemplo.invalid', '{"nome":"Espera Teste"}'),
    (inativo, 'teste-inativo@exemplo.invalid', '{"nome":"Inativo Teste"}'),
    (fin, 'teste-fin@exemplo.invalid', '{"nome":"Fin Teste"}'),
    (conta, 'teste-contador@exemplo.invalid', '{"nome":"Contador Teste"}'),
    (cliente, 'teste-cliente@exemplo.invalid', '{"nome":"Cliente Teste"}');
  update public.profiles set role = 'Engenheiro' where id = eng;
  update public.profiles set role = 'Financeiro' where id = fin;
  update public.profiles set role = 'Contador' where id = conta;
  update public.profiles set role = 'Cliente' where id = cliente;
  update public.profiles set role = 'Mestre' where id in (mestre, inativo);
  update public.profiles set role = 'Aguardando' where id = espera;
  update public.profiles set ativo = false where id = inativo;

  insert into public.obras (nome, codigo) values ('Teste A', 'TESTE-A-' || left(eng::text, 6)) returning id into obra_a;
  insert into public.obras (nome, codigo) values ('Teste B', 'TESTE-B-' || left(eng::text, 6)) returning id into obra_b;
  insert into public.membros (obra_id, profile_id) values (obra_a, mestre), (obra_a, inativo), (obra_a, eng), (obra_b, eng), (obra_a, cliente);
  insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_a, 'Gesso A', 'Sala', 'Em andamento') returning id into frente_a;
  insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_b, 'Gesso B', 'Sala', 'Em andamento') returning id into frente_b;
  insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate) values (obra_a, 'Cimento A', 1, 'sc', current_date) returning id into mat_a;
  insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate) values (obra_b, 'Cimento B', 1, 'sc', current_date) returning id into mat_b;
  insert into public.contratos_empreiteiros (obra_id, frente_id, empreiteiro, valor_contratado) values (obra_a, frente_a, 'Emp A', 100);
  insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', eng);
  insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_b, current_date, 'Equipe', 'B', eng);
  insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'equipe A', eng) returning id into reg_eq;
  insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Ocorrência', 'problema interno A', eng) returning id into reg_oc;
  insert into public.fotos (obra_id, registro_id, data, caminho, autor_id) values
    (obra_a, reg_eq, public.hoje_obra(), obra_a || '/' || public.hoje_obra() || '/a.jpg', eng),
    (obra_a, reg_oc, public.hoje_obra(), obra_a || '/' || public.hoje_obra() || '/oc.jpg', eng);
  update public.frentes set comentario_devolucao = 'Comentário interno' where id = frente_a;
  -- arquivos de foto (só a linha; o arquivo em si não importa para a regra), um em cada obra
  insert into storage.objects (bucket_id, name) values
    ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/a.jpg'),
    ('fotos-obra', obra_b || '/' || public.hoje_obra() || '/b.jpg'),
    ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/oc.jpg'),
    ('comprovantes', obra_a || '/nota-a.jpg');
  select id into emp from public.obras where interna limit 1;
  insert into public.movimentos_banco (obra_id, tipo, data, para_banco, valor, autor_id)
    values (emp, 'Saldo inicial', current_date, 'Inter', 100, eng);
  insert into public.fornecedores (nome, telefone) values ('Fornecedor Teste Permissão', '(11) 5555-0000');

  -- ================= MESTRE (só obra A) =================
  perform set_config('request.jwt.claims', json_build_object('sub', mestre, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 1 then falhas := falhas || format('Mestre vê %s obras de teste (esperado 1)', n); end if;
  select count(*) into n from public.frentes where obra_id = obra_b;
  if n <> 0 then falhas := falhas || text 'Mestre lê frente da obra B'; end if;
  select count(*) into n from public.materiais where obra_id = obra_b;
  if n <> 0 then falhas := falhas || text 'Mestre lê material da obra B'; end if;
  select count(*) into n from public.registros_diario where obra_id = obra_b;
  if n <> 0 then falhas := falhas || text 'Mestre lê diário da obra B'; end if;
  select count(*) into n from public.frentes where obra_id = obra_a;
  if n <> 1 then falhas := falhas || text 'Mestre NÃO lê a frente da obra A'; end if;
  select count(*) into n from public.contratos_empreiteiros;
  if n <> 0 then falhas := falhas || text 'Mestre lê contratos (dinheiro)'; end if;
  select count(*) into n from public.lancamentos;
  if n <> 0 then falhas := falhas || text 'Mestre lê lançamentos (dinheiro)'; end if;
  select count(*) into n from public.obras where interna;
  if n <> 0 then falhas := falhas || text 'Mestre vê a obra interna Empresa'; end if;

  update public.frentes set percentual = 99 where id = frente_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Mestre edita frente direto'; end if;
  update public.materiais set situacao = 'Comprado' where id = mat_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Mestre edita material direto'; end if;

  begin perform public.marcar_frente_pronta(frente_a);
  exception when others then falhas := falhas || ('Mestre não consegue marcar pronta na A: ' || sqlerrm); end;
  ok := false;
  begin perform public.marcar_frente_pronta(frente_b); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre marca pronta frente da obra B'; end if;
  begin perform public.marcar_material_entregue(mat_a);
  exception when others then falhas := falhas || ('Mestre não consegue marcar entregue na A: ' || sqlerrm); end;
  ok := false;
  begin perform public.marcar_material_entregue(mat_b); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre marca entregue material da obra B'; end if;

  -- pedido de material (migration 07): o Mestre pede, só "Aguardando aprovação" e só na obra dele
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, 'Pedido A', 1, 'sc', current_date, 'Aguardando aprovação') returning id into mat_a;
  exception when others then falhas := falhas || ('Mestre não pede material na A: ' || sqlerrm); end;
  ok := false;
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, 'Compra direta', 1, 'sc', current_date, 'A comprar');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre cria material já "A comprar" (sem aprovação)'; end if;
  ok := false;
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_b, 'Pedido B', 1, 'sc', current_date, 'Aguardando aprovação');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre pede material na obra B'; end if;
  ok := false;
  begin perform public.marcar_material_entregue(mat_a); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre marca entregue um pedido não aprovado'; end if;
  delete from public.materiais where id = mat_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Mestre apaga material'; end if;

  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'hoje', mestre);
  exception when others then falhas := falhas || ('Mestre não lança diário de hoje na A: ' || sqlerrm); end;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra() - 1, 'Equipe', 'ontem', mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre lança diário com data de ontem'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_b, public.hoje_obra(), 'Equipe', 'B', mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre lança diário na obra B'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'como outro', eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre lança diário em nome de outro'; end if;

  -- editar o % de um Avanço do dia atualiza a frente (gatilho da migration 05)
  begin
    insert into public.registros_diario (obra_id, data, tipo, frente_id, texto, percentual_novo, autor_id)
      values (obra_a, public.hoje_obra(), 'Avanço', frente_a, 'av', 30, mestre);
    update public.registros_diario set percentual_novo = 45 where autor_id = mestre and tipo = 'Avanço';
  exception when others then falhas := falhas || ('Mestre não lança/edita Avanço de hoje: ' || sqlerrm); end;
  select count(*) into n from public.frentes where id = frente_a and percentual = 45;
  if n <> 1 then falhas := falhas || text 'Editar o % do Avanço não atualizou a frente'; end if;

  -- fotos no Storage: pasta 1 = obra, pasta 2 = data
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_b || '/%';
  if n <> 0 then falhas := falhas || text 'Mestre lê foto da obra B no Storage'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_a || '/%';
  if n <> 2 then falhas := falhas || text 'Mestre NÃO lê as duas fotos da obra A no Storage'; end if;
  select count(*) into n from public.registros_diario where obra_id = obra_a and tipo = 'Ocorrência';
  if n <> 1 then falhas := falhas || text 'Mestre NÃO lê a Ocorrência da obra dele'; end if;
  select count(*) into n from public.frentes_da_obra(obra_a) where comentario_devolucao = 'Comentário interno';
  if n <> 1 then falhas := falhas || text 'Mestre NÃO lê o comentário de devolução'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/m.jpg', mestre::text);
  exception when others then falhas := falhas || ('Mestre não envia foto de hoje na A: ' || sqlerrm); end;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('fotos-obra', obra_a || '/' || (public.hoje_obra() - 1) || '/m.jpg');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre envia foto com data de ontem'; end if;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('fotos-obra', obra_b || '/' || public.hoje_obra() || '/m.jpg');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre envia foto na obra B'; end if;

  -- foto da nota é dinheiro: o Mestre não lê nem envia, nem na obra dele
  select count(*) into n from storage.objects where bucket_id = 'comprovantes';
  if n <> 0 then falhas := falhas || text 'Mestre lê foto de nota (comprovantes)'; end if;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('comprovantes', obra_a || '/m.jpg'); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre envia foto de nota'; end if;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_a, current_date, 'Saída', 'Material', 10, 'Engenheiro', mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre lança nota'; end if;
  -- saldo de banco é dinheiro
  select count(*) into n from public.movimentos_banco;
  if n <> 0 then falhas := falhas || text 'Mestre lê saldo de banco'; end if;
  ok := false;
  begin insert into public.movimentos_banco (obra_id, tipo, data, para_banco, valor, autor_id) values (emp, 'Saldo inicial', current_date, 'Inter', 1, mestre);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre grava saldo de banco'; end if;
  -- fornecedor tem telefone e documento: o Mestre não lê nem grava
  select count(*) into n from public.fornecedores;
  if n <> 0 then falhas := falhas || text 'Mestre lê fornecedores'; end if;
  ok := false;
  begin insert into public.fornecedores (nome) values ('Do Mestre'); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre cadastra fornecedor'; end if;

  ok := false;
  begin update public.profiles set role = 'Engenheiro' where id = mestre; exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre se promove a Engenheiro'; end if;
  begin update public.profiles set nome = 'Mestre Novo Nome' where id = mestre;
  exception when others then falhas := falhas || ('Mestre não edita o próprio nome: ' || sqlerrm); end;
  ok := false;
  begin insert into public.obras (nome, codigo) values ('Invasora', 'INV-' || left(mestre::text, 6)); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre cria obra'; end if;
  ok := false;
  begin insert into public.membros (obra_id, profile_id) values (obra_b, mestre); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Mestre se põe na obra B'; end if;
  select count(*) into n from public.profiles where id = espera;
  if n <> 0 then falhas := falhas || text 'Mestre lê perfil de quem não é da obra dele'; end if;
  select count(*) into n from public.profiles where id = eng;
  if n <> 0 then falhas := falhas || text 'Mestre lê o perfil inteiro (email) do colega'; end if;
  select count(*) into n from public.nomes_visiveis() where id = eng and nome = 'Eng Teste';
  if n <> 1 then falhas := falhas || text 'Mestre não vê o nome do colega da obra'; end if;
  select count(*) into n from public.nomes_visiveis() where id = espera;
  if n <> 0 then falhas := falhas || text 'Mestre vê o nome de quem não é da obra dele'; end if;
  select count(*) into n from public.nomes_das_frentes(obra_a);
  if n <> 0 then falhas := falhas || text 'Mestre usa nomes_das_frentes (é de quem vê dinheiro)'; end if;

  -- ================= MESTRE DESATIVADO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', inativo, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || text 'Mestre desativado ainda lê frentes'; end if;

  -- ================= AGUARDANDO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', espera, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.obras;
  if n <> 0 then falhas := falhas || text 'Aguardando vê obras'; end if;
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || text 'Aguardando vê frentes'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra';
  if n <> 0 then falhas := falhas || text 'Aguardando vê fotos no Storage'; end if;
  select count(*) into n from public.profiles;
  if n <> 1 then falhas := falhas || format('Aguardando vê %s perfis (esperado só o dele)', n); end if;
  ok := false;
  begin update public.profiles set role = 'Engenheiro' where id = espera; exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Aguardando se libera sozinho'; end if;
  select count(*) into n from storage.objects where bucket_id = 'comprovantes';
  if n <> 0 then falhas := falhas || text 'Aguardando vê foto de nota'; end if;
  select count(*) into n from public.movimentos_banco;
  if n <> 0 then falhas := falhas || text 'Aguardando lê saldo de banco'; end if;
  select count(*) into n from public.fornecedores;
  if n <> 0 then falhas := falhas || text 'Aguardando lê fornecedores'; end if;

  -- ================= CLIENTE (só obra A; migration 13) =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', cliente, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 1 then falhas := falhas || format('Cliente vê %s obras de teste (esperado 1)', n); end if;
  select count(*) into n from public.obras where interna;
  if n <> 0 then falhas := falhas || text 'Cliente vê a obra interna Empresa'; end if;
  -- migration 15: o Cliente lê frente pela função, sem o comentário de devolução, e não vê Ocorrência
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || text 'Cliente lê a tabela frentes (com o comentário de devolução)'; end if;
  select count(*) into n from public.frentes_da_obra(obra_a) where servico = 'Gesso A' and comentario_devolucao is null;
  if n <> 1 then falhas := falhas || text 'Cliente não lê a frente da obra dele, ou lê o comentário de devolução'; end if;
  select count(*) into n from public.frentes_da_obra(obra_b);
  if n <> 0 then falhas := falhas || text 'Cliente lê frente da obra B'; end if;
  select count(*) into n from public.registros_diario where tipo = 'Ocorrência';
  if n <> 0 then falhas := falhas || text 'Cliente lê Ocorrência'; end if;
  select count(*) into n from public.fotos where registro_id = reg_oc;
  if n <> 0 then falhas := falhas || text 'Cliente lê a foto da Ocorrência'; end if;
  select count(*) into n from public.fotos where registro_id = reg_eq;
  if n <> 1 then falhas := falhas || text 'Cliente NÃO lê a foto do registro de Equipe'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like '%/oc.jpg';
  if n <> 0 then falhas := falhas || text 'Cliente abre o arquivo da foto da Ocorrência no Storage'; end if;
  select count(*) into n from public.registros_diario where obra_id = obra_a;
  if n = 0 then falhas := falhas || text 'Cliente NÃO lê o diário da obra dele'; end if;
  select count(*) into n from public.registros_diario where obra_id = obra_b;
  if n <> 0 then falhas := falhas || text 'Cliente lê diário da obra B'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_a || '/%';
  if n = 0 then falhas := falhas || text 'Cliente NÃO lê as fotos da obra dele'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_b || '/%';
  if n <> 0 then falhas := falhas || text 'Cliente lê foto da obra B'; end if;
  select count(*) into n from public.materiais;
  if n <> 0 then falhas := falhas || text 'Cliente lê materiais'; end if;
  select count(*) into n from public.nomes_das_frentes(obra_a);
  if n <> 0 then falhas := falhas || text 'Cliente usa nomes_das_frentes (é de quem vê dinheiro)'; end if;
  select count(*) into n from public.lancamentos;
  if n <> 0 then falhas := falhas || text 'Cliente lê lançamentos (dinheiro)'; end if;
  select count(*) into n from public.contratos_empreiteiros;
  if n <> 0 then falhas := falhas || text 'Cliente lê contratos (dinheiro)'; end if;
  select count(*) into n from public.movimentos_banco;
  if n <> 0 then falhas := falhas || text 'Cliente lê saldo de banco'; end if;
  select count(*) into n from public.fornecedores;
  if n <> 0 then falhas := falhas || text 'Cliente lê fornecedores'; end if;
  select count(*) into n from storage.objects where bucket_id = 'comprovantes';
  if n <> 0 then falhas := falhas || text 'Cliente lê foto de nota'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'cli', cliente);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente lança no diário'; end if;
  ok := false;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos-obra', obra_a || '/' || public.hoje_obra() || '/c.jpg', cliente::text);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente envia foto'; end if;
  ok := false;
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, 'Pedido do cliente', 1, 'sc', current_date, 'Aguardando aprovação');
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente pede material'; end if;
  ok := false;
  begin perform public.marcar_frente_pronta(frente_a); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente marca frente pronta'; end if;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', cliente);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente lança nota'; end if;
  ok := false;
  begin update public.profiles set role = 'Engenheiro' where id = cliente; exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Cliente se promove'; end if;
  select count(*) into n from public.profiles where id = eng;
  if n <> 0 then falhas := falhas || text 'Cliente lê o perfil inteiro (email) do Engenheiro'; end if;

  -- ================= FINANCEIRO (todas as obras, só dinheiro; migration 13) =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', fin, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 2 then falhas := falhas || format('Financeiro vê %s obras de teste (esperado 2)', n); end if;
  select count(*) into n from public.obras where interna;
  if n <> 1 then falhas := falhas || text 'Financeiro não vê a obra interna Empresa'; end if;
  select count(*) into n from public.lancamentos where obra_id = obra_a;
  if n <> 1 then falhas := falhas || text 'Financeiro não lê lançamentos'; end if;
  select count(*) into n from public.frentes where obra_id in (obra_a, obra_b);
  if n <> 2 then falhas := falhas || text 'Financeiro não lê as frentes (nome do serviço na nota)'; end if;
  -- migration 16: é por esta função que o app lê (Lançar nota, Cadastrar contrato); sem o comentário de devolução
  select count(*) into n from public.frentes_da_obra(obra_a) where servico = 'Gesso A' and comentario_devolucao is null;
  if n <> 1 then falhas := falhas || text 'Financeiro não lê a frente pela função (lista Frente vazia), ou lê o comentário'; end if;
  select count(*) into n from public.materiais where obra_id = obra_b;
  if n = 0 then falhas := falhas || text 'Financeiro não lê materiais (ligar nota a material)'; end if;
  select count(*) into n from public.registros_diario;
  if n <> 0 then falhas := falhas || text 'Financeiro lê o diário'; end if;
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra';
  if n <> 0 then falhas := falhas || text 'Financeiro lê foto do diário'; end if;
  select count(*) into n from storage.objects where bucket_id = 'comprovantes' and name like obra_a || '/%';
  if n <> 1 then falhas := falhas || text 'Financeiro NÃO lê a foto da nota'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('comprovantes', obra_b || '/f.jpg', fin::text);
  exception when others then falhas := falhas || ('Financeiro não envia foto de nota: ' || sqlerrm); end;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_b, current_date, 'Saída', 'Outros', 10, 'Engenheiro', fin);
  exception when others then falhas := falhas || ('Financeiro não lança nota: ' || sqlerrm); end;
  update public.lancamentos set descricao = 'editada' where obra_id = obra_a;
  get diagnostics n = row_count;
  if n <> 1 then falhas := falhas || text 'Financeiro não edita nota'; end if;
  begin insert into public.movimentos_banco (obra_id, tipo, data, para_banco, valor, autor_id) values (emp, 'Saldo inicial', current_date, 'Santander', 5, fin);
  exception when others then falhas := falhas || ('Financeiro não informa saldo: ' || sqlerrm); end;
  begin insert into public.fornecedores (nome) values ('Fornecedor do Financeiro Teste');
  exception when others then falhas := falhas || ('Financeiro não cadastra fornecedor: ' || sqlerrm); end;
  begin insert into public.contratos_empreiteiros (obra_id, frente_id, empreiteiro, valor_contratado) values (obra_b, frente_b, 'Emp B', 50);
  exception when others then falhas := falhas || ('Financeiro não cadastra contrato: ' || sqlerrm); end;
  update public.frentes set percentual = 99 where id = frente_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Financeiro edita frente'; end if;
  ok := false;
  begin insert into public.registros_diario (obra_id, data, tipo, texto, autor_id) values (obra_a, public.hoje_obra(), 'Equipe', 'fin', fin);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Financeiro lança no diário'; end if;
  ok := false;
  begin perform public.marcar_frente_pronta(frente_b); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Financeiro marca frente pronta'; end if;
  ok := false;
  begin insert into public.obras (nome, codigo) values ('Do Fin', 'FIN-' || left(fin::text, 6)); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Financeiro cria obra'; end if;
  -- o Financeiro nem enxerga o perfil de quem aguarda: o update passa reto (0 linhas) ou é recusado
  n := 0;
  begin update public.profiles set role = 'Mestre' where id = espera; get diagnostics n = row_count;
  exception when others then n := 0; end;
  if n <> 0 then falhas := falhas || text 'Financeiro libera pessoa'; end if;

  -- ================= CONTADOR (só olha o dinheiro; migration 13) =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', conta, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 2 then falhas := falhas || format('Contador vê %s obras de teste (esperado 2)', n); end if;
  select count(*) into n from public.lancamentos where obra_id = obra_a;
  if n <> 1 then falhas := falhas || text 'Contador não lê lançamentos'; end if;
  select count(*) into n from public.movimentos_banco where obra_id = emp and autor_id = eng;
  if n <> 1 then falhas := falhas || text 'Contador não lê saldo de banco'; end if;
  select count(*) into n from public.fornecedores where nome = 'Fornecedor Teste Permissão';
  if n <> 1 then falhas := falhas || text 'Contador não lê fornecedores'; end if;
  select count(*) into n from storage.objects where bucket_id = 'comprovantes' and name like obra_a || '/%';
  if n <> 1 then falhas := falhas || text 'Contador NÃO lê a foto da nota'; end if;
  select count(*) into n from public.materiais;
  if n <> 0 then falhas := falhas || text 'Contador lê materiais'; end if;
  -- migration 14: o Contador não lê frentes; só o nome, pela função
  select count(*) into n from public.frentes;
  if n <> 0 then falhas := falhas || text 'Contador lê a tabela frentes'; end if;
  select count(*) into n from public.frentes_da_obra(obra_a);
  if n <> 0 then falhas := falhas || text 'Contador lê frentes pela função frentes_da_obra'; end if;
  select count(*) into n from public.nomes_das_frentes(obra_a) where servico = 'Gesso A';
  if n <> 1 then falhas := falhas || text 'Contador não vê o nome das frentes'; end if;
  select count(*) into n from public.registros_diario;
  if n <> 0 then falhas := falhas || text 'Contador lê o diário'; end if;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', conta);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Contador lança nota'; end if;
  update public.lancamentos set valor = 1 where obra_id = obra_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Contador edita nota'; end if;
  delete from public.lancamentos where obra_id = obra_a;
  get diagnostics n = row_count;
  if n <> 0 then falhas := falhas || text 'Contador apaga nota'; end if;
  ok := false;
  begin insert into public.movimentos_banco (obra_id, tipo, data, para_banco, valor, autor_id) values (emp, 'Saldo inicial', current_date, 'Inter', 1, conta);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Contador grava saldo de banco'; end if;
  ok := false;
  begin insert into public.fornecedores (nome) values ('Do Contador'); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Contador cadastra fornecedor'; end if;
  ok := false;
  begin insert into storage.objects (bucket_id, name) values ('comprovantes', obra_a || '/c.jpg'); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Contador envia foto de nota'; end if;

  -- ================= ENGENHEIRO =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', eng, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where bucket_id = 'fotos-obra' and name like obra_b || '/%';
  if n <> 1 then falhas := falhas || text 'Engenheiro NÃO lê a foto da obra B'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('fotos-obra', obra_b || '/' || (public.hoje_obra() - 5) || '/e.jpg', eng::text);
  exception when others then falhas := falhas || ('Engenheiro não envia foto de dia antigo: ' || sqlerrm); end;
  select count(*) into n from public.obras where nome like 'Teste %';
  if n <> 2 then falhas := falhas || text 'Engenheiro não vê as duas obras'; end if;
  select count(*) into n from public.lancamentos where obra_id = obra_a;
  if n <> 1 then falhas := falhas || text 'Engenheiro não lê lançamentos'; end if;
  select count(*) into n from storage.objects where bucket_id = 'comprovantes' and name like obra_a || '/%';
  if n <> 1 then falhas := falhas || text 'Engenheiro NÃO lê a foto da nota'; end if;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('comprovantes', obra_b || '/e.jpg', eng::text);
  exception when others then falhas := falhas || ('Engenheiro não envia foto de nota: ' || sqlerrm); end;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_b, current_date, 'Saída', 'Combustível', 10, 'Engenheiro', eng);
  exception when others then falhas := falhas || ('Conta nova Combustível recusada: ' || sqlerrm); end;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id) values (obra_b, current_date, 'Saída', 'Inventada', 10, 'Engenheiro', eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'CHECK aceita conta fora do plano'; end if;
  -- bancos (migration 10)
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, banco, autor_id) values (obra_b, current_date, 'Saída', 'Outros', 10, 'Engenheiro', 'Santander', eng);
  exception when others then falhas := falhas || ('Lançamento com banco recusado: ' || sqlerrm); end;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, banco, autor_id) values (obra_b, current_date, 'Saída', 'Outros', 10, 'Engenheiro', 'Itaú', eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'CHECK aceita banco fora da lista'; end if;
  select count(*) into n from public.movimentos_banco where obra_id = emp and autor_id = eng;
  if n <> 1 then falhas := falhas || text 'Engenheiro não lê saldo de banco'; end if;
  begin insert into public.movimentos_banco (obra_id, tipo, data, de_banco, para_banco, valor, autor_id) values (emp, 'Transferência', current_date, 'Santander', 'Dinheiro em espécie', 50, eng);
  exception when others then falhas := falhas || ('Engenheiro não transfere entre bancos: ' || sqlerrm); end;
  ok := false;
  begin insert into public.movimentos_banco (obra_id, tipo, data, de_banco, para_banco, valor, autor_id) values (obra_b, 'Transferência', current_date, 'Santander', 'Inter', 50, eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Transferência gravada em obra de cliente'; end if;
  ok := false;
  begin insert into public.movimentos_banco (obra_id, tipo, data, de_banco, para_banco, valor, autor_id) values (emp, 'Transferência', current_date, 'Inter', 'Inter', 50, eng);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Transferência para o mesmo banco aceita'; end if;
  -- fornecedores (migration 11)
  select count(*) into n from public.fornecedores where nome = 'Fornecedor Teste Permissão';
  if n <> 1 then falhas := falhas || text 'Engenheiro não lê fornecedores'; end if;
  begin insert into public.fornecedores (nome) values ('Outro Fornecedor Teste');
  exception when others then falhas := falhas || ('Engenheiro não cadastra fornecedor: ' || sqlerrm); end;
  ok := false;
  begin insert into public.fornecedores (nome) values (' fornecedor teste PERMISSÃO '); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Fornecedor com nome repetido aceito'; end if;
  begin update public.profiles set role = 'Mestre' where id = espera;
  exception when others then falhas := falhas || ('Engenheiro não libera outra pessoa: ' || sqlerrm); end;
  ok := false;
  begin update public.profiles set role = 'Mestre' where id = eng; exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Engenheiro muda o próprio perfil'; end if;
  ok := false;
  begin insert into public.lancamentos (obra_id, data, tipo, categoria, valor, pago_por, autor_id, frente_id)
    values (obra_a, current_date, 'Saída', 'Outros', 10, 'Engenheiro', eng, frente_b);
  exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Lançamento da obra A aceita frente da obra B'; end if;
  ok := false;
  begin insert into public.frentes (obra_id, servico, ambiente, situacao) values (obra_a, 'X', 'Y', 'Pronta'); exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'CHECK aceita situação inválida'; end if;
  ok := false;
  begin delete from public.frentes where id = frente_a; exception when others then ok := true; end;
  if not ok then falhas := falhas || text 'Apagou frente com contrato'; end if;
  -- aprovar o pedido do Mestre (mat_a) e excluir um pedido recusado
  update public.materiais set situacao = 'A comprar' where id = mat_a and situacao = 'Aguardando aprovação';
  get diagnostics n = row_count;
  if n <> 1 then falhas := falhas || text 'Engenheiro não aprova o pedido do Mestre'; end if;
  delete from public.materiais where id = mat_a;
  get diagnostics n = row_count;
  if n <> 1 then falhas := falhas || text 'Engenheiro não exclui material'; end if;
  -- cadastrar material direto (migration 08: o insert do Engenheiro também passa por obras_visiveis)
  begin insert into public.materiais (obra_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_b, 'Compra B', 1, 'sc', current_date, 'A comprar');
  exception when others then falhas := falhas || ('Engenheiro não cadastra material: ' || sqlerrm); end;
  -- frente de outra obra: a chave dupla recusa, com a frase que errosBanco.js traduz
  ok := false;
  begin insert into public.materiais (obra_id, frente_id, item, quantidade, unidade, precisa_ate, situacao)
    values (obra_a, frente_b, 'Cruzado', 1, 'sc', current_date, 'A comprar');
  exception when others then
    ok := sqlerrm like 'insert or update on table "materiais"%' and sqlerrm like '%_frente_id_obra_id_fkey%';
    if not ok then falhas := falhas || ('Frase da frente de outra obra mudou: ' || sqlerrm); ok := true; end if;
  end;
  if not ok then falhas := falhas || text 'Material da obra A aceita frente da obra B'; end if;
  -- "returning" é o que o app faz (grava e pede a linha de volta); sem ele o teste não pegou o bug da Rodada 7.
  begin insert into public.obras (nome, codigo) values ('Nova', 'NOVA-' || left(eng::text, 6)) returning id into obra_nova;
  exception when others then falhas := falhas || ('Engenheiro não cria obra: ' || sqlerrm); end;
  begin insert into public.frentes (obra_id, servico, ambiente) values (obra_nova, 'Primeira', 'Sala') returning id into n_frente;
  exception when others then falhas := falhas || ('Engenheiro não cria frente na obra nova: ' || sqlerrm); end;
  select count(*) into n from public.membros m join public.obras o on o.id = m.obra_id where o.nome = 'Nova' and m.profile_id = eng;
  if n <> 1 then falhas := falhas || text 'Quem cria a obra não entrou nela'; end if;

  -- ================= SEM LOGIN (anon) =================
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  ok := false;
  begin select count(*) into n from public.obras; exception when others then ok := true; end;
  if not ok and n > 0 then falhas := falhas || text 'Sem login lê obras'; end if;

  perform set_config('role', 'postgres', true);
  if cardinality(falhas) = 0 then
    raise exception 'TUDO CERTO: nenhuma permissão vazou (o erro é de propósito, para desfazer o teste).';
  else
    raise exception 'FALHOU: %', array_to_string(falhas, ' | ');
  end if;
end
$teste$;
