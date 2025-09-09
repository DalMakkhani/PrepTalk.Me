// This API route is no longer needed for file uploads. Kept for reference or future non-file proxying.
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: "This route is deprecated. Please POST audio directly to the FastAPI backend at http://localhost:8000/analyze_interview."
  }, { status: 410 })
}
