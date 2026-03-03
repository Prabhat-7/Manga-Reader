"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import {
  ONE_PIECE_CHAPTER_END,
  ONE_PIECE_CHAPTER_START,
  ONE_PIECE_TITLE,
  ONE_PIECE_SLUG,
} from "@/lib/one-piece";

const MOCK_MANGAS = [
  {
    id: ONE_PIECE_SLUG,
    title: ONE_PIECE_TITLE,
    writer: "Eiichiro Oda",
    chapters: `${ONE_PIECE_CHAPTER_START} - ${ONE_PIECE_CHAPTER_END}`,
    link: `/manga/${ONE_PIECE_SLUG}`,
  },
  {
    id: "naruto",
    title: "Naruto",
    writer: "Masashi Kishimoto",
    chapters: "1 - 700",
    link: "#",
  },
  {
    id: "bleach",
    title: "Bleach",
    writer: "Tite Kubo",
    chapters: "1 - 686",
    link: "#",
  },
  {
    id: "dragonball",
    title: "Dragon Ball",
    writer: "Akira Toriyama",
    chapters: "1 - 519",
    link: "#",
  },
  {
    id: "jujutsukaisen",
    title: "Jujutsu Kaisen",
    writer: "Gege Akutami",
    chapters: "1 - 271",
    link: "#",
  },
  {
    id: "demonslayer",
    title: "Demon Slayer",
    writer: "Koyoharu Gotouge",
    chapters: "1 - 205",
    link: "#",
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMangas = MOCK_MANGAS.filter((manga) => {
    const query = searchQuery.toLowerCase();
    return (
      manga.title.toLowerCase().includes(query) ||
      manga.writer.toLowerCase().includes(query)
    );
  });

  return (
    <main className="mx-auto mb-[54px] mt-9 grid w-[min(1120px,92vw)] gap-[18px] max-[700px]:mb-10 max-[700px]:mt-6">
      <header className="mb-6 flex flex-col items-center gap-5">
        <h1 className="m-0 text-[1.15rem] font-extrabold uppercase tracking-[2px] text-[var(--muted)]">
          Manga Reader
        </h1>
        <div className="relative w-full max-w-[540px]">
          <Search
            className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[var(--muted)]"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by manga or writer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-4 pl-[52px] pr-5 text-[1.05rem] text-[var(--text)] shadow-[var(--shadow)] outline-none transition focus:border-[var(--primary)] focus:shadow-[0_8px_24px_rgba(20,184,166,0.15)] dark:focus:shadow-[0_8px_24px_rgba(20,184,166,0.08)]"
          />
        </div>
      </header>

      <section className="flex flex-wrap justify-center gap-6">
        {filteredMangas.map((manga) => (
          <article
            key={manga.id}
            className="flex aspect-[2.5/3.5] w-[260px] flex-col items-center justify-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow)]"
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
              <span className="inline-block rounded-full bg-[var(--primary-soft)] px-[10px] py-1 text-[0.8rem] font-bold text-[var(--badge-text)]">
                {manga.title}
              </span>
              <h2 className="m-[8px_0_10px] text-[clamp(1.55rem,3vw,2.1rem)] font-bold text-[var(--text)]">
                {manga.title}
              </h2>
              <p className="-mt-1.5 text-[0.95rem] font-semibold text-[var(--primary)]">
                by {manga.writer}
              </p>
              <p className="mt-1 text-[0.85rem] text-[var(--muted)]">
                Chapters {manga.chapters}
              </p>
            </div>
            {manga.link !== "#" ? (
              <Link
                href={manga.link}
                className="inline-flex items-center justify-center rounded-[10px] bg-[var(--primary)] px-[14px] py-[11px] font-bold text-white no-underline transition hover:bg-[var(--primary-hover)]"
              >
                Open Chapters
              </Link>
            ) : (
              <button
                className="inline-flex cursor-not-allowed items-center justify-center rounded-[10px] bg-[var(--secondary)] px-[14px] py-[11px] font-bold text-white opacity-70"
                disabled
              >
                Coming Soon
              </button>
            )}
          </article>
        ))}
        {filteredMangas.length === 0 && (
          <div className="w-full px-6 py-16 text-center text-[1.2rem] text-[var(--muted)]">
            <p>No manga found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </section>
    </main>
  );
}
