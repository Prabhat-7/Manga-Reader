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
    <main className="catalog-page">
      <header className="catalog-header">
        <h1 className="app-title">Manga Reader</h1>
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search by manga or writer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </header>

      <section className="manga-card-grid">
        {filteredMangas.map((manga) => (
          <article key={manga.id} className="manga-card">
            <div className="manga-card-content">
              <span className="badge">{manga.title}</span>
              <h2>{manga.title}</h2>
              <p className="writer-name">by {manga.writer}</p>
              <p className="chapter-count">Chapters {manga.chapters}</p>
            </div>
            {manga.link !== "#" ? (
              <Link href={manga.link} className="card-link">
                Open Chapters
              </Link>
            ) : (
              <button className="card-link secondary" disabled>
                Coming Soon
              </button>
            )}
          </article>
        ))}
        {filteredMangas.length === 0 && (
          <div className="no-results">
            <p>No manga found matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </section>
    </main>
  );
}
