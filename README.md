# Capstone Project Gallery

[View the live gallery](https://02fentym.github.io/Capstone-Project-Gallery/) · [GitHub repository](https://github.com/02fentym/Capstone-Project-Gallery)

A responsive, buildless student project gallery for GitHub Pages. HTML, CSS, and JavaScript are separate. There are no API keys, dependencies, or student-data snapshots in the repository. Google Sheets is read afresh when a visitor loads the page; Google’s publication cache can delay updates.

## 1. Publish the gallery data

The source is `The Pitch (Responses)`, tab `Form Responses 1` (gid `894911935`). The site expects a header row and one student project per row. It shows all nonblank projects, regardless of the internal Status column.

**Recommended:** Create a new tab named `Public Gallery` in that spreadsheet. Put this formula in A1:

```
=CHOOSECOLS('Form Responses 1'!A:S,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18)
```

This includes First Name through Success, excluding Timestamp, Email Address, Project Ambition, and all internal image/review fields. Keep the original headers. You can instead make a smaller public tab with the required name/title columns and selected optional columns.

1. Open **File → Share → Publish to web**.
2. Select **Public Gallery**, rather than the entire document.
3. Select **Comma-separated values (.csv)** and publish.
4. Under published content/settings, leave automatic republishing enabled. Ensure only the intended gallery tab is published.
5. Copy the generated CSV URL into `GALLERY_CONFIG.csvUrl` at the top of `script.js`.

Google instructions: https://support.google.com/docs/answer/183965

The site is configured with the published CSV URL currently in script.js. If you publish a different gallery tab, replace that URL. The UI only reads an allowlist, but publishing the original tab would still make its email and internal columns accessible through the CSV. Hiding those columns does not remove them from the published data. No source sheet sharing or publication settings were changed during creation.

Required headers: `First Name`, `Last Name`, `Project Title`.
Optional: `Project Idea`, `ICT Area(s)`, `The Problem`, `Target Audience`, `User Need`, `User Experience`, `Minimum Version`, `Inspiration`, `Existing Skills`, `New Skills`, `Tools`, `Testing`, `Success`.

Header matching ignores case and leading/trailing whitespace. ICT areas are separated by commas, semicolons, or newlines. Empty rows and rows without a student name or project title are skipped. Quoted commas and multiline descriptions are supported. Sheet cell content is displayed as text, never executed as HTML or instructions.

## 2. Add project images

Put images in `images/`. Use the student's full first and last names in lowercase, with every word separated by underscores:

- `Ahyan Arsalan` → `images/ahyan_arsalan.jpg`
- `Shrenik Subbaiyan Thiruchenduran` → `images/shrenik_subbaiyan_thiruchenduran.jpg`
- `First Second Third` → `images/first_second_third.png`

Supported extensions, tried in order: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`. Extensions must be lowercase. Spaces, hyphens, apostrophes, and other punctuation become underscores; repeated separators collapse and Latin accents are removed (José → jose). Use a 3:2 landscape image, ideally 1200 × 800 px. Images crop to fill the card. Without an image, a styled initials placeholder appears. Students with identical full names share the same image filename.

## 3. Preview locally

From this folder, run:

```
python3 -m http.server 8000
```

Open http://localhost:8000. Use an HTTP server rather than opening the HTML directly. If the sheet is not published, the page displays a connection message and retry button.

## 4. Host on GitHub Pages

1. Create a GitHub repository and upload this folder’s contents (with `index.html` at the repository root).
2. Open repository **Settings → Pages**.
3. Choose **Deploy from a branch**, the `main` branch, and `/ (root)`, then save.
4. Open the URL provided by GitHub after deployment completes.

All local paths are relative, so the site works at both a custom domain and a GitHub project URL. Commit image additions or code changes to update the site. Sheet changes do not require code deployment.

## Features

Search by student, title, idea, or ICT area; area filters; sheet-order or alphabetical sorting; project detail dialog with Escape and focus restoration; responsive layouts; reduced-motion support; graceful missing images, empty results, and connection errors. Fonts load from Google Fonts with system-font fallbacks.

## Gallery design

Dark image gallery with four columns on wide screens, three on medium screens, and two on smaller screens. Each image has student, title, short description, and area tags beneath it. Click anywhere on a tile, or focus it and press Enter/Space, to open a scrollable project modal. Close with the close button, Escape, or a click outside the dialog. Area filters scroll horizontally on mobile. The modal displays the full image without cropping.

## Project approval status

Set each review decision in **Form Responses 1 → Status (column AA)** using the existing dropdown: **Approved**, **Needs Revision**, or **Not Approved**. The source and public status cells use green, yellow, and red formatting. Do not enter review decisions into Public Gallery column Q; it mirrors the source automatically.

The gallery reads the public **Status** header, outlines each project image green/yellow/red, and displays a matching text label on the card and modal. Blank, unrecognized, or missing statuses display **Awaiting review** with the neutral image border. All projects remain visible regardless of status. Values are matched without case sensitivity and with surrounding spaces ignored.

Public Gallery!Q1 contains this formula, which publishes only recognized status choices:

```
={"Status";ARRAYFORMULA(IF(REGEXMATCH(LOWER(TRIM('Form Responses 1'!AA2:AA)), "^(approved|needs revision|not approved)$"),'Form Responses 1'!AA2:AA,""))}
```

Keep automatic republishing enabled. Changes appear after Google's published CSV refreshes and visitors reload the gallery; they do not require a GitHub commit.
