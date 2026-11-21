# PRD Frontend — Matriz Engenharia (app de obras)

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> Escopo: o que fica pronto para segunda-feira, 23/11/2026. O que é da semana 2 está marcado e **não** entra agora.

## O que o sistema é

Acompanhamento de obras de reforma para um engenheiro que toca várias obras sozinho: o mestre lança o diário com foto e o engenheiro abre de manhã uma tela com o que está atrasando, o que comprar e quanto foi gasto. Usado principalmente **no celular** (mestre no canteiro, engenheiro de manhã); o financeiro e o caixa geral também são usados no computador.

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Layout do `preview.html` (estilo "Painel"), tema claro, com a identidade da logo da Matriz Engenharia (21/11/2026): marinho `#1B2A47` (topo, menu, texto forte), ouro `#C8A24F` (botão principal, item ativo, logo), tons derivados `#121D33` `#2C3D5E` `#7A5E1C` `#D9BE7E` `#F6EFDD`, fundo `#F2F4F7`, vermelho `#E2574C`; âmbar de atenção puxado para o laranja (`#EE8A1A`) para não confundir com o ouro. Fonte IBM Plex Sans + Mono. Logo: o "M" da Matriz em vetor, no topo, no menu lateral, no login e no ícone da aba; nome do app "Matriz Engenharia".
- Botões e campos grandes (mínimo 44px de altura), pensados para dedo e sol do canteiro.
- Celular: barra inferior fixa. Computador (a partir de 900px): menu lateral à esquerda.
- Dinheiro sempre no formato `R$ 1.234,56`; datas `dd/mm/aaaa`; o dia de hoje aparece como "Hoje".

## Perfis

- **Engenheiro:** entra em **Hoje**. Vê tudo de todas as obras, inclusive valores.
- **Mestre** (mestre de obra ou estagiário): entra em **Diário de hoje**. Vê só as obras em que foi colocado, e **nunca vê valor em dinheiro** em nenhuma tela.
- **Aguardando:** quem criou conta e ainda não foi liberado. Vê só o aviso de conta aguardando liberação.
- **Cliente:** semana 2. Não tem tela agora.

## Mapa de navegação

```
Login · Criar conta · Conta aguardando liberação
└── Engenheiro: Hoje · Frentes · Diário · Materiais · Mais (Financeiro, Caixa geral, Obras, Pessoas, Meu perfil)
    + botão flutuante "Lançar nota" em todas as telas
└── Mestre: Diário · Frentes · Materiais · Perfil
```

**Seletor de obra (multi-obra, decisão de 21/11/2026):** sempre visível no topo, em todas as telas, dizendo em qual obra a pessoa está (código, nome, cliente, data-meta de entrega). TROCAR abre a lista das obras que a pessoa pode ver (sem a obra interna "Empresa" e sem as concluídas). A obra escolhida fica lembrada na próxima vez que a pessoa abrir o sistema. Trocar de obra recarrega a tela inteira com os dados daquela obra; nada de uma obra aparece em outra. Única exceção: o **Caixa geral**, que é um comparativo entre obras e diz isso na tela.

---

## Tela: Login

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Logo e nome "Matriz Engenharia", campo de email, campo de senha, botão Entrar, link Criar conta.

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil (Engenheiro → Hoje; Mestre → Diário de hoje; Aguardando → Conta aguardando liberação).
- **Criar conta:** abre a tela Criar conta.

**Estado vazio**
Não se aplica.

---

## Tela: Criar conta

**Quem acessa:** qualquer pessoa sem conta.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Email | email | sim | |
| Senha | senha | sim | mínimo 8 caracteres |

**Ações**
- **Criar conta:** cadastra e leva para Conta aguardando liberação. Exceção: a primeira conta do sistema inteiro já entra como Engenheiro e cai em Hoje (vazio, com o botão Cadastrar obra).

---

## Tela: Conta aguardando liberação

**Quem acessa:** perfil Aguardando.

**O que aparece**
O texto "Conta aguardando liberação do engenheiro. Assim que ele liberar, você entra direto." e o botão Sair.

---

## Tela: Hoje (painel do dia)

**Quem acessa:** Engenheiro.
**Chega aqui por:** item "Hoje" do menu; é a tela inicial do engenheiro.

**O que aparece**, de cima para baixo, sempre da obra escolhida no seletor:
1. **Para aprovar** (só aparece se houver): frentes em *Aguardando aprovação*, com serviço, ambiente, quem marcou e quando. Botões **Aprovar** e **Devolver**.
2. **Frentes de serviço**: uma linha por frente que não está *Concluída*.
3. **Material para chegar**: materiais que não estão *Entregue* e precisam estar na obra até daqui a 7 dias (ou já passaram da data).
4. **Financeiro da obra**: quatro números.

**Campos e informações**

| Bloco | Informação | Observação |
|---|---|---|
| Frentes | serviço, ambiente, responsável | |
| Frentes | dias sem andar | hoje menos o último avanço; sem avanço, conta da data de início prevista; se a data de início ainda não chegou, mostra "começa em dd/mm" |
| Frentes | data limite de decisão | "vencida há N dias" quando passou |
| Frentes | situação | etiqueta colorida |
| Frentes | cor da linha | **vermelho**: data limite de decisão já passou · **amarelo**: data limite em até 3 dias, ou 3 dias ou mais sem andar · **verde**: o resto |
| Material | item, quantidade, frente, precisa até, situação | data já passada aparece em vermelho |
| Financeiro | gasto de ontem | saídas realizadas da obra com data de ontem (pagas por Engenheiro ou Cliente) |
| Financeiro | gasto da semana | saídas realizadas de segunda até hoje |
| Financeiro | saldo da obra | entradas realizadas menos saídas realizadas pagas pelo Engenheiro |
| Financeiro | a receber | parcelas do cliente ainda *Previsto*; mostra em vermelho quanto já venceu |

**Ordem das frentes:** data limite de decisão mais próxima primeiro (as vencidas no topo); frentes sem data limite vão para o fim; empate, a que está há mais dias sem andar.

**Ações**
- **Tocar numa frente:** abre Detalhe da frente.
- **Aprovar:** a frente vira *Concluída*, grava a data de conclusão = hoje e some do painel.
- **Devolver:** pede um comentário (obrigatório) e a frente volta para *Em andamento* com o comentário visível no detalhe.
- **Tocar num material:** abre o material em Materiais.
- **Ver diário de ontem:** abre o Dia do diário de ontem.
- **Tocar no bloco Financeiro:** abre Financeiro.

**Estado vazio**
- Sem obra cadastrada: "Nenhuma obra ainda. Cadastre a primeira obra para começar." + botão **Cadastrar obra**.
- Sem frentes: "Nenhuma frente cadastrada nesta obra. Comece criando as frentes de serviço." + botão **Nova frente**.
- Sem material para chegar: "Nada para chegar nos próximos 7 dias."

---

## Tela: Frentes

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** item "Frentes" do menu.

**O que aparece**
Lista das frentes da obra, agrupada por situação na ordem: Aguardando aprovação · Em andamento · Parada · Não iniciada · Concluída (este grupo vem fechado). Filtro por ambiente no topo.

**Campos e informações** (em cada linha)

| Campo | Observação |
|---|---|
| Serviço | ex.: "Forro de gesso" |
| Ambiente | ex.: "Sala" |
| Responsável | ex.: "Gesso Forte – Carlos" |
| % de avanço | barra |
| Dias sem andar | mesma regra do painel |
| Situação | etiqueta colorida |

**Ações**
- **Nova frente** (só Engenheiro): abre o formulário de frente.
- **Tocar numa frente:** abre Detalhe da frente.

**Regras por perfil**
- **Mestre:** não vê o botão Nova frente.

**Estado vazio**
"Nenhuma frente ainda. Cadastre as frentes de serviço da obra: elétrica, gesso, marcenaria…"

---

## Tela: Detalhe da frente

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** clique numa frente em Hoje ou Frentes.

**O que aparece**
Cabeçalho com serviço, ambiente, responsável, situação e %. Datas: início previsto, término previsto, data limite de decisão, último avanço, data de conclusão (se houver). Comentário de devolução (se houver). Depois, em abas: **Avanço** (registros do diário dessa frente, mais recente primeiro), **Fotos** (fotos dessa frente), **Materiais** (materiais ligados), **Contrato** (só Engenheiro).

**Aba Contrato** (só Engenheiro): empreiteiro, valor contratado, total pago (soma dos lançamentos ligados a este contrato), falta pagar, e a lista dos pagamentos. Botão **Registrar pagamento** abre Lançar nota já com a obra, a frente e o contrato preenchidos e categoria "Mão de obra".

**Formulário de frente** (criar e editar, só Engenheiro)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Serviço | texto | sim | |
| Ambiente | texto com sugestões | sim | sugere os ambientes já usados na obra |
| Responsável | texto | não | empresa ou pessoa |
| Início previsto | data | não | |
| Término previsto | data | não | |
| Data limite de decisão | data | não | a data em que, se nada for decidido, a obra atrasa |
| Situação | lista | sim | Não iniciada · Em andamento · Parada · Aguardando aprovação · Concluída; padrão "Não iniciada" |
| % de avanço | número 0 a 100 | sim | padrão 0 |

**Formulário de contrato** (dentro da aba Contrato, só Engenheiro)

| Campo | Tipo | Obrigatório |
|---|---|---|
| Empreiteiro | texto | sim |
| Valor contratado | dinheiro | sim |
| Observação | texto longo | não |

**Ações**
- **Editar** (Engenheiro): abre o formulário.
- **Marcar como pronta** (Mestre e Engenheiro, só se a frente não está *Concluída* nem *Aguardando aprovação*): pede confirmação "Marcar esta frente como pronta? O engenheiro vai aprovar." e muda para *Aguardando aprovação*.
- **Aprovar / Devolver** (Engenheiro, só em *Aguardando aprovação*): igual ao painel.
- **Excluir** (Engenheiro): confirmação; some da lista.

**Regras por perfil**
- **Mestre:** não vê a aba Contrato, não vê Editar nem Excluir, não vê Aprovar/Devolver.

**Estado vazio**
- Aba Avanço: "Nenhum avanço lançado nesta frente ainda."
- Aba Fotos: "Nenhuma foto desta frente ainda."
- Aba Materiais: "Nenhum material ligado a esta frente."
- Aba Contrato: "Nenhum contrato cadastrado para esta frente." + botão **Cadastrar contrato**.

---

## Tela: Diário

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** item "Diário" do menu; é a tela inicial do Mestre, já aberta no dia de hoje.

**O que aparece**
No topo, o cartão **Diário de hoje** com o botão grande **Lançar no diário**. Abaixo, duas abas: **Dias** (lista dos dias com registro, mais recente primeiro: data, quem lançou, quantas frentes andaram, quantas fotos) e **Fotos** (galeria).

**Ações**
- **Lançar no diário:** abre o formulário de registro do dia de hoje.
- **Tocar num dia:** abre Dia do diário.

**Estado vazio**
"Nenhum diário lançado nesta obra ainda. Toque em Lançar no diário para registrar o dia de hoje."

---

## Tela: Lançar no diário (formulário)

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** botão Lançar no diário.

**O que aparece**
Três botões grandes para escolher o tipo do registro: **Avanço de frente**, **Equipe presente**, **Ocorrência**. Cada um abre os campos abaixo. Depois de salvar, volta para o Diário de hoje mostrando o registro.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | padrão hoje; o Mestre só pode lançar com a data de hoje |
| Tipo | lista | sim | Avanço · Equipe · Ocorrência |
| Frente | lista das frentes da obra | sim se tipo = Avanço | |
| O que foi feito / texto | texto longo | sim | |
| Novo % de avanço | número 0 a 100 | não | só no tipo Avanço; mostra o % atual da frente ao lado |
| Fotos | câmera ou galeria, várias | não | cada foto mostra miniatura e pode ser removida antes de salvar |

**Ações**
- **Salvar:** grava o registro e as fotos. No tipo Avanço, a frente passa a ter "último avanço" = data do registro, recebe o novo % (se informado) e, se estava *Não iniciada* ou *Parada*, vira *Em andamento*.
- **Cancelar:** volta sem gravar.

**Regras por perfil**
- **Mestre:** edita e apaga só os próprios registros, e só no mesmo dia. Depois do dia, o registro aparece sem botão de editar.
- **Engenheiro:** edita e apaga qualquer registro, de qualquer dia.

---

## Tela: Dia do diário

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** clique num dia da lista, ou "Ver diário de ontem" no painel.

**O que aparece**
Data no topo com setas para o dia anterior e o seguinte. Blocos: **Equipe presente**, **Avanço por frente** (frente, texto, % novo, quem lançou), **Ocorrências**, **Fotos do dia** (grade).

**Ações**
- **Tocar numa foto:** abre a foto grande com data, ambiente, frente e quem tirou; deslizar passa para a próxima.
- **Editar / Excluir** num registro: conforme as regras por perfil do formulário.

**Estado vazio**
"Nada lançado neste dia."

---

## Tela: Fotos (aba dentro de Diário)

**Quem acessa:** Engenheiro e Mestre.

**O que aparece**
Galeria agrupada por dia, mais recente primeiro, com o cabeçalho de cada dia ("Hoje", "Ontem", "sexta, 20/11/2026"). Filtros no topo: ambiente e frente.

**Ações**
- **Tocar numa foto:** foto grande com data, ambiente, frente e quem tirou.

**Estado vazio**
"Nenhuma foto nesta obra ainda. As fotos entram pelo diário."

---

## Tela: Materiais

**Quem acessa:** Engenheiro e Mestre.
**Chega aqui por:** item "Materiais" do menu.

**O que aparece**
Lista dos materiais da obra, em abas por situação: **A comprar** · **Comprado** · **Entregue**. Dentro da aba, ordenado pela data em que precisa estar na obra (o mais urgente primeiro; data passada em vermelho).

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Item | texto | sim | |
| Quantidade | número | sim | |
| Unidade | texto | sim | ex.: m², sc, un, m |
| Frente | lista das frentes | não | |
| Precisa estar na obra até | data | sim | |
| Situação | lista | sim | A comprar · Comprado · Entregue; padrão "A comprar" |
| Fornecedor | texto | não | |
| Observação | texto | não | |

Sem campo de valor: o custo do material entra pela nota no Financeiro.

**Ações**
- **Novo material** (Engenheiro): abre o formulário.
- **Marcar comprado** (Engenheiro).
- **Marcar entregue** (Engenheiro e Mestre): pede confirmação e move para a aba Entregue.
- **Lançar nota deste material** (Engenheiro): abre Lançar nota já com obra, frente, fornecedor e categoria "Material".
- **Editar / Excluir** (Engenheiro).

**Regras por perfil**
- **Mestre:** vê tudo da lista, inclusive o fornecedor; só tem a ação **Marcar entregue**.

**Estado vazio**
"Nenhum material programado nesta obra."

---

## Tela: Financeiro

**Quem acessa:** Engenheiro.
**Chega aqui por:** Mais → Financeiro, ou tocar no bloco Financeiro do painel.

**O que aparece**, sempre da obra escolhida:
1. **Resumo:** contratado com o cliente (soma de todas as parcelas), recebido, a receber (com o vencido em vermelho), total gasto, saldo da obra.
2. Abas: **Lançamentos** · **Parcelas do cliente** · **Empreiteiros**.
   - **Lançamentos:** lista mais recente primeiro (data, tipo, categoria, fornecedor, frente, valor, pago por, ícone de comprovante). Filtros: período, categoria, frente.
   - **Parcelas do cliente:** lista por vencimento (descrição, valor, vencimento, situação). Botão **Nova parcela**. Em cada parcela *Previsto*, botão **Marcar recebida**.
   - **Empreiteiros:** uma linha por contrato (frente, empreiteiro, contratado, pago, falta pagar).

**Formulário de parcela**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Descrição | texto | sim | ex.: "Entrada", "Quinzena 3" |
| Valor | dinheiro | sim | |
| Vencimento | data | sim | |

Grava como lançamento tipo **Entrada**, categoria **Recebimento do cliente**, situação **Previsto**.

**Ações**
- **Marcar recebida:** pede a data do recebimento (padrão hoje) e a forma de pagamento; a parcela vira **Realizado** e entra no saldo.
- **Tocar num lançamento:** abre o lançamento para ver o comprovante, editar ou excluir.

**Estado vazio**
- Lançamentos: "Nenhum lançamento nesta obra."
- Parcelas: "Nenhuma parcela cadastrada. Cadastre a entrada e as quinzenas do contrato com o cliente."
- Empreiteiros: "Nenhum contrato com empreiteiro. Cadastre pelo detalhe da frente."

---

## Tela: Lançar nota

**Quem acessa:** Engenheiro.
**Chega aqui por:** botão flutuante "Lançar nota" (em todas as telas do engenheiro), ou atalhos em Materiais e no Contrato da frente.

**O que aparece**
Primeiro o botão grande **Foto da nota** (abre a câmera ou a galeria). Depois o formulário, com a foto em miniatura no topo.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Foto da nota | imagem | não | recomendada |
| Obra | lista: as obras + "Empresa (sem obra)" | sim | padrão: a obra do seletor |
| Data | data | sim | padrão hoje |
| Tipo | lista | sim | Entrada · Saída; padrão "Saída" |
| Categoria | lista | sim | Mão de obra · Material · Serviço terceirizado · Taxa · Recebimento do cliente · Outros |
| Valor | dinheiro | sim | maior que zero |
| Fornecedor | texto com sugestões | não | sugere os já usados |
| Frente | lista das frentes da obra | não | some quando a obra é "Empresa" |
| Material | lista dos materiais da obra | não | |
| Contrato de empreiteiro | lista dos contratos da obra | não | |
| Pago por | lista | sim (em Saída) | Engenheiro · Cliente; padrão "Engenheiro" |
| Forma de pagamento | lista | não | Pix · Dinheiro · Cartão · Boleto · Transferência |
| Descrição | texto | não | |

Todo lançamento feito aqui grava com situação **Realizado**.

**Ações**
- **Salvar:** grava e mostra "Nota lançada". Botão **Lançar outra** mantém a obra e a data, limpa o resto.
- **Cancelar:** volta sem gravar.

---

## Tela: Caixa geral

**Quem acessa:** Engenheiro.
**Chega aqui por:** Mais → Caixa geral.

**O que aparece**
Sem seletor de obra: junta todas. Filtro de mês no topo (padrão: mês atual).
1. **Saldo do caixa da empresa:** todas as entradas realizadas menos todas as saídas realizadas pagas pelo Engenheiro, de todas as obras e da "Empresa", desde o começo.
2. **No mês:** entrou, saiu (pago pelo Engenheiro), resultado.
3. **Por obra:** uma linha por obra (recebido, gasto, saldo, a receber) e uma linha "Empresa (sem obra)" só com o gasto.
4. **Parcelas vencidas:** de todas as obras (obra, descrição, valor, vencida há N dias).

**Ações**
- **Tocar numa obra:** troca o seletor para ela e abre Financeiro.
- **Tocar numa parcela vencida:** abre Parcelas do cliente daquela obra.

**Estado vazio**
"Nenhum lançamento ainda. Os números aparecem assim que você lançar a primeira nota ou parcela."

---

## Tela: Obras

**Quem acessa:** Engenheiro.
**Chega aqui por:** Mais → Obras.

**O que aparece**
Lista das obras (nome, cliente, situação, término previsto), ativas primeiro.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | ex.: "Apto 1802 – Ed. Jardins" |
| Código / apelido | texto | sim | curto, ex.: "JARDINS-1802" |
| Endereço | texto | não | |
| Cliente | texto | não | nome do cliente |
| Data de início | data | não | |
| Data-meta de entrega | data | não | |
| Situação | lista | sim | Em andamento · Parada · Concluída; padrão "Em andamento" |

**Ações**
- **Nova obra:** formulário acima. O engenheiro que cria vira membro da obra automaticamente.
- **Tocar numa obra:** edita, e mostra quem está nela (lista de pessoas, com botão **Adicionar pessoa** e **Remover**).
- **Excluir:** só se a obra não tiver nenhum registro; senão, mostra "Esta obra já tem registros. Marque como Concluída em vez de excluir."

**Regras por perfil**
- Obras *Concluídas* saem do seletor de obra, mas continuam no Caixa geral.
- A obra interna "Empresa (sem obra)" não aparece nesta lista nem no seletor; guarda os gastos que não são de obra nenhuma.

**Estado vazio**
"Nenhuma obra ainda. Cadastre a primeira obra para começar."

---

## Tela: Pessoas

**Quem acessa:** Engenheiro.
**Chega aqui por:** Mais → Pessoas.

**O que aparece**
No topo, **Aguardando liberação** (quem criou conta e não foi liberado). Abaixo, todas as pessoas com nome, email, perfil e obras.

**Ações**
- **Liberar:** escolhe o perfil (Engenheiro · Mestre) e marca as obras em que a pessoa entra.
- **Editar:** troca o perfil e as obras.
- **Desativar:** a pessoa não entra mais, mas o que ela lançou continua com o nome dela.

**Estado vazio**
"Só você por enquanto. Peça para o mestre criar a conta pelo link do sistema e libere aqui."

---

## Tela: Meu perfil

**Quem acessa:** Engenheiro e Mestre.

**O que aparece**
Nome (editável), email, perfil, botão **Sair**.

---

## Textos do sistema

- Botões: Salvar · Cancelar · Novo · Editar · Excluir · Aprovar · Devolver · Marcar como pronta · Marcar entregue · Marcar recebida · Lançar nota · Lançar no diário
- Confirmação de exclusão: "Excluir este registro? Não dá para desfazer."
- Aviso de conta pendente: "Conta aguardando liberação do engenheiro. Assim que ele liberar, você entra direto."
- Salvo com sucesso: "Salvo."
- Erro genérico: "Não foi possível salvar. Confira sua internet e tente de novo."
- Foto subindo: "Enviando fotos…" (o botão Salvar fica desativado até terminar)

## Dados de exemplo

"Hoje" nos exemplos = segunda, 23/11/2026.

**Pessoas**
- Engenheiro: "Eng. Júnior" — perfil Engenheiro, todas as obras
- Mestre: "Seu Antônio" — perfil Mestre, obras 1 e 2
- Aguardando: "Lucas (estagiário)" — perfil Aguardando

**Obras**
1. "Apto 1802 – Ed. Jardins" — cliente Dra. Helena Prado — início 01/10/2026 — término 18/12/2026 — Ativa
2. "Apto 501 – Ed. Mirante" — cliente Roberto e Clara — início 02/11/2026 — término 29/01/2027 — Ativa

**Frentes (obra 1)**
1. Elétrica – infraestrutura · Geral · "Eletro JR – Jefferson" · 06/10 a 31/10 · limite — · 100% · Concluída (concluída 30/10)
2. Forro de gesso · Sala · "Gesso Forte – Carlos" · 03/11 a 21/11 · limite 18/11 · 70% · Em andamento · último avanço 17/11 (6 dias, vermelho)
3. Porcelanato 120×120 · Sala · "Pisos Prime – Marcos" · 10/11 a 05/12 · limite 25/11 · 40% · Em andamento · último avanço 21/11 (amarelo)
4. Marcenaria – cozinha · Cozinha · "Marcenaria Bela" · 01/12 a 15/12 · limite 24/11 (aprovar projeto executivo) · 0% · Não iniciada (amarelo)
5. Bancadas em quartzo · Cozinha · "Marmoraria Ideal" · 08/12 a 12/12 · limite 27/11 (medição no local) · 0% · Não iniciada
6. Impermeabilização · Banho suíte · "Seu Antônio (equipe própria)" · 09/11 a 14/11 · limite — · 100% · Aguardando aprovação (marcada em 22/11)
7. Pintura · Quartos · "Pinturas Silva" · 16/11 a 28/11 · limite 20/11 · 20% · Parada · último avanço 16/11 (vermelho)

**Frentes (obra 2)**
8. Demolição de alvenaria · Cozinha · "Seu Antônio (equipe própria)" · 03/11 a 10/11 · 100% · Concluída
9. Hidráulica – prumadas · Banho social · "Hidro Max" · 11/11 a 28/11 · limite 26/11 · 50% · Em andamento · último avanço 23/11 (verde)

**Contratos de empreiteiros (obra 1)**
- Frente 2 · Gesso Forte · R$ 18.500,00 · pago R$ 9.000,00
- Frente 3 · Pisos Prime · R$ 22.000,00 · pago R$ 6.000,00
- Frente 7 · Pinturas Silva · R$ 14.800,00 · pago R$ 0,00

**Registros do diário (obra 1)**
- 21/11 · Avanço · frente 3 · "Assentadas 18 m² na sala, faltam rodapés" · 40% · Seu Antônio · 3 fotos
- 21/11 · Equipe · "Gesso 2, piso 3, pintura 0" · Seu Antônio
- 21/11 · Ocorrência · "Faltou argamassa AC-III às 14h, piso parou 1h" · Seu Antônio · 1 foto
- 17/11 · Avanço · frente 2 · "Tabicas da sala fechadas" · 70% · Seu Antônio · 2 fotos
- 16/11 · Avanço · frente 7 · "Massa corrida no quarto 1" · 20% · Seu Antônio

**Materiais (obra 1)**
- Argamassa AC-III · 30 sc · frente 3 · até 24/11 · Comprado · Leroy Merlin
- Rodapé poliestireno 10 cm · 42 m · frente 3 · até 27/11 · A comprar · —
- Tinta acrílica fosca branco · 6 latas 18 L · frente 7 · até 20/11 · A comprar (vermelho)
- Perfil de gesso F530 · 60 un · frente 2 · até 12/11 · Entregue · Gesso Forte

**Lançamentos (obra 1)**
- 01/10 · Entrada · Recebimento do cliente · "Entrada" · R$ 30.000,00 · Realizado
- 15/10, 01/11, 15/11 · Entrada · "Quinzena 1, 2, 3" · R$ 12.000,00 cada · Realizado
- 01/12, 15/12 · Entrada · "Quinzena 4, 5" · R$ 12.000,00 cada · Previsto
- vencimento 20/11 · Entrada · "Aditivo – forro extra" · R$ 4.500,00 · Previsto (vencida, para testar o vermelho)
- 22/11 · Saída · Material · Leroy Merlin · argamassa AC-III · R$ 1.170,00 · pago por Engenheiro · Pix · com foto
- 22/11 · Saída · Material · Casa do Pintor · lixas e fita · R$ 186,40 · pago por Cliente
- 20/11 · Saída · Mão de obra · Gesso Forte · contrato frente 2 · R$ 4.500,00 · Engenheiro · Transferência
- 19/11 · Saída · Taxa · Condomínio Ed. Jardins · taxa de mudança de entulho · R$ 350,00 · Engenheiro
- 21/11 · Saída · Outros · obra "Empresa" · Posto Shell · combustível · R$ 280,00 · Engenheiro

## Critérios de aceite

- [ ] O engenheiro entra e cai em **Hoje**, da obra lembrada, com as frentes na ordem da data limite de decisão (vencidas no topo).
- [ ] As cores das linhas seguem a regra (vermelho, amarelo, verde) com os dados de exemplo: frentes 2 e 7 vermelhas, 3 e 4 amarelas.
- [ ] Trocar de obra no seletor troca todos os blocos; nenhum dado da obra 1 aparece na obra 2.
- [ ] O Mestre entra e cai em **Diário de hoje**; consegue lançar um avanço com foto em menos de 1 minuto no celular.
- [ ] Depois de lançar um avanço numa frente, o "dias sem andar" dela volta a 0 e ela desce no painel, sem recarregar a página.
- [ ] O Mestre marca uma frente como pronta; ela aparece em **Para aprovar** no painel do engenheiro; Aprovar tira do painel, Devolver volta com o comentário.
- [ ] O Mestre não vê nenhum valor em dinheiro em nenhuma tela, nem o item Financeiro, nem a aba Contrato.
- [ ] O Mestre só vê as obras em que foi colocado.
- [ ] Lançar nota com foto aparece na hora em Lançamentos, no gasto de hoje e no Caixa geral.
- [ ] Nota "pago por Cliente" aparece no gasto da obra, mas não mexe no saldo do caixa.
- [ ] Marcar uma parcela como recebida soma no recebido e no saldo.
- [ ] Fotos aparecem agrupadas por dia e filtram por ambiente e por frente.
- [ ] Todas as telas funcionam no celular (375px) sem rolagem horizontal.
- [ ] Cada lista tem estado vazio com texto próprio.

## A conta que vai chegar depois

- `[PENDENTE: quem paga o material]` — por enquanto cada nota diz "pago por Engenheiro/Cliente"
- `[PENDENTE: confirmar o corte da semana 2]` — se a visão do cliente não puder esperar, entra perfil Cliente e uma tela a mais

## Decidir depois de usar

- `[DESCOBRIR NO USO: quantos dias sem andar acendem o amarelo]` — por enquanto: 3 dias
- `[DESCOBRIR NO USO: janela de materiais no painel]` — por enquanto: 7 dias
