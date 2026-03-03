import Link from "next/link";

import { ONE_PIECE_TITLE, getOnePieceChapterList } from "@/lib/one-piece";

export default function OnePieceChapterListPage() {
  const chapters = getOnePieceChapterList();

  return (
    <main className="chapter-list-page">
      <section className="dashboard-card">
        <p className="badge">{ONE_PIECE_TITLE}</p>
        <h1>Chapter List</h1>
        <p>Choose a chapter to open the full-page scroll reader.</p>
        <div className="actions">
          <Link href="/" className="link-button secondary">
            Back to catalog
          </Link>
        </div>
      </section>

      <section className="chapter-grid">
        {chapters.map((chapter) => (
          <Link
            key={chapter}
            href={`/manga/onepiece/${chapter}`}
            className="chapter-link"
          >
            Chapter {chapter}
          </Link>
        ))}
      </section>
    </main>
  );
}
