import { NextRequest, NextResponse } from 'next/server'

import { getApiBaseUrl } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id parameter is required' },
        { status: 400 }
      )
    }
    
    // Forward to backend
    const response = await fetch(`${getApiBaseUrl()}/session_groups?user_id=${encodeURIComponent(user_id)}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Session groups API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session groups' },
      { status: 500 }
    )
  }
}
