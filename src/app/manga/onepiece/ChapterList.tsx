"use client"
import { useState, useMemo } from "react";
import Link from "next/link";
import { List, Search, ChevronDown } from "lucide-react";
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

  return (
    <section className="rounded-[18px] bg-[var(--surface)] p-4 shadow-[var(--shadow)] md:p-6">
      <div className="mb-4">
        <h2 className="mb-4 text-lg font-bold text-[var(--text)]">
          List of chapters:
        </h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!searchQuery.trim() && chunks.length > 0 && (
            <div className="relative flex items-center gap-2">
              <List className="h-5 w-5 text-[var(--text)]" />
              <Select
                value={selectedChunkIndex.toString()}
                onValueChange={(val) => setSelectedChunkIndex(Number(val))}
              >
                <SelectTrigger className="w-[140px] h-9 border-none bg-[var(--input-bg)]  text-xs font-semibold text-[var(--text)] focus:ring-1 focus:ring-[var(--primary)]">
                  <SelectValue placeholder="Select Episodes" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] text-[var(--text)] border-[var(--border)] rounded-xl shadow-lg">
                  {chunks.map((chunk, index) => {
                    const first = chunk[0];
                    const last = chunk[chunk.length - 1];
                    return (
                      <SelectItem
                        key={index}
                        value={index.toString()}
                        className="cursor-pointer focus:bg-[var(--secondary)] focus:text-[var(--text)]"
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
              <Search className="absolute left-3 h-4 w-4 text-[var(--muted)] pointer-events-none" />
              <Input
                type="text"
                placeholder="Number of Ep"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-full  border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] placeholder:text-[var(--muted)] focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid max-h-[65svh] grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-2 overflow-y-auto pr-1">
        {displayedChapters.map((chapter) => (
          <Link
            key={chapter}
            href={`/manga/onepiece/${chapter}`}
            className="flex min-h-[44px] items-center justify-center rounded-md bg-[var(--secondary)] text-sm font-semibold text-slate-300 transition hover:bg-[var(--secondary-hover)] hover:text-white"
          >
            {chapter}
          </Link>
        ))}
        {displayedChapters.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-[var(--muted)]">
            No episodes found.
          </div>
        )}
      </div>
    </section>
  );
}
