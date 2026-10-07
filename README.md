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

## AdSense setup

The site uses its previously approved Google AdSense publisher account. The generator includes one async loader on eligible, indexable pages and the previously configured responsive leaderboard, sidebar and in-content units. Quality-held profiles, redirects, the error page, and trust or submission pages do not load AdSense. Google Analytics remains installed; Journey and Grow by Mediavine have been removed. The publisher must verify the active site status, consent message, Policy center, and Auto ads settings in the same AdSense account. Code deployment alone does not enable or guarantee ad serving.

The root `ads.txt` is generated from the repository's verified AdSense seller record. GitHub Pages serves it as a static file. Check that the record matches the active AdSense account before changing it. Do not copy these account identifiers to another website. Run `node tools/audit-monetization.js`, `node tools/audit-listing-pages.js`, and the AdSense skill's audit script after rebuilding. Previous Adsterra, Monetag, Propeller and Mediavine scripts are not generated.

Generated profiles are visibly labelled as directory records. Profiles with normalized facts recovered from linked first-party websites receive an `Official website facts checked` label; this is source-backed automated extraction, not a claim of individual reporting. Manually synthesized source reviews and records updated directly by a business receive separate provenance labels. The generator keeps useful profiles `index,follow`, but applies `noindex,follow` and removes sitemap membership when a profile has the lowest information-depth score and no editorial review, business submission, documented image rights, or keep-index exception. Keep-index exceptions protect limited profiles with demonstrated organic visits; private Search Console metrics are not stored in the repository.

Business-specific images render only when `imageRights` records owner permission, a reusable licence, or a public-domain basis. Public availability, attribution, and source links are not treated as permission. The current build displays the approved GroomArts Academy gallery and uses a site-owned placeholder elsewhere, with an authorization flow for businesses that want to submit photos.

The current generated build includes 7,248 sitemap URLs and 5,645 indexable business profiles. Another 84 business profiles remain accessible on quality hold, and 3 legacy profile redirects remain noindex. The build also includes 1,807 profiles with rendered first-party website enrichment, 6 manually reviewed profiles, 133 dog grooming cost pages, and 8 grooming-tool pages. The cost pages use planning ranges and quote questions instead of fixed price claims, because real prices depend on dog size, coat condition, matting, handling, add-ons, mobile route needs, and local availability.

Before any major release, inspect Search Console indexing for the homepage, guide hub, tools hub, several city pages, and several guide articles. Preserve established URLs, canonicals, titles, and sitemap membership while improving original value and reader trust.

The October 2, 2026 review assessed all 87 previously held profiles. The initial pass included name/location searches for 79 profiles, direct linked-site crawls for 6 others, and local identity checks for 2 ambiguously named records. Follow-up phone searches covered those 2 records and 6 others. Crawl4AI checked 33 candidate URLs across 16 profiles; the remaining 71 were searched but not crawled. This was bounded source discovery, not an exhaustive investigation. Three profiles gained substantive official-source reviews; 84 remain held for insufficient or mismatched evidence. Per-profile decisions and source URLs are recorded in `data/noindex-profile-research.json`. The indexing gate and keep-index exceptions are unchanged. These local changes do not guarantee Google indexing or an AdSense policy outcome.

## Rebuild from the CSV

```bash
node tools/build-site.js
```

The generator reads:

```text
Apify Google Maps Scraper jJzJjRpnTviQKBwns - dog grooming only.csv
```

Generated pages are written directly into this folder so GitHub Pages can serve the site without a build step.

## Permanent listing exclusions

`data/listing-exclusions.json` records businesses that must not appear in the directory. The build filters both CSV imports and manual submissions before enrichment and again after corrections. Matches use a listing ID, original route, source identifier, dedicated website domain (including subdomains), Canadian phone number, or an exact normalized business-name alias plus city. A changed scraper ID or URL does not bypass these other identities. Only record domains and phone numbers dedicated to the excluded business, not shared chain or booking-platform identities.

The enrichment pipeline reads the same registry, skips excluded targets, and removes excluded cached records when loading or writing results. Missing or malformed exclusion data stops the build and enrichment. Keep the registry across future dataset replacements, and check new ingestion tools against it before publication. Record public business identities, the exclusion date and a concise reason; do not publish private request emails. Removing an exclusion requires an explicit decision to reinstate the business.

Run `node --test tools/tests/listing-exclusions.test.js` and the Python regression suite after changing these safeguards.

## First-party profile enrichment

The optional research pipeline checks every eligible profile that links to an independent business website or a business-controlled booking page. It stores only normalized facts such as named grooming services, access model, credentials or policies, booking links, and structured location data. It does not copy marketing prose or store published price amounts, and it rejects pages that do not match the business and location closely enough.

```bash
python3.12 -m venv .venv-crawl
source .venv-crawl/bin/activate
pip install -r requirements-crawl.txt
crawl4ai-setup
crawl4ai-doctor
python tools/enrich-thin-listings.py \
  --scope all \
  --crawl4ai-fallback \
  --output data/thin-listing-enrichment.json \
  --failure-report /tmp/dgc-listing-enrichment-failures.json
```

Direct HTML is attempted first and Crawl4AI renders sites that require a browser. Profiles without a usable independent source remain labelled directory records and keep explicit missing-information guidance; unsupported business claims are never inferred.

Run the source-safety regression tests with:

```bash
python3.12 -m unittest discover -s tools/tests -p 'test_*.py' -v
```

## GitHub Pages

1. Commit the generated files.
2. Push to GitHub.
3. In repository settings, enable Pages from the branch root.
4. Point DNS for `doggroomerscanada.ca` to GitHub Pages.

The `CNAME` file is already set to `doggroomerscanada.ca`.

## Content dates and local comparisons

Sitemap `lastmod` values come only from `data/page-content-updates.json`. Add a route, the actual date of a substantial content change, and a note describing that change. Unknown dates are omitted. Rebuilding the site, changing analytics, or updating a cache version must not refresh every page's content date. The generator rejects invalid, future, or undocumented dates.

`data/city-local-reviews.json` contains manually reviewed official sources for comparisons in Calgary, Edmonton, Toronto, Montreal, Hamilton, and Surrey, plus additive details on 15 matching profiles. Preserve source links and the actual review date; recheck the source before refreshing a claim. These sections describe published services and booking logistics, not endorsements, independently inspected premises, or guaranteed availability. Existing titles, URLs, canonical tags, listing order, and indexing quality rules remain stable.

## Enquiry measurement

`assets/enquiries.js` measures delegated interactions on static and dynamically rendered directory links:

| Event | Meaning | GA4 key event |
| --- | --- | --- |
| `phone_click` | Business telephone link selected | Yes |
| `booking_click` | Explicit appointment link selected | Yes |
| `listing_website_click` | Business website link selected | No |
| `directions_click` | Business map/directions action selected | No |
| `listing_email_prepared` | Valid listing form prepared an email using the existing mailto flow | No |

These measure intent: a phone click does not confirm a connected call, a booking click does not confirm an appointment, and email preparation does not confirm a sent message. True completed calls/bookings require a separate integration with the phone or booking provider.

Event parameters include the public listing ID, city/province slugs and placement; web actions also include the destination domain. They exclude phone numbers, email addresses, URL query strings and form contents. Tracking does not prevent navigation and tolerates unavailable analytics.

GA4 property 538257267 has `phone_click` and `booking_click` configured as key events with no default monetary value. Event-scoped custom dimensions are Enquiry city (`city_slug`), Enquiry province (`province_slug`), Enquiry placement (`link_placement`) and Enquiry listing ID (`listing_id`). In Explore, use event name and these dimensions with event count, filtering to enquiry events and a city or short date range. Data is prospective after deployment and visitor interaction; custom reporting may need 24–48 hours. No synthetic production events should be sent during QA.

Run focused regressions after changing these modules:

```bash
node --test tools/tests/enquiries.test.js tools/tests/sitemap-dates.test.js
node tools/audit-listing-pages.js
node tools/audit-monetization.js
```

Use a local preview that blocks external analytics/ad requests for browser QA. Private Search Console exports, the individual excluded-page review and account analytics reports are kept outside this public repository.

## Amazon Associates links

### Publisher-authored book

`tools/between-grooms-guide.js` supplies the original `/guides/dog-coat-care-between-grooming-appointments/` article and one optional recommendation for Omar Bernard's *The Between-Grooms Coat Care System*. The article contains a usable home-care plan and notebook log, independent care sources, and professional-help boundaries before the book recommendation. Its Amazon.ca paperback URL and contents were checked against the public listing and KDP bookshelf on October 7, 2026.

The recommendation discloses the publisher/author relationship and royalty earnings beside the link. It uses `rel="sponsored nofollow noopener"` and a direct product URL without an Associate tag. It does not claim independent professional review, include price/availability claims, copy Amazon images, or add product/review schema. The paperback's separate digital workbook exclusion is explicit. Keep this recommendation distinct from AdSense units and optional affiliate shopping comparisons. The homepage and guide collections link to the useful article, rather than placing purchase links across the directory.

The guide has a dedicated search title and meta description, a self-referencing canonical, Article/Breadcrumb/FAQ markup, its actual publication/update dates, a crawlable sitemap entry, and a contextual link from the bath-and-brush guide. Its social metadata and Article image use the site's existing grooming JPEG with explicit dimensions and descriptive alternate text. The useful article targets between-appointment care; the bath-and-brush article keeps its separate service focus. SEO checks establish technical readiness, not Google indexing, rankings, rich results, or sales.

### Affiliate shopping categories

Amazon Canada affiliate search links use this site's verified Associate ID, `doggroomersca-20`. The website is registered in that account. Do not reuse its tag on another site.

`data/guide-shopping.json` deliberately limits the initial rollout to three existing technique guides: line brushing, bath and brush, and nail care. Each has two relevant category links, original buying criteria, limitations, alternatives to purchasing, and source links. These are shopping comparisons, not hands-on product reviews. `tools/guide-shopping.js` creates direct HTTPS Amazon.ca search URLs with the tag, `rel="sponsored nofollow noopener"`, and visible `(paid link)` labels. Every participating article shows the required Amazon Associate statement before its first affiliate link and links to the editorial disclosure.

Keep prices, ratings, discounts, availability promises, copied product descriptions, Amazon images, tracking widgets and product-review schema out of this static implementation. Amazon prices/availability require its supported data tools and rules. Update the original guidance and sources before expanding to another guide; record substantive content dates in both the guide data and the sitemap registry. Existing URLs, titles and indexing controls must remain unchanged. The generated article's visible review date and Article `dateModified` follow the reviewed guide date; original publication dates remain intact.

No Amazon ad script, pixel, display unit or ads.txt entry is needed for these text links. AdSense configuration is independent of these affiliate links. Amazon reports clicks and qualifying purchases in Associates Central; enquiry key events must not count affiliate shopping clicks. Owner-side tax/payment onboarding is managed in Amazon Associates, not in this repository.
