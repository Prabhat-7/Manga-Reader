# Manga Reader Flow and Progress

## Purpose

This document tracks the intended end-to-end flow of the application, the current implementation status in the repository, and the detailed to-do list needed to reach the full product vision.

## Target End-to-End Flow

1. The user opens a manga and clicks the chapter they want to experience.
2. The chapter reader loads the list of page image URLs for that chapter.
3. For the current page, the app sends that page image URL to the manga panel extractor service.
4. The manga panel extractor returns an ordered list of extracted panels for that page.
5. In a later phase, the panel extractor should also return a bounding box for each panel so the UI can highlight the active panel while audio is playing.
6. Each extracted panel is sent to the Docling service to parse visible text and panel content.
7. The parsed panel text and the original panel image are sent to a Gemini structured-output step.
8. Gemini returns a structured response for each panel, including dialogue order, speaker name, dialogue text, narration type, and a short speaking description or emotional cue.
9. The app maps the detected speaker to a stored character profile and voice reference.
10. The app sends the final text plus voice reference to the voice cloning service.
11. The app receives generated audio for each dialogue line or panel.
12. The reader plays audio in sequence while the UI highlights the current panel being recited.
13. The app stores useful metadata such as pages, panels, parsed dialogue, and generated assets so repeated playback does not need to recompute everything.

## Current Progress Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Manga selection UI | Implemented | Home page exists with manga cards and One Piece entry point. |
| Chapter listing UI | Implemented | One Piece chapter list page exists with search, chunking, and navigation. |
| Chapter page viewer | Implemented | Reader page loads chapter images and displays one page per viewport section. |
| Page image discovery | Implemented | One Piece image URL probing and caching are already in place. |
| Backend proxy routing | Implemented | Next.js proxy routes exist for backend, Docling, voice cloning, and manga panel extractor. |
| Manga panel extractor service | Partially integrated | Service code and proxy route exist, but chapter reader does not yet call it automatically. |
| Docling service | Partially integrated | Service and proxy route exist, but panels are not yet being processed through it from the reader flow. |
| Gemini structured analysis | Not started in app flow | No Gemini orchestration route or structured-response pipeline is wired into the reader yet. |
| Voice cloning playback flow | Partially integrated | Voice cloning proxy and service exist, but character-based synthesis and playback are not wired into the reader. |
| Database persistence | Partially implemented | Prisma models for `Page` and `Panel` exist, but the full ingestion pipeline is not connected. |
| Character voice profiles | Not started | No character registry, reference audio library, or speaker-to-voice mapping is implemented. |
| Panel highlight UX | Not started | No bounding-box driven panel highlighting exists in the current reader UI. |
| End-to-end automation | Not started | No single pipeline currently runs page -> panels -> parse -> structure -> voice -> playback. |

## Overall Assessment

The repository already has the frontend skeleton, the chapter reading experience, and the service proxy infrastructure. The core product workflow you described is still mostly in the planning and wiring phase. The project is currently strongest at content browsing and weakest at orchestration, structured analysis, audio generation flow, and playback UX.

## Detailed To-Do List

### Phase 1: Define the contracts between services

- [ ] Finalize the request and response contract for manga panel extraction.
  - Confirm the exact input shape for a page request, especially `image_url`.
  - Confirm the returned fields for each panel, including `panelIndex`, `panelUrl`, `readingOrder`, and future `boundingBox`.
  - Decide whether panel images are returned as hosted URLs, base64 payloads, or file references.

- [ ] Finalize the request and response contract for Docling panel parsing.
  - Decide whether Docling accepts a panel image URL, uploaded file, or raw bytes.
  - Define the normalized parsed output format so the Gemini step always receives predictable text.
  - Decide how parsing errors are represented when a panel contains no readable text.

- [ ] Finalize the Gemini structured output schema.
  - Define the exact JSON schema for dialogue extraction.
  - Include fields such as `character`, `text`, `type`, `description`, and `order`.
  - Decide how to represent unknown speakers, narration, multiple speakers, and sound effects.

- [ ] Finalize the voice cloning input contract.
  - Define how the app chooses a voice profile for a character.
  - Decide whether synthesis happens line-by-line or panel-by-panel.
  - Define the returned audio format, duration metadata, and playback URL strategy.

### Phase 2: Add orchestration for one chapter page

- [ ] Create a server-side or API orchestration layer for the page-processing pipeline.
  - Start with one page at a time instead of full-chapter processing.
  - Sequence the calls as page image -> panel extractor -> Docling -> Gemini -> voice cloning.
  - Return a single normalized payload that the reader UI can consume directly.

- [ ] Introduce a stable typed domain model in the Next.js app.
  - Add shared TypeScript types for `Page`, `Panel`, `DialogueLine`, `CharacterVoice`, and `PlaybackItem`.
  - Use one normalized structure so the UI does not depend on raw service-specific payloads.
  - Keep room for optional fields such as `boundingBox`, `audioUrl`, `confidence`, and `status`.

- [ ] Add retries, timeout handling, and partial-failure behavior.
  - A page should still render even if one service fails.
  - Failed panels should report status in the UI rather than breaking the whole chapter.
  - Decide when to retry automatically and when to fall back to silent reading mode.

### Phase 3: Wire the panel extraction step into the reader

- [ ] Trigger panel extraction from the chapter reader.
  - Detect the currently active page in the viewport.
  - Send that page image URL to `/api/manga-panel-extractor/extract`.
  - Cache results so revisiting the same page does not repeat expensive work.

- [ ] Preserve reading order explicitly.
  - Ensure the extractor response is sorted before downstream processing begins.
  - Validate that the returned order matches visual reading flow expectations.
  - Add guards for missing panel indexes or duplicated order values.

- [ ] Prepare for bounding-box support.
  - Reserve a place in the UI state for panel coordinates.
  - Define a coordinate system compatible with responsive image rendering.
  - Plan the transform needed to convert service coordinates into on-screen overlay positions.

### Phase 4: Process each panel with Docling

- [ ] Build panel-to-Docling integration.
  - Pass each extracted panel to Docling using the agreed input contract.
  - Store the raw parsed output along with the panel metadata.
  - Normalize the text so Gemini receives consistent input.

- [ ] Handle empty or noisy OCR results.
  - Some panels will contain no dialogue or only art.
  - Mark these panels explicitly instead of forcing Gemini to infer text from bad input.
  - Decide whether non-text panels should still receive narration output later.

### Phase 5: Add Gemini structured interpretation

- [ ] Create a Gemini orchestration endpoint or service wrapper.
  - Send both the panel image and the Docling text together.
  - Require strict structured output so the frontend receives predictable JSON.
  - Validate the model output before saving or using it for audio generation.

- [ ] Add structured output validation.
  - Reject malformed response shapes.
  - Fill safe defaults for unknown characters or empty descriptions.
  - Keep raw model output for debugging when parsing fails.

- [ ] Define speaker resolution rules.
  - Match speaker names to canonical character identities.
  - Handle aliases, missing names, and uncertain detections.
  - Decide what happens when a line is narration rather than spoken dialogue.

### Phase 6: Add character voice profiles

- [ ] Design a character voice registry.
  - Store a canonical character name, optional aliases, and a reference audio asset.
  - Decide whether these profiles live in the database, filesystem, or both.
  - Support a default fallback voice for unresolved speakers.

- [ ] Create the initial mapping workflow.
  - When Gemini returns a speaker name, resolve it against the registry.
  - Return a deterministic voice choice so playback is consistent across chapters.
  - Log unresolved names for manual cleanup.

### Phase 7: Generate and play audio

- [ ] Connect dialogue lines to the voice cloning service.
  - Generate audio for each dialogue item or grouped playback unit.
  - Store returned audio URLs or asset identifiers.
  - Keep duration metadata for synchronized playback and panel highlighting.

- [ ] Build the reader playback queue.
  - Play audio in dialogue order.
  - Expose play, pause, resume, replay, and skip controls.
  - Keep the queue stable if the user scrolls while playback is active.

- [ ] Add graceful fallbacks.
  - If audio generation fails, the reader should still show extracted dialogue text.
  - If voice data is missing, use a default narrator voice or silent mode.
  - Make the current failure reason visible in development mode.

### Phase 8: Highlight the active panel while it is being recited

- [ ] Add overlay rendering for panel highlights.
  - Render panel bounding boxes on top of the page image.
  - Keep overlays aligned correctly across mobile and desktop layouts.
  - Support active, upcoming, and completed visual states if useful.

- [ ] Synchronize playback and highlight state.
  - Link the currently playing dialogue line to the related panel.
  - Update highlight state as playback advances.
  - Keep panel focus accurate even if a panel contains multiple dialogue lines.

### Phase 9: Persist and reuse processed results

- [ ] Store processed page metadata in the database.
  - Save the source page URL, chapter reference, and page number.
  - Avoid duplicate rows for the same page.
  - Track when a page was last processed.

- [ ] Store panel-level results in the database.
  - Save `panelIndex`, `panelUrl`, `dialogDescription`, and future bounding-box data.
  - Save audio references when generation is complete.
  - Preserve enough metadata to replay without recomputing every service call.

- [ ] Add cache invalidation rules.
  - Decide when a page should be reprocessed.
  - Support force-refresh during development.
  - Distinguish stable cached results from partial or failed runs.

### Phase 10: Monitoring, QA, and release readiness

- [ ] Add instrumentation and logging across the pipeline.
  - Track latency and failures for each service step.
  - Keep enough context to debug a bad panel or wrong speaker assignment.
  - Make it easy to inspect the raw inputs and outputs for one page.

- [ ] Add test coverage for the pipeline.
  - Unit test schema validation and response normalization.
  - Integration test the orchestration path with mocked services.
  - Add at least one end-to-end happy path for a sample chapter page.

- [ ] Define release criteria for the first usable version.
  - One supported manga and one supported chapter pipeline should work reliably.
  - A page should extract panels, parse dialogue, synthesize audio, and play in order.
  - The UI should remain usable even when one service fails.

## Suggested Milestone Order

1. Lock service contracts.
2. Implement one-page orchestration.
3. Connect panel extraction to the reader.
4. Connect Docling and Gemini.
5. Add character voice mapping.
6. Generate audio and playback.
7. Add bounding-box highlighting.
8. Persist results and add tests.

## Current Practical Definition of Progress

If this repository is used as the source of truth today, the application is currently at the "reader foundation and service scaffolding" stage, not yet at the "automated narrated manga experience" stage.
