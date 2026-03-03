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
    <main className="chapter-reader-page">
      <header className="reader-header">
        <div className="reader-header-info">
          <Link href="/manga/onepiece" className="reader-header-title">
            {ONE_PIECE_TITLE}
          </Link>
          <span className="reader-header-chapter">Chapter {chapter}</span>
        </div>
        
        <nav className="reader-nav" aria-label="Chapter navigation">
          {prevChapter ? (
            <Link 
              href={`/manga/onepiece/${prevChapter}`} 
              className="reader-nav-button"
            >
              Previous
            </Link>
          ) : (
            <span className="reader-nav-button disabled">Previous</span>
          )}
          
          <Link 
            href={`/manga/onepiece/${nextChapter}`} 
            className="reader-nav-button"
          >
            Next
          </Link>
        </nav>
      </header>

      {imageUrls.length > 0 ? (
        <section className="reader-scroll-area" aria-label={`Chapter ${chapter} pages`}>
          {imageUrls.map((imageUrl, index) => (
            <figure key={imageUrl} className="reader-page">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={`One Piece chapter ${chapter} page ${index + 1}`} />
              <figcaption>Page {index + 1}</figcaption>
            </figure>
          ))}
        </section>
      ) : (
        <section className="dashboard-card">
          <p className="error-line">
            No pages were detected for this chapter on the host.
          </p>
        </section>
      )}
    </main>
  );
}
