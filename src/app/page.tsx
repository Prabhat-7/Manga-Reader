import Link from "next/link";

import {
  ONE_PIECE_CHAPTER_END,
  ONE_PIECE_CHAPTER_START,
  ONE_PIECE_TITLE,
} from "@/lib/one-piece";

export default function HomePage() {
  return (
    <main className="catalog-page">
      <section className="dashboard-card">
        <p className="badge">Manga Reader</p>
        <h1>Manga Catalog</h1>
        <p>Select a title to open its chapter list.</p>
      </section>

      <section className="manga-card-grid">
        <article className="manga-card">
          <p className="badge">{ONE_PIECE_TITLE}</p>
          <h2>{ONE_PIECE_TITLE}</h2>
          <p>
            Chapters {ONE_PIECE_CHAPTER_START} to {ONE_PIECE_CHAPTER_END}
          </p>
          <Link href="/manga/onepiece" className="card-link">
            Open Chapters
          </Link>
        </article>
      </section>
    </main>
  );
}
