# How to Convert Your Report to Microsoft Word

## Method 1: Using Pandoc (Best Formatting)

### Step 1: Install Pandoc
Download and install Pandoc from: https://pandoc.org/installing.html

### Step 2: Convert to Word
Open Command Prompt in your project folder and run:

```bash
cd C:\Users\37369\bukki
pandoc PROJECT_REPORT.md -o PROJECT_REPORT.docx --reference-doc=reference.docx
```

This will create a properly formatted Word document.

### Step 3: Customize Formatting (Optional)
1. Create a reference Word document with your preferred styles
2. Save it as `reference.docx`
3. Run the command again with `--reference-doc=reference.docx`

---

## Method 2: Open in Microsoft Word Directly

### Step 1: Open Word
1. Open Microsoft Word
2. Go to File → Open
3. Select "All Files (*.*)" from the file type dropdown
4. Navigate to `C:\Users\37369\bukki\PROJECT_REPORT.md`
5. Open the file

### Step 2: Format
Word will automatically convert markdown to formatted text. Then:
1. Go to File → Save As
2. Choose "Word Document (.docx)" as the format
3. Save

---

## Method 3: Use Online Converter

1. Go to https://cloudconvert.com/md-to-docx
2. Upload `PROJECT_REPORT.md`
3. Convert to DOCX
4. Download the result

---

## Recommended Formatting After Conversion

Once in Word, apply these styles:

### Title Page
- Title: "BUKKi Booking Platform - Project Report"
- Font: Arial 18pt, Bold, Centered
- Add your name, student ID, date, university name

### Abstract
- Font: Times New Roman 11pt
- Italicize the word "Abstract"
- Single spacing

### Headings
- Chapter Titles (Chapter 1, 2, etc.): Arial 16pt, Bold
- Section Headings (1.1, 2.1, etc.): Arial 14pt, Bold
- Subsections: Arial 12pt, Bold

### Body Text
- Font: Times New Roman 12pt
- Line Spacing: 1.5 or Double (check your university requirements)
- Alignment: Justified
- Margins: 1 inch (2.54 cm) all sides

### Page Numbers
- Insert page numbers in footer
- Start from page 1 after the title page

### Table of Contents
1. Place cursor after Abstract
2. Go to References → Table of Contents → Automatic Table

### Bibliography
- Use Hanging Indent (0.5 inch)
- Alphabetically ordered (already done in the report)
