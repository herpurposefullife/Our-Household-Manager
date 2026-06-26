import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ddbggapyyffibsjinmwg.supabase.co'
const supabaseKey = 'sb_publishable_ZYuNlxYAAmLOjksng6eNZA_XzCF0axD'

export const supabase = createClient(supabaseUrl, supabaseKey)
