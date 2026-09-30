import { createClient } from '@supabase/supabase-js'

// Замените эти строчки на ваши реальные данные из панели Supabase (Settings -> API)
const SUPABASE_URL = 'https://totggwsnitoqkfcalepq.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_V4gO2jnUzrdAE5ilBtC9BA_l8z4j7Aj'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)