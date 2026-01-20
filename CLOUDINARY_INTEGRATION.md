# Cloudinary Integration Documentation

This document describes how Cloudinary is integrated into the backend for storing and retrieving user-uploaded images and documents in chat conversations.

---

## Configuration

Cloudinary is configured in `utils/cloudinary.js` using the following environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Upload Locations

| File Type | Cloudinary Folder   | Resource Type |
| --------- | ------------------- | ------------- |
| Images    | `perplex/images`    | `image`       |
| Documents | `perplex/documents` | `auto`        |

---

## Endpoints That Handle Uploads

### 1. `POST /api/chat/stream`

Handles streaming chat with optional image and document uploads.

**Form Data:**

- `prompt` - User message text
- `image` - Optional image file
- `document` - Optional document file (PDF, DOCX, TXT, etc.)

### 2. `POST /api/chat/ask`

Handles single-turn chat with optional image upload.

**Form Data:**

- `prompt` - User message text
- `image` - Optional image file

---

## Message Metadata Structure

When a message with attachments is saved, the following metadata is stored in the `metadata` JSON field:

### User Message with Image

```json
{
  "hasImage": true,
  "imageType": "image/png",
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/v123/perplex/images/abc123.png",
  "imagePublicId": "perplex/images/abc123",
  "hasDocument": false
}
```

### User Message with Document

```json
{
  "hasImage": false,
  "hasDocument": true,
  "documentName": "report.pdf",
  "documentType": "application/pdf",
  "documentSize": 102400,
  "documentUrl": "https://res.cloudinary.com/your-cloud/raw/upload/v123/perplex/documents/xyz789.pdf",
  "documentPublicId": "perplex/documents/xyz789"
}
```

### User Message with Both Image and Document

```json
{
  "hasImage": true,
  "imageType": "image/jpeg",
  "imageUrl": "https://res.cloudinary.com/.../perplex/images/abc123.jpg",
  "imagePublicId": "perplex/images/abc123",
  "hasDocument": true,
  "documentName": "notes.pdf",
  "documentType": "application/pdf",
  "documentSize": 51200,
  "documentUrl": "https://res.cloudinary.com/.../perplex/documents/xyz789.pdf",
  "documentPublicId": "perplex/documents/xyz789"
}
```

### Assistant Message (no attachments)

```json
{
  "model": "gpt-5-mini-2025-08-07",
  "responseLength": 1024,
  "generatedImages": [
    {
      "url": "https://...",
      "revised_prompt": "A detailed description..."
    }
  ]
}
```

---

## API Response Formats

### `GET /api/chat/conversations/:id` — Full Conversation with All Messages

✅ **Includes full metadata with Cloudinary URLs**

```json
{
  "success": true,
  "data": {
    "id": "clx123abc...",
    "userId": "user_123",
    "title": "Chat about images",
    "spaceId": "space_456",
    "createdAt": "2026-01-20T00:00:00.000Z",
    "updatedAt": "2026-01-20T00:10:00.000Z",
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "messages": [
      {
        "id": "msg_001",
        "conversationId": "clx123abc...",
        "role": "user",
        "content": "What's in this image?",
        "metadata": {
          "hasImage": true,
          "imageType": "image/png",
          "imageUrl": "https://res.cloudinary.com/.../perplex/images/abc123.png",
          "imagePublicId": "perplex/images/abc123",
          "hasDocument": false
        },
        "createdAt": "2026-01-20T00:00:00.000Z"
      },
      {
        "id": "msg_002",
        "conversationId": "clx123abc...",
        "role": "assistant",
        "content": "This image shows...",
        "metadata": {
          "model": "gpt-5-mini-2025-08-07",
          "responseLength": 512
        },
        "createdAt": "2026-01-20T00:00:05.000Z"
      }
    ]
  }
}
```

---

### `GET /api/chat/conversations` — Conversation List (Preview Only)

⚠️ **Only returns first message with limited fields (no metadata)**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "clx123abc...",
        "userId": "user_123",
        "title": "Chat about images",
        "spaceId": null,
        "createdAt": "2026-01-20T00:00:00.000Z",
        "updatedAt": "2026-01-20T00:10:00.000Z",
        "messages": [
          {
            "content": "What's in this image?",
            "createdAt": "2026-01-20T00:00:00.000Z"
          }
        ],
        "_count": {
          "messages": 4
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

---

### `GET /api/spaces/:id/conversations` — Space Conversations List

⚠️ **Only returns message count, no messages or metadata**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv_123",
        "userId": "user_123",
        "title": "Space Chat",
        "spaceId": "space_456",
        "createdAt": "2026-01-20T00:00:00.000Z",
        "updatedAt": "2026-01-20T00:10:00.000Z",
        "_count": {
          "messages": 6
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

---

### `GET /api/chat/history` — User Search History

❌ **Not related to attachments** — Returns simple search string history only.

```json
{
  "success": true,
  "data": {
    "history": [
      "[document: report.pdf]",
      "[image]",
      "What is the weather today?"
    ],
    "pagination": {
      "current_page": 1,
      "per_page": 20,
      "total_items": 3,
      "total_pages": 1
    }
  }
}
```

---

## Summary: Attachment Availability by Endpoint

| Endpoint                            | Messages Included     | Metadata with URLs                  |
| ----------------------------------- | --------------------- | ----------------------------------- |
| `GET /api/chat/conversations/:id`   | ✅ All messages       | ✅ **Yes**                          |
| `GET /api/chat/conversations`       | ⚠️ First message only | ❌ No (only `content`, `createdAt`) |
| `GET /api/spaces/:id/conversations` | ❌ None               | ❌ No                               |
| `GET /api/chat/history`             | ❌ (search strings)   | ❌ No                               |

---

## Frontend Usage

To display attachments in the frontend, fetch the full conversation using:

```
GET /api/chat/conversations/:conversationId
```

Then for each message, check:

```javascript
const message = conversation.messages[0];

// Check for image
if (message.metadata?.hasImage && message.metadata?.imageUrl) {
  // Display image from message.metadata.imageUrl
}

// Check for document
if (message.metadata?.hasDocument && message.metadata?.documentUrl) {
  // Display download link for message.metadata.documentUrl
  // Use message.metadata.documentName for display name
}
```

---

## File Structure

```
utils/
  └── cloudinary.js      # Cloudinary configuration and upload helper

routes/
  └── chat.js            # Upload handling in /stream and /ask endpoints

prisma/
  └── schema.prisma      # Message model with metadata Json field
```
