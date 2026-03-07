import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, HttpUrl
from uploadthing_py import UTApi, UTFile, UploadFiles

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from image_processing.panel import MergeMode, OutputMode, generate_panel_blocks
from myutils.myutils import load_images

load_dotenv()

app = FastAPI()
security = HTTPBearer()

UPLOADTHING_TOKEN = os.getenv("UPLOADTHING_TOKEN")
utapi = UTApi(token=UPLOADTHING_TOKEN) if UPLOADTHING_TOKEN else None

CONTENT_TYPE_TO_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
}

EXT_TO_CONTENT_TYPE = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
}


class ExtractPanelsRequest(BaseModel):
    image_url: HttpUrl | None = None
    input_dir: str | None = None
    fallback: bool = True
    split_joint_panels: bool = True
    mode: Literal["bounding", "masked"] = OutputMode.BOUNDING
    merge: Literal["none", "vertical", "horizontal"] = MergeMode.NONE


@dataclass
class SourceImage:
    source_name: str
    image: np.ndarray
    output_extension: str


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),  # noqa: B008
) -> str:
    secret_key = os.getenv("SECRET_KEY")
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


def _safe_basename(filename: str) -> str:
    stem = Path(filename).stem
    safe = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._")
    return safe or "panel"


def _get_output_extension_from_url(image_url: str, content_type: str | None) -> str:
    parsed = urlparse(image_url)
    ext = Path(parsed.path).suffix.lower()
    if ext in EXT_TO_CONTENT_TYPE:
        return ext
    if content_type:
        raw_type = content_type.split(";")[0].strip().lower()
        if raw_type in CONTENT_TYPE_TO_EXT:
            return CONTENT_TYPE_TO_EXT[raw_type]
    return ".png"


def _load_source_image_from_url(image_url: str) -> SourceImage:
    request = Request(
        image_url,
        headers={"User-Agent": "manga-panel-extractor-api/1.0"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = response.read()
            content_type = response.headers.get("Content-Type")
    except URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image from URL: {exc.reason}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image from URL: {exc}",
        ) from exc

    encoded_array = np.frombuffer(payload, dtype=np.uint8)
    decoded_image = cv2.imdecode(encoded_array, cv2.IMREAD_COLOR)
    if decoded_image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided image_url could not be decoded as an image.",
        )

    parsed = urlparse(image_url)
    fallback_name = os.path.basename(parsed.path) or "input_url_image"
    if "." not in fallback_name:
        fallback_name = f"{fallback_name}.png"
    output_extension = _get_output_extension_from_url(image_url, content_type)
    if Path(fallback_name).suffix.lower() not in EXT_TO_CONTENT_TYPE:
        fallback_name = f"{Path(fallback_name).stem}{output_extension}"

    return SourceImage(
        source_name=fallback_name,
        image=decoded_image,
        output_extension=output_extension,
    )


def _load_source_images_from_input_dir(input_dir: str) -> list[SourceImage]:
    if not os.path.isdir(input_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="input_dir must point to an existing directory.",
        )

    loaded_images = load_images(input_dir)
    source_images: list[SourceImage] = []
    for loaded in loaded_images:
        if loaded.image is None:
            continue
        extension = Path(loaded.image_name).suffix.lower()
        output_extension = extension if extension in EXT_TO_CONTENT_TYPE else ".png"
        source_images.append(
            SourceImage(
                source_name=os.path.basename(loaded.image_name),
                image=loaded.image,
                output_extension=output_extension,
            )
        )

    if not source_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No decodable image files were found in input_dir.",
        )

    return source_images


def _encode_panel(panel: np.ndarray, extension: str) -> tuple[bytes, str]:
    normalized_extension = extension if extension.startswith(".") else f".{extension}"
    if normalized_extension not in EXT_TO_CONTENT_TYPE:
        normalized_extension = ".png"

    ok, encoded = cv2.imencode(normalized_extension, panel)
    if not ok:
        ok, encoded = cv2.imencode(".png", panel)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to encode a panel image before upload.",
            )
        normalized_extension = ".png"

    return encoded.tobytes(), normalized_extension


@app.post("/extract")
async def extract_panels(
    payload: ExtractPanelsRequest,
    _token: str = Depends(verify_token),
):
    if bool(payload.image_url) == bool(payload.input_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one of image_url or input_dir.",
        )

    if utapi is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="UPLOADTHING_TOKEN is not configured on the manga-panel-extractor service.",
        )

    source_images = (
        [_load_source_image_from_url(str(payload.image_url))]
        if payload.image_url
        else _load_source_images_from_input_dir(payload.input_dir or "")
    )

    files_to_upload: list[UTFile] = []
    upload_manifest: list[tuple[str, int]] = []
    source_order = [source.source_name for source in source_images]

    for source in source_images:
        panels = generate_panel_blocks(
            source.image,
            fallback=payload.fallback,
            split_joint_panels=payload.split_joint_panels,
            mode=payload.mode,
            merge=payload.merge,
        )

        source_stem = _safe_basename(source.source_name)
        for panel_index, panel in enumerate(panels):
            panel_bytes, extension = _encode_panel(panel, source.output_extension)
            content_type = EXT_TO_CONTENT_TYPE.get(extension, "image/png")
            panel_name = f"{source_stem}_panel_{panel_index:03d}{extension}"
            files_to_upload.append(
                UTFile(content=panel_bytes, name=panel_name, content_type=content_type)
            )
            upload_manifest.append((source.source_name, panel_index))

    if not files_to_upload:
        return {
            "success": True,
            "total_input_images": len(source_images),
            "total_panels": 0,
            "panel_urls": [],
            "sources": [
                {"source_name": source_name, "panel_count": 0, "panel_urls": []}
                for source_name in source_order
            ],
        }

    results = await utapi.upload_files(
        files_to_upload, options=UploadFiles.UploadFilesOptions(concurrency=5)
    )
    if len(results) != len(upload_manifest):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "UploadThing returned an unexpected number of upload results. "
                "Please retry the request."
            ),
        )

    panels_by_source: dict[str, list[dict[str, int | str]]] = {
        source_name: [] for source_name in source_order
    }
    upload_failures: list[dict[str, str | int | None]] = []

    for index, result in enumerate(results):
        source_name, panel_index = upload_manifest[index]
        if result.is_success and result.data:
            panels_by_source[source_name].append(
                {
                    "panel_index": panel_index,
                    "panel_url": result.data.url,
                }
            )
        else:
            error_message = str(result.error) if result.error else "Unknown upload error"
            upload_failures.append(
                {
                    "source_name": source_name,
                    "panel_index": panel_index,
                    "error": error_message,
                }
            )

    if upload_failures:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "message": "One or more panel uploads failed.",
                "failures": upload_failures,
            },
        )

    ordered_panels_by_source = {
        source_name: sorted(
            panels_by_source[source_name], key=lambda panel: int(panel["panel_index"])
        )
        for source_name in source_order
    }

    source_results = [
        {
            "source_name": source_name,
            "panel_count": len(ordered_panels_by_source[source_name]),
            "panels": ordered_panels_by_source[source_name],
            "panel_urls": [
                str(panel["panel_url"]) for panel in ordered_panels_by_source[source_name]
            ],
        }
        for source_name in source_order
    ]

    all_panels = [
        {
            "source_name": source_name,
            "panel_index": int(panel["panel_index"]),
            "panel_url": str(panel["panel_url"]),
        }
        for source_name in source_order
        for panel in ordered_panels_by_source[source_name]
    ]

    all_panel_urls = [
        panel["panel_url"]
        for panel in all_panels
    ]

    return {
        "success": True,
        "total_input_images": len(source_images),
        "total_panels": len(all_panel_urls),
        "panels": all_panels,
        "panel_urls": all_panel_urls,
        "sources": source_results,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "uploadthing_configured": utapi is not None,
        "auth_enabled": bool(os.getenv("SECRET_KEY")),
    }
