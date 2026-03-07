import Link from "next/link";
import { notFound } from "next/navigation";

import ChapterReaderClient from "./ChapterReaderClient";

import {
  ONE_PIECE_TITLE,
  getOnePieceChapterImages,
  isValidOnePieceChapter,
  parseOnePieceChapter,
} from "@/lib/one-piece";

export const dynamic = "force-dynamic";

type ChapterReaderPageProps = {
  params: Promise<{
    chapter: string;
  }>;
};

export default async function OnePieceChapterReaderPage({
  params,
}: ChapterReaderPageProps) {
  const resolvedParams = await params;
  const chapter = parseOnePieceChapter(resolvedParams.chapter);

  if (chapter === null || !isValidOnePieceChapter(chapter)) {
    notFound();
  }

  const imageUrls = await getOnePieceChapterImages(chapter);

  const prevChapter = chapter > 1 ? chapter - 1 : null;
  const nextChapter = chapter + 1; // Assuming open-ended or handle max chapter if known

  return (
    <main className="w-full">
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-border bg-card px-3 shadow-md sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/manga/onepiece"
            className="text-[1.1rem] font-bold text-card-foreground no-underline"
          >
            {ONE_PIECE_TITLE}
          </Link>
          <span className="flex items-center text-[0.95rem] text-muted-foreground">
            <span className="mr-3 inline-block h-1 w-1 rounded-full bg-muted-foreground" />
            Chapter {chapter}
          </span>
        </div>

        <nav className="flex gap-2" aria-label="Chapter navigation">
          {prevChapter ? (
            <Link
              href={`/manga/onepiece/${prevChapter}`}
              className="inline-flex items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[0.85rem] font-semibold text-foreground no-underline transition hover:border-primary hover:bg-primary/20 hover:text-primary"
            >
              Previous
            </Link>
          ) : (
            <span className="pointer-events-none inline-flex cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[0.85rem] font-semibold text-foreground opacity-50">
              Previous
            </span>
          )}

          <Link
            href={`/manga/onepiece/${nextChapter}`}
            className="inline-flex items-center justify-center rounded-md border border-border bg-muted/50 px-3 py-1.5 text-[0.85rem] font-semibold text-foreground no-underline transition hover:border-primary hover:bg-primary/20 hover:text-primary"
          >
            Next
          </Link>
        </nav>
      </header>

      {imageUrls.length > 0 ? (
        <ChapterReaderClient chapter={chapter} imageUrls={imageUrls} />
      ) : (
        <section className="mx-auto mt-24 w-[min(1120px,92vw)] rounded-[18px] border border-border bg-card p-6 shadow-md">
          <p className="m-0 font-bold text-destructive">
            No pages were detected for this chapter on the host.
          </p>
        </section>
      )}
    </main>
  );
}
