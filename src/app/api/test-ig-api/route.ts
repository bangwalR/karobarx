import { NextRequest, NextResponse } from "next/server";

// Simple test to call the Instagram conversations API and return the result
export async function GET(req: NextRequest) {
  try {
    // Get the base URL from the request
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    
    // Call the Instagram conversations API
    const response = await fetch(`${baseUrl}/api/social/instagram/conversations`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      apiResponse: data,
      conversationsCount: data.conversations?.length || 0,
      firstConversation: data.conversations?.[0] || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: msg,
    });
  }
}
