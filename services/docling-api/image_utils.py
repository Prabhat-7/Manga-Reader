"""Utility functions for image handling and uploading."""

import base64
import re
from uploadthing_py import UTApi, UTFile, UploadFiles


def extract_base64_data(uri: str) -> bytes | None:
    """Extract base64 data from data URI."""
    if not uri or uri == "<data uri>" or uri == "<base 64>" or uri == "":
        return None

    # Handle data URI format: data:image/png;base64,{data}
    if uri.startswith("data:"):
        match = re.search(r"base64,(.+)$", uri)
        if match:
            try:
                return base64.b64decode(match.group(1))
            except Exception:
                return None

    # Handle raw base64 string
    try:
        return base64.b64decode(uri)
    except Exception:
        return None


def get_content_type_from_uri(uri: str) -> str:
    """Extract content type from data URI or default to png."""
    if uri.startswith("data:"):
        match = re.search(r"data:([^;]+)", uri)
        if match:
            return match.group(1)

    return "image/png"


async def upload_images_from_docling(
    doc_dict: dict, utapi: UTApi
) -> tuple[dict, dict[str, str]]:
    """Extract, upload images from Docling output, and update URIs.

    Args:
        doc_dict: The Docling document dictionary
        utapi: The UploadThing API instance

    Returns:
        tuple: (updated_doc_dict, uri_to_url_map) where uri_to_url_map maps old base64 URIs to new UploadThing URLs
    """

    # Collect all images to upload
    files_to_upload = []
    image_mappings = []  # Store mapping of old URI to new URL

    uri_to_url_map = {}  # Map old URIs to new URLs for markdown transformation

    # Extract images from pictures
    if "pictures" in doc_dict:
        for idx, picture in enumerate(doc_dict["pictures"]):
            if "image" in picture and "uri" in picture["image"]:
                uri = picture["image"]["uri"]
                image_data = extract_base64_data(uri)

                if image_data:
                    content_type = get_content_type_from_uri(uri)
                    extension = content_type.split("/")[-1]
                    file_name = f"picture_{idx}.{extension}"

                    ut_file = UTFile(
                        content=image_data, name=file_name, content_type=content_type
                    )
                    files_to_upload.append(ut_file)
                    image_mappings.append(
                        {"type": "picture", "index": idx, "old_uri": uri}
                    )

    # Extract images from tables (if any have images)
    if "tables" in doc_dict:
        for _idx, _table in enumerate(doc_dict["tables"]):
            # Tables might have associated images in some cases
            # Add logic here if needed
            pass

    # Extract page images
    if "pages" in doc_dict:
        for _page_no, page_data in doc_dict["pages"].items():
            if "image" in page_data and "uri" in page_data["image"]:
                # Set image to null instead of uploading
                page_data["image"]["uri"] = None

    # Upload all images if any exist
    if files_to_upload:
        print(f"Uploading {len(files_to_upload)} images to UploadThing...")

        results = await utapi.upload_files(
            files_to_upload, options=UploadFiles.UploadFilesOptions(concurrency=5)
        )

        # Update URIs with uploaded URLs
        for i, result in enumerate(results):
            if result.is_success and result.data:
                mapping = image_mappings[i]
                uploaded_url = result.data.url
                old_uri = mapping["old_uri"]

                # Store mapping for markdown transformation
                uri_to_url_map[old_uri] = uploaded_url

                if mapping["type"] == "picture":
                    doc_dict["pictures"][mapping["index"]]["image"]["uri"] = (
                        uploaded_url
                    )
                elif mapping["type"] == "page":
                    doc_dict["pages"][mapping["page_no"]]["image"]["uri"] = uploaded_url

                print(f"Uploaded {result.data.name} -> {uploaded_url}")
            else:
                print(f"Failed to upload image {i}: {result.error}")

    return doc_dict, uri_to_url_map


def transform_markdown_images(markdown: str, uri_to_url_map: dict[str, str]) -> str:
    """Transform markdown by replacing base64 data URIs with UploadThing URLs.

    Args:
        markdown: The markdown string containing base64 encoded images
        uri_to_url_map: Dictionary mapping old base64 URIs to new UploadThing URLs

    Returns:
        Transformed markdown with UploadThing URLs instead of base64 data
    """
    if not uri_to_url_map:
        return markdown

    transformed = markdown

    # Replace each base64 URI with its corresponding UploadThing URL
    for old_uri, new_url in uri_to_url_map.items():
        # The markdown format is typically: ![alt text](data:image/png;base64,...)
        # We need to replace the entire data URI with the new URL
        transformed = transformed.replace(old_uri, new_url)

    return transformed
