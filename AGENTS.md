# Matriz Engenharia (app de obras)

Acompanhamento de obras de reforma: o mestre lança o diário com foto no canteiro, o engenheiro abre de manhã uma tela com o que está atrasando, o que comprar e quanto foi gasto.
React + Vite + Supabase (ainda não ligado) + Vercel. Perfis: Engenheiro (`src/pages/AppEngenheiro.jsx`), Mestre (`src/pages/AppMestre.jsx`), Aguardando (`src/pages/Aguardando.jsx`). Os dois apps usam o mesmo roteador, `src/pages/AppBase.jsx`.
Fonte das decisões: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`, `PRD-BACKEND.md`. Referência visual aprovada: `preview.html`.

## ESTE APP É MULTI-OBRA (vale para todo módulo, agora e depois)

O engenheiro toca várias obras ao mesmo tempo, e os dados de uma **nunca** aparecem em outra.

1. **Toda tabela de lançamento tem `obra_id` obrigatório** (`not null`, apontando para `obras`). Sem exceção: gasto que não é de obra nenhuma vai para a obra interna **"Empresa (sem obra)"** (`interna = true`), que não aparece no seletor e só entra no Caixa geral.
2. **Todo módulo novo filtra por `obra_id`.** E quem filtra é a camada de dados, não a tela: `src/lib/dados.js` guarda a obra atual (`definirObraAtual`) e toda função de lista passa por `daObra()` (`src/lib/escopo.js`). As telas **não passam** `obra_id`; assim nenhuma consegue esquecer o filtro.
3. **Nenhuma tela mostra duas obras juntas**, a não ser que seja explicitamente um comparativo entre obras, e diga isso na tela. Hoje só existe um: o **Caixa geral** (`listarCaixaGeral`). Comparativo novo = função nova em `dados.js`, com o comentário dizendo que é comparativo.
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

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui. Aviso novo é seu e é de agora; conserte no mesmo lote.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra a tela, nas duas obras.

**Todo bug corrigido em `src/lib/` nasce com teste junto** em `tests/`, no mesmo lote. Build e lint não pegam regra errada.

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
- **Situação da obra** é `Em andamento · Parada · Concluída` (decisão do engenheiro em 21/11/2026, mais nova que o PRD original). Obra concluída sai do seletor, mas continua no Caixa geral.

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

## Onde paramos (22/11/2026, fim da conversa)

Esta seção é **substituída** no fim de cada conversa, não acumula. O que já passou nos testes fica em `docs/DIARIO.md`.

**Pronto (no GitHub), tudo ainda com dados de exemplo (`USAR_MOCK = true`):**
- **Login e pessoas** (commit `947d3b0`): Login, Criar conta, tela de espera que confere a cada 15 s, Pessoas (Liberar, Editar, Desativar, Reativar), Meu perfil (Editar nome). Regras em `src/lib/pessoas.js`, testes em `tests/pessoas.mjs`. 15 itens aprovados.
- **Obras e seletor** (commit `287f6c7`): Nova obra, Editar e Excluir (só obra sem registros), Adicionar e Remover mestre da obra, seletor do topo que se atualiza na hora (`recarregarObras` no `ObraContext`). Regras em `src/lib/obras.js`, testes em `tests/obras.mjs`. 13 itens aprovados. Depois do teste, a revisão de código gerou 5 consertos (excluir travado durante o envio, erro na recarga não derruba o app, mestre desativado sai livre, etiqueta de situação neutra, "Abrir esta obra" pergunta a `obrasDoSeletor`). Passaram no `npm run check` e o agente viu a tela, mas o engenheiro ainda não.
- **Decidido pelo engenheiro em 22/11:** concluir ou excluir uma obra pode deixar um Mestre sem nenhuma obra, sem aviso ("obra que acabou, acabou"). Só o Remover impede tirar da última. Não "conserte".
- A página de testes diz "Nada a testar agora": https://claude.ai/artifact/DUuJHnZp9uWE75DAtNVTc8

**Pela metade** (5 pontos menores da revisão do módulo de pessoas, sem conserto, o engenheiro ainda não decidiu):
1. "Primeira conta vira Engenheiro e cai em Hoje vazio" só tem teste automático. O mock nunca começa sem contas, então não dá para ver na tela.
2. Falha ao criar conta não mostra a frase do plano: "Não foi possível criar sua conta agora. Tente de novo em alguns minutos."
3. `src/screens/pessoas.jsx` decide Liberar × Editar com `role === 'Aguardando'` escrito à mão. Pela regra, isso vai para `lib/pessoas.js`, e o texto vem de `vocabulario.js`.
4. `salvarMeuNome` (`dados.js`) não confere se a conta existe e está ativa, e não usa `validar(CAMPOS_MEU_NOME)`.
5. O link "Criar conta / Entrar" do login usa `.link`, que é mono em caixa-alta; a convenção visual não permite.

Também sem conserto: o cadastro de obra aceita data-meta de entrega anterior à data de início.

**Ainda só com aviso "entra na etapa do banco":** os formulários de gravação de frente, diário, material, nota e parcela.

**Próximo passo:** a **etapa do Supabase**. É a recomendação do agente, mas o engenheiro ainda não confirmou: pergunte no começo da conversa nova. É nela que login, pessoas, obras e membros passam a gravar de verdade, com a RLS por `membros` e o seed das duas obras. Ele quer usar de verdade a partir de 23/11, e com o mock nada sobrevive ao F5. Alternativa: os 5 pontos acima.

**Armadilhas do mock:**
- **O F5 zera tudo:** contas, liberações, obras cadastradas, quem está em cada obra.
- **Cada aba tem a sua cópia dos dados:** o que muda numa aba não chega na outra. Para testar o Mestre vendo uma obra nova, saia e entre como Mestre **na mesma aba**, sem F5.
- **A senha `obra1234` é só do mock.** Ela fica em `mockSenhas`, à parte de `profiles`, e some na etapa do banco.

## O que entra neste arquivo

Ele é lido inteiro em toda sessão — cada linha custa em todas elas. Só entra o que o código não conta sozinho:

- ✅ armadilha ("X parece seguro mas faz Y"), o porquê de uma decisão, convenção que **difere** do padrão da linguagem, proibição ("nunca faça Z"), comando não óbvio, o que a verificação exige.
- ❌ árvore de pastas, lista de dependências, resumo de arquitetura, assinatura de função, boa prática genérica, histórico do que foi feito. `ls` e o `package.json` já respondem isso — e, quando envelhecem aqui, passam a mentir.
