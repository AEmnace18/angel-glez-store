import { NextResponse } from "next/server"
import {
  clearAdminSessionCookie,
  createAdminSessionToken,
  getAdminPassword,
  isAdminAuthenticated,
  setAdminSessionCookie,
} from "@/lib/server/admin-auth"

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminAuthenticated() })
}

export async function POST(req: Request) {
  try {
    const configuredPassword = getAdminPassword()

    if (!configuredPassword) {
      return NextResponse.json(
        { error: "Admin password is not configured" },
        { status: 500 }
      )
    }

    const { password } = await req.json()

    if (String(password || "") !== configuredPassword) {
      return NextResponse.json({ error: "Wrong admin password" }, { status: 401 })
    }

    const response = NextResponse.json({ authenticated: true })
    setAdminSessionCookie(response, createAdminSessionToken())

    return response
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error)
    return NextResponse.json({ error: "Failed to log in" }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  clearAdminSessionCookie(response)

  return response
}
