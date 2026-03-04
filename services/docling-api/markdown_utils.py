"""Utility functions for processing markdown with chunk tags."""

import re
from docling_core.types.doc.document import DoclingDocument, ContentLayer, GroupItem, DocItem
from docling_core.transforms.serializer.markdown import MarkdownDocSerializer, MarkdownParams
from docling_core.types.doc.base import ImageRefMode

def serialize_doc_with_chunk_tags(
    doc: DoclingDocument, image_mode: ImageRefMode = ImageRefMode.EMBEDDED
) -> str:
    """Serialize document to markdown with each item wrapped in <c> tags.

    Iterates through document items and wraps each serialized item in <c id="N">...</c>.
    Includes BODY and FURNITURE layers.

    Args:
        doc: The DoclingDocument to serialize
        
        image_mode: Image export mode (embedded, referenced, placeholder)

    Returns:
        Markdown string with wrapped chunks
    """
    # Create params with image_mode configuration
    params = MarkdownParams(
        layers={ContentLayer.BODY, ContentLayer.FURNITURE},
        image_mode=image_mode
    )
    
    # Create serializer with configured params
    serializer = MarkdownDocSerializer(doc=doc, params=params)

    wrapped_chunks = []

    # Iterate through items including body and furniture (headers/footers)
    # matching the previous export_to_markdown config
    # Iterate through items using semantic iterator to keep key_value_area grouped
    iterator = semantically_iterate_items(
        doc=doc,
        included_content_layers={ContentLayer.BODY, ContentLayer.FURNITURE}
    )

    for i, (item, level) in enumerate(iterator):
        # Serialize the individual item to markdown text
        # Check if serialize accepts image_mode if init didn't (though usually it's init)
        item_md = serializer.serialize(item=item).text
        # Skip empty items if necessary
        if not item_md.strip():
            continue

        # Wrap with custom tag and 1-based index
        wrapped_chunk = f'<c id="{i + 1}">{item_md}</c>'
        wrapped_chunks.append(wrapped_chunk)

    # Join with double newlines
    return "\n\n".join(wrapped_chunks)


def semantically_iterate_items(
    doc: DoclingDocument,
    included_content_layers: set[ContentLayer] | None = None,
):
    """Iterate through direct children of body only.
    
    Each direct child of body becomes one chunk - groups are NOT recursed into.
    This ensures chunks match the body's children structure exactly.
    """
    
    # Only iterate through direct children of body
    if not hasattr(doc.body, "children"):
        return
    
    for i, child_ref in enumerate(doc.body.children):
        child = child_ref.resolve(doc)
        
        # Check content layer if applicable
        
        if isinstance(child, DocItem):
            if included_content_layers and child.content_layer not in included_content_layers:
                continue
        
        # Yield the child directly (whether it's a DocItem or GroupItem)
        # Groups are yielded as single items, not recursed into
        yield child, 0


def process_markdown_with_chunk_tags(markdown: str) -> str:
    """Process markdown by splitting on double newlines and wrapping each section with <c> tags.

    Each double newline represents the start of a new body child element.
    The id is just the index (e.g., "0", "1", "2"), not "c0", "c1", "c2".

    Args:
        markdown: The markdown string to process

    Returns:
        Processed markdown with each section wrapped in <c id="N">...</c> tags
    """
    # Split on double newlines (handles both \n\n and \r\n\r\n)
    sections = re.split(r"\r?\n\r?\n", markdown)

    processed_sections = []
    for index, section in enumerate(sections):
        trimmed = section.strip()
        if not trimmed:
            continue  # Skip empty sections
        processed_sections.append(f'<c id="{index + 1}">{trimmed}</c>')

    # Join with double newlines
    return "\n\n".join(processed_sections)
