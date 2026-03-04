"""Utility functions for extracting chunks with bounding boxes from Docling JSON."""

from typing import Any, TypedDict


class BoundingBox(TypedDict):
    left: float
    top: float
    right: float
    bottom: float


class Chunk(TypedDict):
    id: str
    page: int
    bounding_box: BoundingBox | None
    type:str


def resolve_ref(
    doc: dict[str, Any], ref: str
) -> dict[str, Any] | None:
    """Resolve a $ref string to find the element in the document.
    
    $ref format is like "#/texts/0" or "#/tables/1" or "#/pictures/2" or "#/groups/0"
    """
    # Parse the ref: "#/texts/0" -> ["texts", "0"]
    parts = ref.replace("#/", "").split("/")
    if len(parts) != 2:
        return None

    collection, index_str = parts
    if not index_str:
        return None

    try:
        index = int(index_str)
    except ValueError:
        return None

    collection_data = doc.get(collection)
    if collection_data and 0 <= index < len(collection_data):
        return {"type": collection, "element": collection_data[index]}

    return None


def get_page_size(doc: dict[str, Any], page_no: int) -> tuple[float, float] | None:
    """Get page width and height from the pages property.
    
    Args:
        doc: The Docling document dictionary
        page_no: The page number (1-indexed)
        
    Returns:
        tuple of (width, height) or None if page not found
    """
    pages = doc.get("pages", {})
    # Pages are keyed by page number as string
    page_data = pages.get(str(page_no))
    if page_data and "size" in page_data:
        size = page_data["size"]
        return size.get("width", 0), size.get("height", 0)
    return None


def normalize_bounding_box(
    bbox: dict[str, Any], page_width: float, page_height: float
) -> BoundingBox:
    """Convert bounding box from bottom-left origin to top-left origin and normalize.
    
    The Docling bbox uses bottom-left origin with coordinates:
    - l (left), r (right) for x-axis
    - b (bottom), t (top) for y-axis where 0 is at the bottom
    
    We convert to top-left origin where:
    - 0,0 is at top-left
    - Values are normalized to 0-1 range
    
    Args:
        bbox: The original bounding box with l, t, r, b coordinates
        page_width: Width of the page
        page_height: Height of the page
        
    Returns:
        Normalized bounding box with top-left origin
    """
    # Original coordinates (bottom-left origin)
    left = bbox.get("l", 0)
    right = bbox.get("r", 0)
    bottom = bbox.get("b", 0)  # Distance from bottom
    top = bbox.get("t", 0)     # Distance from bottom (higher value)
    
    # Convert to top-left origin:
    # new_top = page_height - original_top (distance from top)
    # new_bottom = page_height - original_bottom (distance from top)
    new_top = page_height - top
    new_bottom = page_height - bottom
    
    # Normalize to 0-1 range
    if page_width > 0 and page_height > 0:
        return {
            "left": left / page_width,
            "top": new_top / page_height,
            "right": right / page_width,
            "bottom": new_bottom / page_height,
        }
    
    return {
        "left": left,
        "top": new_top,
        "right": right,
        "bottom": new_bottom,
    }


def extract_bounding_box(
    element: dict[str, Any], doc: dict[str, Any]
) -> tuple[int, BoundingBox | None]:
    """Extract bounding box from an element (text, table, or picture).
    
    Converts from bottom-left to top-left origin and normalizes using page size.
    
    Args:
        element: The element with prov data
        doc: The full Docling document (needed for page size lookup)
    
    Returns:
        tuple of (page_number, normalized_bounding_box)
    """
    prov = element.get("prov", [])
    if not prov:
        return 0, None

    first_prov = prov[0]
    bbox = first_prov.get("bbox")
    page_no = first_prov.get("page_no", 0)

    if not bbox:
        return page_no, None
    
    # Get page size for normalization
    page_size = get_page_size(doc, page_no)
    if not page_size:
        # Fallback: return raw coordinates if page size not available
        return page_no, {
            "left": bbox.get("l", 0),
            "top": bbox.get("t", 0),
            "right": bbox.get("r", 0),
            "bottom": bbox.get("b", 0),
        }
    
    page_width, page_height = page_size
    normalized_bbox = normalize_bounding_box(bbox, page_width, page_height)
    
    return page_no, normalized_bbox


def calculate_group_bounding_box(
    doc: dict[str, Any], group: dict[str, Any]
) -> tuple[int, BoundingBox | None]:
    """Calculate bounding box for a group by combining children bounding boxes.
    
    Combines all child bounding boxes, converts to top-left origin, and normalizes.
    """
    children = group.get("children", [])
    if not children:
        return 0, None

    min_left = float("inf")
    min_bottom = float("inf")  # In bottom-left coords, this is the lower edge
    max_right = float("-inf")
    max_top = float("-inf")    # In bottom-left coords, this is the upper edge
    page_no = 0
    has_valid_bbox = False

    for child_ref in children:
        ref = child_ref.get("$ref", "")
        resolved = resolve_ref(doc, ref)
        if not resolved or not resolved.get("element"):
            continue

        element = resolved["element"]
        if "prov" in element and element["prov"]:
            prov = element["prov"][0]
            bbox = prov.get("bbox")

            if bbox:
                has_valid_bbox = True
                page_no = prov.get("page_no", 0)

                min_left = min(min_left, bbox.get("l", 0))
                min_bottom = min(min_bottom, bbox.get("b", 0))
                max_right = max(max_right, bbox.get("r", 0))
                max_top = max(max_top, bbox.get("t", 0))

    if not has_valid_bbox:
        return 0, None

    # Get page size for normalization
    page_size = get_page_size(doc, page_no)
    if not page_size:
        # Fallback: return raw coordinates converted to top-left origin
        return page_no, {
            "left": min_left,
            "top": max_top,  # In bottom-left, top is the higher value
            "right": max_right,
            "bottom": min_bottom,
        }
    
    page_width, page_height = page_size
    
    # Create a combined bbox dict and normalize
    combined_bbox = {
        "l": min_left,
        "r": max_right,
        "b": min_bottom,
        "t": max_top,
    }
    normalized_bbox = normalize_bounding_box(combined_bbox, page_width, page_height)
    
    return page_no, normalized_bbox


def extract_chunks(doc: dict[str, Any]) -> list[Chunk]:
    """Extract chunks from Docling JSON response with bounding box info.
    
    Iterates over body.children and resolves each $ref to get the actual element.
    Returns list of chunks with id (index as string), page, and bounding_box.
    """
    chunks: list[Chunk] = []

    body = doc.get("body", {})
    children = body.get("children", [])

    if not children:
        return chunks

    chunk_id_counter = 1

    for child in children:
        ref = child.get("$ref", "")
        resolved = resolve_ref(doc, ref)

        page = 0
        bounding_box: BoundingBox | None = None
        
        if resolved:
            element_type = resolved.get("type", "")
            element = resolved.get("element")

            # Check for pictures or tables with captions
            if (element_type == "pictures" or element_type == "tables") and element:
                elem_children = element.get("children", [])
                if elem_children:
                    # Check if first child is a caption
                    first_child_ref = elem_children[0].get("$ref", "")
                    resolved_child = resolve_ref(doc, first_child_ref)
                    
                    if resolved_child:
                        child_element = resolved_child.get("element", {})
                        # Check label for caption
                        if child_element.get("label") == "caption":
                            # Create a chunk for the caption
                            caption_page, caption_bbox = extract_bounding_box(child_element, doc)
                            chunks.append({
                                "id": str(chunk_id_counter),
                                "page": caption_page,
                                "bounding_box": caption_bbox,
                                "type": "caption",
                            })
                            chunk_id_counter += 1

                if "prov" in element:
                    page, bounding_box = extract_bounding_box(element, doc)
                else:
                    page, bounding_box = calculate_group_bounding_box(doc, element)

            elif element_type == "groups" and element:
                page, bounding_box = calculate_group_bounding_box(doc, element)
            elif element and "prov" in element:
                page, bounding_box = extract_bounding_box(element, doc)

            chunks.append({
                "id": str(chunk_id_counter),
                "page": page,
                "bounding_box": bounding_box,
                "type": element_type,
            })
            chunk_id_counter += 1

    return chunks
