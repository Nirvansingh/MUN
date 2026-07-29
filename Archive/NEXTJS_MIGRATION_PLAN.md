# Next.js Migration Plan — MUN Research Hub

> ⏸️ **Status: Planned — waiting for go-ahead before implementing.**

---

## Why Next.js?

| Current Problem | Next.js Solution |
|---|---|
| All content in one JS bundle | Each file = its own page, loaded on demand |
| Plain `<pre>` text rendering | MDX / formatted markdown pages |
| No SEO / shareable URLs | Clean routes like `/unhrc/india` |
| Search is client-side only | Full-text search via server or static index |
| No asset optimization | Built-in `next/image`, `next/font` |

---

## Phase 1 — Project Scaffolding

```
mun-hub/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx                  ← Dashboard
│   ├── committee/
│   │   ├── [committee].tsx        ← UNHRC / UNSC overview
│   │   └── [committee]/
│   │       └── [slug].tsx         ← Individual file page
│   ├── global/
│   │   └── [slug].tsx             ← Global Reference files
│   └── search.tsx                 ← Search results page
├── lib/
│   ├── files.ts                   ← Load & parse manifest / txt files
│   ├── countries.ts               ← Country metadata helpers
│   └── search.ts                  ← Full-text search
├── components/
│   ├── Layout.tsx                 ← Header, sidebar, right panel
│   ├── Sidebar.tsx                ← File tree (collapsible)
│   ├── FileViewer.tsx             ← Formatted text renderer
│   ├── CountryCard.tsx            ← Country summary card
│   ├── RelatedContent.tsx         ← Related files section
│   ├── Scratchpad.tsx             ← LocalStorage scratchpad
│   ├── SearchBar.tsx              ← Global search
│   ├── SpeechTimer.tsx            ← Timer widget
│   ├── MunFact.tsx                ← Fact widget
│   └── MyCountrySelector.tsx      ← Country selection modal
├── styles/
│   └── globals.css                ← All current CSS, adapted
├── public/
│   ├── favicon.png
│   └── manifest.js                ← Keep as data source
├── data/                          ← Optional: convert .txt → .md / .json
│   ├── unhrc/
│   ├── unsc/
│   └── global/
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## Phase 2 — Data Layer (3 options)

**A — Keep `.txt` files as-is**
- Read `manifest.js` at build time via `getStaticProps`
- Parse content on the server, pass as props
- Simplest, no data migration

**B — Convert to Markdown**
- Convert all `.txt` → `.md` with frontmatter
- Use `gray-matter` + `react-markdown` for rendering
- Better formatting (headings, lists, code blocks)

**C — Hybrid (recommended)**
- Keep `.txt` as source of truth
- At build time, parse and generate a JSON index
- Each page reads from the JSON index

---

## Phase 3 — Routing

```
/                          → Dashboard
/committee/unhrc           → UNHRC country list
/committee/unsc            → UNSC country list
/committee/unhrc/india     → India's UNHRC battle card
/committee/unsc/china      → China's UNSC battle card
/global/india              → India's Global Reference profile
/search?q=...              → Search results
```

Each file page:
- Fetches content via `getStaticProps` / `getStaticPaths`
- Renders with `FileViewer` (formatted text)
- Shows `CountryCard` if applicable
- Shows `RelatedContent` in sidebar
- Supports `MyCountry` highlighting

---

## Phase 4 — Component Migration

**Port as-is to React:**
- Header (committee filter, search, theme toggle)
- Sidebar file tree (collapsible folders)
- File viewer with formatted text
- Country summary card
- Related content chips
- Scratchpad (localStorage)
- Speech timer widget
- MUN fact widget
- My Country selector
- Dark/light theme
- Keyboard shortcuts

**What improves:**
- **Search** → server-side FTS (flexsearch / SQLite FTS)
- **File loading** → only load the file you need
- **URL sharing** → `/committee/unhrc/india` is shareable
- **Performance** → static generation = instant loads
- **Accessibility** → semantic HTML, proper headings

---

## Phase 5 — State Management

| Current (vanilla JS) | Next.js equivalent |
|---|---|
| Global `let` variables | React state + context |
| `localStorage` for prefs | Same (client-side) |
| DOM queries | `useRef` / `useEffect` |
| Manual re-renders | React reactivity |
| `setupEventListeners()` | `useEffect` + event props |

**AppContext provider** holds:
- `selectedCommittee` filter
- `myCountry` selection
- `pinnedFiles`, `recentFiles`
- `sidebarVisible`, `rightPanelVisible`
- Theme preference

---

## Phase 6 — Build & Deployment

```bash
npx create-next-app@latest mun-hub --typescript
npm install react-markdown gray-matter rehype-highlight
npm run build
npm run export    # Full static export (no server needed)
```

Deploy to: **GitHub Pages** / **Vercel** / **Netlify**

---

## Key Decisions

1. **TypeScript or plain JS?** — TS recommended
2. **`.txt` or `.md`?** — Markdown = better formatting
3. **Static export or SSR?** — Static export (`next export`) is simpler
4. **Keep `manifest.js` or read files directly?** — Reading via `fs` at build time is cleaner
5. **CSS Modules, Tailwind, or plain CSS?** — Tailwind fastest to build, plain CSS keeps existing styles

---

## Estimated Effort

| Phase | Time |
|---|---|
| Scaffolding + config | ~30 min |
| Data layer + file parsing | ~1 hr |
| Layout + sidebar + routing | ~1.5 hr |
| File viewer + formatting | ~1 hr |
| Widgets (timer, facts, scratchpad) | ~1 hr |
| My Country + search | ~1 hr |
| Polish + responsive | ~1 hr |
| **Total** | **~7–8 hours** |