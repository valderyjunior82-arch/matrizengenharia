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

## O que entra neste arquivo

Ele é lido inteiro em toda sessão — cada linha custa em todas elas. Só entra o que o código não conta sozinho:

- ✅ armadilha ("X parece seguro mas faz Y"), o porquê de uma decisão, convenção que **difere** do padrão da linguagem, proibição ("nunca faça Z"), comando não óbvio, o que a verificação exige.
- ❌ árvore de pastas, lista de dependências, resumo de arquitetura, assinatura de função, boa prática genérica, histórico do que foi feito. `ls` e o `package.json` já respondem isso — e, quando envelhecem aqui, passam a mentir.
