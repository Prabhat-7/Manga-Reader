import Link from "next/link";
import { notFound } from "next/navigation";

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
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/manga/onepiece"
            className="text-[1.1rem] font-bold text-[var(--text)] no-underline"
          >
            {ONE_PIECE_TITLE}
          </Link>
          <span className="flex items-center text-[0.95rem] text-[var(--muted)]">
            <span className="mr-3 inline-block h-1 w-1 rounded-full bg-[var(--muted)]" />
            Chapter {chapter}
          </span>
        </div>

        <nav className="flex gap-2" aria-label="Chapter navigation">
          {prevChapter ? (
            <Link
              href={`/manga/onepiece/${prevChapter}`}
              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-mid)] px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--text)] no-underline transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              Previous
            </Link>
          ) : (
            <span className="pointer-events-none inline-flex cursor-not-allowed items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-mid)] px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--text)] opacity-50">
              Previous
            </span>
          )}

          <Link
            href={`/manga/onepiece/${nextChapter}`}
            className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-mid)] px-3 py-1.5 text-[0.85rem] font-semibold text-[var(--text)] no-underline transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          >
            Next
          </Link>
        </nav>
      </header>

      {imageUrls.length > 0 ? (
        <section
          className="h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-[var(--bg-mid)] pt-[60px]"
          aria-label={`Chapter ${chapter} pages`}
        >
          {imageUrls.map((imageUrl, index) => (
            <figure
              key={imageUrl}
              className="m-0 flex min-h-[100svh] snap-start snap-always flex-col items-center justify-center p-2 sm:p-[14px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`One Piece chapter ${chapter} page ${index + 1}`}
                className="block h-auto max-h-[calc(100svh-56px)] w-auto max-w-full rounded-[10px] shadow-[0_14px_36px_rgba(0,0,0,0.35)] sm:max-h-[calc(100svh-64px)]"
              />
              <figcaption className="mt-2 text-[0.9rem] font-semibold text-slate-300">
                Page {index + 1}
              </figcaption>
            </figure>
          ))}
        </section>
      ) : (
        <section className="mx-auto mt-24 w-[min(1120px,92vw)] rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <p className="m-0 font-bold text-[var(--danger)]">
            No pages were detected for this chapter on the host.
          </p>
        </section>
      )}
    </main>
  );
}
