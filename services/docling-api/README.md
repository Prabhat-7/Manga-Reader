# 📄 Docling API

A FastAPI-powered document processing microservice that leverages [Docling](https://github.com/DS4SD/docling) for intelligent document conversion with automatic image extraction and cloud storage via [UploadThing](https://uploadthing.com).

## ✨ Features

- **🔄 Document Conversion** - Convert PDFs and other documents to structured JSON and Markdown
- **🖼️ Image Extraction** - Automatically extract embedded images and pictures from documents
- **☁️ Cloud Image Storage** - Upload extracted images to UploadThing and replace base64 data with permanent URLs
- **📊 Table Detection** - Intelligent table structure recognition and extraction
- **⚡ High Performance** - Concurrent image uploads with configurable parallelism
- **🏥 Health Checks** - Built-in health endpoint for container orchestration

## 🚀 Quick Start

### Prerequisites

- **Python 3.12+**
- **[uv](https://github.com/astral-sh/uv)** - Fast Python package manager
- **CUDA 13.0** (optional, for GPU acceleration)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd docling-api
   ```

2. **Install dependencies**

   ```bash
   uv sync
   ```

3. **Configure environment**

   Create a `.env` file in the project root containing your UploadThing token and a custom `SECRET_KEY` of your choice:

   ```env
   UPLOADTHING_TOKEN=your_uploadthing_token_here
   SECRET_KEY=your_chosen_secret_key_here
   ```

4. **Run the development server**

   ```bash
   make dev
   ```

   Or manually:

   ```bash
   uv run fastapi dev main.py
   ```

The API will be available at `http://localhost:8000`

## 📚 API Reference

### Process Document

Converts a document to structured JSON and Markdown format.

```http
POST /docling
Authorization: Bearer <your_secret_key>
Content-Type: application/json
```

#### Request Body

| Field | Type   | Description                          |
| ----- | ------ | ------------------------------------ |
| `url` | string | URL of the document to process (PDF) |

#### Example Request

```bash
curl -X POST "http://localhost:8000/docling" \
  -H "Authorization: Bearer your_chosen_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/document.pdf"}'
```

#### Response

```json
{
  "success": true,
  "parsed": {
    "json": {
      "pictures": [...],
      "tables": [...],
      "pages": {...},
      ...
    },
    "markdown": "# Document Title\n\n..."
  },
  "message": "Document processed and images uploaded successfully"
}
```

#### Response Fields

| Field             | Type    | Description                                           |
| ----------------- | ------- | ----------------------------------------------------- |
| `success`         | boolean | Whether processing completed successfully             |
| `parsed.json`     | object  | Full Docling document structure with UploadThing URLs |
| `parsed.markdown` | string  | Markdown representation with embedded image URLs      |
| `message`         | string  | Status message                                        |

---

### Health Check

Check if the service is running.

```http
GET /health
```

#### Response

```json
{
  "status": "healthy"
}
```

## ⚙️ Configuration

### Environment Variables

| Variable            | Required | Description                                                            |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `UPLOADTHING_TOKEN` | ✅       | Your UploadThing API token (Base64-encoded JSON with apiKey and appId) |
| `SECRET_KEY`        | ✅       | A custom secret key of your choice used to authenticate API requests   |

### Pipeline Options

The document converter is configured with the following options:

| Option                    | Value  | Description                           |
| ------------------------- | ------ | ------------------------------------- |
| `generate_picture_images` | `true` | Extract images from document pictures |
| `generate_page_images`    | `true` | Generate images for each page         |
| `do_table_structure`      | `true` | Enable table structure detection      |

## 🛠️ Development

### Available Make Commands

| Command       | Description                              |
| ------------- | ---------------------------------------- |
| `make dev`    | Start development server with hot reload |
| `make test`   | Run test suite                           |
| `make lint`   | Run Ruff linter                          |
| `make format` | Auto-format code with Ruff               |

### Project Structure

```
docling-api/
├── main.py           # FastAPI application and endpoints
├── pyproject.toml    # Project configuration and dependencies
├── Makefile          # Development automation
├── .env              # Environment variables (not in git)
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

### Dependencies

| Package          | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `fastapi`        | Web framework                            |
| `docling`        | Document parsing and conversion          |
| `uploadthing-py` | UploadThing Python SDK for image uploads |
| `torch`          | PyTorch for ML-based document analysis   |
| `uvicorn`        | ASGI server                              |
| `python-dotenv`  | Environment variable management          |
| `ruff`           | Linting and formatting (dev)             |

## 🔧 How It Works

1. **Document Ingestion**: The API receives a document URL
2. **Conversion**: Docling parses the document, extracting text, tables, and images
3. **Image Processing**: Base64-encoded images are extracted from the Docling output
4. **Cloud Upload**: Images are uploaded concurrently to UploadThing (5 concurrent uploads)
5. **URI Replacement**: Base64 data URIs in both JSON and Markdown are replaced with permanent URLs
6. **Response**: Cleaned JSON structure and Markdown with proper image URLs are returned

### Image Handling Flow

```
PDF Document
    │
    ▼
┌─────────────┐
│   Docling   │──── Extract images as base64
└─────────────┘
    │
    ▼
┌─────────────┐
│ UTFile Prep │──── Convert to uploadable format
└─────────────┘
    │
    ▼
┌─────────────┐
│ UploadThing │──── Upload to cloud storage
└─────────────┘
    │
    ▼
┌─────────────┐
│   Replace   │──── Swap base64 → permanent URLs
└─────────────┘
    │
    ▼
JSON + Markdown with image URLs
```

## 🐳 Docker (Coming Soon)

Docker deployment support is planned for future releases.

## 📝 License

[Add your license here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
