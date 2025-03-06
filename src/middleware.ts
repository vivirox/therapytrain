import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateSessionId } from "@/lib/validation";

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  try {
    // Extract session ID from URL if present
    const sessionIdMatch =
      request.nextUrl.pathname.match(/\/sessions\/([^\/]+)/);
    if (sessionIdMatch) {
      const sessionId = sessionIdMatch[1];
      validateSessionId(sessionId);
    }

    // Validate path for traversal attempts
    if (request.nextUrl.pathname.includes("..")) {
      throw new Error("Invalid path");
    }

    return NextResponse.next();
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        error: "Invalid request",
        message: error instanceof Error ? error.message : "Validation failed",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

export const config = {
  matcher: "/api/:path*",
};
