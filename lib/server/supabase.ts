import { createClient } from "@supabase/supabase-js"

function cleanEnv(value: string | undefined) {
  return String(value || "").trim().replace(/^["']|["']$/g, "")
}

function requireEnvValue(name: string, value: string) {
  if (!value) {
    throw new Error(`${name} is missing in .env.local`)
  }

  return value
}

export function getSupabaseConfig() {
  const url = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL
  )

  const serviceRoleKey = cleanEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SUPABASE_SECRET_KEY
  )

  const anonKey = cleanEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY
  )

  const key = serviceRoleKey || anonKey

  requireEnvValue("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL", url)
  requireEnvValue("SUPABASE_SERVICE_ROLE_KEY", key)

  if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/.test(url)) {
    throw new Error(
      "Supabase URL is invalid. It should look like https://your-project-ref.supabase.co"
    )
  }

  if (key.length < 40) {
    throw new Error("Supabase key looks too short. Use the service_role key for admin routes.")
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
    usingServiceRole: Boolean(serviceRoleKey),
  }
}

export function createSupabaseAdminClient() {
  const { url, key } = getSupabaseConfig()

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": "angel-glez-admin",
      },
    },
  })
}
