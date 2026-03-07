import { type NextRequest } from "next/server";

import { ONE_PIECE_TITLE } from "@/lib/one-piece";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RequestBody = {
  imageUrl?: string;
  mangaName?: string;
  chapterNumber?: number;
  pageNumber?: number;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function normalizePanels(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const rawPanels = "panels" in payload ? payload.panels : undefined;
  if (!Array.isArray(rawPanels)) {
    return [];
  }

  return rawPanels
    .map((panel) => {
      if (!panel || typeof panel !== "object") {
        return null;
      }

      const panelIndex = "panel_index" in panel ? panel.panel_index : undefined;
      const panelUrl = "panel_url" in panel ? panel.panel_url : undefined;

      if (!isPositiveInteger(panelIndex) && panelIndex !== 0) {
        return null;
      }

      if (typeof panelUrl !== "string" || panelUrl.length === 0) {
        return null;
      }

      return {
        panelIndex,
        panelUrl,
      };
    })
    .filter((panel) => panel !== null)
    .sort((left, right) => left.panelIndex - right.panelIndex);
}

export async function POST(request: NextRequest) {
  let payload: RequestBody;

  try {
    payload = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.imageUrl) {
    return Response.json({ error: "imageUrl is required." }, { status: 400 });
  }

  const mangaName =
    typeof payload.mangaName === "string" && payload.mangaName.length > 0
      ? payload.mangaName
      : ONE_PIECE_TITLE;

  if (!isPositiveInteger(payload.chapterNumber)) {
    return Response.json(
      { error: "chapterNumber must be a positive integer." },
      { status: 400 },
    );
  }

  if (!isPositiveInteger(payload.pageNumber)) {
    return Response.json(
      { error: "pageNumber must be a positive integer." },
      { status: 400 },
    );
  }

  const pageKey = {
    mangaName,
    chapterNumber: payload.chapterNumber,
    pageNumber: payload.pageNumber,
  };

  const cachedPage = await prisma.page.findUnique({
    where: {
      mangaName_chapterNumber_pageNumber: pageKey,
    },
    include: {
      panels: {
        orderBy: {
          panelIndex: "asc",
        },
      },
    },
  });

  if (cachedPage) {
    return Response.json({
      source: "database",
      mangaName: cachedPage.mangaName,
      chapterNumber: payload.chapterNumber,
      pageNumber: cachedPage.pageNumber,
      panels: cachedPage.panels.map((panel) => ({
        panelIndex: panel.panelIndex,
        panelUrl: panel.panelUrl,
        dialogDescription: panel.dialogDescription,
      })),
    });
  }

  const extractorBaseUrl = process.env.MANGA_PANEL_EXTRACTOR_BASE_URL;
  const secretKey = process.env.SECRET_KEY;

  if (!extractorBaseUrl) {
    return Response.json(
      { error: "MANGA_PANEL_EXTRACTOR_BASE_URL is not configured." },
      { status: 500 },
    );
  }

  if (!secretKey) {
    return Response.json(
      { error: "SECRET_KEY is not configured." },
      { status: 500 },
    );
  }

  const pageImageProxyUrl = new URL(
    "/api/manga/onepiece/page-image",
    request.nextUrl.origin,
  );
  pageImageProxyUrl.searchParams.set("url", payload.imageUrl);

  const upstreamUrl = `${normalizeBaseUrl(extractorBaseUrl)}/extract`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: pageImageProxyUrl.toString(),
        fallback: true,
        split_joint_panels: false,
        mode: "bounding",
        merge: "none",
      }),
      cache: "no-store",
    });

    const contentType = upstreamResponse.headers.get("content-type") ?? "";
    const responsePayload = contentType.includes("application/json")
      ? await upstreamResponse.json()
      : await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      return Response.json(responsePayload, {
        status: upstreamResponse.status,
      });
    }

    const panels = normalizePanels(responsePayload);
    const storedPage = await prisma.page.upsert({
      where: {
        mangaName_chapterNumber_pageNumber: pageKey,
      },
      update: {
        pageUrl: payload.imageUrl,
        panels: {
          deleteMany: {},
          create: panels.map((panel) => ({
            panelIndex: panel.panelIndex,
            panelUrl: panel.panelUrl,
          })),
        },
      },
      create: {
        ...pageKey,
        pageUrl: payload.imageUrl,
        panels: {
          create: panels.map((panel) => ({
            panelIndex: panel.panelIndex,
            panelUrl: panel.panelUrl,
          })),
        },
      },
      include: {
        panels: {
          orderBy: {
            panelIndex: "asc",
          },
        },
      },
    });

    return Response.json({
      source: "extractor",
      mangaName: storedPage.mangaName,
      chapterNumber: payload.chapterNumber,
      pageNumber: storedPage.pageNumber,
      panels: storedPage.panels.map((panel) => ({
        panelIndex: panel.panelIndex,
        panelUrl: panel.panelUrl,
        dialogDescription: panel.dialogDescription,
      })),
      extractorResponse: responsePayload,
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "Unknown manga-panel-extractor request error.";

    return Response.json(
      { error: "Could not reach manga-panel-extractor API server.", detail },
      { status: 502 },
    );
  }
}
