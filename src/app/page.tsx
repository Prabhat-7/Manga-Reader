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
    image: "/card.png",
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
        <h1 className="m-0 text-[1.15rem] font-extrabold uppercase tracking-[2px] text-muted-foreground">
          Manga Reader
        </h1>
        <div className="relative w-full max-w-[540px]">
          <Search
            className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by manga or writer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-card py-4 pl-[52px] pr-5 text-[1.05rem] text-foreground shadow-md outline-none transition focus:border-primary focus:shadow-[0_8px_24px_rgba(20,184,166,0.15)] dark:focus:shadow-[0_8px_24px_rgba(20,184,166,0.08)]"
          />
        </div>
      </header>

      <section className="flex flex-wrap justify-center gap-6">
        {filteredMangas.map((manga) => (
          <article
            key={manga.id}
            className="group relative flex aspect-[2.5/3.5] w-[260px] flex-col items-center justify-center overflow-hidden rounded-[18px] border border-border bg-card shadow-lg transition-transform hover:-translate-y-1"
          >
            {manga.image ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${manga.image})` }}
                />
                <div className="absolute inset-0 bg-black/60 transition-colors group-hover:bg-black/70" />
              </>
            ) : null}
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
                <span
                  className={`inline-block rounded-full px-[10px] py-1 text-[0.8rem] font-bold ${
                    manga.image
                      ? "bg-primary/90 text-primary-foreground"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {manga.title}
                </span>
                <h2
                  className={`m-[8px_0_10px] text-[clamp(1.55rem,3vw,2.1rem)] font-bold ${
                    manga.image ? "text-white" : "text-foreground"
                  }`}
                >
                  {manga.title}
                </h2>
                <p
                  className={`-mt-1.5 text-[0.95rem] font-semibold ${
                    manga.image ? "text-white/90" : "text-primary"
                  }`}
                >
                  by {manga.writer}
                </p>
                <p
                  className={`mt-1 text-[0.85rem] ${
                    manga.image ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  Chapters {manga.chapters}
                </p>
              </div>
              {manga.link !== "#" ? (
                <Link
                  href={manga.link}
                  className="mt-3 inline-flex items-center justify-center rounded-[10px] bg-primary px-[14px] py-[11px] font-bold text-primary-foreground no-underline transition hover:bg-primary/90"
                >
                  Open Chapters
                </Link>
              ) : (
                <button
                  className="mt-3 inline-flex cursor-not-allowed items-center justify-center rounded-[10px] bg-secondary px-[14px] py-[11px] font-bold text-secondary-foreground opacity-70"
                  disabled
                >
                  Coming Soon
                </button>
              )}
            </div>
          </article>
        ))}
        {filteredMangas.length === 0 && (
          <div className="w-full px-6 py-16 text-center text-[1.2rem] text-muted-foreground">
            <p>No manga found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </section>
    </main>
  );
}
