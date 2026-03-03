const REQUEST_HEADERS = new Headers({
  referer: "https://scans-hot.planeptune.us/manga/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
});

const PAGE_SCAN_LIMIT = 80;
const MAX_INITIAL_MISSES = 5;
const MAX_TRAILING_MISSES = 2;

const imageProbeCache = new Map<string, boolean>();
const chapterImageCache = new Map<number, string[]>();

export const ONE_PIECE_TITLE = "One Piece";
export const ONE_PIECE_SLUG = "onepiece";
export const ONE_PIECE_CHAPTER_START = 1;
export const ONE_PIECE_CHAPTER_END = 1175;

function asPositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function probeImage(url: string): Promise<boolean> {
  const cached = imageProbeCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  let exists = false;

  try {
    const headResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      headers: REQUEST_HEADERS,
    });

    if (headResponse.ok) {
      exists = true;
    } else if (headResponse.status === 405 || headResponse.status === 501) {
      const getHeaders = new Headers(REQUEST_HEADERS);
      getHeaders.set("range", "bytes=0-0");

      const getResponse = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: getHeaders,
      });
      exists = getResponse.ok || getResponse.status === 206;
    }
  } catch {
    exists = false;
  }

  imageProbeCache.set(url, exists);
  return exists;
}

export function parseOnePieceChapter(value: string): number | null {
  return asPositiveInteger(value);
}

export function isValidOnePieceChapter(chapter: number): boolean {
  return (
    Number.isInteger(chapter) &&
    chapter >= ONE_PIECE_CHAPTER_START &&
    chapter <= ONE_PIECE_CHAPTER_END
  );
}

export function buildOnePieceImageUrl(chapter: number, page: number): string {
  return `https://scans-hot.planeptune.us/manga/One-Piece/${chapter}-${String(page).padStart(3, "0")}.png`;
}

export function getOnePieceChapterList(): number[] {
  return Array.from(
    { length: ONE_PIECE_CHAPTER_END - ONE_PIECE_CHAPTER_START + 1 },
    (_, index) => index + ONE_PIECE_CHAPTER_START,
  );
}

export async function getOnePieceChapterImages(chapter: number): Promise<string[]> {
  if (!isValidOnePieceChapter(chapter)) {
    return [];
  }

  const cached = chapterImageCache.get(chapter);
  if (cached) {
    return cached;
  }

  const images: string[] = [];
  let initialMisses = 0;
  let trailingMisses = 0;

  for (let pageNumber = 1; pageNumber <= PAGE_SCAN_LIMIT; pageNumber += 1) {
    const imageUrl = buildOnePieceImageUrl(chapter, pageNumber);
    const exists = await probeImage(imageUrl);

    if (exists) {
      images.push(imageUrl);
      trailingMisses = 0;
      continue;
    }

    if (images.length === 0) {
      initialMisses += 1;
      if (initialMisses >= MAX_INITIAL_MISSES) {
        break;
      }
      continue;
    }

    trailingMisses += 1;
    if (trailingMisses >= MAX_TRAILING_MISSES) {
      break;
    }
  }

  chapterImageCache.set(chapter, images);
  return images;
}
