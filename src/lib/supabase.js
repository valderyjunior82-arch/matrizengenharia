// Conexão com o Supabase. Só src/lib/dadosBanco.js usa. As chaves ficam no
// .env.local (fora do Git) e, no ar, nas variáveis da Vercel.
import { createClient } from '@supabase/supabase-js'

// `?.`: nos testes automáticos (Node) não existe import.meta.env.
const url = import.meta.env?.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...): pode ir para o navegador, não é segredo.
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY

// Sem as chaves, fica null em vez de quebrar o app na abertura.
export const supabase = url && key ? createClient(url, key) : null
