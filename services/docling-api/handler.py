import os
import runpod
import asyncio
from dotenv import load_dotenv

# Import Docling components
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat
from docling_core.types.doc.document import ContentLayer
from docling_core.types.doc.base import ImageRefMode

# Import local utils
from uploadthing_py import UTApi
from chunk_utils import extract_chunks
from markdown_utils import serialize_doc_with_chunk_tags
from image_utils import upload_images_from_docling, transform_markdown_images

# Load environment variables (useful for local testing or .env file in Docker)
load_dotenv()

artifacts_path = os.environ.get("DOCLING_ARTIFACTS_PATH", "/app/models")
# Initialize UploadThing API if token is present
UPLOADTHING_TOKEN = os.getenv("UPLOADTHING_TOKEN")
utapi = UTApi(token=UPLOADTHING_TOKEN) if UPLOADTHING_TOKEN else None
if utapi:
    print("--- UploadThing API Initialized ---")
else:
    print("--- UploadThing API NOT Initialized (Missing UPLOADTHING_TOKEN) ---")

# Initialize Docling Converter with Options (same as main.py)
options = PdfPipelineOptions(artifacts_path=artifacts_path)
options.generate_picture_images = True
options.generate_page_images = True
options.do_table_structure = True

converter = DocumentConverter(
    
    format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
)
print("--- MODEL LOADED: Ready for jobs ---")

# --- 2. HANDLER FUNCTION (Runs for every job) ---
async def handler(job):
    """
    Job input format: {"input": {"url": "https://...", "options": {...}}}
    """
    job_input = job.get("input", {})
    
    # Validation
    url = job_input.get("url")
    if not url:
        return {"error": "Missing 'url' in input", "status": "failed"}

    try:
        print(f"Processing URL: {url}")
        
        # Run conversion (blocking call, runs in thread pool ideally if slow, but Docling is CPU heavy)
        # For creating asyncio friendliness we could run in executor if needed, 
        # but pure async handler is fine if we accept blocking for the CPU work.
        result = converter.convert(source=url)
        
        # Export to dictionary and markdown
        doc_dict = result.document.export_to_dict()
        markdown = result.document.export_to_markdown(
            image_mode="embedded",
            included_content_layers={ContentLayer.BODY, ContentLayer.FURNITURE},
        )
        
        # Handle Image Uploads (if utapi is configured)
        uri_to_url_map = {}
        if utapi:
            try:
                doc_dict, uri_to_url_map = await upload_images_from_docling(doc_dict, utapi)
                # Transform markdown images if uploaded
                markdown = transform_markdown_images(markdown, uri_to_url_map)
            except Exception as e:
                print(f"Warning: Image upload failed: {e}")
                # Continue without uploads if it fails
        
        # Extract chunks
        chunks = extract_chunks(doc_dict)
        
        # Process markdown with chunk tags
        processed_markdown = serialize_doc_with_chunk_tags(
            result.document, image_mode=ImageRefMode.EMBEDDED
        )
        if uri_to_url_map:
            processed_markdown = transform_markdown_images(processed_markdown, uri_to_url_map)
            
        # Metadata
        page_count = len(doc_dict.get("pages", {})) or 1
        filename = doc_dict.get("origin", {}).get("filename", "")
        
        # Construct Response consistent with main.py
        return {
            "success": True,
            "chunks": chunks,
            "processed_markdown": processed_markdown,
            "markdown": markdown, # Full markdown
            "metadata": {
                "filename": filename,
                "page_count": page_count,
                "chunk_len": len(chunks),
                "body_child_len": len(doc_dict.get("body", {}).get("children", [])),
            },
            "status": "success"
        }
        
    except Exception as e:
        print(f"Error processing job: {e}")
        return {"error": str(e), "status": "failed"}

# --- 3. START THE WORKER ---
if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
