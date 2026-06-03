import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  // Just redirect to onboarding — Supabase handles the verify endpoint directly
  return NextResponse.redirect(`${origin}/onboarding`)
}
