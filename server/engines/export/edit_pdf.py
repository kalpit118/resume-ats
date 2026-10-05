import sys
import json
import fitz  # PyMuPDF

def apply_changes(input_pdf_path, output_pdf_path, changes_json_path):
    # Load changes
    with open(changes_json_path, 'r', encoding='utf-8') as f:
        changes = json.load(f)
    
    doc = fitz.open(input_pdf_path)
    
    for change in changes:
        if not change.get('accepted', False):
            continue
            
        original = change.get('original', '').strip()
        modified = change.get('optimized', '').strip()
        
        if not original or original == modified:
            continue
            
        for page in doc:
            # Search for the exact string
            # PyMuPDF's search_for returns a list of Rects where the text is found.
            # We can use quads to get more accurate bounding boxes for multi-line text.
            text_instances = page.search_for(original, quads=True)
            
            if not text_instances:
                continue
                
            for quad in text_instances:
                # Add a redaction annotation to remove the original text
                # We use fill=(1,1,1) to white-out the background
                page.add_redact_annot(quad, fill=(1, 1, 1))
                page.apply_redactions()
                
                # We need to insert the modified text
                # We use the bounding box of the quad to determine position and size
                rect = quad.rect
                fontsize = rect.height * 0.75  # Approximate font size
                
                # Insert the new text. We use insert_textbox which supports text wrapping
                # if the new text is longer than the old text, it will wrap within the rect (or a slightly expanded rect).
                expanded_rect = fitz.Rect(rect.x0, rect.y0, rect.x1 + 200, rect.y1 + fontsize * 5)
                page.insert_textbox(expanded_rect, modified, fontsize=fontsize, color=(0, 0, 0), align=0)

    doc.save(output_pdf_path)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python edit_pdf.py <input.pdf> <output.pdf> <changes.json>")
        sys.exit(1)
    apply_changes(sys.argv[1], sys.argv[2], sys.argv[3])
