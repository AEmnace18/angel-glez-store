import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://cgaowpdmkqfirrneoxfx.supabase.co"
const supabaseAnonKey = "sb_publishable_qgDDBk3LF5WWujx5sOmfNQ_Y9BDa4eR"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)