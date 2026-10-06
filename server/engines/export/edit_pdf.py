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
                # 1. Apply redactions for all quads in this group
                for quad in group:
                    page.add_redact_annot(quad, fill=(1, 1, 1))
                page.apply_redactions()
                
                # 2. Calculate the bounding box for the entire paragraph
                rects = [q.rect for q in group]
                x0 = min(r.x0 for r in rects)
                y0 = min(r.y0 for r in rects)
                x1 = max(r.x1 for r in rects)
                
                # Font size derived from the first line's height
                first_rect = min(rects, key=lambda r: r.y0)
                fontsize = first_rect.height * 0.8
                
                # 3. Insert the new text ONCE for the entire group
                expanded_rect = fitz.Rect(x0, y0, x1 + 10, y0 + 500)
                page.insert_textbox(expanded_rect, insert_text, fontname="times-roman", fontsize=fontsize, color=(0, 0, 0), align=0)

    doc.save(output_pdf_path)

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python edit_pdf.py <input.pdf> <output.pdf> <changes.json>")
        sys.exit(1)
    apply_changes(sys.argv[1], sys.argv[2], sys.argv[3])
