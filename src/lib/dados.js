// ============================================================
// CAMADA DE DADOS — a única porta de entrada dos dados do app.
// Nenhuma tela lê mock nem chama o Supabase direto: tudo passa por aqui.
//
// A chave USAR_MOCK (config.js) escolhe a versão: dadosMock.js (exemplo, na
// memória) ou dadosBanco.js (Supabase). As duas têm as mesmas funções.
//
// MULTI-OBRA: a obra atual fica guardada na versão escolhida (definirObraAtual)
// e toda lista filtra por ela sozinha. As telas não passam obra_id.
// Toda função devolve { data, erro }.
// ============================================================
import { USAR_MOCK } from './config.js'
import * as mock from './dadosMock.js'
import * as real from './dadosBanco.js'

const d = USAR_MOCK ? mock : real

export const {
  definirObraAtual, contasDeExemplo, obterPerfil, retomarSessao, sairDaConta, entrar, criarConta,
  listarObras, salvarObra, excluirObra, adicionarNaObra, removerDaObra,
  listarFrentes, obterFrente, salvarFrente, excluirFrente, aprovarFrente, devolverFrente, marcarFrentePronta,
  listarRegistros, listarFotos, salvarRegistro, excluirRegistro, listarMateriais, salvarMaterial, excluirMaterial, mudarSituacaoMaterial,
  listarContratos, listarLancamentos, salvarContrato, marcarParcelaRecebida,
  listarCaixaGeral, listarPessoas, salvarAcesso, definirAtivo, salvarMeuNome,
} = d
