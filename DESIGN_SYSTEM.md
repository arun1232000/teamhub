# TeamHub Design System

**Theme: "Bold & Friendly"** — a vivid violet accent on warm stone neutrals,
a large type scale, generous radii and soft diffuse shadows.

A token-driven design system in plain CSS. No build step, no framework, no CDN
— it works on an offline LAN box and is editable by anyone who knows CSS.

This document is the reference for using it and for migrating further pages.

---

## 1. Architecture

Three stylesheets, loaded in this order. **Order is load-bearing** — later
files depend on earlier ones.

| File | Role | Rule |
|---|---|---|
| `public/tokens.css` | Palette, type scale, space, radius, elevation, motion, z-index | The only file allowed to contain a raw hex or px value |
| `public/components.css` | Reset + reusable components (button, input, card, table, badge…) | Consumes tokens only. Knows nothing about TeamHub |
| `public/styles.css` | Page chrome and view-specific composition | Consumes tokens + components. App-specific |

```html
<link rel="stylesheet" href="tokens.css" />
<link rel="stylesheet" href="components.css" />
<link rel="stylesheet" href="styles.css" />
```

### The two token layers

```
PRIMITIVES   --stone-600, --violet-600      raw palette; no meaning
     ↓
SEMANTIC     --text-muted, --primary        what it's FOR; flips in dark mode
     ↓
COMPONENTS   .btn, .card, .table            consume semantic tokens only
```

**Never reference a primitive outside `tokens.css`.** Primitives don't change
between themes; semantic tokens do. A component that reaches for `--violet-600`
directly will be wrong in dark mode. This is the single rule that keeps
theming working.

This rule earned its keep during the retheme: swapping the whole look —
blue/slate/compact to violet/stone/bold — was almost entirely a change of
token *values*. The three components that had quietly reached for a
primitive (`--neutral-0`, `--neutral-900`) were the only ones that broke,
and they're now on semantic aliases (`--control-knob`, `--bg-inverse`).

### Dark mode

Implemented purely by repointing semantic tokens. No component has a
dark-mode branch. Each dark block is declared twice — once under
`@media (prefers-color-scheme: dark)` guarded with
`:root:where(:not([data-theme="light"]))`, once under `:root[data-theme="dark"]`
— so the in-app toggle beats the OS setting in both directions.

---

## 2. Component reference

### Button

```html
<button class="btn btn--primary">Save status</button>
<button class="btn btn--secondary">Cancel</button>
<button class="btn btn--outline btn--sm">Refresh</button>
<button class="btn btn--destructive">Delete board</button>
<button class="btn btn--ghost btn--icon btn--sm" aria-label="Close">✕</button>
<button class="btn btn--primary btn--block">Continue</button>
<button class="btn btn--primary" disabled>Saving…</button>
```

| Variant | Use for |
|---|---|
| `--primary` | The one high-emphasis action per view |
| `--secondary` | Common non-primary actions (neutral fill) |
| `--outline` | Quiet actions that still need an edge |
| `--destructive` | Irreversible actions only |
| `--ghost` | Icon buttons, toolbar affordances |

Sizes: `--sm` (32px) · default (40px) · `--lg` (48px) · `--icon` (square).
States (`:hover`, `:active`, `:focus-visible`, `:disabled`) are built in.

Variants are driven by local custom properties (`--btn-bg`, `--btn-fg`,
`--btn-border`, `--btn-ring`), so a new variant is a 4-line block — no
duplicated box model.

**Secondary is deliberately neutral, not a second hue.** A competing accent
colour dilutes the primary; a quiet neutral reads as unambiguously secondary.

### Form controls

```html
<div class="field">
  <label class="field__label" for="note">Note <span class="optional">(optional)</span></label>
  <input class="input" id="note" type="text" placeholder="e.g. Family function" />
  <div class="field__hint">Visible to everyone on the team.</div>
</div>

<!-- Error state: put .is-error on the FIELD, not the control -->
<div class="field is-error">
  <label class="field__label" for="from">First day away</label>
  <input class="input" id="from" type="date" />
  <div class="field__error">The last day cannot be before the first.</div>
</div>

<!-- Search -->
<div class="input-group">
  <span class="input-group__icon"><svg …></svg></span>
  <input class="input" type="search" placeholder="Search…" />
</div>

<select class="select">…</select>
<textarea class="textarea"></textarea>
<input class="checkbox" type="checkbox" />

<label class="switch">
  <input type="checkbox" />
  <span class="switch__track" aria-hidden="true"></span>
</label>
```

`.is-error` on the wrapper drives both the control border and the ring, so a
single class toggle handles the whole error presentation.

### Card

```html
<div class="card card--elevated card--pad">…</div>
<div class="card card--interactive">…</div>

<div class="card card--elevated">
  <div class="card__header"><span class="card__title">Tickets</span></div>
  <div class="card__body">…</div>
  <div class="card__footer"><button class="btn btn--secondary">Close</button></div>
</div>

<!-- Row list inside one card -->
<div class="card card--elevated list">
  <div class="list__row"><span>Deploying a hotfix</span><a href="#">Open →</a></div>
</div>
```

`.card` is a hairline border only. `--elevated` adds a subtle shadow;
`--interactive` adds hover affordance. Borders do the structural work in this
design — reach for elevation sparingly.

### Table

```html
<div class="card card--elevated table-wrap">
  <table class="table">
    <thead><tr><th scope="col">ID</th>…</tr></thead>
    <tbody>
      <tr class="is-interactive" tabindex="0">
        <td class="is-id">T-1001</td>
        <td><span class="badge badge--dot badge--destructive">Open</span></td>
      </tr>
    </tbody>
  </table>
  <div class="empty">No tickets match your search.</div>
</div>
```

`.table-wrap` is required — it gives the table its own horizontal scroll so a
wide table never forces the page to scroll sideways on mobile. Headers are
sticky. `.is-id` / `.is-numeric` apply tabular figures so digits align.

Rows that open a detail view get `class="is-interactive" tabindex="0"` plus an
Enter/Space handler, so they're reachable by keyboard.

### Badge

```html
<span class="badge badge--dot badge--success">Closed</span>
<span class="badge badge--warning">Away</span>
<span class="badge badge--primary">Upcoming</span>
<span class="badge badge--destructive">Open</span>
<span class="badge">Neutral</span>
```

Always carries a text label — colour never conveys state alone.

### Other

`.segmented` / `.segmented__item.is-active` (pill filters) · `.avatar` ·
`.progress` / `.progress__fill` · `.empty` · `.skeleton--title|line|block` ·
`.banner banner--destructive` · `.toast` / `.toast--destructive` ·
`.modal-backdrop` / `.modal` / `.modal__header|body|footer` · `.detail-grid` ·
`.prose-block`

Utilities: `.u-visually-hidden` `.u-truncate` `.u-nums` `.u-grow` `.u-eyebrow`

---

## 3. Migration strategy

This is the sequence used to migrate TeamHub, and the one to follow for any
page still on ad-hoc CSS. It is ordered so the app is **never broken between
steps** — you can stop after any step and still ship.

### Step 0 — Snapshot the current behaviour

Before touching styling, record what "working" means: the interactive paths
(filters, modals, forms, polling), and a screenshot of each view in light and
dark. A restyle should change zero behaviour, and you need a baseline to prove
that. Commit this first so you can diff against it.

### Step 1 — Add the token layer, change nothing else

Drop in `tokens.css` and link it *before* the existing stylesheet. Tokens are
inert until referenced, so this is a no-op visually. Verify the page looks
byte-identical.

### Step 2 — Point existing CSS at tokens

Inside your current stylesheet, replace hard-coded values with token
references — colour first, then radius, spacing, type. Still no markup
changes. Work one property family at a time and check the page between each.

At the end of this step you have a themeable app with its old visual design.
Dark mode starts working here.

### Step 3 — Introduce `components.css` alongside, not instead

Add the component library. Because its class names (`.btn`, `.card`, `.input`)
are new, nothing collides with existing styles. The page still renders through
the old CSS.

### Step 4 — Migrate one view at a time, markup and CSS together

Pick the **smallest, least critical view first** (for TeamHub that was SOPs —
a list and a search box). For that view only:

1. Swap markup to component classes (`button.primary` → `btn btn--primary`).
2. Delete the now-dead rules from the old stylesheet.
3. Update any JS that generates markup or toggles classes for that view.
4. Re-run that view's interactions before moving on.

**Step 4.3 is where restyles actually break.** Generated markup and
`classList.toggle('active')` calls are invisible to a find-and-replace over
HTML. Grep for every old class name in your JS, not just your templates:

```bash
grep -rn "classList\|className\|class=" public/app.js
```

In this migration that grep caught a status filter still toggling `active`
while the CSS had moved to `is-active` — a filter that would have silently
stopped highlighting.

### Step 5 — Move the leftovers into the layout file

Whatever remains in the old stylesheet after every view is migrated is
genuinely app-specific composition. That becomes `styles.css`. If a rule looks
reusable, promote it to `components.css` instead.

### Step 6 — Verify contrast, don't eyeball it

Compute the ratios. A palette that looks fine can still fail: this one shipped
two failures found only by measuring — `--text-subtle` at 2.56:1 on white, and
white-on-primary at 3.68:1 in dark mode (the dark accent is lightened for text
legibility, which makes it too light to carry a white button label). Both are
fixed; the second is why `--primary-solid` exists as a separate token from
`--primary`.

Check at minimum: body/muted/subtle text on both surfaces, button labels on
every solid fill, and each badge's ink on its tint — in both themes.

### Step 7 — Re-test behaviour and both themes

Run the interaction list from Step 0 in light, dark, and at 390px. Confirm
zero console errors and no horizontal page overflow.

---

## 4. Conventions

**Naming** — BEM-ish: `.block`, `.block--variant`, `.block__part`, `.is-state`.
State classes are always `.is-*` so they're greppable and never collide with
structural names.

**Where does a rule go?**

- Reusable across any app → `components.css`
- Specific to a TeamHub view → `styles.css`
- A raw value → `tokens.css`, then reference the token

**Adding a colour:** add the primitive, then a semantic alias, then use the
alias. If you can't name the semantic role, you probably don't need the colour.

**Spacing:** every gap comes from the `--space-*` scale (4px rhythm). No
arbitrary margins.

**Hierarchy comes from type weight and colour, not size.** The scale is
deliberately narrow (11–28px) — this is a dense internal tool.

---

## 5. Typography

The stack prefers Inter and falls back to the platform UI font:

```css
--font-sans: "Inter", "Inter var", ui-sans-serif, system-ui, …
```

Inter is **not** loaded from Google Fonts — the portal is intranet-only and a
remote font would hang or silently fail offline. Anyone with Inter installed
locally sees it; everyone else gets a close system fallback, which is a
perfectly good outcome.

To guarantee Inter for all users, self-host it:

1. Download the Inter web fonts and put the `.woff2` files in `public/fonts/`.
2. Add `@font-face` blocks at the top of `tokens.css` with
   `font-display: swap`.

No other change is needed — the stack already lists Inter first.

---

## 6. Known gaps

- **No component for tabs/nav** — the topbar is app-specific and lives in
  `styles.css`. Promote it if a second page ever needs it.
- **No loading/spinner state on buttons.** `.btn` reserves an `.is-loading`
  hook in its comment but nothing implements it yet.
- **The `--viz-*` chart tokens are tuned for the light surface.** They're
  legible on dark but weren't re-derived for it; revisit if charts get more
  complex than the current bars.
- **Stat-tile tints are positional, not semantic.** `.stat--1` … `.stat--4`
  cycle through four tints so the row reads as one colourful set. If a tile
  ever needs to signal state, use a badge inside it rather than recolouring
  the tile — otherwise "amber" starts meaning two different things.
