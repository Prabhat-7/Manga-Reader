import { type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";

import {
  getOnePieceImageRequestHeaders,
  getOnePieceChapterImages,
  isValidOnePieceChapter,
  parseOnePieceChapter,
} from "@/lib/one-piece";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    chapter: string;
  }>;
};

async function fetchImageBytes(imageUrl: string): Promise<Uint8Array> {
  const response = await fetch(imageUrl, {
    cache: "no-store",
    headers: getOnePieceImageRequestHeaders(imageUrl),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image ${imageUrl} (${response.status})`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const chapter = parseOnePieceChapter(resolvedParams.chapter);

  if (chapter === null || !isValidOnePieceChapter(chapter)) {
    return Response.json(
      { error: "Invalid chapter. Chapter must be between 1 and 1175." },
      { status: 400 },
    );
  }

  const imageUrls = await getOnePieceChapterImages(chapter);
  if (imageUrls.length === 0) {
    return Response.json(
      { error: "No pages found for this chapter." },
      { status: 404 },
    );
  }

  const pdf = await PDFDocument.create();

  for (const imageUrl of imageUrls) {
    try {
      const bytes = await fetchImageBytes(imageUrl);
      const embeddedImage = imageUrl.toLowerCase().endsWith(".png")
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const page = pdf.addPage([embeddedImage.width, embeddedImage.height]);

      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: embeddedImage.width,
        height: embeddedImage.height,
      });
    } catch {
      continue;
    }
  }

  if (pdf.getPageCount() === 0) {
    return Response.json(
      { error: "Could not build PDF from chapter pages." },
      { status: 502 },
    );
  }

  const pdfBytes = await pdf.save();
  const pdfBinary = new Uint8Array(pdfBytes.length);
  pdfBinary.set(pdfBytes);

  return new Response(pdfBinary, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="one-piece-chapter-${chapter}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
