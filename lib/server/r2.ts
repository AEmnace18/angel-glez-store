import { S3Client } from "@aws-sdk/client-s3"

function cleanEnv(value: string | undefined) {
  return String(value || "").trim().replace(/^["']|["']$/g, "")
}

function requireValue(name: string, value: string) {
  if (!value) {
    throw new Error(`${name} is missing in .env.local`)
  }

  return value
}

function normalizeEndpoint(endpoint: string) {
  const clean = endpoint.replace(/\/$/, "")

  if (!clean) return clean
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean

  return `https://${clean}`
}

export function sanitizeObjectName(value: string) {
  return String(value || "upload")
    .normalize("NFKD")
    .replace(/[^\w.\-()]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180) || "upload"
}

export function getR2Config() {
  const endpoint = normalizeEndpoint(cleanEnv(process.env.R2_ENDPOINT))
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID)
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY)
  const bucketName = cleanEnv(process.env.R2_BUCKET_NAME)

  requireValue("R2_ENDPOINT", endpoint)
  requireValue("R2_ACCESS_KEY_ID", accessKeyId)
  requireValue("R2_SECRET_ACCESS_KEY", secretAccessKey)
  requireValue("R2_BUCKET_NAME", bucketName)

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
  }
}

export function createR2Client() {
  const config = getR2Config()

  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export function requireR2BucketName() {
  return getR2Config().bucketName
}

export function getR2PublicBaseUrl() {
  return cleanEnv(
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
      process.env.R2_PUBLIC_BASE_URL ||
      process.env.R2_PUBLIC_URL
  ).replace(/\/$/, "")
}

export function extractR2ObjectKey(value: string) {
  const raw = String(value || "").trim()
  if (!raw) return ""

  const publicBaseUrl = getR2PublicBaseUrl()

  if (publicBaseUrl && raw.startsWith(publicBaseUrl)) {
    return raw.slice(publicBaseUrl.length).replace(/^\//, "")
  }

  if (!/^https?:\/\//i.test(raw)) {
    return raw.replace(/^\//, "")
  }

  try {
    const url = new URL(raw)
    return decodeURIComponent(url.pathname.replace(/^\//, ""))
  } catch {
    return raw.replace(/^\//, "")
  }
}
