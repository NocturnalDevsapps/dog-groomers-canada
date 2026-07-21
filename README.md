# Dog Groomers Canada

Static, GitHub Pages-ready dog grooming directory for [Dog Groomers Canada](https://doggroomerscanada.ca/).

## Live site

[Dog Groomers Canada](https://doggroomerscanada.ca/) helps people find dog groomers by province, city, and nearby search intent across Canada, with original grooming guides and planning tools for dog owners.

## What gets generated

- Homepage with search, province browsing, top cities, featured guides, grooming cost planning, grooming tools, editorial guidance, and clear directory value notes
- Province pages
- City pages with service planning sections, seasonal Canadian grooming challenges, and local booking questions
- Individual dog groomer profile pages with booking guidance, cost/quote notes, profile-specific questions, and correction links
- Service pages
- Dog grooming cost pages for Canada, each province, and major cities with enough local directory data
- Original grooming guide pages for techniques, seasonal care in Canada, breed-specific grooming needs, costs, and booking decisions
- Interactive owner tools for cost estimates, grooming frequency, matting risk, coat maintenance, puppy first-groom planning, winter paw care, and groomer call preparation
- About, contact, editorial policy, privacy, and terms pages
- Exact-intent keyword pages for `/dog-grooming/` and `/dog-grooming-near-me/`
- Search and near-me pages enhanced with JavaScript
- `sitemap.xml`, HTML sitemap, `robots.txt`, `CNAME`, `.nojekyll`, and `404.html`

## Journey review posture

Grow by Mediavine is installed sitewide while the Journey application is under review. Previous programmatic ad-network scripts, account tags, seller entries, ad slots, and empty ad placeholders are not generated. The root `ads.txt` remains accessible but empty until Journey provides the approved seller records during onboarding.

All generated profile pages remain `index,follow` and stay in `sitemap.xml`. The high-value review strategy is to improve the site with original guides, richer city pages, correction/claim signals, cost and booking content, Canadian grooming price references, and interactive owner tools under `/grooming-tools/`.

The current generated build includes 7,330 crawlable URLs, including 133 dog grooming cost pages and 8 grooming-tool pages. The cost pages use planning ranges and quote questions instead of fixed price claims, because real prices depend on dog size, coat condition, matting, handling, add-ons, mobile route needs, and local availability.

Before any major release, inspect Search Console indexing for the homepage, guide hub, tools hub, several city pages, and several guide articles. Preserve established URLs, canonicals, titles, and sitemap membership while improving original value and reader trust.

## Rebuild from the CSV

```bash
node tools/build-site.js
```

The generator reads:

```text
Apify Google Maps Scraper jJzJjRpnTviQKBwns - dog grooming only.csv
```

Generated pages are written directly into this folder so GitHub Pages can serve the site without a build step.

## GitHub Pages

1. Commit the generated files.
2. Push to GitHub.
3. In repository settings, enable Pages from the branch root.
4. Point DNS for `doggroomerscanada.ca` to GitHub Pages.

The `CNAME` file is already set to `doggroomerscanada.ca`.
