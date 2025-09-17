import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user'

    // Call Python backend to get profile
    const pyRes = await fetch(`${getApiBaseUrl()}/profile/${userId}`, {
      method: 'GET',
    })

    if (pyRes.ok) {
      const profile = await pyRes.json()
      return NextResponse.json(profile)
    } else {
      // Return default profile if not found
      return NextResponse.json({
        userId: userId,
        name: '',
        email: '',
        phone: '',
        location: '',
        jobTitle: '',
        company: '',
        experience: '',
        education: '',
        skills: [],
        about: '',
        targetRole: '',
        industry: ''
      })
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await request.json()

    // Call Python backend to save profile
    const pyRes = await fetch(`${getApiBaseUrl()}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    })

    if (pyRes.ok) {
      const result = await pyRes.json()
      return NextResponse.json(result)
    } else {
      throw new Error(`Backend responded with status: ${pyRes.status}`)
    }
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}
