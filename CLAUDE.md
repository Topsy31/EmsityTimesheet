# CLAUDE.md - Emsity Timesheet

## Project Purpose
Desktop time tracking application replacing Excel-based monthly timesheet workflow. Built with Electron, saves data to OneDrive-synced folder.

## Status
MVP complete, ready for testing

## Commands

```bash
# Install dependencies
npm install

# Run in development
npm start

# Package as portable .exe
npm run build

# Package as installer
npm run build:installer
```

## Data Location
`E:\Emsity OneDrive\OneDrive - emsity.com\Emsity\Accounts\Working Records\timesheet-data.json`

## Tech Stack
- **Framework:** Electron
- **UI:** Vanilla HTML/CSS/JS
- **PDF Export:** jsPDF
- **Excel Import:** SheetJS (xlsx)
- **Styling:** Custom CSS with Emsity brand colours

## Brand Colours
- Primary blue: #0066CC
- Light blue background: #A8C5E2
- Grey background: #E8E8E8
- White: #FFFFFF
- Text: #333333

## Features
- Client management (add, edit — not delete)
- Time entry with date, activity, hours, notes
- Optional travel/expenses (expandable section)
- Monthly filtering
- CSV and PDF export
- Auto-save to OneDrive folder

## File Structure
```
Timesheet/
├── package.json      # Electron config & dependencies
├── main.js           # Electron main process (file I/O)
├── preload.js        # Secure bridge to renderer
├── index.html        # App UI
├── renderer.js       # App logic
├── styles.css        # Emsity branding
├── logo.png          # Emsity logo (add manually)
└── dist/             # Built .exe (after npm run build)
```
