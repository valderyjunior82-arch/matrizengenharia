# PRD Backend — Matriz Engenharia (app de obras)

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `registros_diario`.
- Colunas em minúsculo com underline: `data_inicio_prevista`, `frente_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at` (timestamptz automático).
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento e maiúscula, como está escrito aqui).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`.
- Foto e comprovante vão para o Storage; o banco guarda só o caminho do arquivo.
- **"Hoje"** é sempre calculado no fuso do engenheiro (UTC−4, o mesmo do computador dele), nunca em UTC. Senão, o diário lançado às 21h cai no dia seguinte.

---

## Unidade principal

**Obra.** Vai existir mais de uma: **sim**. Tabela `obras`, coluna `obra_id` **obrigatória** (`not null`) em toda tabela de lançamento — as de hoje e as dos próximos módulos —, e tabela `membros` dizendo quem trabalha em qual obra. Nenhuma consulta devolve duas obras juntas, a não ser o comparativo do Caixa geral. O Mestre pode estar em mais de uma obra. O Engenheiro enxerga todas as obras sem precisar estar em `membros`.

**Regra que garante que o Mestre nunca vê dinheiro:** nenhuma tabela que o Mestre consegue ler tem coluna de valor. Valores ficam só em `contratos_empreiteiros` e `lancamentos`, que o Mestre não lê.

---

## Tabela `profiles`

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| role | text | sim | CHECK: `Aguardando` · `Engenheiro` · `Mestre` · `Cliente`. Padrão `Aguardando`. `Cliente` já existe na lista, mas só passa a ser usado na semana 2 |
| ativo | boolean | sim | padrão verdadeiro; falso = não entra mais no sistema |
| created_at | timestamptz | sim | automático |

Criado automaticamente quando alguém se cadastra (processo 2).

---

## Tabela `obras`

Para que serve: cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | ex.: "Apto 1802 – Ed. Jardins" |
| codigo | text | sim | código/apelido curto, único. Ex.: "JARDINS-1802" |
| endereco | text | não | |
| cliente_nome | text | não | |
| data_inicio | date | não | |
| data_meta_entrega | date | não | data-meta de entrega |
| situacao | text | sim | CHECK: `Em andamento` · `Parada` · `Concluída`. Padrão `Em andamento` |
| interna | boolean | sim | padrão falso. Verdadeiro só na obra "Empresa (sem obra)" |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários membros, frentes, registros, fotos, materiais, contratos e lançamentos.
**Regra de negócio:** obra com qualquer registro ligado não pode ser apagada (a chave estrangeira bloqueia); ela é marcada `Concluída`.
**Obra interna "Empresa (sem obra)"** (decisão de 21/11/2026): existe uma obra com `interna = true` que guarda os gastos da empresa que não são de obra nenhuma (combustível, contador, ferramenta). Assim **todo** lançamento tem `obra_id`, sem exceção. Ela não aparece no seletor de obra; só o Engenheiro a vê, no Caixa geral e no Lançar nota.

---

## Tabela `membros`

Para que serve: diz quem trabalha em qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| profile_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** a dupla (obra_id, profile_id) é única. Ao criar uma obra, o engenheiro que criou entra como membro.

---

## Tabela `frentes`

Para que serve: as frentes de serviço de cada obra. **Sem nenhum valor em dinheiro.**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| servico | text | sim | |
| ambiente | text | sim | |
| responsavel | text | não | empresa ou pessoa |
| data_inicio_prevista | date | não | |
| data_termino_prevista | date | não | |
| data_limite_decisao | date | não | |
| situacao | text | sim | CHECK: `Não iniciada` · `Em andamento` · `Parada` · `Aguardando aprovação` · `Concluída`. Padrão `Não iniciada` |
| percentual | integer | sim | 0 a 100, padrão 0 |
| ultimo_avanco_em | date | não | preenchido pelo processo 1 |
| marcada_pronta_por | uuid | não | → profiles |
| marcada_pronta_em | timestamptz | não | |
| comentario_devolucao | text | não | preenchido quando o engenheiro devolve |
| data_conclusao | date | não | gravada quando a situação vira `Concluída` |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, situacao), (obra_id, data_limite_decisao).
**Regras de negócio:**
- Ao mudar para `Concluída`, grava `data_conclusao` = hoje (se vazia) e `percentual` = 100.
- Ao sair de `Concluída`, apaga `data_conclusao`.
- **Marcar como pronta** é uma função do banco (`marcar_frente_pronta`): só muda a situação para `Aguardando aprovação` e grava quem e quando. É a única mudança que o Mestre consegue fazer numa frente, e só em obra da qual é membro, e só se a frente não estiver `Concluída` nem `Aguardando aprovação`.

---

## Tabela `contratos_empreiteiros`

Para que serve: o valor contratado com o empreiteiro de cada frente. **Só o Engenheiro lê.**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| frente_id | uuid | sim | → frentes |
| empreiteiro | text | sim | |
| valor_contratado | numeric(14,2) | sim | maior que zero |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários lançamentos (os pagamentos).
**Cálculo:** pago = soma dos `lancamentos` com este `contrato_empreiteiro_id`, tipo `Saída`, situação `Realizado`. Falta pagar = contratado − pago.

---

## Tabela `registros_diario`

Para que serve: o que aconteceu em cada dia de cada obra. Cada linha é um registro: avanço de uma frente, equipe presente ou ocorrência.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| data | date | sim | o dia do diário |
| tipo | text | sim | CHECK: `Avanço` · `Equipe` · `Ocorrência` |
| frente_id | uuid | só no `Avanço` | → frentes; obrigatório quando tipo = `Avanço` |
| texto | text | sim | |
| percentual_novo | integer | não | 0 a 100; só faz sentido no `Avanço` |
| autor_id | uuid | sim | → profiles; quem lançou |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, data), (frente_id, data).
**Regra de negócio:** a frente informada tem que ser da mesma obra do registro.

---

## Tabela `fotos`

Para que serve: as fotos da obra, ligadas ao dia, à frente e ao ambiente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| registro_id | uuid | não | → registros_diario; apagar o registro apaga as fotos dele |
| frente_id | uuid | não | → frentes |
| ambiente | text | não | copiado da frente na hora de salvar, para filtrar mesmo se a frente mudar |
| data | date | sim | o dia do diário |
| caminho | text | sim | caminho do arquivo no Storage |
| autor_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, data), (obra_id, ambiente), (obra_id, frente_id).

---

## Tabela `materiais`

Para que serve: o que precisa chegar na obra e até quando. **Sem valor:** o custo entra pela nota em `lancamentos`.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| frente_id | uuid | não | → frentes |
| item | text | sim | |
| quantidade | numeric(12,2) | sim | maior que zero |
| unidade | text | sim | |
| precisa_ate | date | sim | |
| situacao | text | sim | CHECK: `A comprar` · `Comprado` · `Entregue`. Padrão `A comprar` |
| fornecedor | text | não | o Mestre pode ver |
| observacao | text | não | |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, situacao, precisa_ate).
**Regra de negócio:** **Marcar entregue** é uma função do banco (`marcar_material_entregue`): só muda a situação para `Entregue`. É a única mudança que o Mestre consegue fazer num material, e só em obra da qual é membro.

---

## Tabela `lancamentos`

Para que serve: toda entrada e saída de dinheiro, de todas as obras e da empresa, incluindo as parcelas previstas do contrato com o cliente. **Só o Engenheiro lê.**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; gasto sem obra vai para a obra interna "Empresa (sem obra)" |
| data | date | sim | data do pagamento ou recebimento; numa parcela prevista, igual ao vencimento |
| vencimento | date | não | usado nas parcelas do cliente |
| tipo | text | sim | CHECK: `Entrada` · `Saída` |
| categoria | text | sim | CHECK: `Mão de obra` · `Material` · `Serviço terceirizado` · `Taxa` · `Recebimento do cliente` · `Outros` |
| situacao | text | sim | CHECK: `Previsto` · `Realizado`. Padrão `Realizado` |
| valor | numeric(14,2) | sim | maior que zero (o tipo diz se entra ou sai) |
| descricao | text | não | ex.: "Quinzena 3" |
| fornecedor | text | não | |
| frente_id | uuid | não | → frentes |
| material_id | uuid | não | → materiais |
| contrato_empreiteiro_id | uuid | não | → contratos_empreiteiros |
| pago_por | text | não | CHECK: `Engenheiro` · `Cliente`. Obrigatório quando tipo = `Saída`; padrão `Engenheiro` |
| forma_pagamento | text | não | CHECK: `Pix` · `Dinheiro` · `Cartão` · `Boleto` · `Transferência` |
| comprovante_caminho | text | não | caminho da foto da nota no Storage |
| autor_id | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (obra_id, data), (obra_id, situacao, vencimento), (contrato_empreiteiro_id).
**Regras de negócio:**
- Frente, material e contrato informados têm que ser da mesma obra do lançamento.
- Parcela do cliente = tipo `Entrada`, categoria `Recebimento do cliente`, situação `Previsto` com vencimento. "Marcar recebida" muda para `Realizado` e grava a data do recebimento.

**Cálculos usados nas telas** (feitos na consulta, nada guardado):
- Contratado com o cliente = soma das entradas com categoria `Recebimento do cliente` da obra (previstas + realizadas).
- Recebido = entradas `Realizado`. A receber = entradas `Previsto`; vencido = `Previsto` com vencimento antes de hoje.
- Gasto da obra = saídas `Realizado` (pagas por Engenheiro ou Cliente).
- Saldo da obra = entradas `Realizado` − saídas `Realizado` com pago_por `Engenheiro`.
- Saldo do caixa da empresa = o mesmo cálculo, somando todas as obras e os lançamentos sem obra.

---

## Permissões

Escrito em português. Vira RLS na hora de construir.

"Engenheiro" abaixo = perfil `Engenheiro` e `ativo` verdadeiro. "Membro da obra" = tem linha em `membros` para aquela obra. Perfil `Aguardando`, perfil `Cliente` (por enquanto) e qualquer pessoa com `ativo` falso **não veem nada** em nenhuma tabela.

### `profiles`
- **Ver:** cada pessoa vê o próprio; Engenheiro vê todos. O Mestre vê também nome dos outros membros das suas obras (para mostrar "quem lançou").
- **Criar:** só o processo 2.
- **Editar:** cada pessoa edita o próprio nome; só o Engenheiro muda `role` e `ativo` (ninguém muda o próprio perfil).
- **Apagar:** ninguém (desativa em vez de apagar).
- **Sem login:** nada.

### `obras`
- **Ver:** Engenheiro todas; Mestre só as em que é membro.
- **Criar / editar / apagar:** Engenheiro.
- **Sem login:** nada.

### `membros`
- **Ver:** Engenheiro tudo; Mestre só as próprias linhas.
- **Criar / editar / apagar:** Engenheiro.
- **Sem login:** nada.

### `frentes`
- **Ver:** Engenheiro todas; Mestre as das obras em que é membro.
- **Criar / editar / apagar:** Engenheiro.
- **Mestre:** não edita direto; só usa a função `marcar_frente_pronta`.
- **Sem login:** nada.

### `contratos_empreiteiros`
- **Ver / criar / editar / apagar:** só Engenheiro.
- **Sem login:** nada.

### `registros_diario`
- **Ver:** Engenheiro todos; Mestre os das obras em que é membro.
- **Criar:** Engenheiro em qualquer obra e qualquer data; Mestre só em obra da qual é membro, com `data` = hoje e `autor_id` = ele mesmo.
- **Editar / apagar:** Engenheiro qualquer um; Mestre só os próprios e só se `data` = hoje.
- **Sem login:** nada.

### `fotos`
- **Ver:** Engenheiro todas; Mestre as das obras em que é membro.
- **Criar:** igual a `registros_diario`.
- **Apagar:** Engenheiro qualquer uma; Mestre só as próprias e só no mesmo dia.
- **Sem login:** nada.

### `materiais`
- **Ver:** Engenheiro todos; Mestre os das obras em que é membro (inclusive fornecedor).
- **Criar / editar / apagar:** Engenheiro.
- **Mestre:** não edita direto; só usa a função `marcar_material_entregue`.
- **Sem login:** nada.

### `lancamentos`
- **Ver / criar / editar / apagar:** só Engenheiro.
- **Sem login:** nada.

---

## Fluxo de cadastro e liberação

1. A pessoa cria conta com nome, email e senha.
2. O processo 2 cria o perfil dela como `Aguardando`. Ela não enxerga dado nenhum e vê o aviso "Conta aguardando liberação do engenheiro".
3. O Engenheiro, em Pessoas, escolhe o perfil (`Engenheiro` ou `Mestre`) e as obras dela.
4. **Primeiro acesso do sistema:** a primeira conta criada no sistema inteiro entra direto como `Engenheiro`. Todas as seguintes entram como `Aguardando`. Sem isso, ninguém consegue liberar ninguém.

## Processos automáticos

### 1. O diário atualiza a frente
- **Gatilho:** um registro tipo `Avanço` é criado em `registros_diario`.
- **Passos:** 1. `frentes.ultimo_avanco_em` = a data do registro, se for mais recente que a atual. 2. Se veio `percentual_novo`, ele vira o `percentual` da frente. 3. Se a frente estava `Não iniciada` ou `Parada`, vira `Em andamento`.
- **Resultado:** o "dias sem andar" volta a zero e a frente desce no painel do dia.
- **Se falhar:** o registro também não é salvo (tudo ou nada) e a tela mostra "Não foi possível salvar. Tente de novo."
- **Observação:** roda com permissão do banco, porque o Mestre não pode editar frentes direto.

### 2. Conta nova entra bloqueada
- **Gatilho:** alguém cria conta no login do Supabase.
- **Passos:** 1. cria a linha em `profiles` com nome e email. 2. Se for a primeira conta do sistema, `role` = `Engenheiro`; senão, `Aguardando`.
- **Resultado:** a pessoa aparece em Pessoas → Aguardando liberação.
- **Se falhar:** a conta não é criada e a tela mostra "Não foi possível criar sua conta agora. Tente de novo em alguns minutos."

## Arquivos

- Dois espaços no Storage, os dois **privados** (as fotos abrem por link temporário, nunca por link público):
  - `fotos-obra`: caminho `<obra_id>/<data>/<id>.jpg`. Lê quem pode ver a obra; envia quem pode lançar diário naquela obra.
  - `comprovantes`: caminho `<obra_id ou empresa>/<data>/<id>.jpg`. Só o Engenheiro lê e envia.
- Imagem comprimida no navegador antes de subir (máx. 1200px no lado maior, qualidade 0.8).
- O banco guarda o caminho do arquivo (`fotos.caminho`, `lancamentos.comprovante_caminho`).

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] A primeira conta do sistema entra como Engenheiro; a segunda entra como Aguardando.
- [ ] O Mestre não consegue ler nenhuma linha de `lancamentos` nem de `contratos_empreiteiros`, nem chamando o banco direto.
- [ ] O Mestre não vê obras, frentes, registros, fotos ou materiais de obra da qual não é membro.
- [ ] O Mestre não consegue apagar nada, exceto os próprios registros e fotos do dia de hoje.
- [ ] O Mestre não consegue editar frente nem material, só marcar frente como pronta e material como entregue.
- [ ] O Mestre não consegue lançar diário com data diferente de hoje.
- [ ] Um registro de `Avanço` atualiza `ultimo_avanco_em`, `percentual` e a situação da frente.
- [ ] Mudar a frente para `Concluída` grava `data_conclusao` e 100%.
- [ ] Ninguém muda o próprio `role`; o Engenheiro troca o de qualquer outro.
- [ ] Os valores de lista fechada do banco são idênticos aos da interface (com acento).
- [ ] "Hoje" é calculado no fuso UTC−4: um diário lançado às 22h fica no mesmo dia.
- [ ] Todo campo obrigatório recusa cadastro vazio; valor em dinheiro recusa zero ou negativo.

## A conta que vai chegar depois

- `[PENDENTE: quem paga o material]` — enquanto isso, o campo `pago_por` resolve os dois jeitos
- `[PENDENTE: a planilha atual de lançamentos]` — na semana 2, os dados entram em `lancamentos`; precisa do arquivo para mapear as colunas
- `[PENDENTE: perfil Cliente]` — semana 2: o cliente vai ver avanço por ambiente e fotos sem ler `frentes.responsavel` nem fornecedor; vai precisar de uma consulta própria só com o que ele pode ver, porque a tabela `frentes` tem o nome do responsável

## Decidir depois de usar

- `[DESCOBRIR NO USO: situação "Parada" automática]` — por enquanto: o engenheiro marca na mão
