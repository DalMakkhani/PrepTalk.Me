import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward to backend
    const response = await fetch(`${getApiBaseUrl()}/complete_session`, {
      method: 'POST',
      body: formData,
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Complete session API error:', error)
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    )
  }
}
