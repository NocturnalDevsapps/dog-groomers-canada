#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const GROOMERS_DIR = path.join(ROOT, "groomers");
const SITE_ORIGIN = "https://doggroomerscanada.ca";
const failures = [];
const descriptions = new Map();
const metaDescriptions = new Map();
const wordCounts = [];
const officialWebsiteRoutes = new Set();
const editorialReviewRoutes = new Set();
const coverage = {
  websiteServices: 0,
  websiteAccess: 0,
  websitePolicies: 0,
  breedMentions: 0,
  pricing: 0,
  appointments: 0,
  accessibility: 0,
  amenities: 0,
  reviewThemes: 0,
  websiteLocations: 0,
  officialWebsiteEnrichment: 0,
  directHtmlResearch: 0,
  crawl4aiResearch: 0,
  editorialReviews: 0,
  businessSubmissions: 0,
  imageRightsProfiles: 0,
  limitedInformationContext: 0,
};

const files = findIndexFiles(GROOMERS_DIR);
let profileCount = 0;
let crawlableCount = 0;
let noindexProfileCount = 0;
let redirectCount = 0;
const crawlableRoutes = new Set();

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  const expectedRoute = `/${relative.replace(/index\.html$/, "")}`;
  const isNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const isRedirect = isNoindex && /<meta\s+http-equiv="refresh"/i.test(html);
  if (isRedirect) {
    redirectCount += 1;
    continue;
  }

  profileCount += 1;
  if (isNoindex) {
    noindexProfileCount += 1;
  } else {
    crawlableCount += 1;
    crawlableRoutes.add(expectedRoute);
  }
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const canonicalMatches = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)];
  const leadMatches = [...html.matchAll(/<p\s+class="lead">([\s\S]*?)<\/p>/gi)];
  const signalSections = [...html.matchAll(/data-profile-signals/g)];
  const provenanceSections = [...html.matchAll(/class="profile-provenance"/g)];

  if (h1Matches.length !== 1) fail(relative, `expected one H1, found ${h1Matches.length}`);
  if (canonicalMatches.length !== 1) fail(relative, `expected one canonical, found ${canonicalMatches.length}`);
  if (leadMatches.length !== 1) fail(relative, `expected one profile lead, found ${leadMatches.length}`);
  if (signalSections.length !== 1) fail(relative, `expected one business-specific signal section, found ${signalSections.length}`);
  if (provenanceSections.length !== 1) fail(relative, `expected one profile provenance line, found ${provenanceSections.length}`);
  if (!/data-content-type="directory-record"/.test(html)) fail(relative, "profile is not labelled as a directory record");
  if (isNoindex) {
    if (!/data-profile-index-status="noindex"/.test(html)) fail(relative, "noindex profile is missing its body status");
    const depth = Number((html.match(/data-profile-depth="(\d+)"/) || [null, ""])[1]);
    if (!Number.isFinite(depth) || depth > 1) fail(relative, `noindex profile has unsupported depth ${depth}`);
    if (/data-editorial-profile-review|Business-submitted (?:update|listing|correction)|data-image-rights-note/.test(html)) {
      fail(relative, "reviewed, submitted, or image-authorized profile was noindexed");
    }
  } else if (!/data-profile-index-status="index"/.test(html)) {
    fail(relative, "crawlable profile is missing its body status");
  }
  if (canonicalMatches.length === 1) {
    try {
      const canonical = new URL(decodeHtml(canonicalMatches[0][1]));
      if (canonical.origin !== SITE_ORIGIN || canonical.pathname !== expectedRoute) {
        fail(relative, `canonical mismatch: ${canonical.href}`);
      }
    } catch (error) {
      fail(relative, "canonical is not a valid URL");
    }
  }
  if (!h1Matches.length || !leadMatches.length) continue;

  const h1 = normalizeText(h1Matches[0][1]);
  const lead = normalizeText(leadMatches[0][1]);
  const words = wordCount(lead);
  wordCounts.push(words);
  if (!lead.toLowerCase().includes(h1.toLowerCase())) fail(relative, "lead does not name the business");
  if (words < 55) fail(relative, `lead is thin at ${words} words`);
  if (words > 175) fail(relative, `lead is overly long at ${words} words`);
  if (/Canada, Canada|Customer comments highlight|strong fit/i.test(lead)) fail(relative, "lead contains rejected or malformed copy");
  addDuplicateCandidate(descriptions, lead, relative);

  const metaMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!metaMatch) {
    fail(relative, "missing meta description");
  } else {
    const meta = decodeHtml(metaMatch[1]);
    if (meta.length < 90 || meta.length > 160) fail(relative, `meta description length is ${meta.length}`);
    addDuplicateCandidate(metaDescriptions, meta, relative);
  }

  const signalBlock = (html.match(/<section class="section profile-signals"[\s\S]*?<\/section>/i) || [""])[0];
  const signalRows = [...signalBlock.matchAll(/class="profile-signal-row"/g)].length;
  if (signalRows < 4) fail(relative, `only ${signalRows} profile signal rows`);
  for (const [key, label] of Object.entries({
    websiteServices: "Website services",
    websiteAccess: "Website access",
    websitePolicies: "Website credentials and policies",
    breedMentions: "Breed and coat mentions",
    pricing: "Pricing signal",
    appointments: "Appointments",
    accessibility: "Accessibility",
    amenities: "Amenities",
  })) {
    if (signalBlock.includes(`>${label}<`)) coverage[key] += 1;
  }
  if (signalBlock.includes(">Website location<")) coverage.websiteLocations += 1;
  if (signalBlock.includes("data-official-website-enrichment")) {
    coverage.officialWebsiteEnrichment += 1;
    officialWebsiteRoutes.add(expectedRoute);
    if (!/the official business website/i.test(signalBlock)) fail(relative, "enriched profile is missing official-website attribution");
    if (!/>Official sources</i.test(signalBlock) || !/class="signal-source-link"/.test(signalBlock)) {
      fail(relative, "enriched profile is missing visible official source links");
    }
    if (!/Official website facts checked \d{4}-\d{2}-\d{2}/.test(html)) {
      fail(relative, "enriched profile is missing its dated provenance label");
    }
  }
  const researchMethod = (signalBlock.match(/data-website-research-method="([^"]+)"/) || [null, ""])[1];
  if (researchMethod === "direct_html") coverage.directHtmlResearch += 1;
  else if (researchMethod === "crawl4ai_browser") coverage.crawl4aiResearch += 1;
  else if (researchMethod) fail(relative, `unsupported website research method ${researchMethod}`);
  if (researchMethod && !signalBlock.includes("data-official-website-enrichment")) {
    fail(relative, "website research method appears without official-site enrichment");
  }
  if (signalBlock.includes(">Business-submitted details<")) coverage.businessSubmissions += 1;
  const editorialMatches = [...html.matchAll(/data-editorial-profile-review/g)];
  if (editorialMatches.length > 1) fail(relative, `expected at most one editorial review, found ${editorialMatches.length}`);
  if (editorialMatches.length === 1) {
    coverage.editorialReviews += 1;
    editorialReviewRoutes.add(expectedRoute);
    const editorialBlock = (html.match(/<section class="section editorial-profile-review"[\s\S]*?<\/section>/i) || [""])[0];
    if ((editorialBlock.match(/class="profile-signal-row"/g) || []).length < 3) fail(relative, "editorial review has fewer than three sourced facts");
    if ((editorialBlock.match(/class="signal-source-link"/g) || []).length < 3) fail(relative, "editorial review facts are missing official source links");
    if (!/Reviewed \d{4}-\d{2}-\d{2} against/.test(editorialBlock)) fail(relative, "editorial review is missing its review date");
  }
  if (html.includes("review-theme-summary")) coverage.reviewThemes += 1;

  const profilePhotoBlock = (html.match(/<div class="profile-photo">[\s\S]*?<\/div>/i) || [""])[0];
  const profileImage = (profilePhotoBlock.match(/<img\b[^>]*>/i) || [""])[0];
  const rightsNote = (html.match(/<p class="image-source-note"[^>]*data-image-rights-note="([^"]+)"[\s\S]*?<\/p>/i) || []);
  if (profileImage) {
    const rights = (profileImage.match(/data-image-rights="([^"]+)"/i) || [null, ""])[1];
    if (!rights || !["owner_permission", "licensed", "public_domain"].includes(rights)) fail(relative, "profile image has no documented usage-rights status");
    if (!rightsNote.length || rightsNote[1] !== rights) fail(relative, "profile image is missing its matching visible rights note");
    coverage.imageRightsProfiles += 1;
  } else {
    if (!/Business photos appear only when usage permission or a reusable licence is documented/.test(profilePhotoBlock)) {
      fail(relative, "profile without an authorized image is missing the permission-based placeholder");
    }
    if (rightsNote.length) fail(relative, "profile without an image rendered a rights note");
  }

  for (const imageTag of html.match(/<img\b[^>]+alt="[^"]*(?:listing photo| photo)"[^>]*>/gi) || []) {
    if (!/data-image-rights="(?:owner_permission|licensed|public_domain)"/.test(imageTag)) {
      fail(relative, "business-specific image rendered without documented rights");
      break;
    }
  }

  const limitedMatches = [...html.matchAll(/data-limited-profile-context/g)];
  if (limitedMatches.length > 1) fail(relative, `expected at most one limited-information section, found ${limitedMatches.length}`);
  if (limitedMatches.length === 1) {
    coverage.limitedInformationContext += 1;
    const limitedBlock = (html.match(/<section class="section limited-profile-context"[\s\S]*?<\/section>/i) || [""])[0];
    const depth = Number((limitedBlock.match(/data-information-depth="(\d+)"/) || [null, ""])[1]);
    if (!Number.isFinite(depth) || depth > 3) fail(relative, `invalid limited-information depth ${depth}`);
    if ((limitedBlock.match(/class="profile-signal-row"/g) || []).length !== 4) fail(relative, "limited-information section must have four decision rows");
    if (!/not a judgment about service quality/i.test(limitedBlock)) fail(relative, "limited-information section is missing its neutral qualifier");
    if (!/>Compare locally</i.test(limitedBlock) || !/>Still to confirm</i.test(limitedBlock)) fail(relative, "limited-information section is missing comparison guidance");
  }

  const localBusiness = getLocalBusinessSchema(html);
  if (!localBusiness) {
    fail(relative, "missing valid LocalBusiness schema");
  } else {
    if (normalizeText(localBusiness.name) !== h1) fail(relative, "schema name differs from H1");
    if (normalizeText(localBusiness.description) !== lead) fail(relative, "schema description differs from visible lead");
    if (localBusiness.url !== `${SITE_ORIGIN}${expectedRoute}`) fail(relative, "schema URL differs from canonical route");
    if (profileImage && !Array.isArray(localBusiness.image)) fail(relative, "authorized profile images are missing from LocalBusiness schema");
    if (!profileImage && Object.hasOwn(localBusiness, "image")) fail(relative, "LocalBusiness schema contains an unauthorized image");
  }
  if (/\b(?:undefined|NaN)\b/.test(stripScripts(html))) fail(relative, "rendered page contains undefined or NaN");
}

reportDuplicates("description", descriptions);
reportDuplicates("meta description", metaDescriptions);
auditSitemap(crawlableRoutes);
auditWebsiteEnrichment(officialWebsiteRoutes, editorialReviewRoutes);
auditEditorialProfileReviews(editorialReviewRoutes);
auditProfileIndexOverrides(crawlableRoutes);
auditSearchIndexImageRights();
if (noindexProfileCount > 200) fail("groomers", `quality hold unexpectedly expanded to ${noindexProfileCount} profiles`);

wordCounts.sort((a, b) => a - b);
console.log(`Listing profiles: ${crawlableCount.toLocaleString()} crawlable, ${noindexProfileCount.toLocaleString()} quality holds, ${redirectCount.toLocaleString()} redirects`);
console.log(`Unique leads: ${descriptions.size.toLocaleString()} of ${profileCount.toLocaleString()}`);
console.log(
  `Lead words: min ${percentile(wordCounts, 0)}, p10 ${percentile(wordCounts, 0.1)}, median ${percentile(wordCounts, 0.5)}, p90 ${percentile(wordCounts, 0.9)}, max ${percentile(wordCounts, 1)}`,
);
console.log(
  `Signal coverage: website services ${coverage.websiteServices.toLocaleString()}, website access ${coverage.websiteAccess.toLocaleString()}, website policies ${coverage.websitePolicies.toLocaleString()}, breed or coat mentions ${coverage.breedMentions.toLocaleString()}, pricing ${coverage.pricing.toLocaleString()}, appointment links ${coverage.appointments.toLocaleString()}, accessibility ${coverage.accessibility.toLocaleString()}, amenities ${coverage.amenities.toLocaleString()}, review themes ${coverage.reviewThemes.toLocaleString()}`,
);
console.log(
  `Sparse-profile support: ${coverage.officialWebsiteEnrichment.toLocaleString()} official-site enrichments, ${coverage.websiteLocations.toLocaleString()} structured website locations, ${coverage.limitedInformationContext.toLocaleString()} limited-information decision sections`,
);
console.log(
  `Website research methods: ${coverage.directHtmlResearch.toLocaleString()} direct HTML, ${coverage.crawl4aiResearch.toLocaleString()} Crawl4AI browser`,
);
console.log(
  `Provenance coverage: ${coverage.editorialReviews.toLocaleString()} editorial source reviews, ${coverage.businessSubmissions.toLocaleString()} business-submitted profiles, ${coverage.imageRightsProfiles.toLocaleString()} profiles with authorized images`,
);

if (failures.length) {
  console.error(`\nAudit failed with ${failures.length.toLocaleString()} issue(s):`);
  for (const message of failures.slice(0, 50)) console.error(`- ${message}`);
  if (failures.length > 50) console.error(`- ...and ${(failures.length - 50).toLocaleString()} more`);
  process.exitCode = 1;
} else {
  console.log("Listing SEO/content audit passed.");
}

function findIndexFiles(directory) {
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...findIndexFiles(target));
    else if (entry.name === "index.html") found.push(target);
  }
  return found.sort();
}

function getLocalBusinessSchema(html) {
  for (const match of html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      const candidates = Array.isArray(value) ? value : [value];
      const schema = candidates.find((item) => item && item["@type"] === "LocalBusiness");
      if (schema) return schema;
    } catch (error) {
      return null;
    }
  }
  return null;
}

function auditSitemap(routes) {
  const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const sitemapRoutes = new Set(
    [...sitemap.matchAll(/<loc>https:\/\/doggroomerscanada\.ca(\/groomers\/[^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1])),
  );
  for (const route of routes) if (!sitemapRoutes.has(route)) fail(route, "crawlable profile missing from sitemap");
  for (const route of sitemapRoutes) if (!routes.has(route)) fail(route, "sitemap profile has no crawlable file");
}

function auditWebsiteEnrichment(renderedRoutes, supersededRoutes) {
  const file = path.join(ROOT, "data", "thin-listing-enrichment.json");
  if (!fs.existsSync(file)) return;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("data/thin-listing-enrichment.json", "enrichment data is not valid JSON");
    return;
  }
  const entries = raw && raw.listings && typeof raw.listings === "object" ? raw.listings : {};
  const rejectedHosts = new Set([
    "411sante.com",
    "catop.net",
    "dogv.net",
    "facebook.com",
    "fb.me",
    "findnl.ca",
    "instagram.com",
    "linktr.ee",
    "localcanada.net",
    "mewm.net",
    "okpet.net",
    "pagesjaunes.ca",
    "petnu.net",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "yellowpages.ca",
    "yelp.ca",
    "yelp.com",
  ]);
  const allowedSignals = {
    services: new Set([
      "Bath or bath-and-brush",
      "Cat grooming",
      "Creative grooming",
      "De-matting",
      "De-shedding",
      "Ear cleaning",
      "Full groom or haircut",
      "Hand stripping",
      "Nail trim or grinding",
      "Puppy grooming",
      "Sanitary trim",
      "Self-service dog wash",
      "Teeth cleaning",
    ]),
    convenience: new Set([
      "Cage-free appointments",
      "In-home grooming",
      "Mobile grooming",
      "One-on-one appointments",
      "Online booking",
      "Pickup or drop-off details",
    ]),
    credentials: new Set([
      "Certification or licensing information",
      "Fear Free training or handling information",
      "Insurance information",
      "Pet first-aid or CPR information",
      "Professional policies",
    ]),
    breedExperience: new Set(["Doodles", "Double-coated breeds", "Poodles", "Schnauzers", "Spaniels", "Terriers"]),
  };
  for (const [route, entry] of Object.entries(entries)) {
    if (!renderedRoutes.has(route) && !supersededRoutes.has(route)) fail(route, "enrichment data was not rendered on its profile");
    if (!entry || !entry.businessName || !/^https?:\/\//.test(entry.website || "")) fail(route, "enrichment entry has no valid business identity or website");
    const sources = entry && Array.isArray(entry.sourcePages) ? entry.sourcePages : [];
    if (!sources.length || sources.length > 3) fail(route, "enrichment entry must have one to three source pages");
    if (new Set(sources).size !== sources.length) fail(route, "enrichment source pages are duplicated");
    if (sources.some((url) => !/^https?:\/\//.test(url))) fail(route, "enrichment source page is not an HTTP URL");
    if ([entry && entry.website, ...sources].filter(Boolean).some((url) => {
      try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
        return [...rejectedHosts].some((rejected) => host === rejected || host.endsWith(`.${rejected}`));
      } catch (error) {
        return true;
      }
    })) fail(route, "enrichment uses a social or third-party directory source");
    if (sources.some((url) => {
      try {
        const path = new URL(url).pathname.replace(/[^a-z0-9]+/gi, " ");
        const isCatalog = /\b(?:collections?|products?|shop|catalog|search)\b/i.test(path);
        const isGroomingOffer = /\b(?:groom\w*|toilettage).{0,40}\b(?:appointment|booking|package|service|session|rendez vous|forfait)s?\b|\b(?:appointment|booking|package|service|session|rendez vous|forfait)s?\b.{0,40}\b(?:groom\w*|toilettage)/i.test(path);
        return isCatalog && !isGroomingOffer;
      } catch (error) {
        return true;
      }
    })) {
      fail(route, "retail catalog URL was stored as an enrichment source");
    }
    if (sources.some((url) => /\/(?:author|category|tag)\/|\/20\d{2}\/(?:0?[1-9]|1[0-2])(?:\/|$)/i.test(new URL(url).pathname))) {
      fail(route, "editorial archive URL was stored as an enrichment source");
    }
    if (entry && entry.crawlStatus !== "official_website_enriched") fail(route, "enrichment entry has an unsupported crawl status");
    if (entry && !/^\d{4}-\d{2}-\d{2}$/.test(entry.crawledAt || "")) fail(route, "enrichment entry has no valid crawl date");
    if (entry && !["direct_html", "crawl4ai_browser"].includes(entry.researchMethod)) fail(route, "enrichment entry has an unsupported research method");
    if (entry && Object.hasOwn(entry, "priceAmounts")) fail(route, "enrichment entry must not store price amounts");
    if (/(?:\$\s?\d|\d(?:[.,]\d{2})?\s?\$)/.test(JSON.stringify(entry))) fail(route, "enrichment entry contains a copied price amount");
    for (const forbidden of ["description", "summary", "marketingCopy", "pageText", "html"]) {
      if (entry && Object.hasOwn(entry, forbidden)) fail(route, `enrichment entry must not store copied ${forbidden}`);
    }
    for (const [field, allowed] of Object.entries(allowedSignals)) {
      const values = entry && Array.isArray(entry[field]) ? entry[field] : [];
      if (!entry || !Array.isArray(entry[field]) || values.some((value) => !allowed.has(value))) {
        fail(route, `enrichment ${field} contains a non-normalized value`);
      }
    }
    const bookings = entry && Array.isArray(entry.bookingLinks) ? entry.bookingLinks : [];
    if (bookings.length > 1 || bookings.some((booking) =>
      !booking || !["Book an appointment", "Request an appointment"].includes(booking.name) || !/^https?:\/\//.test(booking.url || "")
    )) fail(route, "enrichment booking link is not normalized");
  }
  for (const route of renderedRoutes) if (!Object.hasOwn(entries, route)) fail(route, "rendered enrichment has no source-data entry");
}

function auditEditorialProfileReviews(renderedRoutes) {
  const file = path.join(ROOT, "data", "editorial-profile-reviews.json");
  if (!fs.existsSync(file)) {
    if (renderedRoutes.size) fail("data/editorial-profile-reviews.json", "rendered reviews have no source-data file");
    return;
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("data/editorial-profile-reviews.json", "review data is not valid JSON");
    return;
  }
  const entries = raw && raw.profiles && typeof raw.profiles === "object" ? raw.profiles : {};
  for (const [route, entry] of Object.entries(entries)) {
    if (!renderedRoutes.has(route)) fail(route, "editorial review data was not rendered on its profile");
    const sources = entry && Array.isArray(entry.sourcePages) ? entry.sourcePages : [];
    const facts = entry && Array.isArray(entry.facts) ? entry.facts : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry && entry.reviewedAt)) fail(route, "editorial review has no valid review date");
    if (sources.length < 1 || sources.some((url) => !/^https:\/\//.test(url))) fail(route, "editorial review source pages are incomplete");
    if (wordCount(entry && entry.lead) < 55) fail(route, "editorial review lead is too short");
    if (wordCount(entry && entry.summary) < 55) fail(route, "editorial review summary is too short");
    if (facts.length < 3 || facts.some((fact) => !fact.label || !fact.value || !sources.includes(fact.sourceUrl))) {
      fail(route, "editorial review facts are not fully tied to listed source pages");
    }
  }
  for (const route of renderedRoutes) if (!Object.hasOwn(entries, route)) fail(route, "rendered editorial review has no source-data entry");
}

function auditProfileIndexOverrides(crawlableRoutes) {
  const file = path.join(ROOT, "data", "profile-index-overrides.json");
  if (!fs.existsSync(file)) return;
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("data/profile-index-overrides.json", "index override data is not valid JSON");
    return;
  }
  if (/"(?:clicks|impressions|ctr|position)"\s*:/.test(JSON.stringify(raw))) {
    fail("data/profile-index-overrides.json", "private Search Console metrics must not be committed");
  }
  const routes = Array.isArray(raw) ? raw : raw.keepIndexed || [];
  for (const route of routes) {
    if (!crawlableRoutes.has(route)) fail(route, "keep-index override did not produce a crawlable profile");
  }
}

function auditSearchIndexImageRights() {
  const file = path.join(ROOT, "assets", "search-index.json");
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail("assets/search-index.json", "search index is not valid JSON");
    return;
  }
  const allowed = new Set(["owner_permission", "licensed", "public_domain"]);
  for (const listing of raw.listings || []) {
    if ((listing.image || listing.fallbackImage) && !allowed.has(listing.imageRights)) {
      fail(listing.url || "assets/search-index.json", "search index exposes an image without documented rights");
    }
    if (!listing.image && listing.imageRights) fail(listing.url || "assets/search-index.json", "search index has image rights without an image");
  }
}

function addDuplicateCandidate(map, value, file) {
  const filesForValue = map.get(value) || [];
  filesForValue.push(file);
  map.set(value, filesForValue);
}

function reportDuplicates(label, map) {
  for (const filesForValue of map.values()) {
    if (filesForValue.length > 1) fail(filesForValue[0], `duplicate ${label} shared by ${filesForValue.length} profiles`);
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  return values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];
}

function wordCount(value) {
  return String(value || "").split(/\s+/).filter(Boolean).length;
}

function normalizeText(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripScripts(value) {
  return String(value || "").replace(/<script\b[\s\S]*?<\/script>/gi, "");
}

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}
