# Plano do Projeto — Matriz Engenharia (app de obras)

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 20/11/2026 · Plano fechado, com 5 pendências listadas no fim (nenhuma trava a construção da segunda-feira)

## Em uma frase

Um sistema de **acompanhamento de obra** que acaba com a noite gasta juntando informação para **o engenheiro que toca várias obras sozinho**, fazendo **o mestre lançar o diário com foto no canteiro e o sistema montar sozinho, toda manhã, a lista do que está atrasando, do que comprar e de quanto foi gasto**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — A noite inteira juntando informação
- **Como acontece hoje:** à noite, o engenheiro junta o que foi feito em cada obra, procura as fotos no WhatsApp e soma o que foi gasto no dia. Diário de obra no caderno, foto solta no WhatsApp, financeiro anotado na mão.
- **Frequência:** todo dia.
- **Custo:** até 4 horas por noite, todo dia de obra (na casa de 20 horas por semana)
- **Como o gasto chega hoje:** o engenheiro junta as notas e manda num grupo de WhatsApp dizendo de qual obra é; depois alguém precisa passar isso para o sistema ou para a planilha.

### Problema 2 — Não saber o que atacar
- **Como acontece hoje:** mesmo depois de juntar tudo, não fica claro qual serviço atacar, o que comprar, e o atraso só aparece quando já aconteceu.
- **Frequência:** todo dia.
- **Custo:** obra atrasando sem aviso prévio.

### Problema 3 — Foto e diário sem data e sem lugar
- **Como acontece hoje:** foto perdida no meio da conversa do WhatsApp, impossível olhar "o que aconteceu no dia 12".
- **Frequência:** toda vez que precisa provar ou mostrar algo (cliente, fornecedor).
- **Custo:** tempo procurando e falta de prova.

## A solução

O mestre (ou estagiário) lança no celular, no canteiro, o diário do dia: o que cada frente fez, com foto. O sistema guarda tudo por obra e por data, calcula há quantos dias cada frente não anda, mostra o que precisa ser comprado antes de travar um serviço e soma o financeiro. De manhã, o engenheiro abre uma tela só e sabe o que fazer sem perguntar para ninguém. O cliente tem a própria tela, com avanço e fotos, sem ver custo nem fornecedor.

**O que ele NÃO faz (v1):**
- Orçamento e composição de preço (já resolvido fora)
- Relatório em PDF (diário, medição) — fica para a v2
- Leitura automática do grupo de WhatsApp — fica para a v2 (a nota entra pela foto no app)
- App nativo de loja (Play Store / App Store): é um site que abre bem no celular
- Integração com banco, contador ou nota fiscal
- Controle de estoque do almoxarifado
- Chat interno (o WhatsApp continua para conversa)

## Funcionalidades

### Painel do dia (a tela de toda manhã)
- **Abre em:** painel, da obra escolhida no seletor do topo
- **Mostra, de cima para baixo:**
  1. **Frentes de serviço**, uma por linha: serviço, ambiente, responsável, há quantos dias não anda, data limite de decisão, situação
  2. **Material que precisa estar na obra** nos próximos 7 dias e ainda não chegou: item, para qual frente, até quando, situação (a comprar / comprado / entregue)
  3. **Financeiro resumido:** gasto de ontem, gasto da semana, total entrou, total saiu, saldo da obra
- **Ordem:** frentes pela data limite de decisão mais próxima (ou já vencida) primeiro; empate, a que está há mais dias parada
- **Cor:** vermelho = data limite vencida; amarelo = vence em até 3 dias ou parada há 3+ dias; verde = andando
- **Ações:** clicar numa frente abre o detalhe dela; botão "Ver diário de ontem"
- **Vazio:** "Nenhuma frente cadastrada nesta obra. Comece criando as frentes de serviço."

### Frentes de serviço
- **Abre em:** lista
- **Mostra:** serviço, ambiente, responsável (empresa ou pessoa), início previsto, término previsto, data limite de decisão, % de avanço, situação
- **Só para o engenheiro, no detalhe:** contrato com o empreiteiro da frente (valor contratado, quanto já pagou, quanto falta). Fica guardado à parte, para o mestre nunca chegar no valor
- **Situação:** Não iniciada · Em andamento · Parada · Aguardando aprovação · Concluída
- **Concluir:** o mestre marca "pronto"; a frente vai para *Aguardando aprovação* e só vira *Concluída* quando o engenheiro aprova (ou devolve com um comentário)
- **"Dias sem andar":** calculado sozinho, a partir do último diário que registrou avanço nessa frente
- **Ações:** criar, editar, marcar concluída, apagar
- **Ao clicar:** detalhe com histórico de avanço, fotos dessa frente e materiais ligados
- **Vazio:** "Nenhuma frente ainda. Cadastre as frentes de serviço da obra: elétrica, gesso, marcenaria…"
- **Nasce e morre:** o engenheiro cria; quando conclui, sai do topo do painel e fica no histórico

### Diário de obra
- **Abre em:** lista por data, mais recente primeiro
- **Mostra:** data, quem lançou, equipes presentes, o que cada frente fez (frente + texto + novo % de avanço), ocorrências, fotos
- **Ações:** lançar o diário do dia, editar no mesmo dia, anexar fotos
- **Ao clicar:** abre o dia inteiro com as fotos
- **Vazio:** "Nenhum diário lançado nesta obra ainda."
- **Nasce e morre:** o mestre ou estagiário cria; depois do dia, só o engenheiro edita

### Fotos por data
- **Abre em:** galeria agrupada por dia
- **Filtro:** por ambiente e por frente
- **Ao clicar:** foto grande com data, ambiente, frente e quem tirou
- **Vazio:** "Nenhuma foto nesta obra ainda. As fotos entram pelo diário."

### Materiais
- **Abre em:** lista
- **Mostra:** item, quantidade, para qual frente, precisa estar na obra até, situação (A comprar · Comprado · Entregue), fornecedor
- **Valor:** o material não guarda preço. O custo entra pela nota no Financeiro, ligada ao material, e só o engenheiro vê
- **Ordem:** pela data em que precisa estar na obra
- **Ações:** criar, mudar situação, apagar
- **Vazio:** "Nenhum material programado."

### Financeiro
- **Dois lados, os dois com contratado e medido:**
  - **Com o cliente (o que entra):** valor contratado, medições feitas, quanto já recebeu, quanto falta receber
  - **Com cada empreiteiro (o que sai):** valor contratado por frente, medições, quanto já pagou, quanto falta pagar
- **Contrato com o cliente:** preço fechado pela mão de obra, com uma entrada e parcelas por quinzena. O sistema guarda cada parcela (valor, vencimento, recebida ou não) e mostra quanto falta receber e o que está vencido
- **Com os empreiteiros:** cada frente tem o valor contratado com o empreiteiro; os pagamentos ligados à frente mostram quanto já foi pago e quanto falta
- **Lançar nota (escolhido):** tirar foto da nota no celular (ou encaminhar a imagem do grupo) e escolher a obra. Na segunda: foto + digitar fornecedor e valor. Na semana 2: o sistema lê fornecedor, data e valor sozinho e você só confirma
- **Pago por:** cada nota diz se foi paga pelo **Engenheiro** (sai do caixa) ou pelo **Cliente** (fica registrada na obra, mas não mexe no caixa). Resolve os dois jeitos de comprar material enquanto a pendência "quem paga o material" não é respondida
- **Lançamento sem obra:** gastos da empresa que não são de nenhuma obra (combustível, contador, ferramenta) entram como "Empresa"
- **Abre em:** lista de lançamentos da obra, mais recente primeiro, com resumo no topo (entrou, saiu, saldo)
- **Mostra:** data, entrada ou saída, categoria (mão de obra, material, serviço terceirizado, taxa, outros), frente, fornecedor, valor, forma de pagamento, comprovante (foto)
- **Filtro:** por período, categoria e frente
- **Ações:** lançar, editar, apagar, anexar comprovante
- **Vazio:** "Nenhum lançamento nesta obra."

### Caixa geral da empresa (só o engenheiro)
- **Abre em:** painel com todas as obras juntas
- **Mostra:** saldo do caixa da empresa; entrou e saiu no mês; uma linha por obra com recebido, gasto, saldo e o que falta receber; parcelas vencidas de todas as obras
- **Filtro:** por mês
- **Vazio:** "Nenhum lançamento ainda. Os números aparecem assim que você lançar a primeira nota ou parcela."

### Visão do cliente (semana 2)
- **Abre em:** painel da obra dele
- **Mostra:** avanço por ambiente (% de cada ambiente, calculado pelas frentes daquele ambiente) e fotos por dia
- **Esconde:** qualquer valor, nome de fornecedor e nome de responsável de frente
- **Vazio:** "As fotos e o avanço da sua obra aparecem aqui assim que a equipe lançar o primeiro diário."

### Obras e usuários
- Cadastro de obras (nome, endereço, cliente, início, término previsto) e seletor no topo para trocar de obra
- Cadastro de pessoas e em quais obras cada uma trabalha

## Unidade principal

**Obra** — vai existir mais de uma? **sim** (várias ao mesmo tempo, com seletor, sem misturar dados). Alguém trabalha em mais de uma ao mesmo tempo? **sim**: o engenheiro em todas; o mestre/estagiário pode estar em mais de uma, e enxerga só as obras em que foi colocado

## Perfis de usuário

- **Engenheiro (admin):** toca as obras, decide e paga · primeira tela: Painel do dia
- **Mestre / Estagiário:** está no canteiro, lança o diário com foto e marca serviço concluído · primeira tela: Diário de hoje
- **Cliente:** dono do apartamento, acompanha · primeira tela: Visão do cliente

### Matriz de permissões (confirmada; a coluna Cliente passa a valer na semana 2)

| Ação | Engenheiro | Mestre/Estagiário | Cliente |
|---|---|---|---|
| Ver as obras | todas | só as dele | só a dele |
| Ver frentes de serviço | sim, com valores | sim, **sem valores** | não (só % por ambiente) |
| Criar e editar frentes | sim | não | não |
| Marcar frente como pronta | sim | **sim (vai para aprovação)** | não |
| Aprovar conclusão da frente | sim | não | não |
| Lançar diário com foto | sim | sim | não |
| Editar diário de dias anteriores | sim | não | não |
| Ver fotos | sim | sim | sim, da obra dele |
| Ver nome de fornecedor e responsável | sim | sim ✔ confirmado | **não, nunca** ✔ confirmado |
| Ver materiais | sim, com valor | **sim, sem valor; vê fornecedor; pode marcar "entregue"** ✔ confirmado | não |
| Ver financeiro (entradas, saídas, saldo) | sim | **não** | **não** |
| Ver valor contratado e medido | sim | **não** | **não** |
| Apagar qualquer coisa | sim | não | não |
| Gerenciar usuários e obras | sim | não | não |
| **Quem não fez login** | **não vê nada** | | |

## Fluxo de cadastro

1. A pessoa se cadastra sozinha com email e senha
2. Entra sem perfil e não vê dado nenhum
3. Vê o aviso "Conta aguardando liberação do engenheiro"
4. O engenheiro libera, escolhe o perfil e em quais obras ela entra
5. A primeira conta criada no sistema (a do engenheiro) já entra como Engenheiro; sem isso ninguém libera ninguém

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até crescer (fotos são o que mais pesa) |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no começo (a leitura automática de nota, na semana 2, custa centavos por nota)
**O que custaria a alternativa pronta:** a régua do engenheiro é **R$ 150 por mês** (R$ 1.800 por ano). Os prontos pesquisados custam entre R$ 39,90 e R$ 99 por mês.

## Prazo

- **Quer usar de verdade em:** **segunda-feira, 23/11/2026**
- **Horas disponíveis:** o fim de semana de 21 e 22/11

### O corte para caber na segunda

| Entra para segunda (23/11) | Fica para a semana 2 |
|---|---|
| Obras com seletor, sem misturar dados | Visão do cliente (avanço por ambiente e fotos) |
| Frentes de serviço com aprovação de conclusão | Leitura automática da nota pela foto |
| Diário de obra com fotos por data | Importar os lançamentos antigos da planilha |
| Painel do dia | |
| Materiais | |
| Financeiro por obra, com "Lançar nota" (foto + digitar valor) | |
| Caixa geral da empresa | |
| Parcelas do contrato com o cliente e pagamentos aos empreiteiros | |
| Perfis Engenheiro e Mestre/Estagiário | Perfil Cliente (entra junto com a visão do cliente) |

---

# 2. Insights do Mercado

## Benchmark (pesquisado em 20/11/2026, preços das páginas de venda)

### ALVA OBRAS
- Site: https://www.alvaobras.com.br/ · Preço: R$ 79,90 por mês, 15 dias grátis
- Faz bem: diário com fotos, financeiro por obra, orçado × realizado; feito por engenheiro civil
- Falta: não mostra a lista de frentes ordenada pela data limite de decisão; não tem o caixa da empresa juntando as obras do jeito do engenheiro [verificar no teste]

### ObraFlow
- Site: https://www.obraflow.app.br/ · Preço: R$ 39,90 (Inicial) ou R$ 79,90 (Profissional) por mês, 30 dias grátis
- Faz bem: diário de obra (RDO) e controle financeiro, barato
- Falta: foco em construtora; não tem a regra de o mestre lançar sem ver valor e a frente ir para aprovação [verificar no teste]

### Vobi
- Site: https://www.vobi.com.br/ · Preço: sem tabela atual pública (um artigo antigo citava R$ 69 a R$ 199 por mês)
- Faz bem: compras, estoque, fluxo de caixa, contas a pagar e receber
- Falta: reclamações no Reclame Aqui sobre plano mudado sem aviso, diário de obra fora do plano financeiro e dificuldade para cancelar

## Por que ainda vale construir o meu

Os prontos são baratos, mas nenhum monta a manhã do jeito do engenheiro: frentes ordenadas pela data limite de decisão, material que trava serviço, financeiro dos dois lados (cliente e empreiteiros) e o caixa da empresa, com o mestre lançando sem ver valor e o cliente sem ver fornecedor. O sistema próprio custa R$ 0 por mês e muda quando a obra mudar.

## Referências de interface

- **Gosta de:** [DESCOBRIR NO USO]
- **Usa mais em:** **celular** (mestre no canteiro; engenheiro de manhã); computador para o financeiro e o caixa geral
- **Visual:** layout do `preview.html` (estilo "Painel") com a identidade da logo (21/11/2026): marinho `#1B2A47` (topo, menu, texto forte), ouro `#C8A24F` (botão principal, item ativo, logo), tons derivados `#121D33` `#2C3D5E` `#7A5E1C` `#D9BE7E` `#F6EFDD`, fundo `#F2F4F7`, vermelho `#E2574C`; âmbar de atenção puxado para o laranja (`#EE8A1A`) para não confundir com o ouro
- **Tema:** **claro** (funciona melhor no sol do canteiro)
- **Logo:** o "M" da Matriz Engenharia (original em `design/logo-matriz-engenharia.webp`); nome do app: Matriz Engenharia

# 3. Arquitetura

> Etapa 3 proposta inteira pela IA, porque o engenheiro pediu para fechar o PRD sem mais perguntas. Revisar na primeira semana de uso.

## Mapa de telas

```
Login · Criar conta · Conta aguardando liberação
└── Engenheiro
    ├── Hoje (painel do dia)  →  Detalhe da frente
    ├── Frentes  →  Detalhe da frente (avanço, fotos, materiais, contrato do empreiteiro)
    ├── Diário  →  Dia do diário  ·  aba Fotos (galeria por data)
    ├── Materiais
    ├── Financeiro  →  Lançar nota · Parcelas do cliente
    └── Mais: Caixa geral · Obras · Pessoas · Meu perfil
└── Mestre / Estagiário
    ├── Diário de hoje (início)  ·  aba Fotos
    ├── Frentes  →  Detalhe da frente (sem valores)
    ├── Materiais (sem valores)
    └── Meu perfil
```

**Navegação:** celular com barra inferior; computador com menu lateral à esquerda. Seletor de obra fixo no topo em todas as telas, menos no Caixa geral (que junta todas).
- Engenheiro no celular (5 itens): Hoje · Frentes · Diário · Materiais · Mais (Financeiro, Caixa geral, Obras, Pessoas, Meu perfil). Botão flutuante **"Lançar nota"** em todas as telas.
- Mestre no celular (4 itens): Diário · Frentes · Materiais · Perfil.

## Processos automáticos

### 1. O diário atualiza a frente
- **Gatilho:** o mestre (ou o engenheiro) salva um registro de avanço no diário para uma frente
- **Passos:** 1. a frente passa a ter "último avanço" = data do diário  2. se o registro trouxe novo %, o % da frente é atualizado  3. se a frente estava *Não iniciada* ou *Parada*, vira *Em andamento*
- **Resultado:** o contador "dias sem andar" volta a zero e a frente desce no painel do dia
- **Se falhar:** o registro do diário não é salvo e aparece "Não foi possível salvar. Tente de novo."; nada fica pela metade

### 2. Conta nova entra bloqueada
- **Gatilho:** alguém cria conta com email e senha
- **Passos:** 1. o sistema cria o perfil dessa pessoa como *Aguardando*  2. ela vê só o aviso de conta aguardando liberação
- **Resultado:** o engenheiro vê a pessoa em Pessoas, escolhe o perfil e as obras dela
- **Se falhar:** a pessoa não consegue entrar e vê "Não foi possível criar sua conta agora. Tente de novo em alguns minutos."

## Modelagem de dados

Nove tabelas (detalhe completo em `PRD-BACKEND.md`):

| Tabela | Serve para |
|---|---|
| `profiles` | a pessoa que faz login e o perfil dela |
| `obras` | cada obra |
| `membros` | quem trabalha em qual obra |
| `frentes` | as frentes de serviço de cada obra |
| `contratos_empreiteiros` | valor contratado com o empreiteiro de cada frente (só o engenheiro vê) |
| `registros_diario` | o que foi feito em cada dia, por frente, mais equipe e ocorrências |
| `fotos` | as fotos, ligadas ao dia, à frente e ao ambiente |
| `materiais` | o que precisa chegar na obra e até quando |
| `lancamentos` | toda entrada e saída de dinheiro, incluindo as parcelas do cliente (só o engenheiro vê) |

Valor nunca fica numa tabela que o mestre lê: é isso que garante que ele não vê dinheiro, mesmo por engano.

## A pergunta de um ano

[PROPOSTA DA IA, não perguntada] "Quanto gastei por obra e por categoria, e quais frentes (e quais empreiteiros) mais atrasaram em relação ao previsto?" Para isso, desde o primeiro dia ficam guardados: a categoria e a frente de cada lançamento, as datas previstas de cada frente e a **data real de conclusão** (gravada quando o engenheiro aprova).

## Melhorias para a v2

- Visão e perfil do cliente (avanço por ambiente e fotos por dia) — semana 2, cortado para caber na segunda-feira
- Leitura automática da nota pela foto — semana 2, cortado pelo prazo
- Importar os lançamentos da planilha atual — semana 2, depende de receber o arquivo
- Leitura automática do grupo de WhatsApp — cortado: precisa de serviço pago e é frágil
- Relatório em PDF do diário e da medição — cortado: não devolve as noites
- Aviso no celular quando uma data limite de decisão estiver vencendo — cortado: o painel já mostra em vermelho

---

# A conta que vai chegar depois

- `[PENDENTE: quem paga o material — sai do caixa do engenheiro ou o cliente paga direto]` — custo: enquanto não responder, cada nota é marcada "pago por Engenheiro/Cliente" na mão
- `[PENDENTE: a planilha atual de lançamentos (onde está o arquivo)]` — custo: sem ela, os lançamentos antigos ficam fora do caixa geral
- `[PENDENTE: confirmar o corte — qual item da semana 2 não pode esperar]` — custo: se algum não puder esperar, a segunda-feira fica mais apertada
- `[PENDENTE: já usou outro sistema de obra e por que parou]` — custo: sem isso, não sabemos qual erro de outro sistema evitar

# Decidir depois de usar

- `[DESCOBRIR NO USO: referências de interface que agradam]` — por enquanto ficou: visual limpo, claro, botões grandes para usar no canteiro
- `[DESCOBRIR NO USO: quantos dias sem andar acendem o amarelo]` — por enquanto ficou: 3 dias
- `[DESCOBRIR NO USO: janela de materiais no painel]` — por enquanto ficou: próximos 7 dias
- `[DESCOBRIR NO USO: se a situação "Parada" deve virar automática]` — por enquanto ficou: o engenheiro marca na mão; o painel já destaca quem está sem andar
