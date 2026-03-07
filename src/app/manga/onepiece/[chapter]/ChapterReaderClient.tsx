"use client";

import { useEffect, useRef, useState } from "react";

import { ONE_PIECE_TITLE } from "@/lib/one-piece";

type ChapterReaderClientProps = {
  chapter: number;
  imageUrls: string[];
};

type PagePanelsResponse = {
  source: "database" | "extractor";
  panels: Array<{
    panelIndex: number;
    panelUrl: string;
    dialogDescription?: unknown;
  }>;
};

function isPagePanelsResponse(payload: unknown): payload is PagePanelsResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (!("source" in payload) || !("panels" in payload)) {
    return false;
  }

  return Array.isArray(payload.panels);
}

export default function ChapterReaderClient({
  chapter,
  imageUrls,
}: ChapterReaderClientProps) {
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const visibilityByPageRef = useRef(new Map<number, number>());
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) {
      return;
    }

    const pages = Array.from(
      root.querySelectorAll<HTMLElement>("[data-page-index]"),
    );
    if (pages.length === 0) {
      return;
    }

    visibilityByPageRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageIndex = Number(
            (entry.target as HTMLElement).dataset.pageIndex ?? "-1",
          );
          if (pageIndex < 0) {
            return;
          }

          visibilityByPageRef.current.set(
            pageIndex,
            entry.isIntersecting ? entry.intersectionRatio : 0,
          );
        });

        let nextActivePageIndex: number | null = null;
        let bestRatio = 0;

        visibilityByPageRef.current.forEach((ratio, pageIndex) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            nextActivePageIndex = pageIndex;
          }
        });

        if (bestRatio > 0) {
          setActivePageIndex((currentPageIndex) =>
            currentPageIndex === nextActivePageIndex
              ? currentPageIndex
              : nextActivePageIndex,
          );
        }
      },
      {
        root,
        threshold: [0.25, 0.5, 0.75],
      },
    );

    pages.forEach((page) => observer.observe(page));

    return () => observer.disconnect();
  }, [imageUrls]);

  useEffect(() => {
    if (activePageIndex === null) {
      return;
    }

    const activeImageUrl = imageUrls[activePageIndex];
    if (!activeImageUrl) {
      return;
    }

    const controller = new AbortController();
    const requestPanelExtraction = async (
      imageUrl: string,
      signal: AbortSignal,
    ) => {
      const response = await fetch("/api/manga-panel-extractor/extract-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          mangaName: ONE_PIECE_TITLE,
          chapterNumber: chapter,
          pageNumber: activePageIndex + 1,
        }),
        cache: "no-store",
        signal,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json()) as unknown)
        : await response.text();

      if (!response.ok) {
        throw new Error(
          typeof payload === "string"
            ? payload
            : payload &&
                typeof payload === "object" &&
                "error" in payload &&
                typeof payload.error === "string"
              ? payload.error
              : "Panel extraction request failed.",
        );
      }

      if (!isPagePanelsResponse(payload)) {
        throw new Error("Panel extraction returned an unexpected response.");
      }

      console.log(`[Panels][${payload.source}]`, payload.panels);
    };

    requestPanelExtraction(activeImageUrl, controller.signal).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("[Manga Panel Extractor]", error);
    });

    return () => controller.abort();
  }, [activePageIndex, imageUrls]);

  return (
    <section
      ref={scrollContainerRef}
      className="h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-background pt-[60px] scroll-pt-[60px]"
      aria-label={`Chapter ${chapter} pages`}
    >
      {imageUrls.map((imageUrl, index) => (
        <figure
          key={imageUrl}
          data-page-index={index}
          className="m-0 flex min-h-[calc(100svh-60px)] snap-start snap-always flex-col items-center justify-center p-2 sm:p-[14px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`One Piece chapter ${chapter} page ${index + 1}`}
            className="block h-auto max-h-[calc(100svh-100px)] w-auto max-w-full rounded-[10px] shadow-[0_14px_36px_rgba(0,0,0,0.35)] sm:max-h-[calc(100svh-110px)]"
          />
          <figcaption className="mt-2 text-[0.9rem] font-semibold text-muted-foreground">
            Page {index + 1}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
