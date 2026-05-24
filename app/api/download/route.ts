import { NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createR2Client, extractR2ObjectKey, requireR2BucketName } from "@/lib/server/r2"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const purchaseId = String(body.purchaseId || "")
    const buyerEmail = String(body.buyerEmail || "").trim().toLowerCase()

    if (!purchaseId || !buyerEmail) {
      return NextResponse.json({ error: "Missing purchase info" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        status,
        buyer_email,
        products (
          file_name,
          file_url
        )
      `)
      .eq("id", purchaseId)
      .eq("buyer_email", buyerEmail)
      .single()

    if (error || !data || data.status !== "approved" || !data.products) {
      return NextResponse.json({ error: "Purchase not approved or not found" }, { status: 403 })
    }

    const product = Array.isArray(data.products) ? data.products[0] : data.products
    const fileName = String(product?.file_name || "download")
    const objectKey = extractR2ObjectKey(String(product?.file_url || ""))

    if (!objectKey) {
      return NextResponse.json({ error: "Product file is not connected" }, { status: 404 })
    }

    const command = new GetObjectCommand({
      Bucket: requireR2BucketName(),
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    })

    const downloadUrl = await getSignedUrl(createR2Client(), command, { expiresIn: 60 * 5 })

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error)
    return NextResponse.json({ error: "Failed to prepare download" }, { status: 500 })
  }
}
