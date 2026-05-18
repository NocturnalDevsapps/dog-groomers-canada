# Dog Groomers Canada

Static, GitHub Pages-ready dog grooming directory for `doggroomerscanada.ca`.

## What gets generated

- Homepage with search, province browsing, top cities, ad slots, and helpful grooming guidance
- Province pages
- City pages
- Individual dog groomer profile pages
- Service pages
- Exact-intent keyword pages for `/dog-grooming/` and `/dog-grooming-near-me/`
- Search and near-me pages enhanced with JavaScript
- `sitemap.xml`, HTML sitemap, `robots.txt`, `CNAME`, `.nojekyll`, and `404.html`

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
