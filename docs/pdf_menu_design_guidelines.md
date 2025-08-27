# PDF Menu Design Guidelines
*Version:* 1.0  
*Goal:* Ensure AI-generated menus are visually polished, professionally designed, and print-ready.

---

## *1. Page Setup & Sizes*
- *Supported formats:*  
  - A4 (210mm × 297mm) — *primary format*
  - Letter (8.5" × 11") — optional
- *Margins:*  
  - Top / Bottom → 20mm  
  - Left / Right → 15mm
- *Orientation:* Portrait by default, Landscape for wine menus or >3 columns.

---

## *2. Color & Branding Rules*
- *Base Colors*:  
  - *Primary:* #1B1B1B (dark neutral for titles)  
  - *Secondary:* #666666 (subtitles, descriptions)  
  - *Accent:* #C49A6C (highlights, chef's specials)
- *Background:* White or subtle off-white #FAFAFA.
- *Custom Branding:*  
  - Allow restaurants to define *primary* and *secondary* colors via admin.
  - Accent color should automatically adapt to chosen brand palette.
- *Contrast:* Maintain *minimum 4.5:1 ratio* for accessibility.

---

## *3. Typography Hierarchy*
| Element         | Font                 | Size | Weight | Color     |
|----------------|----------------------|------|--------|-----------|
| Restaurant Name | Playfair Display     | 28pt | Bold   | Primary   |
| Category Title | Montserrat           | 16pt | Semi-Bold | Primary |
| Menu Item Name | Montserrat           | 12pt | Semi-Bold | Primary |
| Description    | Open Sans            | 10pt | Regular | Secondary |
| Price          | Montserrat          | 12pt | Bold    | Accent   |
| Footer / Notes | Open Sans            | 9pt  | Light   | Secondary |

- Fonts must *embed correctly* into the PDF to avoid missing glyphs.
- Fallback fonts: Helvetica → Arial → Sans-serif.
- Use *vector-safe fonts* (Google Fonts are preferred).

---

## *4. Layout & Spacing*
### *4.1. Columns*
- *<= 20 items* → Single column.
- *21–45 items* → Two columns.
- *46+ items* → Three columns.
- Maintain equal column width and spacing.

### *4.2. Item Structure*
Each menu item should contain:
1. Item name → Bold, slightly larger.
2. Short AI-enhanced description → Max *18 words*.
3. Optional nutrition info → Subtle, small font.
4. Price → Right-aligned for clean scanning.

Example:
Margherita Pizza ............... 42 RON  
Classic Italian pizza topped with fresh mozzarella, basil, and San Marzano tomatoes.  
520 kcal · 18g protein · 12g fat · 68g carbs

---

## *5. Icons & Symbols*
- *Do NOT use emojis* — inconsistent rendering across PDF viewers.
- Use *inline SVG icons* or *PDF-safe icon fonts* (e.g., FontAwesome).
- Recommended icons:
    - Starters → utensils
    - Mains → drumstick-bite
    - Desserts → ice-cream
    - Beverages → wine-glass / coffee
    - Specials → star
- Embed SVG paths into the PDF generation process to guarantee rendering.

---

## *6. AI-Enhanced Descriptions*
- The AI should:
    - Generate *short, appealing, 1-sentence descriptions*.
    - Match restaurant tone:
        - Fine dining → Elegant, sophisticated.
        - Casual café → Warm, conversational.
        - Bar → Fun, energetic.
    - Detect menu language automatically (Romanian or English).
- Examples:
    - *Before:* "Margherita Pizza"  
    - *After:* "A timeless classic with creamy mozzarella, fresh basil, and sweet San Marzano tomatoes."

---

## *7. Image & Branding Support*
- *Optional restaurant logo* → top center, max 150px height.
- *Optional hero dish thumbnails* (if URLs exist in DB).
- Images must be compressed for PDF to avoid file bloat.
- Always embed restaurant QR code linking to the digital menu (bottom-right corner) if none exists in the database generate it.

---

## *8. Sections & Category Styling*
- Separate major categories using:
    - Larger titles.
    - Subtle divider lines.
    - Icons next to category names.
- Top 5 *most profitable dishes* → automatically highlighted using accent color.
- Optional: small "Chef's Special" tag on selected items.

---

## *9. Footer Section*
- Always include:
    - Restaurant name & address.
    - QR code for digital menu.
    - "Prices include VAT" note.
- Font size = 9pt, subtle secondary color.

---

## *10. Technical Rules*
- Library: Upgrade from basic jsPDF to *pdf-lib* or *Puppeteer + HTML/CSS* for better layout control.
- Ensure *SVG + font embedding* is supported.
- Fallback gracefully if assets (icons, logos, fonts) are missing.
- Always generate PDFs in *RGB*, never CMYK.

---

## *11. Testing Checklist*
- [ ] Titles render without missing glyphs.
- [ ] Descriptions never overflow item blocks.
- [ ] No clipped prices or overlapping text.
- [ ] QR code is sharp, scannable, and properly aligned.
- [ ] Works offline without needing web fonts.

---
