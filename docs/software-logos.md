# Software identity and logos

## Implemented

The task's `systems` list is editable and versioned. Task cards and details render known names with a locally bundled SVG from the pinned `simple-icons` dependency. Current aliases cover Google Sheets, Google Drive, Gmail, SAP and Notion. Unknown names retain their text and use a generic application icon. No remote logo request is made when viewing a task.

The library is https://github.com/simple-icons/simple-icons. It is distributed under CC0 with separate brand/trademark considerations described in its DISCLAIMER.md and per-icon metadata. Marks identify the software only; they do not indicate endorsement or an active integration. Add explicit aliases rather than guessing a vendor from an arbitrary URL.

## Firecrawl research follow-up

Firecrawl supports `formats: ["branding"]` in its scrape API, including logo extraction: https://www.firecrawl.dev/blog/branding-format-v2 and https://docs.firecrawl.dev/features/scrape#extract-brand-identity.

An automatic extraction adapter is not implemented in this release. It requires a server-side Firecrawl key and a controlled ingestion flow: research the vendor's canonical public site, keep provenance, treat extracted branding as untrusted, validate the downloaded asset and store a safe local copy, then map the approved vendor identity to task software. Do not load arbitrary SVG markup into the page, expose the key, or infer a working connector from a discovered logo. Keep an accessible text fallback when extraction fails.
