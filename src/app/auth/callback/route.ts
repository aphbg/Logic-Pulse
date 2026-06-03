import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  // Redirect to onboarding — the client side will handle token exchange
  return NextResponse.redirect(`${origin}/onboarding`)
}
