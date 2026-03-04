from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat
from docling_core.types.doc.document import ContentLayer
from uploadthing_py import UTApi
from chunk_utils import extract_chunks
from markdown_utils import serialize_doc_with_chunk_tags
from image_utils import upload_images_from_docling, transform_markdown_images
from docling_core.types.doc.base import ImageRefMode

load_dotenv()
token = os.getenv("UPLOADTHING_TOKEN")
app = FastAPI()
utapi = UTApi(token=token)

security = HTTPBearer()


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),  # noqa: B008
):
    secret_key = os.getenv("SECRET_KEY")
    print("secret key:",secret_key)
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing API key configuration.",
        )
    if credentials.credentials != secret_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    return credentials.credentials


class Doc(BaseModel):
    url: str


@app.post("/docling/full")
async def test_docling(doc: Doc, token: str = Depends(verify_token)):
    try:
        # 1. Initialize converter with options
        options = PdfPipelineOptions()
        options.generate_picture_images = True
        options.generate_page_images = True
        options.do_table_structure = True

        converter = DocumentConverter(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
        )

        # 2. Convert document
        print(f"Converting document from: {doc.url}")

        result = converter.convert(source=doc.url)

        # 3. Export to dictionary and markdown
        doc_dict = result.document.export_to_dict()
        markdown = result.document.export_to_markdown(
            image_mode="embedded",
            included_content_layers={ContentLayer.BODY, ContentLayer.FURNITURE},
        )

        # 4. Extract chunks with bounding boxes (no image upload)
        chunks = extract_chunks(doc_dict)

        # 5. Process markdown with chunk tags
        processed_markdown = serialize_doc_with_chunk_tags(result.document)

        # 6. Get metadata
        page_count = len(doc_dict.get("pages", {})) or 1
        filename = doc_dict.get("origin", {}).get("filename", "")

        # 7. Return the processed response (same format as /docling but without uploading)
        return {
            "success": True,
            "chunks": chunks,
            "processed_markdown": processed_markdown,
            "json": doc_dict,
            "markdown": markdown,
            "metadata": {
                "filename": filename,
                "page_count": page_count,
                "chunk_len": len(chunks),
                "body_child_len": len(doc_dict.get("body", {}).get("children", [])),
            },
        }
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))  # noqa: B904


@app.post("/docling")
async def process_file(
    doc: Doc,
    token: str = Depends(verify_token),
):
    try:
        # 1. Initialize converter with options
        options = PdfPipelineOptions()
        options.generate_picture_images = True
        options.generate_page_images = True
        options.do_table_structure = True

        converter = DocumentConverter(
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
        )

        # 2. Convert document
        print(f"Converting document from: {doc.url}")

        result = converter.convert(source=doc.url)

        document = result.document

        # 3. Export to dictionary and markdown
        doc_dict = result.document.export_to_dict()
        markdown = result.document.export_to_markdown(
            image_mode="embedded",
            included_content_layers={ContentLayer.BODY, ContentLayer.FURNITURE},
        )

        # 4. Upload images and update URIs in JSON
        doc_dict, uri_to_url_map = await upload_images_from_docling(doc_dict, utapi)

        # 5. Transform markdown to use UploadThing URLs
        markdown = transform_markdown_images(markdown, uri_to_url_map)

        # 6. Extract chunks with bounding boxes
        chunks = extract_chunks(doc_dict)

        # 7. Process markdown with chunk tags
        processed_markdown = serialize_doc_with_chunk_tags(
            result.document, image_mode=ImageRefMode.EMBEDDED
        )
        processed_markdown = transform_markdown_images(
            processed_markdown, uri_to_url_map
        )

        # 8. Get metadata
        page_count = len(doc_dict.get("pages", {})) or 1
        filename = doc_dict.get("origin", {}).get("filename", "")

        # 9. Return the processed response
        return {
            "success": True,
            "chunks": chunks,
            "processed_markdown": processed_markdown,
            "metadata": {
                "filename": filename,
                "page_count": page_count,
                "chunk_len": len(chunks),
                "body_child_len": len(doc_dict.get("body", {}).get("children", [])),
            },
        }

    except HTTPException:
        # Re-raise explicit HTTP errors like unauthorized
        raise
    except Exception as e:
        print(f"Error processing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))  # noqa: B904


@app.get("/health")
def health_check():
    return {"status": "healthy"}
