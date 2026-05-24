import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const ADMIN_COOKIE_NAME = "angel-glez-admin-session"
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

type AdminSessionPayload = {
  iat: number
  exp: number
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function getAdminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD

  if (secret) return secret
  if (process.env.NODE_ENV !== "production") return "angel-glez-dev-admin-session-secret"

  return null
}

export function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD
  if (process.env.NODE_ENV !== "production") return "angeladmin123"

  return null
}

function signPayload(payload: string) {
  const secret = getAdminSecret()

  if (!secret) {
    throw new Error("Missing admin session secret")
  }

  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createAdminSessionToken() {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminSessionPayload = {
    iat: now,
    exp: now + ADMIN_SESSION_MAX_AGE_SECONDS,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  return `${encodedPayload}.${signPayload(encodedPayload)}`
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token) return false

  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return false

  try {
    const expectedSignature = signPayload(encodedPayload)
    const provided = Buffer.from(signature)
    const expected = Buffer.from(expectedSignature)

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return false
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload
    const now = Math.floor(Date.now() / 1000)

    return Boolean(payload.exp && payload.exp > now)
  } catch {
    return false
  }
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies()

  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value)
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Admin authentication required" }, { status: 401 })
}
