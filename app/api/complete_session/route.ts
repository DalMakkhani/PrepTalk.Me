import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward to backend
    const response = await fetch('http://localhost:8000/complete_session', {
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
