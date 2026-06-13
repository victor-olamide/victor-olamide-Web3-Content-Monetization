# Content Preview Generation Service — Issue #198

## Overview

The preview generation service automatically creates free, gated-free previews for all content types:

| Content Type | Preview Format | Duration/Size |
|---|---|---|
| Video | First N seconds slice (MP4) | 30 seconds (configurable) |
| Audio | First N seconds slice (MP3) | 30 seconds (configurable) |
| Document (PDF/DOCX) | First 64 KB binary chunk | 1 page equivalent |
| Article (text/HTML) | First 50 lines | 1 page equivalent |
| Image | Full image capped at max size | up to 50 MB |

## Architecture

```
POST /api/preview/:contentId/generate
        │
        ▼
previewService.generateAndStorePreview()
        │
        ├─ video  → generateVideoPreview()   ─┐
        ├─ audio  → generateAudioPreview()    ├─► uploadFileToIPFS() → previewCid
        ├─ image  → generateImagePreview()    ┘
        └─ doc    → generateDocumentPreview()
                │
                ▼
        ContentPreview.findOneAndUpdate({ upsert: true })
          • previewCid  (separate from full-content CID)
          • generationStatus: 'completed'
          • generatedAt: <timestamp>
```

## Public Preview Endpoints (no access check)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/preview/:contentId` | Get preview metadata and view count |
| `GET` | `/api/preview/:contentId/serve` | Get previewCid + gateway URL (immutable cache) |
| `GET` | `/api/preview/cid/:cid` | Look up preview by CID (immutable cache) |

### serve endpoint response
```json
{
  "success": true,
  "data": {
    "contentId": 42,
    "contentType": "video",
    "previewCid": "QmXxx...",
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXxx...",
    "trailerDuration": 30
  }
}
```

## Creator Endpoints (auth required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/preview/:contentId/generate` | Upload file → generate + store preview CID |
| `POST` | `/api/preview/:contentId/thumbnail` | Upload thumbnail image |
| `POST` | `/api/preview/:contentId/trailer` | Upload custom trailer |
| `PATCH` | `/api/preview/:contentId/visibility` | Enable/disable preview |
| `DELETE` | `/api/preview/:contentId` | Delete preview record |

## Environment Variables

```env
PREVIEW_VIDEO_SECONDS=30          # Preview duration for video/audio
PREVIEW_AUDIO_SECONDS=30
PREVIEW_DOCUMENT_PAGES=1          # Pages included in document preview
PREVIEW_MAX_SIZE_BYTES=52428800   # Max size of preview upload (50 MB)
IPFS_GATEWAY_URL=https://gateway.pinata.cloud
```

## CID Storage

Each generated preview receives its own IPFS CID stored in `ContentPreview.previewCid`, completely separate from the full content CID. This allows:

- Public serving without access checks
- Immutable HTTP caching (`Cache-Control: public, max-age=86400, immutable`)
- CID-based lookup via `GET /api/preview/cid/:cid`

## Cleanup

`previewCleanupService.runCleanup()` identifies ContentPreview records whose parent Content has been deleted, unpins the CID from IPFS, and removes the orphaned DB record.
