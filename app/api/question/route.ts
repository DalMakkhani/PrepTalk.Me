import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "hr";
  const count = searchParams.get("count") || "1";
  const jobDomain = searchParams.get("jobDomain") || "";

  // Proxy to FastAPI backend
  const backendUrl = `${getApiBaseUrl()}/question/generate?category=${encodeURIComponent(category)}&count=${encodeURIComponent(count)}&job_domain=${encodeURIComponent(jobDomain)}`;
  const backendRes = await fetch(backendUrl);
  if (!backendRes.ok) {
    return NextResponse.json({ error: "Failed to generate question(s) from backend" }, { status: 500 });
  }
  const data = await backendRes.json();
  // Return the questions array as expected by the frontend
  return NextResponse.json({ questions: data.questions || [], category: data.category, generated: data.generated, count: data.count });
}