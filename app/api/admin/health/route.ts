import { HeadBucketCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/server/admin-auth"
import { createR2Client, getR2Config, requireR2BucketName } from "@/lib/server/r2"
import { createSupabaseAdminClient, getSupabaseConfig } from "@/lib/server/supabase"

export const runtime = "nodejs"

function message(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Unknown error"
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  const result = {
    ok: true,
    supabase: {
      ok: false,
      urlConfigured: false,
      keyConfigured: false,
      usingServiceRole: false,
      message: "",
    },
    r2: {
      ok: false,
      endpointConfigured: false,
      bucketConfigured: false,
      message: "",
    },
  }

  try {
    const config = getSupabaseConfig()
    result.supabase.urlConfigured = true
    result.supabase.keyConfigured = true
    result.supabase.usingServiceRole = config.usingServiceRole

    const supabase = createSupabaseAdminClient()
    const { error, count } = await supabase
      .from("products")
      .select("id", { head: true, count: "exact" })

    if (error) {
      throw new Error(error.message)
    }

    result.supabase.ok = true
    result.supabase.message = `Connected. Products table count: ${count ?? 0}.`
  } catch (error) {
    result.ok = false
    result.supabase.message = message(error)
  }

  try {
    const r2Config = getR2Config()
    result.r2.endpointConfigured = true
    result.r2.bucketConfigured = true

    await createR2Client().send(
      new HeadBucketCommand({
        Bucket: requireR2BucketName(),
      })
    )

    result.r2.ok = true
    result.r2.message = `Connected to bucket: ${r2Config.bucketName}.`
  } catch (error) {
    result.ok = false
    result.r2.message = message(error)
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
