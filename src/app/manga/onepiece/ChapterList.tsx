"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ChapterList({ chapters }: { chapters: number[] | string[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingChapter, setPendingChapter] = useState<string | null>(null);
  const router = useRouter();

  // Total chapters mapping
  // Since we want the latest first overall but the chunks usually go 1-100, 101-200.
  // Wait, let's keep chunks as 1-100, 101-200...
  // The user wants a dropdown with ranges like `1101-1155`.
  
  const CHUNK_SIZE = 100;
  
  // Create ascending array for chunks
  const ascendingChapters = [...chapters].sort((a, b) => Number(a) - Number(b));
  
  const chunks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < ascendingChapters.length; i += CHUNK_SIZE) {
      arr.push(ascendingChapters.slice(i, i + CHUNK_SIZE));
    }
    // Reverse the chunks array so newest chunks are on top
    return arr.reverse();
  }, [ascendingChapters]);

  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);

  // If search query exists, filter all chapters
  // Otherwise, use the selected chunk
  
  const displayedChapters = useMemo(() => {
    if (searchQuery.trim()) {
      return ascendingChapters
        .filter((ch) => ch.toString().includes(searchQuery.trim()))
        .reverse(); // show latest matched first
    }
    
    // Default: return the currently selected chunk (also reversed to show newest first?
    // In the image, episodes flow left to right: 1101, 1102, 1103... so ascending within the chunk)
    return chunks.length > 0 ? chunks[selectedChunkIndex] : [];
  }, [searchQuery, chunks, selectedChunkIndex, ascendingChapters]);

  const isNavigationPending = pendingChapter !== null;

  return (
    <section className="rounded-[18px] bg-card p-4 shadow-md md:p-6">
      <div className="mb-4">
        <h2 className="mb-4 text-lg font-bold text-card-foreground">
          List of chapters:
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!searchQuery.trim() && chunks.length > 0 && (
            <div className="relative flex items-center gap-2">
              <List className="h-5 w-5 text-foreground" />
              <Select
                value={selectedChunkIndex.toString()}
                onValueChange={(val) => setSelectedChunkIndex(Number(val))}
              >
                <SelectTrigger className="w-[140px] h-9 border-none bg-background  text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Select Episodes" />
                </SelectTrigger>
                <SelectContent className="bg-card text-card-foreground border-border rounded-xl shadow-lg">
                  {chunks.map((chunk, index) => {
                    const first = chunk[0];
                    const last = chunk[chunk.length - 1];
                    return (
                      <SelectItem
                        key={index}
                        value={index.toString()}
                        className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                      >
                        EPS: {first}-{last}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative w-full sm:w-[260px] mt-2 sm:mt-0">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Chapter No."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-full  border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {isNavigationPending && (
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-primary" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Opening chapter {pendingChapter}...
        </p>
      )}

      <div
        className="grid max-h-[65svh] grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 overflow-y-auto pr-1"
        aria-busy={isNavigationPending}
      >
        {displayedChapters.map((chapter) => {
          const chapterValue = chapter.toString();
          const chapterHref = `/manga/onepiece/${chapterValue}`;
          const isCurrentPendingChapter = pendingChapter === chapterValue;

          return (
            <Link
              key={chapter}
              href={chapterHref}
              onMouseEnter={() => router.prefetch(chapterHref)}
              onFocus={() => router.prefetch(chapterHref)}
              onClick={(event) => {
                if (
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                event.preventDefault();
                if (isNavigationPending) {
                  return;
                }

                setPendingChapter(chapterValue);
                router.push(chapterHref);
              }}
              className={`flex min-h-[44px] items-center justify-center rounded-md text-sm font-semibold transition ${
                isCurrentPendingChapter
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground"
              } ${isNavigationPending ? "pointer-events-none opacity-85" : ""}`}
            >
              {isCurrentPendingChapter ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading
                </span>
              ) : (
                chapter
              )}
            </Link>
          );
        })}
        {displayedChapters.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No episodes found.
          </div>
        )}
      </div>
    </section>
  );
}
