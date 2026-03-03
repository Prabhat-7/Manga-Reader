import { type NextRequest } from "next/server";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
];

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const baseUrl = process.env.VOICE_CLONING_BASE_URL;

  if (!baseUrl) {
    return Response.json(
      { error: "VOICE_CLONING_BASE_URL is not configured." },
      { status: 500 },
    );
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const incomingUrl = new URL(request.url);
  const resolvedParams = await context.params;
  const upstreamPath = (resolvedParams.path ?? [])
    .map(encodeURIComponent)
    .join("/");
  const upstreamUrl = new URL(`${cleanBase}/${upstreamPath}`);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));

  const method = request.method.toUpperCase();
  const shouldIncludeBody = !["GET", "HEAD"].includes(method);
  const bodyBuffer = shouldIncludeBody ? await request.arrayBuffer() : undefined;
  const body = bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown voice-cloning proxy error.";
    return Response.json(
      { error: "Could not reach voice-cloning API server.", detail: message },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
