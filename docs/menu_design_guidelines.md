# Restaurant Menu Design Guidelines
## AI-Powered PDF Menu Generator Standards

### 1. Visual Hierarchy & Structure

#### **Category Order (Strict Priority)**
1. **Starters/Appetizers** - Light dishes, soups, salads
2. **Main Courses** - Primary food items, entrees
3. **Desserts** - Sweet endings, pastries
4. **Soft Drinks** - Non-alcoholic beverages, juices, sodas
5. **Hot Beverages** - Coffee, tea, hot chocolate
6. **Cocktails** - Mixed alcoholic drinks
7. **Spirits** - Straight alcoholic beverages
8. **Wines** - Red, white, rosé, sparkling
9. **Others** - Any remaining items

#### **Page Layout**
- **Format**: A4 Portrait (210mm × 297mm)
- **Margins**: 20mm on all sides
- **Header Space**: 60mm for branding
- **Footer Space**: 15mm for contact info
- **Content Area**: 202mm × 222mm

### 2. Typography & Spacing

#### **Font Hierarchy**
- **Primary Font**: System sans-serif (Arial, Helvetica, or similar)
- **Secondary Font**: System serif (Times New Roman, Georgia, or similar)
- **Maximum Fonts**: 2 fonts maximum

#### **Font Sizes**
- **Restaurant Name**: 24pt, bold
- **Category Headers**: 16pt, bold, uppercase
- **Item Names**: 12pt, regular
- **Descriptions**: 10pt, italic
- **Prices**: 12pt, bold
- **Contact Info**: 9pt, regular

#### **Spacing Standards**
- **Category Spacing**: 24pt between categories
- **Item Spacing**: 8pt between items
- **Description Spacing**: 4pt below item name
- **Price Alignment**: Right-aligned, 15mm from right margin

### 3. Content Organization

#### **Item Structure**
```
Item Name                                    $XX.XX
Description text in smaller, italic font
```

#### **Category Headers**
```
─────────────────────────────────────────────
                    CATEGORY NAME
─────────────────────────────────────────────
```

#### **Price Formatting**
- **Currency**: Use $ symbol
- **Decimal Places**: Always show 2 decimal places
- **Alignment**: Right-aligned column
- **Spacing**: Consistent 15mm from right edge

### 4. Visual Elements

#### **Branding Area (Top 60mm)**
- **Logo**: Centered, max 40mm height
- **Restaurant Name**: Below logo, centered
- **Tagline/Description**: Optional, smaller font
- **Contact Info**: Bottom of header area

#### **Separators**
- **Category Separators**: Double lines (═══)
- **Section Separators**: Single lines (───)
- **Line Weight**: 0.5pt for separators

#### **Emphasis Techniques**
- **Signature Dishes**: Bold item name + description
- **Premium Items**: Slight price emphasis
- **Chef's Specials**: Small icon or asterisk (*)

### 5. Content Guidelines

#### **Item Descriptions**
- **Maximum Length**: 2 lines maximum
- **Style**: Italic, smaller font
- **Content**: Key ingredients, preparation method
- **Language**: Clear, appetizing descriptions

#### **Category Naming**
- **Food Categories**: Use existing database categories
- **Drink Categories**: Distinguish clearly between alcoholic/non-alcoholic
- **Consistency**: Maintain database category names

#### **Price Presentation**
- **Format**: $XX.XX (always 2 decimal places)
- **Alignment**: Right-aligned column
- **Consistency**: Same format throughout

### 6. Quality Standards

#### **Readability**
- **Contrast**: High contrast text on white background
- **Line Height**: 1.2x for descriptions, 1.5x for categories
- **Paragraph Spacing**: Consistent throughout

#### **Professional Appearance**
- **Clean Layout**: Minimalist design approach
- **Balanced Whitespace**: Proper spacing between elements
- **Consistent Alignment**: Left-aligned text, right-aligned prices

#### **Print-Ready Output**
- **Resolution**: 300 DPI minimum
- **Color Mode**: CMYK for professional printing
- **File Format**: PDF/A-1b for archival quality

### 7. AI Classification Rules

#### **Food vs. Beverage Detection**
- **Food Keywords**: dish, plate, meal, food, cuisine
- **Beverage Keywords**: drink, beverage, cocktail, wine, spirit, beer
- **Context Analysis**: Use item names and descriptions

#### **Alcoholic vs. Non-Alcoholic**
- **Alcoholic Indicators**: wine, beer, spirit, cocktail, vodka, whiskey
- **Non-Alcoholic Indicators**: juice, soda, water, coffee, tea
- **Default Classification**: When uncertain, classify as "Others"

#### **Category Assignment**
- **Use Database Categories**: Respect existing category structure
- **Smart Grouping**: Group similar items within categories
- **Fallback**: If no category exists, use "Others"

### 8. Technical Constraints

#### **Data Source**
- **Dynamic Fetching**: All items from restaurant database
- **No Hardcoding**: No static menu items
- **Real-time Data**: Always use current menu data

#### **Design Limitations**
- **Light Theme Only**: No dark mode support
- **Minimalist Approach**: No experimental layouts
- **Consistent Style**: Maintain uniform appearance

#### **Performance**
- **Generation Time**: Maximum 30 seconds
- **File Size**: Optimize for web download
- **Compatibility**: Works across all modern browsers

### 9. Export Options

#### **PDF Settings**
- **Page Size**: A4 Portrait
- **Quality**: High resolution (300 DPI)
- **Compression**: Optimized for web and print
- **Metadata**: Include restaurant name and generation date

#### **User Controls**
- **Category Reordering**: Allow manual category arrangement
- **Item Reordering**: Allow manual item arrangement within categories
- **Preview**: Show preview before final export
- **Download**: Direct download link

### 10. Verification Checklist

#### **Pre-Export Validation**
- [ ] All items properly categorized
- [ ] Prices correctly formatted and aligned
- [ ] Typography hierarchy maintained
- [ ] Spacing consistent throughout
- [ ] Branding area properly configured
- [ ] No overlapping elements
- [ ] Print-ready quality achieved

#### **Post-Generation Verification**
- [ ] PDF opens correctly in standard viewers
- [ ] Text is selectable and searchable
- [ ] Print quality meets professional standards
- [ ] File size is reasonable for web download
- [ ] All restaurant data accurately represented
