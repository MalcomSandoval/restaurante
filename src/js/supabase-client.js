// =====================================================
// SUPABASE CLIENT - Conexión a base de datos
// Con fallback a localStorage para demo sin configurar
// =====================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const IS_DEMO_MODE = !SUPABASE_URL || SUPABASE_URL === 'your_supabase_url_here'

let supabase = null

if (!IS_DEMO_MODE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
  })
}

export { supabase }
export default supabase
