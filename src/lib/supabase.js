// Conexão com o Supabase. Ainda não é usada: os dados vêm do mock
// (src/lib/config.js, USAR_MOCK). As chaves entram no .env.local na etapa do banco.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...).
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Sem as chaves, fica null em vez de quebrar o app na abertura.
export const supabase = url && key ? createClient(url, key) : null
