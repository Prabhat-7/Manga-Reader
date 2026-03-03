import Link from "next/link";
import { ONE_PIECE_TITLE, getOnePieceChapterList } from "@/lib/one-piece";
import ChapterList from "./ChapterList";

export default function OnePieceChapterListPage() {
  const chapters = getOnePieceChapterList();

  // Reverse chapters so the latest is first
  const reversedChapters = [...chapters].reverse();

  return (
    <main className="mx-auto mb-[54px] mt-9 grid w-[96vw] max-w-[1800px] px-2 gap-[18px] max-[700px]:mb-10 max-[700px]:mt-6">
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <ChapterList chapters={chapters} />

        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6 shadow-[var(--shadow)]">
          <div className="mb-6">
            <div
              className="relative h-64 overflow-hidden rounded-[14px] bg-cover bg-center bg-no-repeat md:h-80"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=1200&q=80")',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.35)]">
                  ▶
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 md:flex-row">
            <div className="w-full md:max-w-[220px] md:flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80"
                alt="One Piece Cover"
                className="block h-auto w-full rounded-[14px] border border-[var(--border)] shadow-[0_12px_30px_rgba(2,6,23,0.35)]"
              />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-900/35 dark:text-amber-100">
                  PG-13
                </span>
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-900 dark:bg-sky-900/35 dark:text-sky-100">
                  HD
                </span>
                <span className="inline-flex rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--badge-text)]">
                  CC {chapters.length}
                </span>
                <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                  Manga
                </span>
              </div>

              <h1 className="m-0 text-[clamp(1.7rem,3.2vw,2.35rem)] font-bold leading-tight text-[var(--text)]">
                {ONE_PIECE_TITLE}
              </h1>

              <p className="m-0 max-w-[68ch] leading-relaxed text-[var(--muted)]">
                Gold Roger was known as the &quot;Pirate King,&quot; the
                strongest and most
                infamous being to have sailed the Grand Line. The capture and
                execution of Roger by the World Government brought a change
                throughout the world. His last words before his death revealed
                the existence of the greatest
                treasure in the world, One Piece.
              </p>

              <div className="mt-1 flex flex-wrap gap-2.5">
                <Link
                  href={`/manga/onepiece/${reversedChapters[0]}`}
                  className="inline-flex items-center justify-center rounded-[10px] bg-[var(--primary)] px-4 py-[11px] font-bold text-white no-underline transition hover:bg-[var(--primary-hover)]"
                >
                  Read Latest
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
