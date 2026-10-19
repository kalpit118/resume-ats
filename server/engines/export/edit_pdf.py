"""
================================================================================
[ARCHIVED / DEPRECATED] In-Place PDF Redaction & Overlay Tool (PyMuPDF / fitz)
================================================================================
Historical Context:
    Used in early versions of ResumeFit to perform in-place text redactions and
    overlays directly onto user-uploaded binary PDFs.

Why Deactivated:
    - ResumeFit has completely migrated to structured LaTeX templates compiled
      via the Texapi cloud service (https://texapi.ovh).
    - Preserves typesetting quality, eliminates misalignment issues, and removes
      the requirement for a Python 3 runtime and PyMuPDF C-binaries on the server.

Status:
    Retained for architectural reference. The calling code in `server/routes/export.ts`
    is commented out.
================================================================================
"""
import sys
import json
import re
import fitz  # PyMuPDF

def sanitize_text(text):
    # Replace smart quotes and special dashes with standard ascii equivalents to avoid encoding/font issues
    replacements = {
        '\u2018': "'", '\u2019': "'",
        '\u201C': '"', '\u201D': '"',
        '\u2010': '-', '\u2011': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-',
        '\u00AD': '-', # soft hyphen
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text

def strip_bullets(text):
    # Remove leading bullets, spaces, and non-alphanumeric chars
    # This allows search_for to find the core text even if bullet symbols differ
    return re.sub(r'^[^a-zA-Z0-9(]+', '', text)

def group_quads(quads):
    # Sort quads primarily by y0, then x0
    sorted_quads = sorted(quads, key=lambda q: (q.rect.y0, q.rect.x0))
    groups = []
    current_group = []
    
    for q in sorted_quads:
        if not current_group:
            current_group.append(q)
        else:
            last_q = current_group[-1]
            y_diff = q.rect.y0 - last_q.rect.y0
            y_diff_next_line = q.rect.y0 - last_q.rect.y1
            
            # If it's roughly on the same line or the immediately next line
            if abs(y_diff) < q.rect.height or abs(y_diff_next_line) < q.rect.height * 1.5:
                current_group.append(q)
            else:
                groups.append(current_group)
                current_group = [q]
    
    if current_group:
        groups.append(current_group)
        
    return groups

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
            
        original_clean = sanitize_text(original)
        modified_clean = sanitize_text(modified)
        
        search_target = strip_bullets(original_clean)
        insert_text = strip_bullets(modified_clean)
        
        if not search_target:
            search_target = original_clean
        if not insert_text:
            insert_text = modified_clean
            
        for page in doc:
            text_instances = page.search_for(search_target, quads=True)
            
            if not text_instances:
                continue
                
            groups = group_quads(text_instances)
            
            for group in groups:
                # 1. Determine bounding box and original font properties
                rects = [q.rect for q in group]
                x0 = min(r.x0 for r in rects)
                y0 = min(r.y0 for r in rects)
                x1 = max(r.x1 for r in rects)
                
                first_rect = min(rects, key=lambda r: r.y0)
                true_fontsize = first_rect.height * 0.8
                true_fontname = "times-roman"
                
                text_dict = page.get_text("dict")
                found_font = False
                for block in text_dict.get("blocks", []):
                    if found_font: break
                    if "lines" not in block: continue
                    for line in block["lines"]:
                        if found_font: break
                        for span in line["spans"]:
                            span_rect = fitz.Rect(span["bbox"])
                            if span_rect.intersects(first_rect):
                                true_fontsize = span["size"]
                                font_lower = span["font"].lower()
                                
                                is_bold = "bold" in font_lower or "bd" in font_lower
                                is_italic = "italic" in font_lower or "it" in font_lower
                                
                                if "sans" in font_lower or "arial" in font_lower or "helv" in font_lower:
                                    base_font = "helv"
                                elif "courier" in font_lower or "mono" in font_lower:
                                    base_font = "courier"
                                else:
                                    base_font = "times"
                                    
                                if is_bold and is_italic:
                                    true_fontname = f"{base_font}-bolditalic" if base_font == "times" else f"{base_font}-boldoblique"
                                elif is_bold:
                                    true_fontname = f"{base_font}-bold"
                                elif is_italic:
                                    true_fontname = f"{base_font}-italic" if base_font == "times" else f"{base_font}-oblique"
                                else:
                                    true_fontname = "times-roman" if base_font == "times" else base_font
                                
                                found_font = True
                                break
                                
                # 2. Apply redactions for all quads in this group
                for quad in group:
                    page.add_redact_annot(quad, fill=(1, 1, 1))
                page.apply_redactions()
                
                # 3. Insert the new text ONCE for the entire group
                expanded_rect = fitz.Rect(x0, y0, x1 + 10, y0 + 500)
                page.insert_textbox(expanded_rect, insert_text, fontname=true_fontname, fontsize=true_fontsize, color=(0, 0, 0), align=0)

    doc.save(output_pdf_path)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python edit_pdf.py <input.pdf> <output.pdf> <changes.json>")
        sys.exit(1)
    apply_changes(sys.argv[1], sys.argv[2], sys.argv[3])
