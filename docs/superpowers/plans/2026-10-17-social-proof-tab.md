# Social Proof Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Social proof admin tab that shows each homepage entry with its project's Outcome and the testimonials from that business. Unused Outcomes and testimonials are listed separately, and Use or Add-to-homepage opens the editor already filled in.

**Architecture:**
- **Matching rules:** pure functions added to `assets/js/social-proof.js` (Node-tested): name keys, testimonial matching, Outcome lookup, the unused list, quote trimming, and the credit line.
- **Admin script:** `assets/js/social-proof-admin.js` gains pure prefill helpers (Node-tested), reads testimonials once per load, renders cards plus the unused list, and passes a prefill to the existing drawer.
- **Markup:** the section moves from the Testimonials panel into a new `#admin-panel-social-proof`, and a tab button joins the Content sub-tabs.

**Tech Stack:** plain HTML/CSS/JS SPA (20 shell copies), Firebase RTDB + Firestore (`window.getDocs`/`window.collection`/`window.db`), Node test scripts, `playwright-core` WebKit for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-17-social-proof-tab-design.md` (builds on `docs/superpowers/specs/2026-10-17-social-proof-design.md`)

## Global Constraints

- **No git commits, pushes or `firebase deploy`.** Ruben commits and deploys. Checkpoints only run tests.
- **Production data:** never read its contents. Browser checks use fake data only.
- **Shell edits:** go into `index.html`, then `node scripts/sync-spa-shells.mjs`. Each marker must then appear in `20` shells (`grep -rl "<marker>" --include=index.html . | grep -v node_modules | wc -l`).
- **No writes before Save:** Use and Add-to-homepage only fill the drawer.
- **Testimonials:** use only `name`, `title`, `company`, `text`, `rating` and `createdAt`. Private answers are never read or shown.
- **Limits:** quote ≤ 200 (cut at a word, ending "…"), credit / bottom line ≤ 60.
- **Not-yet Outcomes:** non-template projects with a non-blank Outcome that no entry links to by `projectId`.
- **Testimonial matching:** `nameKey(t.company) === nameKey(entry.client)`, newest first. `nameKey` lowercases, strips accents and apostrophes, turns other punctuation into spaces, collapses spaces, and drops a leading "the ".
- **Tab:**
  - `data-admin-tab="social-proof"`, placed after Testimonials
  - desktop label "Social proof", mobile label "Proof", icon `ribbon-outline`
  - added to both `CONTENT_SUB_TABS` maps and to `CONTENT_SUB_TAB_IDS` / `CONTENT_SUB_META`
- **Paths:**
  - `SCRATCH=/private/tmp/claude-501/-Users-ruben-Dev-Apps-Portfolio/50754f9c-b62d-454d-b72f-7050a00fbc90/scratchpad`
  - Local server on port 5178 (`node $SCRATCH/portal-server.mjs /Users/ruben/Dev/Apps/Portfolio`)
  - WebKit as in `$SCRATCH/sp-admin-check.cjs`

## Review Focus

1. **A business name typed differently** in the testimonial than in the entry ("Rizo’s Pizzeria" with a curly apostrophe vs "Rizo's Pizzeria", "The Acme Co" vs "Acme Co") should still match. Covered by the `nameKey` tests (Task 1) and the browser check's curly-apostrophe fixture (Task 3).
2. **A long testimonial** (over 200 characters, several paragraphs) used as a quote should come out as the first paragraph, trimmed at a word with "…", within the limit. Covered by the `quoteFromText` tests (Task 1).
3. **The testimonials read failing** (offline, Firestore error) should still render the cards, with a message. Covered by the browser check (Task 3).
4. **Using a quote on an entry that shows a number** should show a note that the number still leads. Covered by the browser check (Task 3).
5. **A platform template with an Outcome** must not appear in "Not on the homepage yet". Covered by the `unusedProof` test (Task 1) and the browser check (Task 3).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `assets/js/social-proof.js` | Modify | + `nameKey`, `testimonialsFor`, `outcomeFor`, `unusedProof`, `quoteFromText`, `creditFromTestimonial` |
| `scripts/test-social-proof.mjs` | Modify | Tests for the above + tab wiring checks |
| `assets/js/social-proof-admin.js` | Modify | Prefill helpers, testimonials load, cards, unused list, drawer prefill, new panel id |
| `scripts/test-social-proof-admin.mjs` | Modify | Tests for the prefill helpers |
| `index.html` (+19 shells) | Modify | Tab button, new panel (section moved), unused list, number note, cache-busters |
| `assets/js/script.js` | Modify | `CONTENT_SUB_TABS` ×2, mobile sub-tab list, activate hook |
| `assets/css/style.css` | Modify | Card layout, proof blocks, unused list |

---

### Task 1: Matching rules in the shared module

**Files:**
- Modify: `assets/js/social-proof.js` (add functions before `var api = {`, export them)
- Test: `scripts/test-social-proof.mjs` (append before the `// ── Homepage wiring (Task 3) ──` block)

**Interfaces:**
- Produces:
  - `nameKey(s) → string`
  - `testimonialsFor(entry, testimonials) → Testimonial[]` (newest first)
  - `outcomeFor(entry, projects) → Project|null`
  - `unusedProof(entries, testimonials, projects) → { testimonials: Testimonial[], outcomes: Project[] }`
  - `quoteFromText(text) → string` (≤ 200)
  - `creditFromTestimonial(t) → string` (≤ 60)
- `Testimonial` = `{ id, name, title, company, text, rating, createdMs }`.

- [ ] **Step 1: Write the failing tests**

Insert into `scripts/test-social-proof.mjs`, just before the line `// ── Homepage wiring (Task 3) ──`:

```js
// ── Social proof tab: matching (tab Task 1) ──
ok(SP.nameKey("Rizo's Pizzeria") === 'rizos pizzeria' && SP.nameKey('Rizo’s  Pizzeria!') === 'rizos pizzeria', 'nameKey: apostrophes, punctuation, spaces');
ok(SP.nameKey('The Acme Co.') === 'acme co' && SP.nameKey('Café Ñandú') === 'cafe nandu', 'nameKey: leading "the", accents');
ok(SP.nameKey('') === '' && SP.nameKey(null) === '', 'nameKey: blank');

const T = [
  { id: 't1', name: 'Roberto Rizo', title: 'Owner', company: 'Rizo’s Pizzeria', text: 'Great.', rating: 5, createdMs: 100 },
  { id: 't2', name: 'Ana Rizo', title: '', company: "rizos pizzeria", text: 'Fast.', rating: 5, createdMs: 200 },
  { id: 't3', name: 'Jane Doe', title: 'CEO', company: 'Acme Co', text: 'Solid.', rating: 4, createdMs: 50 },
  { id: 't4', name: 'No Company', title: '', company: '', text: 'Hi.', rating: 5, createdMs: 10 },
];
ok(SP.testimonialsFor({ client: "Rizo's Pizzeria" }, T).map((t) => t.id).join() === 't2,t1', 'testimonialsFor: matched by business name, newest first');
ok(SP.testimonialsFor({ client: '' }, T).length === 0, 'testimonialsFor: blank client matches nothing (not the blank-company testimonial)');

const P = [
  { id: 'p1', title: "Rizo's Pizzeria", outcome: 'Orders now come in online.', visibility: 'private' },
  { id: 'p2', title: 'Shelton Springs HOA', outcome: 'One portal for the board.' },
  { id: 'p3', title: 'Lawn Care Platform', outcome: 'Template outcome.', isTemplate: true },
  { id: 'p4', title: 'No Outcome', outcome: '   ' },
];
ok(SP.outcomeFor({ projectId: 'p1' }, P).id === 'p1', 'outcomeFor: linked project');
ok(SP.outcomeFor({ projectId: 'p4' }, P) === null && SP.outcomeFor({ projectId: '' }, P) === null && SP.outcomeFor({ projectId: 'zz' }, P) === null, 'outcomeFor: blank outcome / no link / missing project → null');

const u = SP.unusedProof([{ client: "Rizo's Pizzeria", projectId: 'p1' }], T, P);
ok(u.testimonials.map((t) => t.id).join() === 't3,t4', 'unused testimonials: the ones no entry matches (newest first)');
ok(u.outcomes.map((p) => p.id).join() === 'p2', 'unused outcomes: not linked, not templates, not blank');

// Quote + credit
ok(SP.quoteFromText('First paragraph\nwraps.\n\nSecond.') === 'First paragraph wraps.', 'quoteFromText: first paragraph, joined');
const longQ = SP.quoteFromText('word '.repeat(80));
ok(longQ.length <= 200 && longQ.endsWith('…') && !/\s…$/.test(longQ), `quoteFromText: long text cut at a word (${longQ.length})`);
ok(SP.quoteFromText('') === '' && SP.quoteFromText(null) === '', 'quoteFromText: blank');
ok(SP.creditFromTestimonial(T[0]) === 'Roberto Rizo · Owner, Rizo’s Pizzeria', 'credit: name · title, business');
ok(SP.creditFromTestimonial(T[1]) === 'Ana Rizo · rizos pizzeria', 'credit: no title');
ok(SP.creditFromTestimonial({ name: 'N'.repeat(40), title: 'T'.repeat(30), company: 'C' }).length <= 60, 'credit: capped at 60');
ok(SP.creditFromTestimonial({}) === '', 'credit: blank');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof.mjs 2>&1 | grep -m1 "Error\|✗"`
Expected: `TypeError: SP.nameKey is not a function`.

- [ ] **Step 3: Add the functions**

In `assets/js/social-proof.js`, insert this block just before `  var api = {`:

```js
  /** "Rizo’s Pizzeria!" → "rizos pizzeria": matches a testimonial's business to an entry. */
  function nameKey(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/^the /, '');
  }

  function newestFirst(a, b) {
    return (Number(b.createdMs) || 0) - (Number(a.createdMs) || 0);
  }

  /** Testimonials from this entry's business, newest first. */
  function testimonialsFor(entry, testimonials) {
    var key = nameKey(entry && entry.client);
    if (!key) return [];
    return (testimonials || [])
      .filter(function (t) { return t && nameKey(t.company) === key; })
      .sort(newestFirst);
  }

  /** The linked portfolio project, when it has an Outcome. */
  function outcomeFor(entry, projects) {
    if (!entry || !entry.projectId) return null;
    var p = (projects || []).filter(function (x) { return x && x.id === entry.projectId; })[0];
    return p && String(p.outcome || '').trim() ? p : null;
  }

  /** Proof no entry uses yet: unmatched testimonials, unlinked client Outcomes. */
  function unusedProof(entries, testimonials, projects) {
    var names = {};
    var linked = {};
    (entries || []).forEach(function (e) {
      var k = nameKey(e && e.client);
      if (k) names[k] = true;
      if (e && e.projectId) linked[e.projectId] = true;
    });
    return {
      testimonials: (testimonials || [])
        .filter(function (t) { return t && !names[nameKey(t.company)]; })
        .sort(newestFirst),
      outcomes: (projects || []).filter(function (p) {
        return p && p.isTemplate !== true && String(p.outcome || '').trim() && !linked[p.id];
      })
    };
  }

  /** First paragraph, cut to the quote limit at a word. */
  function quoteFromText(text) {
    var first = String(text == null ? '' : text)
      .split(/\n\s*\n/)
      .map(function (p) { return p.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean)[0] || '';
    if (first.length <= LIMITS.summary) return first;
    var cut = first.slice(0, LIMITS.summary - 1);
    var space = cut.lastIndexOf(' ');
    return (space > 80 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '') + '…';
  }

  /** "Roberto Rizo · Owner, Rizo's Pizzeria" for the bottom line (≤ 60). */
  function creditFromTestimonial(t) {
    var x = t || {};
    var where = [String(x.title || '').trim(), String(x.company || '').trim()].filter(Boolean).join(', ');
    var s = [String(x.name || '').trim(), where].filter(Boolean).join(' · ');
    if (s.length <= LIMITS.tagline) return s;
    return s.slice(0, LIMITS.tagline - 1).replace(/[\s,·]+$/, '') + '…';
  }

```

Then add to the `api` object, after `checkInDue: checkInDue`:

```js
    checkInDue: checkInDue,
    nameKey: nameKey,
    testimonialsFor: testimonialsFor,
    outcomeFor: outcomeFor,
    unusedProof: unusedProof,
    quoteFromText: quoteFromText,
    creditFromTestimonial: creditFromTestimonial
```

That is, replace `    checkInDue: checkInDue\n  };` with the block above followed by `\n  };`.

- [ ] **Step 4: Run it to make sure it passes**

Run: `node scripts/test-social-proof.mjs | grep -c '✗'`
Expected: `0`.

- [ ] **Step 5: Checkpoint (no commit)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 2: Prefill helpers in the admin script

**Files:**
- Modify: `assets/js/social-proof-admin.js` (pure helpers after `checkInEmail`, exported in `_test`)
- Test: `scripts/test-social-proof-admin.mjs` (append)

**Interfaces:**
- Consumes: `SP.quoteFromText`, `SP.creditFromTestimonial` (Task 1).
- Produces:
  - `prefillFromTestimonial(t) → { summary, tagline }`
  - `prefillFromOutcome(p) → { summary }`
  - `newEntryFromTestimonial(t) → { client, summary, tagline, published: false }`
  - `newEntryFromOutcome(p) → { client, projectId, summary, published: false }`
  - `testimonialFromDoc(id, data) → Testimonial`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test-social-proof-admin.mjs`:

```js
// ── Social proof tab: prefill helpers ──
const tdoc = T.testimonialFromDoc('t1', { name: ' Roberto Rizo ', title: 'Owner', company: "Rizo's Pizzeria", text: 'Ruben built it.\n\nMore.', rating: 5, createdAt: { toMillis: () => 1234 }, private: { privateNotes: 'secret' } });
ok(tdoc.id === 't1' && tdoc.name === 'Roberto Rizo' && tdoc.createdMs === 1234 && !('private' in tdoc), 'testimonialFromDoc keeps public fields only (no private answers)');
ok(T.testimonialFromDoc('t2', { createdAt: { seconds: 5 } }).createdMs === 5000 && T.testimonialFromDoc('t3', {}).createdMs === 0, 'createdMs from seconds / missing');
const pt = T.prefillFromTestimonial(tdoc);
ok(pt.summary === 'Ruben built it.' && pt.tagline === "Roberto Rizo · Owner, Rizo's Pizzeria", 'use testimonial: their words + who said it');
ok(T.prefillFromOutcome({ outcome: 'Orders online.\n\nMore.' }).summary === 'Orders online.' && !('tagline' in T.prefillFromOutcome({ outcome: 'x' })), 'use outcome: quote only, bottom line untouched');
const nt = T.newEntryFromTestimonial(tdoc);
ok(nt.client === "Rizo's Pizzeria" && nt.published === false && nt.tagline === pt.tagline, 'add testimonial: new draft named after the business');
ok(T.newEntryFromTestimonial({ name: 'Solo Person', text: 'Hi' }).client === 'Solo Person', 'add testimonial with no business: uses the person');
const no = T.newEntryFromOutcome({ id: 'p2', title: 'Shelton Springs HOA', outcome: 'One portal.' });
ok(no.client === 'Shelton Springs HOA' && no.projectId === 'p2' && no.summary === 'One portal.' && no.published === false, 'add outcome: new draft linked to the project');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof-admin.mjs 2>&1 | grep -m1 "Error\|✗"`
Expected: `TypeError: T.testimonialFromDoc is not a function`.

- [ ] **Step 3: Add the helpers**

In `assets/js/social-proof-admin.js`, insert after the closing `}` of `function checkInEmail(entry) { … }`:

```js

  /** Public testimonial fields only; private answers are never read here. */
  function testimonialFromDoc(id, d) {
    var x = d || {};
    var c = x.createdAt;
    var ms = c && typeof c.toMillis === 'function' ? c.toMillis() : (c && c.seconds ? c.seconds * 1000 : Number(c) || 0);
    return {
      id: id,
      name: String(x.name || '').trim(),
      title: String(x.title || '').trim(),
      company: String(x.company || '').trim(),
      text: String(x.text || ''),
      rating: Math.max(0, Math.min(5, parseInt(x.rating, 10) || 0)),
      createdMs: ms
    };
  }

  /** Use a testimonial: their words as the quote, who said it as the bottom line. */
  function prefillFromTestimonial(t) {
    return { summary: SP.quoteFromText(t.text), tagline: SP.creditFromTestimonial(t) };
  }

  /** Use an Outcome: its first paragraph as the quote; the bottom line stays. */
  function prefillFromOutcome(p) {
    return { summary: SP.quoteFromText(p.outcome) };
  }

  function newEntryFromTestimonial(t) {
    return Object.assign({ client: String(t.company || t.name || '').trim(), published: false }, prefillFromTestimonial(t));
  }

  function newEntryFromOutcome(p) {
    return Object.assign({ client: String(p.title || '').trim(), projectId: p.id, published: false }, prefillFromOutcome(p));
  }
```

In the `_test` object, after `deletePaths: deletePaths`, add:

```js
      deletePaths: deletePaths,
      testimonialFromDoc: testimonialFromDoc,
      prefillFromTestimonial: prefillFromTestimonial,
      prefillFromOutcome: prefillFromOutcome,
      newEntryFromTestimonial: newEntryFromTestimonial,
      newEntryFromOutcome: newEntryFromOutcome
```

That is, replace `      deletePaths: deletePaths\n    }` with the block above followed by `\n    }`.

- [ ] **Step 4: Run it to make sure it passes**

Run: `node scripts/test-social-proof-admin.mjs | grep -c '✗'`
Expected: `0`.

- [ ] **Step 5: Checkpoint (no commit)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 3: The tab, cards, not-yet list and drawer prefill

**Files:**
- Modify:
  - `index.html` (tab button; move the section into a new panel; unused list; number note; cache-busters), then sync
  - `assets/js/script.js` (`CONTENT_SUB_TABS` ×2, `CONTENT_SUB_TAB_IDS`, `CONTENT_SUB_META`, the activate hook)
  - `assets/js/social-proof-admin.js` (panel id, testimonials load, cards, unused list, prefill-aware drawer, click handlers)
  - `assets/css/style.css` (card layout)
- Test:
  - wiring block appended to `scripts/test-social-proof.mjs`
  - new browser check `$SCRATCH/sp-tab-check.cjs`
  - existing `$SCRATCH/sp-admin-check.cjs` and `$SCRATCH/sp-admin-fixes.cjs` switched to the new panel id

**Interfaces:**
- Consumes: Task 1 and Task 2 functions.
- Produces:
  - `#admin-tab-social-proof`, `#admin-panel-social-proof`, `#admin-social-proof-unused`, `#admin-social-proof-unused-list`, `#social-proof-number-note`
  - card buttons `[data-use-testimonial="<id>"]`, `[data-use-outcome]`, `[data-edit-project="<id>"]`, `[data-open-testimonials]`
  - not-yet buttons `[data-add-testimonial="<id>"]`, `[data-add-outcome="<id>"]`

- [ ] **Step 1: Write the failing wiring test**

Append to `scripts/test-social-proof.mjs`:

```js
// ── Social proof tab: wiring (tab Task 3) ──
const tabBtnAt = shell.indexOf('id="admin-tab-social-proof"');
ok(tabBtnAt > shell.indexOf('id="admin-tab-testimonials"') && /data-admin-tab="social-proof" data-admin-content-sub/.test(shell), 'Social proof tab button sits after Testimonials in Content');
const panelAt = shell.indexOf('id="admin-panel-social-proof"');
const sectionAt = shell.indexOf('id="social-proof-admin-section"');
ok(panelAt > 0 && sectionAt > panelAt && sectionAt > shell.indexOf('<!-- /admin-panel-testimonials -->'), 'section moved out of Testimonials into its own panel');
ok(/id="admin-social-proof-unused-list"/.test(shell) && /id="social-proof-number-note"/.test(shell), 'not-yet list + number note markup');
ok((script.match(/CONTENT_SUB_TABS = \{[^}]*'social-proof': 1/g) || []).length === 2, "both CONTENT_SUB_TABS maps include 'social-proof'");
ok(/CONTENT_SUB_TAB_IDS = \[[^\]]*'social-proof'/.test(script) && /'social-proof': \{ label: 'Proof', icon: 'ribbon-outline' \}/.test(script), 'mobile sub-tab bar lists Social proof');
ok(/tabId === 'social-proof' && window\.CWR_SOCIAL_PROOF/.test(script) && !/tabId === 'testimonials' && window\.CWR_SOCIAL_PROOF/.test(script), 'opening the tab loads social proof (not the Testimonials tab)');
ok(/getElementById\('admin-panel-social-proof'\)/.test(read('assets/js/social-proof-admin.js')), 'admin script auto-opens on the new panel');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof.mjs | grep '✗'`
Expected: the 7 tab-wiring lines show `✗`.

- [ ] **Step 3: index.html: tab button, panel move, unused list, number note, versions; sync**

```bash
python3 - <<'EOF'
import pathlib, re
p = pathlib.Path('index.html'); s = p.read_text()

# Tab button after Testimonials.
m = re.search(r'(                <button type="button" class="admin-tab" role="tab" id="admin-tab-testimonials"[\s\S]*?</button>\n)', s)
assert m
btn = '''                <button type="button" class="admin-tab" role="tab" id="admin-tab-social-proof" data-admin-tab="social-proof" data-admin-content-sub aria-selected="false" aria-controls="admin-panel-social-proof" tabindex="-1" aria-label="Social proof">
                  <ion-icon name="ribbon-outline" aria-hidden="true"></ion-icon>
                  <span class="admin-tab-label" aria-hidden="true"><span class="admin-tab-label-desktop">Social proof</span><span class="admin-tab-label-mobile">Proof</span></span>
                </button>
'''
s = s[:m.end()] + btn + s[m.end():]

# Move the section into its own panel after the Testimonials panel.
a = s.index('          <section class="service admin-collapsible-section admin-collapsible-open" id="social-proof-admin-section">')
b = s.index('          </section>\n', a) + len('          </section>\n')
section = s[a:b]
s = s[:a] + s[b:]
section = section.replace(
  '<p class="admin-panel-lead">Real clients and real results for “Trusted by local businesses” on the homepage.',
  '<p class="admin-panel-lead">Every client’s homepage line, their portfolio Outcome, and what they wrote in testimonials, in one place. Use a testimonial or Outcome to fill the homepage quote.')
section = section.replace(
  '                <ul class="admin-social-proof-list" id="admin-social-proof-list" aria-label="Social proof entries"></ul>\n',
  '''                <ul class="admin-social-proof-list" id="admin-social-proof-list" aria-label="Social proof entries"></ul>
                <div class="admin-social-proof-unused" id="admin-social-proof-unused" hidden>
                  <h4 class="h4 service-item-title">Not on the homepage yet</h4>
                  <ul class="admin-social-proof-unused-list" id="admin-social-proof-unused-list"></ul>
                </div>
''')
assert 'admin-social-proof-unused-list' in section and 'Every client’s homepage line' in section
anchor = '          </div><!-- /admin-panel-testimonials -->\n'
panel = ('\n          <!-- Social proof -->\n'
         '          <div id="admin-panel-social-proof" class="admin-tab-panel" role="tabpanel" aria-labelledby="admin-tab-social-proof" data-admin-tab="social-proof" hidden>\n'
         + section +
         '          </div><!-- /admin-panel-social-proof -->\n')
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + panel)

# Drawer: number note above the quote.
old = '''                  <div class="form-group">
                    <label for="social-proof-summary">One line</label>'''
new = '''                  <p class="form-hint social-proof-number-note" id="social-proof-number-note" hidden>This entry shows its number on the homepage; the quote shows when there’s no number.</p>
                  <div class="form-group">
                    <label for="social-proof-summary">One line</label>'''
assert s.count(old) == 1
s = s.replace(old, new)

s = re.sub(r'(/assets/js/social-proof\.js\?v=)[^"]*', r'\1proof-tab-20261017', s)
s = re.sub(r"(/assets/js/social-proof-admin\.js\?v=)[^']*", r'\1proof-tab-20261017', s)
s = re.sub(r'(/assets/js/script\.js\?v=)[^"]*', r'\1proof-tab-20261017', s)
s = re.sub(r'(/assets/css/style\.css\?v=)[^"]*', r'\1proof-tab-20261017', s)
p.write_text(s); print('ok')
EOF
node scripts/sync-spa-shells.mjs 2>&1 | tail -1
for m in 'id="admin-tab-social-proof"' 'id="admin-panel-social-proof"' 'id="admin-social-proof-unused-list"' 'id="social-proof-number-note"' 'social-proof-admin.js?v=proof-tab-20261017' 'script.js?v=proof-tab-20261017' 'style.css?v=proof-tab-20261017'; do echo "$m: $(grep -rl "$m" --include=index.html . | grep -v node_modules | wc -l | tr -d ' ')"; done
```

Expected: `ok`, `All shells synced and stamped.`, and each line prints `20`.

- [ ] **Step 4: script.js: Content tab lists and the activate hook**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('assets/js/script.js'); s = p.read_text()
old = "var CONTENT_SUB_TABS = { portfolio: 1, blog: 1, testimonials: 1, instagram: 1, 'post-builder': 1 };"
assert s.count(old) == 2
s = s.replace(old, "var CONTENT_SUB_TABS = { portfolio: 1, blog: 1, testimonials: 1, 'social-proof': 1, instagram: 1, 'post-builder': 1 };")
old = "var CONTENT_SUB_TAB_IDS = ['portfolio', 'blog', 'testimonials', 'instagram', 'post-builder'];"
assert s.count(old) == 1
s = s.replace(old, "var CONTENT_SUB_TAB_IDS = ['portfolio', 'blog', 'testimonials', 'social-proof', 'instagram', 'post-builder'];")
old = "      testimonials: { label: 'Reviews', icon: 'chatbox-ellipses-outline' },\n"
assert s.count(old) == 1
s = s.replace(old, old + "      'social-proof': { label: 'Proof', icon: 'ribbon-outline' },\n")
old = "      if (tabId === 'testimonials' && window.CWR_SOCIAL_PROOF) {"
assert s.count(old) == 1
s = s.replace(old, "      if (tabId === 'social-proof' && window.CWR_SOCIAL_PROOF) {")
p.write_text(s); print('ok')
EOF
```

Expected: `ok`.

- [ ] **Step 5: social-proof-admin.js: testimonials, cards, unused list, prefill drawer**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('assets/js/social-proof-admin.js'); s = p.read_text()
edits = [
# State
("""  var loadedOk = false;
""", """  var loadedOk = false;
  var testimonials = [];
  var testimonialsOk = true;
"""),
# Elements
("""      panel: $('admin-panel-testimonials'),
""", """      panel: $('admin-panel-social-proof'),
      unused: $('admin-social-proof-unused'),
      unusedList: $('admin-social-proof-unused-list'),
      numberNote: $('social-proof-number-note'),
"""),
# Cards
("""  function render() {
    if (!els.list) return;
    els.list.innerHTML = rows.map(function (r, i) {
      var e = r.entry;
      var result = e.stat
        ? '<strong>' + esc(e.stat) + '</strong> ' + esc(e.label)
        : '<span class="admin-social-proof-muted">No number yet</span>';
      var meta = [SP.sourceLabel(e.source, 'en'), SP.monthLabel(e.asOf, 'en')].filter(Boolean).join(' · ');
      return '<li class="admin-social-proof-row" data-index="' + i + '">' +
        (e.logoUrl
          ? '<img class="admin-social-proof-logo" src="' + esc(e.logoUrl) + '" alt="">'
          : '<span class="admin-social-proof-logo is-empty" aria-hidden="true"></span>') +
        '<div class="admin-social-proof-main">' +
          '<p class="admin-social-proof-name">' + esc(e.client) + '</p>' +
          '<p class="admin-social-proof-result">' + result + '</p>' +
          (meta ? '<p class="admin-social-proof-meta">' + esc(meta) + '</p>' : '') +
          '<p class="admin-social-proof-chips">' + chipHtml(r) + '</p>' +
        '</div>' +
        '<div class="admin-social-proof-actions">' +
          '<button type="button" class="admin-social-proof-move" data-move="-1" aria-label="Move ' + esc(e.client) + ' up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="admin-social-proof-move" data-move="1" aria-label="Move ' + esc(e.client) + ' down"' + (i === rows.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '<button type="button" class="btn btn-secondary admin-social-proof-checkin" data-checkin>Check-in</button>' +
          '<button type="button" class="btn btn-secondary admin-social-proof-edit" data-edit>Edit</button>' +
        '</div></li>';
    }).join('');
  }""", """  function projectsAll() {
    return Array.isArray(global.portfolioProjectsAll) ? global.portfolioProjectsAll : [];
  }

  function findTestimonial(id) {
    return testimonials.filter(function (t) { return t.id === id; })[0] || null;
  }

  function stars(n) {
    return n > 0 ? '<span class="admin-social-proof-stars" aria-label="' + n + ' of 5 stars">' + '★'.repeat(n) + '</span> ' : '';
  }

  function homepageBlock(e) {
    var line = e.stat
      ? '<strong>' + esc(e.stat) + '</strong> ' + esc(e.label)
      : (e.summary ? '“' + esc(e.summary) + '”' : '<span class="admin-social-proof-muted">No quote or number yet</span>');
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Homepage</p>' +
      '<p class="admin-social-proof-text">' + line + '</p>' +
      '<p class="admin-social-proof-meta">' + esc(SP.metaLine(e, 'en')) + '</p>' +
      '</div>';
  }

  function outcomeBlock(p) {
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Outcome · ' + esc(p.title || 'Project') + '</p>' +
      '<p class="admin-social-proof-text">' + esc(SP.quoteFromText(p.outcome)) + '</p>' +
      '<p class="admin-social-proof-block-actions">' +
        '<button type="button" class="btn btn-secondary" data-use-outcome>Use on homepage</button>' +
        '<button type="button" class="admin-social-proof-link" data-edit-project="' + esc(p.id) + '">Edit project</button>' +
      '</p></div>';
  }

  function testimonialBlock(t) {
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Testimonial · ' + esc([t.name, t.title].filter(Boolean).join(', ')) + '</p>' +
      '<p class="admin-social-proof-text">' + stars(t.rating) + '“' + esc(SP.quoteFromText(t.text)) + '”</p>' +
      '<p class="admin-social-proof-block-actions">' +
        '<button type="button" class="btn btn-secondary" data-use-testimonial="' + esc(t.id) + '">Use on homepage</button>' +
        '<button type="button" class="admin-social-proof-link" data-open-testimonials>Open in Testimonials</button>' +
      '</p></div>';
  }

  function render() {
    if (!els.list) return;
    var projects = projectsAll();
    els.list.innerHTML = rows.map(function (r, i) {
      var e = r.entry;
      var outcome = SP.outcomeFor(e, projects);
      var fromClient = SP.testimonialsFor(e, testimonials);
      return '<li class="admin-social-proof-row" data-index="' + i + '">' +
        '<div class="admin-social-proof-head">' +
          (e.logoUrl
            ? '<img class="admin-social-proof-logo" src="' + esc(e.logoUrl) + '" alt="">'
            : '<span class="admin-social-proof-logo is-empty" aria-hidden="true"></span>') +
          '<div class="admin-social-proof-main">' +
            '<p class="admin-social-proof-name">' + esc(e.client) + '</p>' +
            '<p class="admin-social-proof-chips">' + chipHtml(r) + '</p>' +
          '</div>' +
          '<div class="admin-social-proof-actions">' +
            '<button type="button" class="admin-social-proof-move" data-move="-1" aria-label="Move ' + esc(e.client) + ' up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button type="button" class="admin-social-proof-move" data-move="1" aria-label="Move ' + esc(e.client) + ' down"' + (i === rows.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '<button type="button" class="btn btn-secondary admin-social-proof-checkin" data-checkin>Check-in</button>' +
            '<button type="button" class="btn btn-secondary admin-social-proof-edit" data-edit>Edit</button>' +
          '</div>' +
        '</div>' +
        '<div class="admin-social-proof-proof">' +
          homepageBlock(e) +
          (outcome ? outcomeBlock(outcome) : '') +
          fromClient.map(testimonialBlock).join('') +
        '</div></li>';
    }).join('');
    renderUnused(projects);
  }

  function renderUnused(projects) {
    if (!els.unusedList) return;
    var u = SP.unusedProof(rows.map(function (r) { return r.entry; }), testimonials, projects);
    var items = u.testimonials.map(function (t) {
      return '<li class="admin-social-proof-unused-item">' +
        '<p class="admin-social-proof-kicker">Testimonial · ' + esc([t.name, t.company].filter(Boolean).join(' · ')) + '</p>' +
        '<p class="admin-social-proof-text">' + stars(t.rating) + '“' + esc(SP.quoteFromText(t.text)) + '”</p>' +
        '<p class="admin-social-proof-block-actions"><button type="button" class="btn btn-secondary" data-add-testimonial="' + esc(t.id) + '">Add to homepage</button></p>' +
        '</li>';
    }).concat(u.outcomes.map(function (p) {
      return '<li class="admin-social-proof-unused-item">' +
        '<p class="admin-social-proof-kicker">Outcome · ' + esc(p.title || 'Project') + '</p>' +
        '<p class="admin-social-proof-text">' + esc(SP.quoteFromText(p.outcome)) + '</p>' +
        '<p class="admin-social-proof-block-actions"><button type="button" class="btn btn-secondary" data-add-outcome="' + esc(p.id) + '">Add to homepage</button></p>' +
        '</li>';
    }));
    els.unused.hidden = !items.length;
    els.unusedList.innerHTML = items.join('');
  }

  /** One read per load; a failure leaves the cards up without testimonials. */
  async function loadTestimonials() {
    if (!global.db || !global.getDocs || !global.collection) { testimonialsOk = false; return []; }
    try {
      var snap = await global.getDocs(global.collection(global.db, 'testimonials'));
      var list = [];
      snap.forEach(function (d) { list.push(testimonialFromDoc(d.id, d.data())); });
      testimonialsOk = true;
      return list;
    } catch (err) {
      console.warn('Testimonials load failed', err);
      testimonialsOk = false;
      return [];
    }
  }"""),
# load(): read testimonials alongside, combine status
("""      status('Loading social proof…');
      try {
        var both = await Promise.all([""", """      status('Loading social proof…');
      var testimonialsRead = loadTestimonials();
      var note = '';
      try {
        var both = await Promise.all(["""),
("""        loadedOk = true;
        status(rows[0] && rows[0].builtIn ? 'Showing the built-in clients. Your first save copies them into the database.' : '');
      } catch (err) {
        console.warn('Social proof load failed', err);
        rows = rowsFrom(null, null);
        loadedOk = false;
        status('Couldn’t read the social proof list (check your connection, or deploy the database rules). Saving is off until it loads, so reopen this tab.', true);
      }
      render();""", """        loadedOk = true;
        note = rows[0] && rows[0].builtIn ? 'Showing the built-in clients. Your first save copies them into the database.' : '';
      } catch (err) {
        console.warn('Social proof load failed', err);
        rows = rowsFrom(null, null);
        loadedOk = false;
        note = 'Couldn’t read the social proof list (check your connection, or deploy the database rules). Saving is off until it loads, so reopen this tab.';
      }
      testimonials = await testimonialsRead;
      if (!testimonialsOk) note = (note ? note + ' ' : '') + 'Couldn’t load testimonials, so the cards show without them.';
      status(note, !loadedOk || !testimonialsOk);
      render();"""),
# Drawer: prefill
("""  function openDrawer(index) {
    var r = index != null ? rows[index] : null;
    els.form.reset();
    showErrors([]);
    els.id.value = r ? r.id : '';
    els.title.textContent = r ? 'Edit ' + r.entry.client : 'Add client';
    fillProjects(r ? r.entry.projectId : '');""", """  /** prefill (optional): fields from a testimonial or Outcome, applied over the entry. Nothing saves until Save. */
  function openDrawer(index, prefill) {
    var r = index != null ? rows[index] : null;
    var pre = prefill || {};
    els.form.reset();
    showErrors([]);
    els.id.value = r ? r.id : '';
    els.title.textContent = r ? 'Edit ' + r.entry.client : 'Add client';
    fillProjects(pre.projectId || (r ? r.entry.projectId : ''));"""),
("""      els.published.checked = e.published;
    }
    els.del.hidden = !r || r.builtIn;""", """      els.published.checked = e.published;
    }
    if (pre.client != null && !r) els.client.value = pre.client;
    if (pre.summary != null) els.summary.value = pre.summary;
    if (pre.tagline != null) els.tagline.value = pre.tagline;
    if (pre.published === false) els.published.checked = false;
    if (els.numberNote) els.numberNote.hidden = !(r && r.entry.stat);
    els.del.hidden = !r || r.builtIn;"""),
# Clicks on cards and the unused list
("""      if (ev.target.closest('[data-checkin]')) { checkIn(rows[i]); return; }
      if (ev.target.closest('[data-edit]')) openDrawer(i);
    });""", """      if (ev.target.closest('[data-checkin]')) { checkIn(rows[i]); return; }
      var useT = ev.target.closest('[data-use-testimonial]');
      if (useT) {
        var t = findTestimonial(useT.getAttribute('data-use-testimonial'));
        if (t) openDrawer(i, prefillFromTestimonial(t));
        return;
      }
      if (ev.target.closest('[data-use-outcome]')) {
        var p = SP.outcomeFor(rows[i].entry, projectsAll());
        if (p) openDrawer(i, prefillFromOutcome(p));
        return;
      }
      var ep = ev.target.closest('[data-edit-project]');
      if (ep) {
        if (typeof global.openPortfolioProjectEditor === 'function') global.openPortfolioProjectEditor(ep.getAttribute('data-edit-project'));
        return;
      }
      if (ev.target.closest('[data-open-testimonials]')) {
        var tab = doc.getElementById('admin-tab-testimonials');
        if (tab) tab.click();
        return;
      }
      if (ev.target.closest('[data-edit]')) openDrawer(i);
    });
    if (els.unusedList) {
      els.unusedList.addEventListener('click', function (ev) {
        var at = ev.target.closest('[data-add-testimonial]');
        if (at) {
          var t = findTestimonial(at.getAttribute('data-add-testimonial'));
          if (t) openDrawer(null, newEntryFromTestimonial(t));
          return;
        }
        var ao = ev.target.closest('[data-add-outcome]');
        if (ao) {
          var id = ao.getAttribute('data-add-outcome');
          var p = projectsAll().filter(function (x) { return x.id === id; })[0];
          if (p) openDrawer(null, newEntryFromOutcome(p));
        }
      });
    }"""),
# Late-load auto-open on the new panel
("""  var panel = doc && doc.getElementById('admin-panel-testimonials');""", """  var panel = doc && doc.getElementById('admin-panel-social-proof');"""),
]
for old, new in edits:
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new)
p.write_text(s); print('ok')
EOF
node -e "new Function(require('fs').readFileSync('assets/js/social-proof-admin.js','utf8'))" && echo parses
```

Expected: `ok`, `parses`.

- [ ] **Step 6: CSS: the row becomes a card**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('assets/css/style.css'); s = p.read_text()
old = """.admin-social-proof-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--jet);
  border-radius: 14px;
  background: var(--eerie-black-2);
}"""
new = """/* One card per client: head row, then Homepage / Outcome / Testimonial blocks. */
.admin-social-proof-row {
  padding: 12px 14px;
  border: 1px solid var(--jet);
  border-radius: 14px;
  background: var(--eerie-black-2);
}

.admin-social-proof-head {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.admin-social-proof-proof {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.admin-social-proof-block,
.admin-social-proof-unused-item {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--jet);
  border-radius: 10px;
  background: hsla(0, 0%, 100%, 0.02);
}

.admin-social-proof-kicker {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: var(--fw-600);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--light-gray-70);
}

.admin-social-proof-text {
  margin: 0;
  font-size: var(--fs-7);
  line-height: 1.5;
  color: var(--light-gray);
  overflow-wrap: anywhere;
}

.admin-social-proof-text strong {
  color: var(--orange-yellow-crayola);
}

.admin-social-proof-stars {
  display: inline;
  color: var(--orange-yellow-crayola);
}

.admin-social-proof-block-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0;
}

.admin-social-proof-link {
  display: inline;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--fs-8);
  color: var(--light-gray-70);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.admin-social-proof-unused {
  margin-top: 24px;
}

.admin-social-proof-unused-list {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}"""
assert s.count(old) == 1
s = s.replace(old, new)
old = """  .admin-social-proof-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }"""
assert s.count(old) == 1
s = s.replace(old, """  .admin-social-proof-head {
    grid-template-columns: 40px minmax(0, 1fr);
  }""")
p.write_text(s); print('ok')
EOF
```

Expected: `ok`.

- [ ] **Step 7: Run the Node tests**

Run: `for t in social-proof social-proof-rules social-proof-admin; do node scripts/test-$t.mjs | grep -c '✗'; done; node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `0` three times, then `✓ preflight: …`

- [ ] **Step 8: Point the existing admin browser checks at the new panel**

```bash
sed -i '' "s/getElementById('admin-panel-testimonials')/getElementById('admin-panel-social-proof')/g" $SCRATCH/sp-admin-check.cjs $SCRATCH/sp-admin-fixes.cjs
grep -c "admin-panel-social-proof" $SCRATCH/sp-admin-check.cjs $SCRATCH/sp-admin-fixes.cjs
```

Expected: each file prints `1`.

- [ ] **Step 9: New browser check for the tab**

Create `$SCRATCH/sp-tab-check.cjs`:

```js
// Social proof tab, WebKit, fake RTDB + fake Firestore. No production reads or writes.
const { webkit } = require('/Users/ruben/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };

const SEED = {
  socialProof: {
    rizo: { client: "Rizo's Pizzeria", logoUrl: '/assets/images/logo/logo-2-color.png', stat: '', label: '', source: '', asOf: '', summary: 'Old line.', tagline: 'Restaurant · online ordering', projectId: 'priv1', published: true, order: 10, updatedAt: 1 },
    shelton: { client: 'Shelton Springs HOA', logoUrl: '', stat: '86', label: 'residents on the portal', source: 'app', asOf: '2026-09', summary: '', tagline: 'HOA · management portal', projectId: '', published: true, order: 20, updatedAt: 1 },
  },
  socialProofDetails: { rizo: { kind: 'none' }, shelton: { kind: 'count', count: '86' } },
};
const TESTIMONIALS = [
  { id: 't1', name: 'Roberto Rizo', title: 'Owner', company: 'Rizo’s Pizzeria', text: 'Ruben built exactly what we needed.\n\nSecond paragraph.', rating: 5, createdAt: { seconds: 200 } },
  { id: 't2', name: 'Jane Doe', title: 'CEO', company: 'Acme Co', text: 'Solid work.', rating: 4, createdAt: { seconds: 100 } },
];
const PROJECTS = [
  { id: 'priv1', title: "Rizo's Pizzeria", outcome: 'Orders now come in online.\n\nMore detail.', visibility: 'private' },
  { id: 'proc1', title: 'ProCleaning Seattle', outcome: 'Crews see every job in one app.' },
  { id: 'tmpl1', title: 'Lawn Care Platform', outcome: 'Template outcome.', isTemplate: true },
];

async function prepare(browser, opts) {
  const page = await (await browser.newContext({ viewport: { width: (opts && opts.width) || 1200, height: 900 } })).newPage();
  await page.goto('http://localhost:5178/'); await page.waitForTimeout(2500);
  await page.evaluate(({ seed, tests, projects, failTestimonials }) => {
    const store = JSON.parse(JSON.stringify(seed));
    const get = (path) => path.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), store);
    const set = (path, v) => { const ks = path.split('/').filter(Boolean); let o = store; ks.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; }); if (v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
    let n = 0;
    window.__store = store; window.__writes = 0;
    window.rtdb = {}; window.rtdbRef = (db, path) => ({ path: path || '' });
    window.rtdbGet = async (r) => ({ val: () => { const v = get(r.path); return v === undefined ? null : JSON.parse(JSON.stringify(v)); } });
    window.rtdbUpdate = async (r, obj) => { window.__writes++; Object.keys(obj).forEach((k) => set((r.path ? r.path + '/' : '') + k, obj[k])); };
    window.rtdbPush = () => ({ key: 'k' + (++n) });
    window.isAdminSession = () => true;
    window.db = {}; window.collection = (db, name) => ({ name });
    window.getDocs = async () => { if (failTestimonials) throw new Error('offline'); return { forEach: (cb) => tests.forEach((t) => cb({ id: t.id, data: () => t })) }; };
    window.portfolioProjectsAll = projects;
    window.__opened = null; window.openPortfolioProjectEditor = (id) => { window.__opened = id; };
    const banner = document.getElementById('cwr-cookie-banner'); if (banner) banner.remove();
    let el = document.getElementById('admin-panel-social-proof');
    while (el && el !== document.body) { el.hidden = false; if (getComputedStyle(el).display === 'none') el.style.display = 'block'; el = el.parentElement; }
    window.__tabClicked = false;
    const tab = document.getElementById('admin-tab-testimonials'); if (tab) tab.addEventListener('click', () => { window.__tabClicked = true; });
  }, { seed: SEED, tests: TESTIMONIALS, projects: PROJECTS, failTestimonials: !!(opts && opts.failTestimonials) });
  await page.addScriptTag({ url: '/assets/js/social-proof-admin.js?v=tab' + Date.now() });
  await page.evaluate(() => window.CWR_SOCIAL_PROOF.open()); await page.waitForTimeout(500);
  return page;
}

(async () => {
  const browser = await webkit.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/webkit-2370/pw_run.sh' });
  let page = await prepare(browser);

  const cards = await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-row')].map((li) => ({
    name: li.querySelector('.admin-social-proof-name').textContent,
    kickers: [...li.querySelectorAll('.admin-social-proof-kicker')].map((k) => k.textContent),
  })));
  ok(cards.length === 2 && cards[0].name === "Rizo's Pizzeria", 'one card per entry, in order');
  ok(cards[0].kickers.join(' | ') === "Homepage | Outcome · Rizo's Pizzeria | Testimonial · Roberto Rizo, Owner", `Rizo card: homepage + outcome + matched testimonial (curly apostrophe) — ${cards[0].kickers.join(' | ')}`);
  ok(cards[1].kickers.join() === 'Homepage', 'Shelton card: homepage only');
  const unused = await page.evaluate(() => ({ shown: !document.getElementById('admin-social-proof-unused').hidden, items: [...document.querySelectorAll('.admin-social-proof-unused-item .admin-social-proof-kicker')].map((k) => k.textContent) }));
  ok(unused.shown && unused.items.join(' | ') === 'Testimonial · Jane Doe · Acme Co | Outcome · ProCleaning Seattle', `not-yet list: unmatched testimonial + unlinked outcome, no template — ${unused.items.join(' | ')}`);

  // Use testimonial → drawer prefilled, nothing written.
  await page.click('.admin-social-proof-row:nth-child(1) [data-use-testimonial="t1"]');
  let d = await page.evaluate(() => ({ open: document.getElementById('social-proof-modal').classList.contains('active'), client: document.getElementById('social-proof-client').value, summary: document.getElementById('social-proof-summary').value, tagline: document.getElementById('social-proof-tagline').value, note: document.getElementById('social-proof-number-note').hidden, writes: window.__writes }));
  ok(d.open && d.client === "Rizo's Pizzeria" && d.summary === 'Ruben built exactly what we needed.' && d.tagline === 'Roberto Rizo · Owner, Rizo’s Pizzeria' && d.writes === 0, 'Use testimonial: quote + credit filled, nothing written');
  ok(d.note === true, 'no number on this entry → number note hidden');
  await page.click('#social-proof-modal .business-doc-modal-close');

  // Use outcome → quote only; bottom line unchanged.
  await page.click('.admin-social-proof-row:nth-child(1) [data-use-outcome]');
  d = await page.evaluate(() => ({ summary: document.getElementById('social-proof-summary').value, tagline: document.getElementById('social-proof-tagline').value }));
  ok(d.summary === 'Orders now come in online.' && d.tagline === 'Restaurant · online ordering', 'Use outcome: first paragraph, bottom line kept');
  await page.click('#social-proof-modal .business-doc-modal-close');

  // Number note on an entry that shows a number.
  await page.click('.admin-social-proof-row:nth-child(2) [data-edit]');
  ok(await page.evaluate(() => !document.getElementById('social-proof-number-note').hidden), 'entry with a number → note shown');
  await page.click('#social-proof-modal .business-doc-modal-close');

  // Add to homepage (testimonial) → draft on Save.
  await page.click('[data-add-testimonial="t2"]');
  d = await page.evaluate(() => ({ client: document.getElementById('social-proof-client').value, pub: document.getElementById('social-proof-published').checked, writes: window.__writes }));
  ok(d.client === 'Acme Co' && d.pub === false && d.writes === 0, 'Add to homepage: new draft filled, nothing written yet');
  await page.click('#social-proof-save-btn'); await page.waitForTimeout(500);
  const saved = await page.evaluate(() => Object.values(window.__store.socialProof).find((e) => e.client === 'Acme Co'));
  ok(saved && saved.published === false && saved.tagline === 'Jane Doe · CEO, Acme Co' && saved.summary === 'Solid work.', 'saved as a Draft with quote + credit');
  ok(await page.evaluate(() => ![...document.querySelectorAll('.admin-social-proof-unused-item .admin-social-proof-kicker')].some((k) => /Acme/.test(k.textContent))), 'Acme leaves the not-yet list after saving');

  // Add to homepage (outcome) links the project.
  await page.click('[data-add-outcome="proc1"]');
  d = await page.evaluate(() => ({ client: document.getElementById('social-proof-client').value, project: document.getElementById('social-proof-project').value, summary: document.getElementById('social-proof-summary').value }));
  ok(d.client === 'ProCleaning Seattle' && d.project === 'proc1' && d.summary === 'Crews see every job in one app.', 'Add outcome: draft linked to the project');
  await page.click('#social-proof-modal .business-doc-modal-close');

  // Last on this page (it may really switch tabs): Edit project + Open in Testimonials.
  await page.click('.admin-social-proof-row:nth-child(1) [data-edit-project="priv1"]');
  await page.evaluate(() => document.querySelector('.admin-social-proof-row:nth-child(1) [data-open-testimonials]').click());
  ok(await page.evaluate(() => window.__opened === 'priv1' && window.__tabClicked === true), 'Edit project opens the portfolio editor; Open in Testimonials switches tab');

  // Testimonials read fails → cards still render, message shown.
  page = await prepare(browser, { failTestimonials: true });
  const f = await page.evaluate(() => ({ cards: document.querySelectorAll('.admin-social-proof-row').length, msg: document.getElementById('admin-social-proof-status').textContent }));
  ok(f.cards === 2 && /Couldn’t load testimonials/.test(f.msg), 'testimonials read fails → cards still show + message');

  // Phone width: no overflow.
  page = await prepare(browser, { width: 393 });
  ok(await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-row, .admin-social-proof-unused-item')].every((r) => r.scrollWidth <= r.clientWidth + 1)), 'cards fit at 393px');
  await page.locator('#social-proof-admin-section').screenshot({ path: process.argv[2] + '/sp-tab-phone.png', timeout: 15000 });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
```

Run: `node $SCRATCH/sp-tab-check.cjs $SCRATCH`
Expected: every line `✓`. Then read `$SCRATCH/sp-tab-phone.png`. The cards should be readable, with the Homepage, Outcome and Testimonial blocks stacked.

- [ ] **Step 10: Re-run the existing browser checks**

Run: `for c in sp-home-check sp-admin-check sp-admin-fixes; do node $SCRATCH/$c.cjs $SCRATCH 2>&1 | grep -c '✗'; done`
Expected: `0` three times.

- [ ] **Step 11: Checkpoint (no commit)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 4: Final pass

- [ ] **Step 1:** `node scripts/preflight.mjs 2>&1 | tail -1`, then all four browser checks. Expected: everything `✓`.
- [ ] **Step 2:** `git status --short | grep '^??'`. Remove any `.playwright-mcp/` files this work created.
- [ ] **Step 3: Hand-off.** Tell Ruben:
  - the tab is under Content → Social proof
  - Use / Add to homepage only fill the editor
  - no rules deploy beyond the pending one
