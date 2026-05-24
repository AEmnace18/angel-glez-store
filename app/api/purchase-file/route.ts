import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import JSZip from "jszip"
import mammoth from "mammoth"
import { extractR2ObjectKey } from "@/lib/server/r2"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

type PurchaseProduct = {
  file_name?: string | null
  file_url?: string | null
}

type PurchaseFileRow = {
  status?: string | null
  products?: PurchaseProduct | PurchaseProduct[] | null
}

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

type R2Body = NodeJS.ReadableStream | Blob | { transformToByteArray: () => Promise<Uint8Array> }

function hasByteArrayTransform(stream: R2Body): stream is { transformToByteArray: () => Promise<Uint8Array> } {
  return "transformToByteArray" in stream && typeof stream.transformToByteArray === "function"
}

async function bufferFromStream(stream: R2Body): Promise<Buffer> {
  if (hasByteArrayTransform(stream)) {
    return Buffer.from(await stream.transformToByteArray())
  }

  if (stream instanceof Blob) {
    return Buffer.from(await stream.arrayBuffer())
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

function contentType(name: string) {
  const lower = name.toLowerCase()

  if (/\.png$/i.test(lower)) return "image/png"
  if (/\.(jpg|jpeg)$/i.test(lower)) return "image/jpeg"
  if (/\.gif$/i.test(lower)) return "image/gif"
  if (/\.webp$/i.test(lower)) return "image/webp"
  if (/\.svg$/i.test(lower)) return "image/svg+xml"
  if (/\.pdf$/i.test(lower)) return "application/pdf"
  if (/\.txt$/i.test(lower)) return "text/plain; charset=utf-8"
  if (/\.md$/i.test(lower)) return "text/markdown; charset=utf-8"
  if (/\.html?$/i.test(lower)) return "text/html; charset=utf-8"
  if (/\.json$/i.test(lower)) return "application/json; charset=utf-8"
  if (/\.docx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (/\.doc$/i.test(lower)) return "application/msword"
  if (/\.pptx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  if (/\.ppt$/i.test(lower)) return "application/vnd.ms-powerpoint"
  if (/\.xlsx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (/\.xls$/i.test(lower)) return "application/vnd.ms-excel"
  if (/\.csv$/i.test(lower)) return "text/csv; charset=utf-8"

  return "application/octet-stream"
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function wrapDocxHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background:
        radial-gradient(circle at top left, rgba(139, 92, 246, 0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 24%),
        linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
      color: #0f172a;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .doc-shell { padding: 28px; }
    .doc-paper {
      width: min(100%, 920px);
      margin: 0 auto;
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 28px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .doc-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 24px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
      background: linear-gradient(180deg, rgba(248,250,252,0.98), rgba(255,255,255,0.96));
    }
    .doc-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #7c3aed;
      margin: 0 0 6px;
    }
    .doc-title {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      word-break: break-word;
    }
    .doc-badge {
      border: 1px solid rgba(148, 163, 184, 0.22);
      background: #ffffff;
      color: #475569;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .doc-content {
      padding: 36px 40px 44px;
      line-height: 1.75;
      font-size: 15px;
      color: #1e293b;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    .doc-content h1,.doc-content h2,.doc-content h3,.doc-content h4,.doc-content h5,.doc-content h6 {
      color: #020617;
      line-height: 1.25;
      margin-top: 1.4em;
      margin-bottom: 0.6em;
      font-weight: 800;
    }
    .doc-content h1 { font-size: 2rem; }
    .doc-content h2 { font-size: 1.55rem; }
    .doc-content h3 { font-size: 1.25rem; }
    .doc-content p { margin: 0 0 1em; }
    .doc-content ul,.doc-content ol { margin: 0 0 1.2em 1.25em; padding: 0; }
    .doc-content li { margin: 0.3em 0; }
    .doc-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.25em 0;
      border-radius: 16px;
      overflow: hidden;
      display: block;
      overflow-x: auto;
    }
    .doc-content th,.doc-content td {
      border: 1px solid #e2e8f0;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      min-width: 120px;
    }
    .doc-content th { background: #f8fafc; font-weight: 700; color: #0f172a; }
    .doc-content img { max-width: 100%; height: auto; border-radius: 16px; }
    .doc-content blockquote {
      margin: 1.2em 0;
      padding: 0.9em 1em;
      border-left: 4px solid #8b5cf6;
      background: #faf5ff;
      color: #4c1d95;
      border-radius: 12px;
    }
    .doc-content pre,.doc-content code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .doc-content pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 16px;
      overflow-x: auto;
    }
    @media (max-width: 768px) {
      .doc-shell { padding: 14px; }
      .doc-topbar { padding: 14px 16px; }
      .doc-content { padding: 22px 18px 28px; }
      .doc-badge { display: none; }
    }
  </style>
</head>
<body>
  <div class="doc-shell">
    <div class="doc-paper">
      <div class="doc-topbar">
        <div>
          <p class="doc-kicker">Document Preview</p>
          <h1 class="doc-title">${escapeHtml(title)}</h1>
        </div>
        <div class="doc-badge">DOCX</div>
      </div>
      <div class="doc-content">${bodyHtml || "<p>This document has no readable text preview.</p>"}</div>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const purchaseId = searchParams.get("purchaseId") || ""
    const buyerEmail = searchParams.get("buyerEmail") || ""
    const entryPath = searchParams.get("entryPath") || ""
    const download = searchParams.get("download") === "1"
    const preview = searchParams.get("preview") || ""

    if (!purchaseId || !buyerEmail || !entryPath) {
      return NextResponse.json({ error: "Missing file request data" }, { status: 400 })
    }

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

    const purchase = data as PurchaseFileRow | null
    const product = Array.isArray(purchase?.products) ? purchase?.products[0] : purchase?.products

    if (error || !purchase || purchase.status !== "approved" || !product) {
      return NextResponse.json({ error: "Purchase not approved or not found" }, { status: 403 })
    }

    const fileName = String(product.file_name || "")
    const rawFileUrl = String(product.file_url || "")
    const objectKey = extractR2ObjectKey(rawFileUrl)

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "This product is not a ZIP file" }, { status: 400 })
    }

    if (!objectKey) {
      return NextResponse.json({ error: "ZIP file key is missing" }, { status: 400 })
    }

    const object = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: objectKey,
      })
    )

    if (!object.Body) {
      return NextResponse.json({ error: "ZIP file not found" }, { status: 404 })
    }

    const zipBuffer = await bufferFromStream(object.Body)
    const zip = await JSZip.loadAsync(zipBuffer)
    const entry = zip.file(entryPath)

    if (!entry) {
      return NextResponse.json({ error: "File not found in ZIP" }, { status: 404 })
    }

    const entryBuffer = await entry.async("nodebuffer")
    const outputName = entryPath.split("/").pop() || "file"
    const lowerName = outputName.toLowerCase()

    if (preview === "docx" && /\.docx$/i.test(lowerName)) {
      try {
        const result = await mammoth.convertToHtml({ buffer: entryBuffer })
        const html = wrapDocxHtml(outputName, result.value)
        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
          },
        })
      } catch (docxError) {
        console.error("DOCX PREVIEW ERROR:", docxError)
        return NextResponse.json({ error: "Failed to render DOCX preview" }, { status: 500 })
      }
    }

    const fileBytes = new Uint8Array(entryBuffer)

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType(outputName),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${outputName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("PURCHASE FILE ERROR:", error)
    return NextResponse.json({ error: "Failed to open ZIP file entry" }, { status: 500 })
  }
}
