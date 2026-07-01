---
type: Guide
title: CivitAI REST API Reference
description: Reference documentation for the CivitAI REST API endpoints used by Sage Utils.
tags: [okf, docs, api, civitai]
resource: docs/ref_docs/civitai_api.md
timestamp: 2026-07-01T00:00:00Z
---

# CivitAI REST API Reference

This guide captures the CivitAI REST API endpoints and request/response fields referenced by Sage Utils.

## Base URL

```text
https://civitai.com/api/v1
```

## Authentication

Use an API key from [CivitAI User Account Settings](https://civitai.com/user/account).

### Authorization header

```http
GET https://civitai.com/api/v1/models
Content-Type: application/json
Authorization: Bearer {api_key}
```

### Query string

```http
GET https://civitai.com/api/v1/models?token={api_key}
Content-Type: application/json
```

## API endpoints

### Creators

#### GET /api/v1/creators

Get a list of creators.

**Endpoint:** `https://civitai.com/api/v1/creators`

**Query parameters:**

- `limit` (optional, number) — results per page (0-200, default: 20). Set to `0` for all creators.
- `page` (optional, number) — page number.
- `query` (optional, string) — search query to filter usernames.

**Response fields:**

- `username` — creator username.
- `modelCount` — number of models by this user.
- `link` — URL to retrieve all models from the user.
- `metadata.totalItems` — total items available.
- `metadata.currentPage` — current page number.
- `metadata.pageSize` — page size.
- `metadata.totalPages` — total pages.
- `metadata.nextPage` — URL for the next page.
- `metadata.prevPage` — URL for the previous page.

### Images

#### GET /api/v1/images

Get a list of images.

**Endpoint:** `https://civitai.com/api/v1/images`

**Query parameters:**

- `limit` (optional, number) — results per page (0-200, default: 100).
- `postId` (optional, number) — post ID to filter images.
- `modelId` (optional, number) — model ID to filter images.
- `modelVersionId` (optional, number) — model version ID to filter images.
- `username` (optional, string) — creator username.
- `nsfw` (optional, boolean/enum) — mature content filter (`None`, `Soft`, `Mature`, `X`).
- `sort` (optional, enum) — order by reactions or date.
- `period` (optional, enum) — time frame: `AllTime`, `Year`, `Month`, `Week`, `Day`.
- `page` (optional, number) — page number.

**Response fields:**

- `id` — image ID.
- `url` — source image URL.
- `hash` — image blurhash.
- `width` — image width.
- `height` — image height.
- `nsfw` — whether the image is mature.
- `nsfwLevel` — NSFW level.
- `createdAt` — posted date.
- `postId` — associated post ID.
- `stats.cryCount` — cry reactions.
- `stats.laughCount` — laugh reactions.
- `stats.likeCount` — like reactions.
- `stats.heartCount` — heart reactions.
- `stats.commentCount` — comment reactions.
- `meta` — generation parameters.
- `username` — creator username.

### Models

#### GET /api/v1/models

Get a list of models.

**Endpoint:** `https://civitai.com/api/v1/models`

**Query parameters:**

- `limit` (optional, number) — results per page (1-100, default: 100).
- `page` (optional, number) — page number.
- `query` (optional, string) — search query.
- `tag` (optional, string) — tag filter.
- `username` (optional, string) — creator filter.
- `types` (optional, enum[]) — model types such as `Checkpoint`, `TextualInversion`, `Hypernetwork`, `AestheticGradient`, `LORA`, `Controlnet`, `Poses`.
- `sort` (optional, enum) — `Highest Rated`, `Most Downloaded`, `Newest`.
- `period` (optional, enum) — `AllTime`, `Year`, `Month`, `Week`, `Day`.
- `favorites` (optional, boolean) — authenticated user's favorites.
- `hidden` (optional, boolean) — hidden models.
- `primaryFileOnly` (optional, boolean) — only return primary files.
- `allowNoCredit` (optional, boolean) — credit permission filter.
- `allowDerivatives` (optional, boolean) — derivative permission filter.
- `allowDifferentLicenses` (optional, boolean) — license permission filter.
- `allowCommercialUse` (optional, enum) — commercial usage permission.
- `nsfw` (optional, boolean) — safer results when false.
- `supportsGeneration` (optional, boolean) — models supporting generation.

**Response fields:**

- `id` — model identifier.
- `name` — model name.
- `description` — model description (HTML).
- `type` — model type.
- `nsfw` — NSFW flag.
- `tags` — tag array.
- `mode` — model mode, e.g. `Archived`, `TakenDown`.
- `creator.username` — creator username.
- `creator.image` — creator avatar URL.
- `stats.downloadCount` — downloads.
- `stats.favoriteCount` — favorites.
- `stats.commentCount` — comments.
- `stats.ratingCount` — rating count.
- `stats.rating` — average rating.

#### Model version fields

- `modelVersions.id` — version identifier.
- `modelVersions.name` — version name.
- `modelVersions.description` — version description.
- `modelVersions.createdAt` — creation date.
- `modelVersions.downloadUrl` — download URL.
- `modelVersions.trainedWords` — trigger words.
- `modelVersions.files.sizeKb` — file size.
- `modelVersions.files.pickleScanResult` — pickle scan result.
- `modelVersions.files.virusScanResult` — virus scan result.
- `modelVersions.files.metadata.fp` — floating point precision.
- `modelVersions.files.metadata.size` — model size.
- `modelVersions.files.metadata.format` — file format.
- `modelVersions.images.url` — image URL.
- `modelVersions.images.nsfw` — image NSFW flag.
- `modelVersions.images.width` — image width.
- `modelVersions.images.height` — image height.
- `modelVersions.images.hash` — image blurhash.
- `modelVersions.images.meta` — generation metadata.

### Model details

#### GET /api/v1/models/:modelId

Get a specific model by ID.

**Endpoint:** `https://civitai.com/api/v1/models/:modelId`

Response fields are the same as the models list endpoint.

#### GET /api/v1/model-versions/:modelVersionId

Get a specific model version by ID.

**Endpoint:** `https://civitai.com/api/v1/model-versions/:id`

**Response fields:**

- `id` — version identifier.
- `name` — version name.
- `description` — version description.
- `model.name` — model name.
- `model.type` — model type.
- `model.nsfw` — whether model is NSFW.
- `model.poi` — person-of-interest flag.
- `model.mode` — model mode.
- `modelId` — model identifier.
- `createdAt` — creation date.
- `downloadUrl` — download URL.
- `trainedWords` — trigger words.
- `files.sizeKb` — file size.
- `files.pickleScanResult` — pickle scan result.
- `files.virusScanResult` — virus scan result.
- `files.metadata.fp` — floating point precision.
- `files.metadata.size` — file size metadata.
- `files.metadata.format` — file format.
- `stats.downloadCount` — download count.
- `stats.ratingCount` — rating count.
- `stats.rating` — average rating.
- `images.url` — image URL.
- `images.nsfw` — image NSFW status.
- `images.width` — image width.
- `images.height` — image height.
- `images.hash` — image blurhash.
- `images.meta` — generation metadata.

#### GET /api/v1/model-versions/by-hash/:hash

Get a model version by file hash.

**Endpoint:** `https://civitai.com/api/v1/model-versions/by-hash/:hash`

Response fields are the same as the model version endpoint.

**Supported hash algorithms:**

- `AutoV1`
- `AutoV2`
- `SHA256`
- `CRC32`
- `Blake3`
