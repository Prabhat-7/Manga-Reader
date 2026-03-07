import { type NextRequest } from "next/server";

import { getOnePieceImageRequestHeaders } from "@/lib/one-piece";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return Response.json({ error: "url is required." }, { status: 400 });
  }

  try {
    const upstreamResponse = await fetch(imageUrl, {
      cache: "no-store",
      headers: getOnePieceImageRequestHeaders(imageUrl),
    });

    if (!upstreamResponse.ok) {
      return Response.json(
        {
          error: "Failed to fetch page image.",
          status: upstreamResponse.status,
        },
        { status: 502 },
      );
    }

    const responseHeaders = new Headers();
    const contentType = upstreamResponse.headers.get("content-type");
    const cacheControl = upstreamResponse.headers.get("cache-control");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    if (cacheControl) {
      responseHeaders.set("cache-control", cacheControl);
    } else {
      responseHeaders.set("cache-control", "no-store");
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown page image proxy error.";

    return Response.json(
      { error: "Could not fetch the requested page image.", detail },
      { status: 502 },
    );
  }
}
