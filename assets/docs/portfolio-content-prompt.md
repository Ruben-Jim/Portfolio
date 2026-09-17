# Prompt: fill out the portfolio projects

Paste everything in the fenced block below into Claude Code (or any coding agent)
from the repo root. It is written to be self-checking — the agent derives the
current gaps itself rather than trusting a snapshot in this file.

**Before you run it:** have the real numbers ready. The `outcome` field is a
public claim about a real client's results. The prompt tells the agent to ask
you rather than invent them — answer honestly or leave the field out. An
invented outcome on a portfolio is the kind of thing that ends a deal.

---

```
Fill out the incomplete portfolio project entries in
assets/js/portfolio-built-in-data.js (window.DEFAULT_PORTFOLIO_PROJECTS).

FIRST, show me the current state — don't trust anything I tell you about it:

  node -e "
  global.window={};const fs=require('fs');
  let s=fs.readFileSync('assets/js/portfolio-built-in-data.js','utf8');
  const m=s.match(/DEFAULT_PORTFOLIO_PROJECTS\s*=\s*(\[[\s\S]*?\n\];)/);
  eval('var arr='+m[1]);
  arr.forEach(p=>console.log(p.title.padEnd(44),
    'desc:'+String((p.description||'').length).padStart(4),
    'outcome:'+(p.outcome?'y':'NO '),
    'pkg:'+(p.pricingPackage||'NONE').padEnd(12),
    'buyNow:'+(p.buyNowLabel?'y':'NO')));"

SCHEMA — match the existing entries exactly. This is a plain browser-global JS
file (no build step, no TypeScript), so keep the existing style: two-space
indent, single quotes, trailing `showQuoteButton` last.

  order            number, ascending in steps of 10
  category         'professional' | 'creative'
  title            string
  projectUrl       live demo URL, or '#' if there is no live deploy
  imageUrl         '/assets/images/projects/<slug>/<slug>.webp'
  imageAlt         short, descriptive, no "image of"
  description      2-3 sentences, 180-260 chars — see RULES below
  techTags         3 tags, e.g. ['React Native', 'Expo', 'Firebase']
  outcome          1-2 sentences on the real result — see RULES below
  pricingPackage   MUST be one of: 'starter-page' | 'website' | 'starter' |
                   'growth' | 'linktree'   (whitelist is sanitizePricingPackage()
                   in assets/js/script.js — anything else is silently dropped)
  buyNowLabel      'Buy Now: $X'
  buyPremiumLabel  'Premium with Customizations: $X - $Y'
  showQuoteButton  true

WHAT TO FIX

1. pricingPackage is missing on almost every project. Add it to all of them,
   choosing from the whitelist above based on what the project actually is:
   one page + admin -> 'starter-page'; multi-page site -> 'website';
   site + mobile app -> 'starter'; full ops platform -> 'growth';
   link-in-bio -> 'linktree'.

2. outcome is missing on several. STOP and ASK ME for each one — do not write
   an outcome from imagination. If I don't have a real number or result, leave
   the field off entirely rather than writing something vague and impressive.

3. buyNowLabel / buyPremiumLabel are missing on several AND the existing ones
   are stale. Pro Cleaning says "Buy Now: $2,000", which matches no current
   package. Current tiers on /services-pricing are:
     Starter Page $499 | Business Website $999 | Starter Presence $1,500
     Growth Platform $3,500 | Business Platform $6k-12k | Studio Build $15k-40k
     Link Tree $99-199
   Re-price every buyNowLabel to the tier that project actually represents, and
   tell me each change you make so I can sanity-check it.

4. Descriptions are uneven (105-257 chars). Bring the short ones up to the
   180-260 range.

RULES

- Never invent an outcome, metric, client name, or result. Ask me.
- Describe what the software DOES for the business owner, not the tech stack —
  the stack is already in techTags. "Customers book a recurring clean and pay a
  deposit before you pick up the phone" beats "leverages Firebase for realtime
  data sync."
- Match the voice on the live site: plain, concrete, second person, no
  marketing superlatives ("cutting-edge", "seamless", "robust" are banned).
- Do not touch projectUrl values. They were all verified live on 2026-09-12;
  10 of 11 return 200 and Grippy Socks is intentionally '#' because its
  deployment no longer exists.
- Do not add fields that aren't in the schema above — portfolio-detail-shared.js
  only reads the listed ones, so extra keys are dead weight.

WHEN DONE

  node --check assets/js/portfolio-built-in-data.js

and re-run the inspection command from the top to show me the before/after.
This file is a browser global loaded directly by index.html, so no sync or
build step is needed. Do not commit — I handle my own commits.
```

---

## Notes for future you

- These entries are the **fallback** used when RTDB `portfolioProjects` is
  empty. Admin → Portfolio Projects → "Publish built-in projects" copies them
  into the live store, so editing this file only affects new publishes — if a
  project is already live in RTDB, edit it in the admin instead.
- `getPortfolioPricingPackage()` in `script.js` has a hardcoded fallback that
  maps anything titled "Lawn Care" to `starter-page`. Once every project has an
  explicit `pricingPackage`, that special case can go.
