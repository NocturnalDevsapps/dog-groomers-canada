# Dog Groomers Canada

Static, GitHub Pages-ready dog grooming directory for [Dog Groomers Canada](https://doggroomerscanada.ca/).

## Live site

[Dog Groomers Canada](https://doggroomerscanada.ca/) helps people find dog groomers by province, city, and nearby search intent across Canada.

## What gets generated

- Homepage with search, province browsing, top cities, editorial guidance, and clear directory value notes
- Province pages
- City pages
- Individual dog groomer profile pages
- Service pages
- About, contact, editorial policy, privacy, and terms pages
- Exact-intent keyword pages for `/dog-grooming/` and `/dog-grooming-near-me/`
- Search and near-me pages enhanced with JavaScript
- `sitemap.xml`, HTML sitemap, `robots.txt`, `CNAME`, `.nojekyll`, and `404.html`

## AdSense review posture

The AdSense account meta tag remains in the site head, and `ads.txt` is generated at the domain root. Display ad slots are disabled in `tools/build-site.js` while the site is under review, and the AdSense script is limited to core trust/content pages so generated directory pages do not show empty ad surfaces before approval.

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
