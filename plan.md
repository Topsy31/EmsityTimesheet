# Timesheet App — Planning Document

## Background

This app replaces a manual Excel-based workflow for recording billable time and generating client invoices.

### Current Workflow (Excel)
- Monthly spreadsheet file (e.g., "December 2025.xlsx")
- 5 weekly sheets (WEEK1–WEEK5) for time entry
- Totals sheet aggregating hours/expenses across weeks
- Combined Data sheet with complex INDEX/IFERROR formulas
- LISTS sheet for dropdown values (clients, activities)
- Invoice Template sheet for generating invoices
- Manual file duplication each month

### Pain Points
1. **Manual weekly sheet navigation** — must switch between sheets
2. **Fragile formulas** — nested INDEX/IFERROR across sheets breaks easily
3. **Monthly file duplication** — copy template, rename, clear data
4. **No persistent history** — each month is isolated
5. **Limited reporting** — pivot tables require manual refresh
6. **No mobile access** — Excel on phone is clunky

---

## Requirements

### Data Model

**Client** (separate entity, not per-entry):

| Field | Type | Notes |
|-------|------|-------|
| Name | String | Display name |
| Hourly Rate | Decimal | £ per hour |
| VAT Applicable | Boolean | Whether to add 20% VAT |
| Activities | Array | List of activity types for this client |

**Time Entry** (primary record):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Date | Date | Yes | Entry date |
| Activity | String | Yes | From client's activity list |
| Hours | Decimal | Yes | Hours worked (billable) |
| Comments | String | No | Free text notes |

**Additional Costs** (optional, added separately to an entry):

| Field | Type | Notes |
|-------|------|-------|
| Time Travelling | Decimal | Hours travelling (billable at same rate) |
| Expense Type | String | Category of expense |
| Expense Value | Decimal | £ amount |
| Miles | Integer | For mileage calculation (£0.45/mile) |

### Architecture

- **Client list** — top-level selector, switches between separate timesheets
- **Per-client timesheet** — each client has its own entries
- **Streamlined entry** — date, activity, hours, notes only
- **"Add costs" action** — expands to show travel/expense fields (rare use)

### Default Clients

| Client | Hourly Rate | VAT | Activities |
|--------|-------------|-----|------------|
| Safran | £65.00 | No | Customer Support, Safran Marketing, SRM Development |
| Russell | £62.50 | Yes | TBD |
| Satarla | £75.00 | Yes | TBD |

### Mileage Rate
- £0.45 per mile (HMRC approved rate)

---

## Feature Requirements

### Must Have (MVP)
- [ ] Time entry form with date, client, activity, hours
- [ ] View/edit existing entries
- [ ] Monthly summary by client (hours, travel, expenses, totals)
- [ ] Calculate invoice totals with VAT where applicable
- [ ] Data persistence (survives browser refresh)
- [ ] Export data (CSV or Excel compatible)

### Should Have
- [ ] Mobile-friendly responsive design
- [ ] Quick entry for common tasks (repeat yesterday, templates)
- [ ] Monthly/weekly calendar view
- [ ] Delete/edit entries
- [ ] Filter by client, date range, activity

### Could Have
- [ ] GitHub Gist sync for cloud backup
- [ ] PDF invoice generation
- [ ] Multi-month history and reporting
- [ ] Import from existing Excel files
- [ ] Dark mode

### Won't Have (for now)
- User authentication (single user app)
- Team/multi-user features
- Integration with accounting software

---

## Technical Approach

### Option A: Static HTML + LocalStorage
- Single HTML file, no build step
- Data stored in browser localStorage
- Pros: Simple, works offline, no hosting needed
- Cons: Data tied to browser, no sync

### Option B: Static HTML + GitHub Gist
- Single HTML file with GitHub Gist API integration
- Data stored as JSON in a private Gist
- Pros: Cloud backup, accessible from multiple devices
- Cons: Requires GitHub token, API rate limits

### Option C: PWA with IndexedDB
- Progressive Web App, installable
- IndexedDB for larger data storage
- Optional Gist sync
- Pros: App-like experience, works offline, more storage
- Cons: Slightly more complex

### Recommended: Option B (GitHub Gist)
Matches the proven approach from TimeCapture project. Provides cloud sync without backend infrastructure.

### Tech Stack
- **UI**: Vanilla HTML/CSS/JS or Vue 3 (CDN)
- **Styling**: Tailwind CSS (CDN)
- **Storage**: GitHub Gist API
- **Build**: None (runs directly from file or hosted)

---

## UI Wireframes (Conceptual)

### Client Selector
```
┌─────────────────────────────────────────────────┐
│  Timesheets                                     │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │   SAFRAN    │ │   RUSSELL   │ │  SATARLA  │  │
│  │   £65/h     │ │   £62.50/h  │ │   £75/h   │  │
│  │   Dec: 87h  │ │   Dec: 12h  │ │   Dec: 0h │  │
│  └─────────────┘ └─────────────┘ └───────────┘  │
│                                                 │
│  [+ Add Client]                    [Settings]   │
└─────────────────────────────────────────────────┘
```

### Client Timesheet View
```
┌─────────────────────────────────────────────────┐
│  ← Safran                     [December 2025 ▼] │
├─────────────────────────────────────────────────┤
│  [+ New Entry]                                  │
├─────────────────────────────────────────────────┤
│  Thu 5 Dec                                      │
│    Customer Support | 2h | OMV meeting          │
│    SRM Development  | 1h | Licencing      [+$]  │
│  Wed 4 Dec                                      │
│    SRM Development  | 2h | Heath report         │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  December Total: 87h = £5,655.00                │
│  [Entries] [Summary] [Export]                   │
└─────────────────────────────────────────────────┘
```

### Entry Form (Streamlined)
```
┌─────────────────────────────────────────────────┐
│  New Entry — Safran                     [Cancel]│
├─────────────────────────────────────────────────┤
│  Date        [05/12/2025      📅]               │
│  Activity    [SRM Development ▼]               │
│  Hours       [    2    ]                        │
│  Notes       [                    ]             │
│                                                 │
│  [+ Add travel/expenses]                        │
│                                                 │
│              [Save Entry]                       │
└─────────────────────────────────────────────────┘
```

### Entry Form (Expanded — when "Add travel/expenses" clicked)
```
┌─────────────────────────────────────────────────┐
│  New Entry — Safran                     [Cancel]│
├─────────────────────────────────────────────────┤
│  Date        [05/12/2025      📅]               │
│  Activity    [SRM Development ▼]               │
│  Hours       [    2    ]                        │
│  Notes       [                    ]             │
│                                                 │
│  ┄┄┄┄┄┄┄┄┄┄ Travel & Expenses ┄┄┄┄┄┄┄┄┄┄ [Hide] │
│  Travel Time [    1    ] hours                  │
│  Expense     [Subsistence ▼] £[  12.50  ]       │
│  Miles       [   40    ] (£18.00)               │
│                                                 │
│              [Save Entry]                       │
└─────────────────────────────────────────────────┘
```

### Monthly Summary
```
┌─────────────────────────────────────────────────┐
│  December 2025 Summary                          │
├─────────────────────────────────────────────────┤
│  SAFRAN                                         │
│    Working: 85h | Travel: 2h | Total: 87h       │
│    Rate: £65/h | Subtotal: £5,655.00            │
│    Expenses: £45.00 | Mileage: £18.00           │
│    TOTAL: £5,718.00 (No VAT)                    │
├─────────────────────────────────────────────────┤
│  RUSSELL                                        │
│    Working: 12h | Travel: 0h | Total: 12h       │
│    Rate: £62.50/h | Subtotal: £750.00           │
│    Expenses: £0.00                              │
│    VAT (20%): £150.00                           │
│    TOTAL: £900.00                               │
├─────────────────────────────────────────────────┤
│  GRAND TOTAL: £6,618.00                         │
│                                                 │
│  [Export CSV] [Copy for Invoice]                │
└─────────────────────────────────────────────────┘
```

---

## Open Questions

1. ~~**Activities per client** — Should each client have a fixed list of activities, or one global list?~~ **Resolved: Per-client activity lists**
2. **Expense categories** — What expense types do you use? (Travel, Subsistence, Materials, etc.)
3. **Invoice format** — Do you need PDF generation, or is a copy-paste summary sufficient?
4. **Historical data** — Should we import existing Excel data, or start fresh?
5. **Backup preference** — GitHub Gist sync, or local-only with manual export?
6. **Client management** — Should clients be editable (add/remove/change rates), or fixed list?

---

## Planned Improvements

### 1. Hide/Unhide Clients
- Add `hidden` boolean field to client data model
- Hidden clients don't appear on landing page
- Add "Unhide" dropdown in header to show hidden clients
- Click hidden client in dropdown to unhide it
- Add "Hide" option to client card or edit modal

### 2. Persistent Entry Date with +/- Controls
- Remember the date from the last entry created
- When opening "New Entry", default to last used date (not today)
- Add +1 day and -1 day buttons next to date picker
- Makes it easy to log entries for consecutive days

### 3. Activity Breakdown Tab
- New tab alongside "Entries" and "Summary"
- Shows hours per activity for the selected month
- Table format: Activity | Hours | Percentage
- Helps identify where time is being spent

### 4. Desktop/Start Menu Shortcut
- Package app as portable .exe using electron-builder
- Create Windows shortcut for desktop/Start Menu
- Double-click to launch without terminal
- Use Emsity logo as icon

### 5. Import from Selectable Folder
- File picker dialog to choose import folder (not hardcoded)
- Scan folder for Excel files (.xlsx, .xls)
- Display list of found files with import button
- Parse Excel structure and map to app data model
- Support importing multiple months of historical data

---

## Next Steps

1. ~~Confirm requirements and answer open questions~~
2. ~~Finalise tech stack decision~~
3. ~~Build MVP with core entry and summary features~~
4. ~~Add sync/export functionality~~
5. Implement planned improvements
6. Package as .exe and create desktop shortcut
