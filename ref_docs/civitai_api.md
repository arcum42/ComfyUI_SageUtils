# Civitai REST API Documentation

This document describes how to use the Civitai REST API. The API provides access to models, images, creators, and tags from the Civitai platform.

## Base URL
```
https://civitai.com/api/v1
```

## Authentication

To make authorized requests, you must use an API Key generated from your [User Account Settings](https://civitai.com/user/account).

### Authorization Header
```http
GET https://civitai.com/api/v1/models
Content-Type: application/json
Authorization: Bearer {api_key}
```

### Query String
```http
GET https://civitai.com/api/v1/models?token={api_key}
Content-Type: application/json
```

## API Endpoints

### Creators

#### GET /api/v1/creators
Get a list of creators.

**Endpoint:** `https://civitai.com/api/v1/creators`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit (optional) | number | Results per page (0-200, default: 20). Set to 0 for all creators |
| page (optional) | number | Page to start fetching from |
| query (optional) | string | Search query to filter by username |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| username | string | The username of the creator |
| modelCount | number | Number of models linked to this user |
| link | string | URL to get all models from this user |
| metadata.totalItems | string | Total number of items available |
| metadata.currentPage | string | Current page |
| metadata.pageSize | string | Size of the batch |
| metadata.totalPages | string | Total number of pages |
| metadata.nextPage | string | URL to get next batch |
| metadata.prevPage | string | URL to get previous batch |

### Images

#### GET /api/v1/images
Get a list of images.

**Endpoint:** `https://civitai.com/api/v1/images`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit (optional) | number | Results per page (0-200, default: 100) |
| postId (optional) | number | ID of a post to get images from |
| modelId (optional) | number | ID of a model to get images from |
| modelVersionId (optional) | number | ID of a model version to get images from |
| username (optional) | string | Filter to images from specific user |
| nsfw (optional) | boolean/enum | Filter mature content (None, Soft, Mature, X) |
| sort (optional) | enum | Order: Most Reactions, Most Comments, Newest |
| period (optional) | enum | Time frame: AllTime, Year, Month, Week, Day |
| page (optional) | number | Page to start fetching from |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | number | Image ID |
| url | string | Image URL at source resolution |
| hash | string | Blurhash of the image |
| width | number | Image width |
| height | number | Image height |
| nsfw | boolean | Has mature content labels |
| nsfwLevel | enum | NSFW level (None, Soft, Mature, X) |
| createdAt | date | Date the image was posted |
| postId | number | ID of the post the image belongs to |
| stats.cryCount | number | Number of cry reactions |
| stats.laughCount | number | Number of laugh reactions |
| stats.likeCount | number | Number of like reactions |
| stats.heartCount | number | Number of heart reactions |
| stats.commentCount | number | Number of comment reactions |
| meta | object | Generation parameters for the image |
| username | string | Username of the creator |

### Models

#### GET /api/v1/models
Get a list of models.

**Endpoint:** `https://civitai.com/api/v1/models`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit (optional) | number | Results per page (1-100, default: 100) |
| page (optional) | number | Page to start fetching from |
| query (optional) | string | Search query to filter by name |
| tag (optional) | string | Filter models by tag |
| username (optional) | string | Filter models by user |
| types (optional) | enum[] | Model types: Checkpoint, TextualInversion, Hypernetwork, AestheticGradient, LORA, Controlnet, Poses |
| sort (optional) | enum | Order: Highest Rated, Most Downloaded, Newest |
| period (optional) | enum | Time frame: AllTime, Year, Month, Week, Day |
| favorites (optional) | boolean | Filter to authenticated user's favorites |
| hidden (optional) | boolean | Filter to authenticated user's hidden models |
| primaryFileOnly (optional) | boolean | Only include primary file for each model |
| allowNoCredit (optional) | boolean | Filter by credit requirements |
| allowDerivatives (optional) | boolean | Filter by derivative permissions |
| allowDifferentLicenses (optional) | boolean | Filter by license permissions |
| allowCommercialUse (optional) | enum | Commercial permissions: None, Image, Rent, Sell |
| nsfw (optional) | boolean | Return safer images if false |
| supportsGeneration (optional) | boolean | Return models supporting generation |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | number | Model identifier |
| name | string | Model name |
| description | string | Model description (HTML) |
| type | enum | Model type |
| nsfw | boolean | Whether model is NSFW |
| tags | string[] | Associated tags |
| mode | enum | Model mode (Archived, TakenDown) |
| creator.username | string | Creator name |
| creator.image | string | Creator avatar URL |
| stats.downloadCount | number | Number of downloads |
| stats.favoriteCount | number | Number of favorites |
| stats.commentCount | number | Number of comments |
| stats.ratingCount | number | Number of ratings |
| stats.rating | number | Average rating |

**Model Version Fields:**
| Field | Type | Description |
|-------|------|-------------|
| modelVersions.id | number | Version identifier |
| modelVersions.name | string | Version name |
| modelVersions.description | string | Version description |
| modelVersions.createdAt | Date | Creation date |
| modelVersions.downloadUrl | string | Download URL |
| modelVersions.trainedWords | string[] | Trigger words |
| modelVersions.files.sizeKb | number | File size |
| modelVersions.files.pickleScanResult | string | Pickle scan status |
| modelVersions.files.virusScanResult | string | Virus scan status |
| modelVersions.files.metadata.fp | enum | Floating point (fp16, fp32) |
| modelVersions.files.metadata.size | enum | Model size (full, pruned) |
| modelVersions.files.metadata.format | enum | File format (SafeTensor, PickleTensor, Other) |
| modelVersions.images.url | string | Image URL |
| modelVersions.images.nsfw | string | Image NSFW status |
| modelVersions.images.width | number | Image width |
| modelVersions.images.height | number | Image height |
| modelVersions.images.hash | string | Image blurhash |
| modelVersions.images.meta | object | Image generation params |

#### GET /api/v1/models/:modelId
Get a specific model by ID.

**Endpoint:** `https://civitai.com/api/v1/models/:modelId`

Response fields are the same as the models list endpoint.

#### GET /api/v1/model-versions/:modelVersionId
Get a specific model version by ID.

**Endpoint:** `https://civitai.com/api/v1/model-versions/:id`

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | number | Version identifier |
| name | string | Version name |
| description | string | Version description |
| model.name | string | Model name |
| model.type | enum | Model type |
| model.nsfw | boolean | Whether model is NSFW |
| model.poi | boolean | Whether model is of person of interest |
| model.mode | enum | Model mode |
| modelId | number | Model identifier |
| createdAt | Date | Creation date |
| downloadUrl | string | Download URL |
| trainedWords | string[] | Trigger words |
| files.sizeKb | number | File size |
| files.pickleScanResult | string | Pickle scan status |
| files.virusScanResult | string | Virus scan status |
| files.metadata.fp | enum | Floating point |
| files.metadata.size | enum | Model size |
| files.metadata.format | enum | File format |
| stats.downloadCount | number | Downloads |
| stats.ratingCount | number | Ratings |
| stats.rating | number | Average rating |
| images.url | string | Image URL |
| images.nsfw | string | Image NSFW status |
| images.width | number | Image width |
| images.height | number | Image height |
| images.hash | string | Image blurhash |
| images.meta | object | Image generation params |

#### GET /api/v1/model-versions/by-hash/:hash
Get a model version by file hash.

**Endpoint:** `https://civitai.com/api/v1/model-versions/by-hash/:hash`

Response fields are the same as the model-versions endpoint.

**Supported Hash Algorithms:**
- AutoV1
- AutoV2
- SHA256
- CRC32
- Blake3

**Note:** Still in the process of hashing older files, so results may be incomplete.

### Tags

#### GET /api/v1/tags
Get a list of tags.

**Endpoint:** `https://civitai.com/api/v1/tags`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit (optional) | number | Results per page (1-200, default: 20). Set to 0 for all tags |
| page (optional) | number | Page to start fetching from |
| query (optional) | string | Search query to filter by name |

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| name | string | Tag name |
| modelCount | number | Models linked to this tag |
| link | string | URL to get all models with this tag |
| metadata.totalItems | string | Total items available |
| metadata.currentPage | string | Current page |
| metadata.pageSize | string | Batch size |
| metadata.totalPages | string | Total pages |
| metadata.nextPage | string | Next batch URL |
| metadata.prevPage | string | Previous batch URL |

## Download Notes

The download URL uses a `content-disposition` header to set the filename correctly. Example with wget:

```bash
wget https://civitai.com/api/download/models/{modelVersionId} --content-disposition
```

For authenticated downloads:

```bash
wget https://civitai.com/api/download/models/{modelVersionId}?token={api_key} --content-disposition
```

## Example Requests

### Get TextualInversion Models
```bash
curl https://civitai.com/api/v1/models?limit=3&types=TextualInversion \
  -H "Content-Type: application/json" \
  -X GET
```

### Get Model by ID
```bash
curl https://civitai.com/api/v1/models/1102 \
  -H "Content-Type: application/json" \
  -X GET
```

### Get Model Version by Hash
```bash
curl https://civitai.com/api/v1/model-versions/by-hash/{hash} \
  -H "Content-Type: application/json" \
  -X GET
```

### Get Images
```bash
curl https://civitai.com/api/v1/images?limit=1 \
  -H "Content-Type: application/json" \
  -X GET
```

### Get Tags
```bash
curl https://civitai.com/api/v1/tags?limit=3 \
  -H "Content-Type: application/json" \
  -X GET
```

## Rate Limiting

The API has rate limiting in place. When making multiple requests, implement proper delays between requests to avoid hitting rate limits (HTTP 429 responses).

## CORS Policy

Direct browser requests to the Civitai API may be blocked by CORS policy. For web applications, consider using a backend proxy to make API requests.

---

**Reference Links:**
- [Official Civitai API Documentation](https://developer.civitai.com/docs/api/public-rest)
- [Guide to Downloading via API](https://education.civitai.com/civitais-guide-to-downloading-via-api/)
- [Civitai User Account Settings](https://civitai.com/user/account)

**Last Updated:** July 26, 2025
