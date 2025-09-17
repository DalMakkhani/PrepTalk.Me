import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { session_group_id: string } }
) {
  try {
    const session_group_id = params.session_group_id
    
    // Forward to backend
    const response = await fetch(`${getApiBaseUrl()}/session_group/${session_group_id}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Session group details API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session group details' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { session_group_id: string } }
) {
  try {
    const session_group_id = params.session_group_id
    const body = await request.json()
    
    // Forward to backend
    const response = await fetch(`${getApiBaseUrl()}/session_group/${session_group_id}/name`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Update session name API error:', error)
    return NextResponse.json(
      { error: 'Failed to update session name' },
      { status: 500 }
    )
  }
}
