// Gera supabase/seed-exemplo.sql a partir de src/lib/mockData.js: as MESMAS duas obras
// do mock (Apto 1802 cheio, Apto 501 magro), sem traduzir nada à mão.
//   node supabase/gerar-seed.mjs
//
// Os ids viram uuid fixo (md5 do id do mock), então rodar de novo não duplica:
// tudo usa "on conflict do nothing". As pessoas NÃO são criadas aqui (conta só se
// cria pelo app, com senha de quem usa): p1 vira o primeiro Engenheiro do banco e
// p2 o primeiro Mestre (se ainda não houver Mestre, o Engenheiro assina no lugar).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as m from '../src/lib/mockData.js'

const PESSOAS = { p1: 'v_eng', p2: 'v_mestre' }
const CHAVES = ['obra_id', 'frente_id', 'registro_id', 'material_id', 'contrato_empreiteiro_id']
const DE_PESSOA = ['autor_id', 'marcada_pronta_por', 'profile_id']

const uuid = (id) => (id === 'o-empresa' ? 'v_empresa' : `md5('matriz-seed:${id}')::uuid`)
const texto = (v) => `'${String(v).replace(/'/g, "''")}'`

function valor(col, v) {
  if (v === null || v === undefined) return 'null'
  if (col === 'id' || CHAVES.includes(col)) return uuid(v)
  if (DE_PESSOA.includes(col)) return PESSOAS[v] ?? 'null'
  if (col === 'comprovante_caminho') return 'null' // no mock era "mock": não existe arquivo no Storage
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return texto(v)
}

let ordem = 0
function inserir(tabela, linhas) {
  return linhas.map((l) => {
    const cols = Object.keys(l)
    ordem++
    return `  insert into public.${tabela} (${cols.join(', ')}, created_at) values (${cols.map((c) => valor(c, l[c])).join(', ')}, v_agora + interval '${ordem} milliseconds') on conflict do nothing;`
  }).join('\n')
}

const obras = m.mockObras.filter((o) => !o.interna)
const membrosEng = m.mockMembros.filter((x) => x.profile_id === 'p1')
const membrosMestre = m.mockMembros.filter((x) => x.profile_id === 'p2')

const sql = `-- GERADO por supabase/gerar-seed.mjs a partir de src/lib/mockData.js. Não edite à mão.
-- Dados de EXEMPLO (as duas obras do mock). Precisa de pelo menos um Engenheiro no banco.
do $seed$
declare
  v_agora timestamptz := now() - interval '1 day';
  v_eng uuid := (select id from public.profiles where role = 'Engenheiro' and ativo order by created_at limit 1);
  v_mestre uuid := coalesce((select id from public.profiles where role = 'Mestre' and ativo order by created_at limit 1), v_eng);
  v_empresa uuid := (select id from public.obras where interna limit 1);
begin
  if v_eng is null then raise exception 'Crie primeiro a conta do Engenheiro pelo app.'; end if;
${inserir('obras', obras)}
${inserir('membros', membrosEng)}
  if v_mestre <> v_eng then
${inserir('membros', membrosMestre)}
  end if;
${inserir('frentes', m.mockFrentes)}
${inserir('contratos_empreiteiros', m.mockContratos)}
  -- As frentes do mock já trazem o avanço; sem isto o gatilho do diário mudaria a Pintura de Parada para Em andamento.
  alter table public.registros_diario disable trigger diario_atualiza_frente;
${inserir('registros_diario', m.mockRegistros)}
  alter table public.registros_diario enable trigger diario_atualiza_frente;
${inserir('fotos', m.mockFotos)}
${inserir('materiais', m.mockMateriais)}
${inserir('lancamentos', m.mockLancamentos)}
end
$seed$;
`

const destino = join(dirname(fileURLToPath(import.meta.url)), 'seed-exemplo.sql')
writeFileSync(destino, sql)
console.log(`seed escrito em ${destino} (${ordem} linhas)`)
