const DEFAULT_REFERER = "https://scans-hot.planeptune.us/manga/";
const SCANS_HOST = "scans-hot.planeptune.us";
const HOT_HOST = "hot.planeptune.us";
const CHAPTER_SPLIT_FOR_HOST_PRIORITY = 1100;

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
    const requestHeaders = getOnePieceImageRequestHeaders(url);
    const headResponse = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      headers: requestHeaders,
    });

    if (headResponse.ok) {
      exists = true;
    } else if (headResponse.status === 405 || headResponse.status === 501) {
      const getHeaders = new Headers(requestHeaders);
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

export function buildLegacyOnePieceImageUrl(chapter: number, page: number): string {
  return `https://hot.planeptune.us/manga/One-Piece/${String(chapter).padStart(4, "0")}-${String(page).padStart(3, "0")}.png`;
}

export function getOnePieceImageRequestHeaders(imageUrl: string): Headers {
  let referer = DEFAULT_REFERER;

  try {
    const { host } = new URL(imageUrl);
    if (host === HOT_HOST) {
      referer = "https://hot.planeptune.us/manga/";
    } else if (host === SCANS_HOST) {
      referer = "https://scans-hot.planeptune.us/manga/";
    }
  } catch {
    referer = DEFAULT_REFERER;
  }

  return new Headers({
    referer,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  });
}

function getOnePieceImageCandidates(chapter: number, page: number): string[] {
  const legacyUrl = buildLegacyOnePieceImageUrl(chapter, page);
  const currentUrl = buildOnePieceImageUrl(chapter, page);

  if (chapter <= CHAPTER_SPLIT_FOR_HOST_PRIORITY) {
    return [legacyUrl, currentUrl];
  }

  return [currentUrl, legacyUrl];
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
    const candidates = getOnePieceImageCandidates(chapter, pageNumber);
    let imageUrl: string | null = null;

    for (const candidate of candidates) {
      const exists = await probeImage(candidate);
      if (exists) {
        imageUrl = candidate;
        break;
      }
    }

    if (imageUrl) {
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
