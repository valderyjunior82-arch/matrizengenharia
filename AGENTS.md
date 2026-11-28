# Matriz Engenharia (app de obras)

Acompanhamento de obras de reforma: o mestre lança o diário com foto no canteiro, o engenheiro abre de manhã uma tela com o que está atrasando, o que comprar e quanto foi gasto.
React + Vite + Supabase + Vercel. Perfis: Engenheiro (`src/pages/AppEngenheiro.jsx`), Mestre (`src/pages/AppMestre.jsx`), Aguardando (`src/pages/Aguardando.jsx`). Os dois apps usam o mesmo roteador, `src/pages/AppBase.jsx`.
Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`, `PRD-BACKEND.md`. Referência visual aprovada: `preview.html`.

## ESTE APP É MULTI-OBRA (vale para todo módulo, agora e depois)

O engenheiro toca várias obras ao mesmo tempo, e os dados de uma **nunca** aparecem em outra.

1. **Toda tabela de lançamento tem `obra_id` obrigatório** (`not null`, apontando para `obras`). Sem exceção: gasto que não é de obra nenhuma vai para a obra interna **"Empresa (sem obra)"** (`interna = true`), que não aparece no seletor e só entra no Caixa geral.
2. **Todo módulo novo filtra por `obra_id`.** E quem filtra é a camada de dados, não a tela: `src/lib/dados.js` guarda a obra atual (`definirObraAtual`) e toda função de lista filtra por ela sozinha: `daObra()` (`src/lib/escopo.js`) no mock, `daObraAtual()` (`.eq('obra_id', …)`) em `dadosBanco.js`. As telas **não passam** `obra_id`; assim nenhuma consegue esquecer o filtro.
3. **Nenhuma tela mostra duas obras juntas**, a não ser que seja explicitamente um comparativo entre obras, e diga isso na tela. Hoje são dois: o **Caixa geral** (`listarCaixaGeral`, com o saldo por banco: o banco é um só para todas as obras) e a lista de fornecedores em Cadastros (`listarFornecedores`, só nomes, sem valor). Comparativo novo = função nova em `dados.js`, com o comentário dizendo que é comparativo.
4. **Trocar de obra remonta a tela inteira** (`key={obraId}` no `<main>` do `Shell`). Nada de cache, `useRef` ou `localStorage` sem o `obra_id` na chave.
5. **A obra escolhida fica guardada** por pessoa (`matriz:obra:<profile_id>` no navegador) e volta quando o app reabre.
6. **Mock e seed com duas obras diferentes** (Apto 1802 cheio, Apto 501 magro e sem material). Tela nova se testa nas duas. O `tests/multi-obra.mjs` confere o isolamento; se ele falhar, pare tudo.
7. Na etapa do banco, a RLS repete a regra: Mestre só lê linha de obra em que é membro (`membros`), por uma função única usada em toda política.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão, formatação. Sem React, sem banco, sem `window`. Import com `.js` explícito (o Node exige). É a única camada com teste.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca. A tela **pede a decisão à lib**; não decide.
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela lê o mock nem chama o Supabase direto. Toda função devolve `{ data, erro }`.
- `src/lib/config.js` — `USAR_MOCK` (a chave mock × banco) e o `hoje()` (no mock, parado em 23/11/2026; de verdade, no fuso UTC−4 do engenheiro).
- `src/lib/vocabulario.js` — dono único das listas fechadas (situações, categorias, papéis). Texto **idêntico** ao CHECK do banco, com acento.
- `src/lib/formularios.js` — os campos de cada formulário e a validação. O `<Formulario>` desenha a partir daqui.

Três consequências práticas:

1. **`if` de negócio dentro de tela vai para `lib`**, mesmo com três linhas — se a linha decide *o que é verdade*, e não *o que aparece*.
2. **Constante compartilhada tem um dono só.** Cópias divergem caladas.
3. **Arquivo grande não é problema; arquivo confuso é.** Quebre quando ele passar a ter dois motivos para mudar.

**O Mestre nunca vê dinheiro.** As telas de dinheiro nem existem no `AppMestre`; o detalhe da frente esconde a aba Contrato com `ehEngenheiro()`. Tela nova com valor: só no `AppEngenheiro`.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes (inclui `check-grants`, que lê as migrations, e `check-schema`, que cruza as colunas do código com `tests/_schema-snapshot.json`). **Fecha em zero** — não há linha de base herdada aqui. Aviso novo é seu e é de agora; conserte no mesmo lote.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra a tela, nas duas obras.

**Todo bug corrigido em `src/lib/` nasce com teste junto** em `tests/`, no mesmo lote. Build e lint não pegam regra errada.

**Mudou permissão no banco (RLS, GRANT, função): rode `supabase/tests/permissoes.sql`** pelo `execute_sql`. Ele SEMPRE termina em erro de propósito (para desfazer tudo); a mensagem diz "TUDO CERTO" ou lista o que vazou. **Mudou coluna: regenere o `_schema-snapshot.json`** — snapshot velho passa verde mentindo.

No Windows, se `npm` reclamar de "execução de scripts desabilitada", use `npm.cmd` / `npx.cmd`. Nunca mexer na política de execução do Windows.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, `src/lib/escopo.js`, políticas RLS, migrations ou fluxo de dinheiro/recebimento (`src/lib/financeiro.js`, telas de Financeiro, Caixa e Lançar nota) → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes de subir. É por caminho, não por julgamento: nesses arquivos o erro não aparece na tela. Filtro de obra frouxo vaza dado sem nenhum sintoma; conta errada só aparece no fim do mês.

## Deploy

Ainda não está no ar. O padrão desta casa: a pessoa diz "sobe pro GitHub", o agente sobe com git (`git add`, `git commit`, `git push`), e a Vercel publica sozinha. A pessoa não digita comando: o agente roda o npm e o git na pasta dela.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na migration, só para `authenticated` (e `service_role`). Erro "permission denied for table (42501)" é GRANT faltando, não RLS. Nunca `grant all`, nunca `to anon` sem querer leitura pública.
- **Datas são texto `AAAA-MM-DD` e as contas são em UTC** (`src/lib/datas.js`). Nunca `new Date().toISOString().slice(0, 10)` para "hoje": vira UTC e pula um dia à noite. Use `hoje()` de `config.js`.
- **Dinheiro soma em centavos** (`src/lib/financeiro.js`). Nunca somar `valor` direto em ponto flutuante.
- **Nota "pago por Cliente" entra no gasto da obra, mas não no saldo do caixa.** Está testado; não "simplifique".
- **Banco:** projeto Supabase `matriz-engenharia` (id `cwfmrqyisksvejhyssks`, São Paulo). Toda mudança é arquivo em `supabase/migrations/`, aplicado com `apply_migration` — nunca clique no painel. O Mestre não lê `profiles` dos colegas (tem email): nome de quem lançou sai de `public.nomes_visiveis()`, que devolve só id e nome. Política de linha de obra passa **sempre** por `public.obras_visiveis()`; dinheiro, por `public.eh_engenheiro()`. O Mestre só muda frente/material pelas funções `marcar_frente_pronta` e `marcar_material_entregue`.
- **Fotos: a regra do Storage lê o caminho** `<obra_id>/<data>/<id>.jpg` (pasta 1 = obra visível, pasta 2 = data; o Mestre só envia na pasta de hoje). Mudar o formato do caminho quebra a permissão. Gatilho de update que mexe em outra tabela leva `when (old.x is distinct from new.x)`: o app manda a coluna mesmo sem mudar.
- **Os 6 avisos "SECURITY DEFINER executável" do painel são intencionais** (as funções das políticas, `nomes_visiveis` e as duas do Mestre; cada uma só devolve o que a pessoa já pode ver). Aviso novo além desses: investigue.
- **Confirmação de email está DESLIGADA** no Supabase (decisão do engenheiro em 23/11): o email grátis do Supabase só entrega para o dono, e o Mestre nunca receberia o link. Conta nova entra em `Aguardando` e não vê nada até ser liberada; essa é a tranca.
- **Chave mock × banco:** `USAR_MOCK` em `config.js` (hoje `false`). `dados.js` só escolhe entre `dadosMock.js` e `dadosBanco.js`, que têm as mesmas funções: função nova vai nas duas e na lista de `dados.js`. Os testes em `tests/` importam `dadosMock.js` (rodam sem internet).
- **Obra com chave dupla:** frentes, materiais, contratos e registros têm `unique (id, obra_id)` e as outras tabelas apontam para a dupla. É o banco garantindo que a frente de um lançamento é da mesma obra. Não troque por FK simples.
- **Apagar com registro ligado** é recusado pela chave estrangeira; `src/lib/errosBanco.js` traduz para a frase da tela. Erro novo do banco que aparece em inglês: traduza lá, com teste em `tests/erros-banco.mjs`.
- **Situação da obra** é `Em andamento · Parada · Concluída` (decisão do engenheiro em 21/11/2026, mais nova que o PRD original). Obra concluída sai do seletor, mas continua no Caixa geral.
- **Bancos e saldo** (decisão do engenheiro em 25/11): `BANCOS` em `vocabulario.js` = CHECK da migration 10. Lançamento do caixa leva banco; nota paga pelo Cliente não leva. O saldo não é guardado: `saldosPorBanco` = último "Saldo inicial" (saldo no **começo** do dia) + lançamentos e transferências daquele dia em diante. Saldo inicial e transferência moram em `movimentos_banco`, sempre na obra interna (a política recusa outra). Valor em R$ se lê com `paraDinheiro` ("12.000" = doze mil); quantidade com `paraNumero` ("1.500" = 1,5).
- **`fornecedores` não tem `obra_id`, de propósito** (migration 11): é cadastro da empresa, como `obras`, e só o Engenheiro lê. A nota e o material guardam o **nome** em texto; renomear ou excluir o cadastro não muda nota antiga. Não troque por chave estrangeira sem decisão dele.
- **Planilha do engenheiro: só pelo `scripts/importar-planilha.py`** (as regras de conta, fornecedor e aporte estão no topo dele, decididas pelo engenheiro em 26/11). Ele gera `.sql` com id estável e `on conflict do nothing`: rodar de novo com a planilha atualizada só traz o que é novo, e o `99-verificacao.sql` tem que dar zero linhas (saldo dos bancos = planilha). Linha antiga **editada** na planilha volta duplicada: a verificação acusa; confira antes de apagar. Desfazer: `delete ... where origem = 'planilha-2026'` em `lancamentos` e `movimentos_banco` (migration 12). Nunca importe à mão.
- **Aporte de sócio** (`CONTA_APORTE`, migration 12) entra no banco e no fluxo, mas **não é receita**: o DRE mostra à parte. Não "simplifique" para Outros. **Só se lança na Empresa** (decisão de 27/11): numa obra de cliente viraria "Recebido" no painel. `camposDaNota` recusa (recebe o id da Empresa) e `contasDeEntrada` tira da lista.
- **Nota da "Empresa (sem obra)" abre de qualquer obra** (`lancamentoDaObra` aceita a obra do seletor ou a interna, e só elas). É a única exceção ao filtro por obra, porque a Empresa não tem seletor. As notas dela se veem pela lista que abre ao tocar na Empresa em **Por obra** do Caixa geral; a Empresa **nunca** vira obra atual (decisão de 27/11: aberta como obra, Frentes, Parcelas e Materiais gravariam nela, e o banco aceita).
- **Contrato do empreiteiro** (decisões do engenheiro em 25/11): o valor contratado não pode ficar abaixo do já pago (`erroValorDoContrato`); contrato com nota ligada não se apaga (a FK recusa, `errosBanco` traduz); o campo Contrato de empreiteiro só existe em **Saída**. "Pagamento do contrato" é uma regra só: `pagamentosDoContrato` em `financeiro.js`.
- **Material: o Mestre pede, o Engenheiro aprova** (decisão do engenheiro em 23/11/2026, mais nova que os PRDs, que ainda dizem "o Mestre só marca entregue"). O Mestre cria material só como `Aguardando aprovação` (`PEDIDO` em `vocabulario.js`) e só em obra dele; vira compra quando o Engenheiro aprova (`A comprar`); recusar apaga o pedido. O banco garante (migrations 07 e 08: política `materiais_insert` e `marcar_material_entregue` recusando pedido). Pedido pendente aparece no painel Hoje seja qual for a data. Não "conserte" de volta para o PRD.

## Convenções visuais (decididas em 21/11/2026)

- **Letra mono em caixa-alta (`.mono`) só em título de bloco, aba e etiqueta de status (`.chip`).** Rótulo de dado usa `.rotulo`; linha de detalhe (ambiente, responsável, data) usa `.m`, em texto normal de 14px. É leitura no sol.
- **Cor de status vem do prazo, não da situação.** Vermelho/âmbar/verde saem de `nivelFrente()`; a situação ("Em andamento") fica neutra.
- **Identidade da Matriz Engenharia (tirada da logo):** marinho `--ink` e ouro `--ouro`. O ouro nunca vira texto pequeno sobre branco (use `--ouro-ink`) e nunca é cor de status: "atenção" é laranja (`--amb`), justamente para não confundir. O logo é o componente `MarcaM` (vetor); o original está em `design/logo-matriz-engenharia.webp`.
- **A régua de prazo (`ReguaPrazo`) é o elemento de assinatura.** Não crie outras barras de progresso; use a régua.
- **Espaçamento em múltiplos de 4px, ritmo de 8** (gutter 16px no celular, 24px na tela larga). Hover só dentro de `@media (hover: hover)`; no toque, a resposta é o `:active`.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em `lib/dados.js` → a exposição no contexto → os chamadores nas telas → a query. Função exposta que nenhuma tela chama é lixo.
- **Zero avisos novos de lint.** Aviso antigo que você encontrar, limpe se já estiver tocando no arquivo.
- **Código comentado não é backup, o git é.** Comentário explica *por quê*. Bloco comentado sem explicação, apague.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro, e verifique quem chama o *wrapper*, não só a função. Depois confira órfãos: quem só era chamado pelo que você removeu morre no mesmo commit.
- **Estado que nunca muda ou nunca é lido é lixo** — `useState` sem setter, prop que ninguém consome, flag que ninguém liga.
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua existindo até decisão de quem é dono. Na dúvida, pergunte.

## Checklist de testes vivo

Combinado com o engenheiro em 21/11/2026; vale em toda conversa.

O engenheiro (dono da Matriz Engenharia) não programa: decide o produto e testa na tela. O agente constrói. Para ele saber **o que testar** e o agente saber **o que deu errado**, existe uma página de testes viva, que o agente mantém e ele marca.

### 1. A página

Na primeira melhoria que precisar de teste, crie uma página publicada chamada **"Testes do Matriz Engenharia"**, com um banco de dados próprio (as marcas ficam guardadas no servidor, não no navegador). Se não existir ferramenta de página publicada na conversa, crie `testes.html` na pasta do projeto, guardando as marcas no próprio navegador, e diga que nesse caso ele precisa colar o resultado de volta.

A página tem:

- **No topo, a rodada:** nome ("Rodada 2 · Cadastros no banco · 21/10"), uma nota curta do que mudou e o que fazer antes de começar (ex.: "aperte Ctrl+F5").
- **Um cartão por item a testar**, agrupado por módulo, com:
  - **título**: o que se testa, em uma linha;
  - **passos**: numerados, uma ação por passo, com os nomes exatos da tela ("Clique em **Lançar nota**", e não "lance uma nota");
  - **esperado**: o que ele deve ver se deu certo, para dizer sim ou não sem interpretar;
  - **três botões**: `A testar` · `Funcionou` · `Problema`;
  - **um campo de observação**.
- Sem enfeite: a página é ferramenta. Funciona no celular.

### 2. O ciclo

1. O agente **constrói** a melhoria.
2. **Antes de passar**, confere o que dá sozinho: `npm run check`, a tela no navegador (nas duas obras), e, quando mexer no banco, o teste de permissões. **Só passa o que passou.** O que não conseguiu conferir (ex.: exige a senha dele), diz qual.
3. **Escreve os itens** na página e manda o link com um resumo de uma linha por item.
4. Ele **testa** e marca cada item, escrevendo o que viu nos que deram problema.
5. Ele **avisa** ("atualizei os testes"). O agente lê as marcas direto da página; ele não copia nada para o chat.
6. **Para cada problema**, o agente descobre a causa antes de mexer (código, registros do servidor, banco) e explica em uma linha o que estava acontecendo e o que mudou.
7. O agente **limpa a página**: o que passou **sai**; o que deu problema volta como `A testar`, com passos ajustados; o que é novo entra. Atualiza a nota da rodada.
8. Repete até não sobrar nada. A rodada fecha e a página diz "nada a testar agora".

**Nada morto fica guardado.** A página mostra só o que falta testar. Histórico, se houver, é uma linha por item aprovado em `docs/DIARIO.md` (data, o que mudou, o que passou), nunca na página.

### 3. Como escrever um bom item

- **Um comportamento por item.** "Cadastrar e editar obra" são dois, se puderem falhar separados.
- **Passos que qualquer pessoa repete** sem saber programar, na ordem da tela.
- **Esperado observável:** "a nota aparece em Lançamentos com o valor novo", e não "salva corretamente".
- **Teste o caminho errado também:** campo vazio, valor inválido, botão clicado duas vezes, o que não deveria ser permitido.
- **Diga qual conta usar** quando importar (Engenheiro, Mestre, Aguardando) e **qual obra** (Apto 1802, Apto 501).
- **Diga se o teste grava dado de verdade**, e como desfazer depois.

### 4. Quando o banco entra: os itens que nunca faltam

Para cada tela que passa a gravar, inclua itens que provem:

| Prova | O item pergunta | Por que |
|---|---|---|
| **Ficou gravado** | Depois de salvar, **aperte F5**: continua lá? | O mock guardava na memória; o banco pode não ter gravado e a tela fingir que sim |
| **Gravou certo** | O que voltou do F5 é exatamente o que foi digitado (acento, data, número, ordem)? | Tradução entre tela e banco perde campo sem avisar |
| **Cada um vê o seu** | Com a conta de outro perfil, e em outra obra, vê só o que deve? | A RLS é a única tranca de verdade; esconder botão não protege nada |
| **Quem não pode, não consegue, e é avisado** | O perfil sem permissão tenta gravar: o banco recusa **e a tela diz por quê**? | Recusa calada parece bug; aviso claro é produto |
| **Nada duplica** | Salvar duas vezes, importar de novo, tirar e pôr de volta: aparece repetido? | Clique duplo e reimportação são as duplicatas mais comuns |
| **Apagar não some com histórico** | Desativar algo que outra tela usa: a outra tela continua funcionando? | Registro que outro lugar lê se desativa, não se apaga |
| **Lista vazia e lista grande** | Sem dado, a tela diz o que fazer? Com muitos, aparece tudo? | O Supabase corta listas em 1.000 linhas sem avisar |
| **Erro de rede** | Se a internet cair no meio, a tela diz que não salvou? | Gravação perdida sem aviso é o pior defeito possível |

E do lado do agente, antes de passar qualquer item de banco:

- **Toda mudança no banco é arquivo versionado** em `supabase/migrations/`, nunca clique no painel.
- **Teste de permissões automático**: cada perfil tenta ler e gravar no que é seu e no do vizinho (outra obra), dentro de uma transação desfeita no fim. Roda depois de qualquer mudança de permissão.
- **Revisão de código** em toda mudança na camada de dados, nas permissões ou no login, antes de subir.
- **Avisos de segurança do painel do Supabase** conferidos depois de cada mudança, cada um explicado (intencional ou a corrigir).

### 5. O que o agente nunca faz

- Digitar senha, chave ou token, nem criar conta em nome dele. Se o teste precisa, o passo diz "entre com a sua conta".
- Colocar segredo (chave, senha, `.env`) no código, no Git ou na página de testes.
- Usar dado real de cliente como exemplo. Exemplo é sempre fictício.
- Dizer que algo está pronto sem ter rodado `npm run check` e olhado a tela; se não conseguiu olhar, dizer isso.
- Apagar dado de verdade para "limpar o teste". Desativar, sim; apagar, só com o ok dele.

### 6. Como responder depois de cada rodada

Resposta curta, em português simples, sem jargão:

- o que passou e saiu da página;
- uma tabela com cada problema: **o que estava acontecendo** · **o que mudou**;
- o que voltou para teste e o que é novo;
- o que não deu para conferir e por quê;
- o que espera uma decisão dele: uma pergunta por vez, com a recomendação do agente.

## Onde paramos (27/11/2026, fim da conversa da importação da planilha)

Esta seção é **substituída** no fim de cada conversa, não acumula. O que já passou nos testes fica em `docs/DIARIO.md`.

**Pronto, com o banco de verdade (`USAR_MOCK = false`).** No GitHub só até `ff0788d` + o "AGENTS.md: onde paramos…" seguinte. **O trabalho desta conversa não está no GitHub e NÃO pode subir enquanto o repositório for público** (`git status` diz se já tem commit; o repositório estava público em 27/11; o histórico já tem saldos de 25/11, e o script novo tem nomes de clientes e obras). Antes de qualquer push: confirme com ele que ficou privado (GitHub → Settings → Danger Zone → Change visibility).
- **Nesta conversa (26 e 27/11, rodadas 20 a 24, aprovadas):** a planilha dele foi importada pelo `scripts/importar-planilha.py` (676 lançamentos, 6 obras novas, transferências; saldo dos bancos = planilha). Migration 12: conta **Aporte de sócio** (fora do DRE, **só na Empresa**), forma **Débito automático**, coluna `origem`. Funcionário e sócio saíram de fornecedor (vão na descrição). Tocar na Empresa em **Por obra** do Caixa abre só a lista das notas dela (a Empresa nunca vira obra atual). O formulário confere também as listas que a tela injeta (`validar(campos, valores, listas)`).
- Antes (rodadas 1 a 19): login e pessoas, obras e seletor, frentes, Diário e fotos, Materiais, Financeiro inteiro (Lançar nota com foto, parcelas, contratos de empreiteiro, Fluxo, DRE, saldo por banco, Cadastros), Caixa geral e Painel do dia. Página de testes: "Nada a testar agora", https://claude.ai/artifact/DUuJHnZp9uWE75DAtNVTc8
- Banco: migrations `20261123-01` a `20261126-12`. `permissoes.sql` deu TUDO CERTO (última mudança de permissão: migration 11). Painel: só os 7 avisos conhecidos.
- Contas no banco: a do engenheiro (Engenheiro) e a "Mestre Teste" (dele, liberada só no Apto 501).
- **Obras de exemplo ficam no banco por enquanto** (decisão do engenheiro em 23/11, para treinar). Antes do uso real, pergunte de novo; se ele mandar limpar, apague só os dados de exemplo (ids `md5('matriz-seed:...')`), nunca as contas, as obras e notas da planilha (`origem = 'planilha-2026'`, ids `md5('matriz-import:...')`) nem o que ele cadastrou (ex.: a obra "Casa Teste", contratos e parcelas das obras importadas).

**Como ligar o app nesta máquina:** `preview_start` com o nome `matriz-obra` (sobe na **5173**; se outra conversa ocupar, vai para a 5174/5175, e o login fica guardado por endereço). Trocar `USAR_MOCK` com o app aberto deixa no console um "Cannot destructure property 'profile' of useSessao" do recarregamento a quente: é só da troca; recarregue a página antes de julgar o console. O agente não entra com a senha dele: confere a tela pela versão de exemplo (troca `USAR_MOCK` para `true` só para olhar e **volta para `false`** antes de qualquer commit; conta de exemplo e senha estão em `mockData.js`) e o banco simulando a conta dele (`set_config('request.jwt.claims', ...)` numa transação desfeita).

**Próximo passo:** ele quer **mais dois tipos de usuário** (pediu em 27/11, para uma conversa nova; ainda não disse quais nem o que cada um pode). Mexe no CHECK de `profiles.role`, em `vocabulario.js`, nas políticas (`eh_engenheiro`, `obras_visiveis`) e no `permissoes.sql`: pergunte o que cada um vê (dinheiro? todas as obras ou só as dele?) e faz. Depois: repositório privado → subir; pedir a planilha atualizada e rodar o script de novo; pôr no ar na **Vercel** (etapa 9 da skill), para o Mestre abrir no celular e usar a câmera de verdade. Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (valores no `.env.local`, que não vai para o Git). Depois: em Authentication → URL Configuration do Supabase, o Site URL vira o endereço da Vercel.

**Pela metade / ainda não feito:**
1. **Planilha importada até 25/11** (ver a armadilha "Planilha do engenheiro"). Ele continua lançando na planilha até o app ir para o ar: **antes de pôr no ar, peça a planilha atualizada e rode o script de novo** (só entra o que é novo). Contrato, parcelas, cliente e data-meta das obras importadas ele cadastra pelo app (decisão de 26/11). O comprovante de um lançamento de teste apagado em 25/11 ficou órfão no Storage. Usei a data do pagamento, não a competência (7 linhas diferem; as 3 de Buda são de competência abril e caíram em março).
2. Limites aceitos no diário: excluir um Avanço não devolve o % da frente; foto que o Engenheiro acrescenta ao registro do Mestre fica órfã no Storage se o Mestre apagar o registro; com a tela aberta mais de 1h, as fotos param de abrir até o F5. Não há botão para apagar uma foto sozinha.
3. Sem internet ao abrir, o app mostra o login em vez de um aviso (a sessão não se perde). Fica para quando o uso offline do canteiro for tratado.
4. Dado de exemplo mexido nos testes de 25/11: a parcela **Quinzena 4** do Apto 1802 ficou vencendo em 11/12 (era 01/12). O engenheiro sabe; não corrija sem ele pedir.
5. Aviso do painel "Leaked Password Protection Disabled": recurso do plano pago do Supabase; já explicado ao engenheiro, nada a fazer agora.
6. Achado da revisão de Materiais (24/11), ainda não feito (os outros dois saíram na rodada 18): o cartão "Material 7 dias" agora conta também pedidos de mais de 7 dias (título e PRD não dizem isso). **Esperam decisão do engenheiro:** o Mestre pode cancelar o próprio pedido? Recusar deve deixar um motivo?
7. Achados da revisão de Financeiro (25/11) que **esperam decisão do engenheiro ou a importação**: (a) o campo Fornecedor de Materiais não sugere os cadastrados (o Mestre não lê a tabela, então seria só para o Engenheiro); (b) não há como juntar dois nomes do mesmo fornecedor (renomear notas antigas de todas as obras) e o plano de contas continua fixo; (c) medido em 26/11 com ~700 notas: o Lançar nota baixa ~60 KB (id, fornecedor e tipo de todas as obras) e o Caixa geral ~400 KB (tudo, com `todas()` em páginas de 1.000); aceitável agora, mas cresce com o ano: reavaliar quando o Caixa passar de 2.000 notas.
8. Pontos menores sem decisão: `src/screens/pessoas.jsx` decide Liberar × Editar com `role === 'Aguardando'` à mão (vai para `lib/pessoas.js`); `src/screens/frente.jsx` decide Aprovar/Devolver com `f.situacao === 'Aguardando aprovação'` à mão; o link "Criar conta / Entrar" e os botões Editar/Excluir do Dia usam `.link` (mono caixa-alta, a convenção não permite); o cadastro de obra aceita data-meta antes do início (`naoAntesDe` resolve em uma linha).
9. Achados menores da revisão do Caixa geral (25/11), deixados de fora pelo engenheiro: (a) o texto da tela vazia difere do PRD ("Os números aparecem assim que você lançar a primeira nota ou parcela"); (b) `src/screens/caixa.jsx` ainda testa `obra.interna` na lista Por obra (o resto já usa `idDaEmpresa` de `escopo.js`); (c) tocar numa obra no Caixa chama `trocarObra` direto, e não o `aoTrocarObra` do `AppBase`: o Voltar do Financeiro leva ao Caixa com a obra já trocada.
10. No teste da rodada 17 a obra **Casa Teste** (dele) foi marcada Concluída; foi pedido para ele voltar para Em andamento. Se ela não aparecer no seletor, é isso: pergunte antes de mexer.
11. Achados da revisão do Painel do dia (26/11), deixados de fora pelo engenheiro (ele mandou consertar só a troca de obra): (a) tocar num material abre a aba certa, mas não destaca o material (o PRD diz "abre o material"); (b) Materiais aberto pelo painel não tem Voltar para o Hoje; (c) Para aprovar não mostra quem marcou (`listarFrentes` não traz `marcada_pronta_por_nome`; o PRD pede); (d) o painel mostra "Último diário" (último dia com registro) e não "Ver diário de ontem" do PRD: **confirmar com ele** qual vale; (e) no bloco Financeiro do painel só o link Abrir leva ao Financeiro (o PRD diz tocar no bloco).

## O que entra neste arquivo

Ele é lido inteiro em toda sessão — cada linha custa em todas elas. Só entra o que o código não conta sozinho:

- ✅ armadilha ("X parece seguro mas faz Y"), o porquê de uma decisão, convenção que **difere** do padrão da linguagem, proibição ("nunca faça Z"), comando não óbvio, o que a verificação exige.
- ❌ árvore de pastas, lista de dependências, resumo de arquitetura, assinatura de função, boa prática genérica, histórico do que foi feito. `ls` e o `package.json` já respondem isso — e, quando envelhecem aqui, passam a mentir.
