#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { guideCategories, guideArticles } = require("./grooming-guides");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://doggroomerscanada.ca";
const CSV_FILE =
  process.argv[2] ||
  path.join(ROOT, "Apify Google Maps Scraper jJzJjRpnTviQKBwns - dog grooming only.csv");
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
// Update this only when the published directory/guides are materially reviewed.
const CONTENT_UPDATED_DATE = "2026-07-20";
const ASSET_VERSION = process.env.ASSET_VERSION || new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
const BRAND_NAME = "Dog Groomers Canada";
const THEME_COLOR = "#073b2a";
const CONTACT_EMAIL = "nocturnaldevs@gmail.com";
const LOGO_MARK_PATH = "/assets/logo-mark-realistic.png";
const LOGO_PATH = "/assets/logo-mark-realistic.png";
const FAVICON_PATH = "/assets/favicon-realistic.png";
const OG_IMAGE_PATH = "/assets/og-image.svg";
const PHOTO_HERO_PATH = "/assets/dgc-photo-hero-grooming.jpg";
const IMAGE_OVERRIDES_FILE = path.join(ROOT, "data", "listing-image-overrides.json");
const BROKEN_IMAGE_URLS_FILE = path.join(ROOT, "data", "broken-image-urls.json");
const LISTING_CORRECTIONS_FILE = path.join(ROOT, "data", "listing-corrections.json");
const MANUAL_LISTINGS_FILE = path.join(ROOT, "data", "manual-listings.json");
const THIN_LISTING_ENRICHMENT_FILE = path.join(ROOT, "data", "thin-listing-enrichment.json");
const EDITORIAL_PROFILE_REVIEWS_FILE = path.join(ROOT, "data", "editorial-profile-reviews.json");
const PROFILE_INDEX_OVERRIDES_FILE = path.join(ROOT, "data", "profile-index-overrides.json");
const LEGACY_AD_SERVICE_WORKER_TOMBSTONE = `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
`;
const GOOGLE_ANALYTICS_ID = "G-BY1BF23TD7";
const GROW_SITE_ID = "U2l0ZTo1OTBhOGFjZC1lOTEwLTQ2ZTQtODE3NS02YTVkZTE4MDhhYjM=";
const DOCUMENTED_IMAGE_RIGHTS = new Set(["owner_permission", "licensed", "public_domain"]);

const CITY_COST_PAGE_LIMIT = 120;
const CITY_COST_MIN_LISTINGS = 8;
const COST_REFERENCE_SOURCES = Object.freeze([
  { name: "Good Dog Grooming pricing", url: "https://www.gooddog.ca/pricing" },
  { name: "East Coast Dog grooming services", url: "https://eastcoastdog.ca/grooming/" },
  { name: "Pet Grooming Studio fees", url: "https://www.petgroom.ca/dog-grooming-service-and-fees/" },
  { name: "Dogster Canada grooming cost guide", url: "https://www.dogster.com/lifestyle/how-much-does-dog-grooming-cost-canada" },
]);
const COST_RANGES = Object.freeze({
  nailTrim: "$15-$35",
  nailGrind: "$20-$45",
  bathBrush: { small: "$45-$85", medium: "$60-$110", large: "$80-$150", giant: "$110-$220" },
  fullGroom: { small: "$75-$130", medium: "$95-$170", large: "$130-$230", giant: "$180-$320" },
  deshedding: "$25-$90+",
  dematting: "$20-$80+",
  medicatedBath: "$10-$30+",
  handling: "$20-$50+",
  mobile: "$20-$75+",
});

const GENERATED_DIRS = [
  "groomers",
  "provinces",
  "cities",
  "services",
  "search",
  "near-me",
  "dog-grooming",
  "dog-grooming-near-me",
  "mobile-dog-grooming-near-me",
  "dog-grooming-cost",
  "guides",
  "grooming-tools",
  "about",
  "contact",
  "add-your-business",
  "for-businesses",
  "editorial-policy",
  "privacy",
  "terms",
  "sitemap",
];

const ROOT_FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml", "ads.txt", "sw.js", "CNAME", ".nojekyll"];

const provinceMap = new Map([
  ["alberta", ["Alberta", "AB"]],
  ["ab", ["Alberta", "AB"]],
  ["british columbia", ["British Columbia", "BC"]],
  ["bc", ["British Columbia", "BC"]],
  ["manitoba", ["Manitoba", "MB"]],
  ["mb", ["Manitoba", "MB"]],
  ["new brunswick", ["New Brunswick", "NB"]],
  ["nb", ["New Brunswick", "NB"]],
  ["newfoundland and labrador", ["Newfoundland and Labrador", "NL"]],
  ["newfoundland & labrador", ["Newfoundland and Labrador", "NL"]],
  ["nl", ["Newfoundland and Labrador", "NL"]],
  ["northwest territories", ["Northwest Territories", "NT"]],
  ["nt", ["Northwest Territories", "NT"]],
  ["nova scotia", ["Nova Scotia", "NS"]],
  ["ns", ["Nova Scotia", "NS"]],
  ["nunavut", ["Nunavut", "NU"]],
  ["nu", ["Nunavut", "NU"]],
  ["ontario", ["Ontario", "ON"]],
  ["on", ["Ontario", "ON"]],
  ["prince edward island", ["Prince Edward Island", "PE"]],
  ["pei", ["Prince Edward Island", "PE"]],
  ["pe", ["Prince Edward Island", "PE"]],
  ["quebec", ["Quebec", "QC"]],
  ["québec", ["Quebec", "QC"]],
  ["qc", ["Quebec", "QC"]],
  ["saskatchewan", ["Saskatchewan", "SK"]],
  ["sk", ["Saskatchewan", "SK"]],
  ["yukon", ["Yukon", "YT"]],
  ["yt", ["Yukon", "YT"]],
]);

const serviceDefinitions = [
  {
    slug: "dog-haircuts",
    name: "Dog Haircuts and Styling",
    short: "Haircuts",
    patterns: [/hair\s*cut/i, /haircut/i, /styling/i, /full groom/i, /breed/i],
    intro:
      "Compare grooming businesses that mention dog haircuts, styling, full grooms, or breed-specific coat work.",
  },
  {
    slug: "nail-trimming",
    name: "Dog Nail Trimming",
    short: "Nail trims",
    patterns: [/nail/i, /grind/i, /dremel/i, /pawdicure/i],
    intro:
      "Find dog groomers that mention nail trims, nail grinding, or paw-care services in their directory data.",
  },
  {
    slug: "puppy-grooming",
    name: "Puppy Grooming",
    short: "Puppy grooms",
    patterns: [/puppy/i],
    intro:
      "Browse groomers that mention puppy groom services, first-groom appointments, or gentle introductory grooming.",
  },
  {
    slug: "bath-and-brush",
    name: "Bath and Brush Dog Grooming",
    short: "Bath and brush",
    patterns: [/bath/i, /brush/i, /wash/i],
    intro:
      "Compare businesses that mention bath, brush, wash, coat cleaning, or tidy-up grooming services.",
  },
  {
    slug: "deshedding",
    name: "Dog De-shedding",
    short: "De-shedding",
    patterns: [/de-?shedd/i, /shed/i, /undercoat/i],
    intro:
      "Find groomers that mention de-shedding, undercoat care, or seasonal coat-maintenance services.",
  },
  {
    slug: "mobile-dog-grooming",
    name: "Mobile Dog Grooming",
    short: "Mobile grooming",
    patterns: [/mobile/i, /at home/i, /in-home/i, /house call/i],
    intro:
      "Browse listings that explicitly mention mobile grooming, mobile pet salons, mobile nail care, in-home grooming, or house-call grooming.",
  },
  {
    slug: "teeth-cleaning",
    name: "Dog Teeth Brushing",
    short: "Teeth brushing",
    patterns: [/teeth/i, /tooth/i, /dental/i],
    intro:
      "Find groomers that mention teeth brushing, dental add-ons, or oral-care grooming services.",
  },
  {
    slug: "dematting",
    name: "Dog De-matting",
    short: "De-matting",
    patterns: [/de-?mat/i, /matted/i, /matting/i],
    intro:
      "Compare groomers that mention de-matting, coat rescue, or tangled-coat care.",
  },
  {
    slug: "cat-grooming",
    name: "Cat Grooming",
    short: "Cat grooming",
    patterns: [/cat/i, /feline/i],
    intro:
      "Find pet groomers that also mention cat grooming or feline coat-care services.",
  },
];

const REVIEW_THEME_DEFINITIONS = Object.freeze([
  {
    label: "haircuts and coat results",
    pattern: /\b(?:haircuts?|grooms?|groomed|trim(?:med|ming)?|coat|fur|style|styled|brush(?:ed|ing)?|mat(?:s|ted|ting)?)\b/i,
  },
  {
    label: "handling, patience, and pet comfort",
    pattern: /\b(?:gentle|patient|patience|calm|comfort(?:able)?|anxious|anxiety|nervous|scared|fearful|handling|handled|kind)\b/i,
  },
  {
    label: "service and communication",
    pattern: /\b(?:customer service|service|communication|communicat(?:e|ed|ion)|responsive|response|reply|staff|explained|listened)\b/i,
  },
  {
    label: "detail and thoroughness",
    pattern: /\b(?:attention to detail|detail(?:ed)?|thorough|thoroughly|meticulous|careful|carefully)\b/i,
  },
  {
    label: "appointments and scheduling",
    pattern: /\b(?:appointments?|booking|booked|schedule|scheduling|availability|wait(?:ed|ing)?|punctual|on time)\b/i,
  },
  {
    label: "nail and paw care",
    pattern: /\b(?:nails?|paw|paws|dremel|grind(?:ing)?)\b/i,
  },
  {
    label: "price and value",
    pattern: /\b(?:price|pricing|cost|value|affordable|expensive|fee|fees)\b/i,
  },
]);

const PROFILE_ACCESSIBILITY_SIGNALS = Object.freeze([
  ["Assistive hearing loop", "Assistive hearing loop"],
  ["Wheelchair accessible entrance", "Wheelchair-accessible entrance"],
  ["Wheelchair accessible parking lot", "Wheelchair-accessible parking"],
  ["Wheelchair accessible restroom", "Wheelchair-accessible restroom"],
  ["Wheelchair accessible seating", "Wheelchair-accessible seating"],
]);

const PROFILE_AMENITY_SIGNALS = Object.freeze([
  ["Online scheduling", "Online scheduling"],
  ["Free parking", "Free parking"],
  ["Paid parking", "Paid parking"],
  ["Gender-neutral restroom", "Gender-neutral restroom"],
  ["Public restroom", "Public restroom"],
  ["Restroom", "Restroom"],
]);

const GROOMING_COMMENT_PATTERN = /\b(?:groom(?:er|ers|ed|ing|s)?|haircuts?|trim(?:med|ming)?|bath(?:ed|ing)?|brush(?:ed|ing)?|coat|nails?|mat(?:s|ted|ting)?|shed(?:ding)?|clean(?:ed|ing)?|teeth|tooth|fur|clip(?:ped|ping)?|style|stylist|paws?)\b/i;

function main() {
  if (!fs.existsSync(CSV_FILE)) {
    throw new Error(`CSV file not found: ${CSV_FILE}`);
  }

  cleanGeneratedFiles();

  const rawListings = [...loadListings(CSV_FILE), ...loadManualListings()];
  const correctedListings = applyListingCorrections(buildListingUrls(rawListings), loadListingCorrections());
  const enrichedListings = applyThinListingEnrichment(correctedListings.listings, loadThinListingEnrichment());
  const reviewedListings = applyEditorialProfileReviews(enrichedListings, loadEditorialProfileReviews());
  const imageSafeListings = enforceListingImageRights(applyImageOverrides(reviewedListings, loadImageOverrides()));
  const listings = applyProfileIndexOverrides(
    removeBrokenListingImages(imageSafeListings, loadBrokenImageUrls()),
    loadProfileIndexOverrides(),
  );
  const provinceGroups = groupProvinces(listings);
  const cityGroups = groupCities(listings);
  const serviceGroups = groupServices(listings);

  const context = {
    listings,
    provinces: provinceGroups,
    cities: cityGroups,
    services: serviceGroups,
    listingRedirects: correctedListings.redirects,
    stats: {
      listings: listings.length,
      provinces: provinceGroups.length,
      cities: cityGroups.length,
      withPhones: listings.filter((item) => item.phone).length,
      withWebsites: listings.filter((item) => item.website).length,
      indexableListings: listings.filter(shouldIndexListing).length,
      reviewedListings: listings.filter((item) => item.editorialReview).length,
      businessSubmittedListings: listings.filter((item) => item.businessSubmission).length,
      imageRightsListings: listings.filter(hasDocumentedImageRights).length,
    },
    pages: [],
  };

  writeStaticAssets(context);
  writeHomePage(context);
  writeProvinceIndex(context);
  writeCityIndex(context);
  writeProvincePages(context);
  writeCityPages(context);
  writeListingPages(context);
  writeListingRedirects(context.listingRedirects);
  writeServicePages(context);
  writeCostPages(context);
  writeGuidePages(context);
  writeToolPages(context);
  writeKeywordPages(context);
  writeUtilityPages(context);
  writeSitemap(context);
  writeRobotsAndDomain();

  console.log(`Generated ${context.pages.length.toLocaleString()} crawlable pages from ${listings.length.toLocaleString()} listings.`);
  console.log(`Site root: ${ROOT}`);
}

function cleanGeneratedFiles() {
  for (const dir of GENERATED_DIRS) {
    fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
  }
  for (const file of ROOT_FILES) {
    fs.rmSync(path.join(ROOT, file), { force: true });
  }
}

function loadListings(file) {
  const text = fs.readFileSync(file, "utf8");
  let headers = null;
  const listings = [];
  let rowNumber = 0;

  parseCsvRows(text, (row) => {
    rowNumber += 1;
    if (!headers) {
      headers = row.map((name, index) => (index === 0 ? name.replace(/^\uFEFF/, "") : name));
      return;
    }
    const get = makeGetter(headers, row);
    const title = clean(get("title"));
    if (!title) return;

    const address = clean(get("address"));
    const province = normalizeProvince(get("state"), address);
    const city = clean(get("city")) || inferCity(address, province.code) || "Canada";
    const lat = numberOrNull(get("location/lat"));
    const lng = numberOrNull(get("location/lng"));
    const rating = numberOrNull(get("totalScore"));
    const reviews = integerOrZero(get("reviewsCount"));
    const phone = clean(get("phone"));
    const phoneRaw = clean(get("phoneUnformatted")) || phone.replace(/[^\d+]/g, "");
    const category = clean(get("categoryName")) || firstPresent(getRange(get, "categories/", 0, 10));
    const website = sanitizeBusinessWebsite(clean(get("website")));
    const sourceImage = normalizeListingImageUrl(bestImage(get));
    const photos = unique([sourceImage, ...getRange(get, "imageUrls/", 0, 4), ...getNestedImages(get), ...getGoogleFallbackImages(get)].map(normalizeListingImageUrl))
      .filter(Boolean)
      .slice(0, 24);
    const hours = getHours(get);
    const services = getServices(get);
    const reviewComments = getReviewTexts(get);
    const reviewThemes = buildReviewThemes(category, reviewComments);
    const bookingLinks = getBookingLinks(get);
    const websiteSignals = getWebsiteSignals(get);
    const profileAttributes = getProfileAttributes(get);
    const idSeed =
      clean(get("cid")) ||
      clean(get("fid")) ||
      clean(get("kgmid")) ||
      `${title}-${address}-${rowNumber}`;
    const listing = {
      id: shortHash(idSeed),
      title,
      category,
      address,
      street: clean(get("street")),
      postalCode: clean(get("postalCode")) || extractPostalCode(address),
      city,
      province: province.name,
      provinceCode: province.code,
      provinceSlug: province.slug,
      citySlug: slugify(city),
      countryCode: clean(get("countryCode")) || "CA",
      phone,
      phoneRaw,
      website,
      mapsUrl: clean(get("url")),
      rating,
      reviews,
      lat,
      lng,
      image: sourceImage,
      photos,
      imageRights: null,
      hours,
      services,
      serviceText: clean(get("servicesOffered")),
      websiteServiceText: clean(get("websiteServicesFound")),
      websiteConvenienceText: clean(get("websiteConvenienceFound")),
      convenienceText: clean(get("convenientLocationOrMobileService")),
      websiteCrawlStatus: clean(get("websiteCrawlStatus")),
      websiteCrawlSource: safeHttpUrl(get("websiteCrawlSource")),
      websiteServices: websiteSignals.services,
      websiteConvenience: websiteSignals.convenience,
      websiteCredentials: websiteSignals.credentials,
      websiteBreedExperience: websiteSignals.breedExperience,
      websitePricingAvailable: websiteSignals.pricingAvailable,
      bookingLinks,
      accessibility: profileAttributes.accessibility,
      amenities: profileAttributes.amenities,
      ownerUpdateCount: getOwnerUpdateCount(get),
      reviewCommentCount: reviewComments.length,
      reviewThemes,
      description: "",
      descriptionIsCustom: false,
      editorialReview: null,
      businessSubmission: null,
      keepIndexed: false,
      temporarilyClosed: isTruthy(get("temporarilyClosed")),
      scrapedAt: clean(get("scrapedAt")),
      score: 0,
    };
    listing.description = buildListingDescription(listing);
    listing.score = qualityScore(listing);
    listings.push(listing);
  });

  return listings.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function loadManualListings() {
  if (!fs.existsSync(MANUAL_LISTINGS_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(MANUAL_LISTINGS_FILE, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.listings || [];

  return entries.map((item, index) => {
    const title = clean(item.title);
    const address = clean(item.address);
    const province = normalizeProvince(item.provinceCode || item.province, address);
    const city = clean(item.city) || inferCity(address, province.code) || "Canada";
    if (!title) throw new Error(`Manual listing ${index + 1} is missing a title.`);

    const phone = clean(item.phone);
    const website = sanitizeBusinessWebsite(clean(item.website));
    const services = unique((Array.isArray(item.services) ? item.services : []).map(clean)).filter(Boolean).slice(0, 8);
    const hours = (Array.isArray(item.hours) ? item.hours : [])
      .map((entry) => ({ day: clean(entry.day), hours: clean(entry.hours) }))
      .filter((entry) => entry.day && entry.hours)
      .slice(0, 7);
    const sourcePhotos = (Array.isArray(item.photos) ? item.photos : []).map(normalizeListingImageUrl).filter(Boolean);
    const image = normalizeListingImageUrl(item.image || sourcePhotos[0]);
    const photos = unique([image, ...sourcePhotos]).filter(Boolean).slice(0, 8);
    const imageRights = normalizeImageRights(item.imageRights, item.imageCredit, item.imageSourceUrl);
    const offerTitle = clean(item.offer && item.offer.title);
    const offerDescription = clean(item.offer && item.offer.description);
    const offer = offerTitle && offerDescription
      ? {
          label: clean(item.offer.label) || "Special offer",
          title: offerTitle,
          description: offerDescription,
          sourceUrl: sanitizeBusinessWebsite(clean(item.offer.sourceUrl)),
        }
      : null;
    const listing = {
      id: shortHash(clean(item.id) || website || `${title}-${address}-${index + 1}`),
      title,
      category: clean(item.category) || "Pet groomer",
      address,
      street: clean(item.street),
      postalCode: clean(item.postalCode) || extractPostalCode(address),
      city,
      province: province.name,
      provinceCode: province.code,
      provinceSlug: province.slug,
      citySlug: slugify(city),
      countryCode: clean(item.countryCode) || "CA",
      phone,
      phoneRaw: clean(item.phoneRaw) || phone.replace(/[^\d+]/g, ""),
      email: clean(item.email),
      website,
      mapsUrl: clean(item.mapsUrl),
      rating: numberOrNull(item.rating),
      reviews: integerOrZero(item.reviews),
      lat: numberOrNull(item.lat),
      lng: numberOrNull(item.lng),
      image,
      photos,
      imageRights,
      imageCredit: clean(item.imageCredit),
      imageSourceUrl: sanitizeBusinessWebsite(clean(item.imageSourceUrl)),
      hours,
      services,
      serviceText: clean(item.serviceText) || services.join("; "),
      websiteServiceText: clean(item.websiteServiceText),
      websiteConvenienceText: clean(item.websiteConvenienceText),
      convenienceText: clean(item.convenienceText),
      websiteCrawlStatus: clean(item.websiteCrawlStatus) || (website ? "owner_provided" : ""),
      websiteCrawlSource: safeHttpUrl(item.websiteCrawlSource || website),
      websiteServices: cleanSignalArray(item.websiteServices),
      websiteConvenience: cleanSignalArray(item.websiteConvenience).map(friendlyWebsiteSignal),
      websiteCredentials: cleanSignalArray(item.websiteCredentials).map(friendlyWebsiteSignal),
      websiteBreedExperience: cleanSignalArray(item.websiteBreedExperience),
      websitePricingAvailable: Boolean(item.websitePricingAvailable || (item.offer && item.offer.title)),
      bookingLinks: normalizeBookingLinks(item.bookingLinks),
      accessibility: cleanSignalArray(item.accessibility),
      amenities: cleanSignalArray(item.amenities),
      ownerUpdateCount: integerOrZero(item.ownerUpdateCount),
      reviewCommentCount: 0,
      reviewThemes: [],
      description: "",
      descriptionIsCustom: Boolean(clean(item.description)),
      editorialReview: null,
      businessSubmission: normalizeBusinessSubmission(item.businessSubmission),
      keepIndexed: false,
      offer,
      temporarilyClosed: Boolean(item.temporarilyClosed),
      scrapedAt: clean(item.updatedAt),
      score: 0,
    };
    listing.description = clean(item.description) || buildListingDescription(listing);
    listing.score = qualityScore(listing);
    return listing;
  });
}

function parseCsvRows(text, onRow) {
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      onRow(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    onRow(row);
  }
}

function makeGetter(headers, row) {
  const map = new Map(headers.map((name, index) => [name, index]));
  return (name) => {
    const index = map.get(name);
    return index === undefined ? "" : row[index] || "";
  };
}

function buildListingUrls(listings) {
  const used = new Set();
  return listings.map((listing) => {
    const base = slugify(`${listing.title}-${listing.city}-${listing.provinceCode}`) || `groomer-${listing.id}`;
    const slug = uniqueSlug(`${base}-${listing.id}`, used);
    const cityPath = listing.provinceSlug === "canada" ? "canada" : `${listing.provinceSlug}/${listing.citySlug}`;
    return {
      ...listing,
      slug,
      cityUrl: listing.provinceSlug === "canada" ? "/cities/" : `/provinces/${listing.provinceSlug}/${listing.citySlug}/`,
      provinceUrl: listing.provinceSlug === "canada" ? "/provinces/" : `/provinces/${listing.provinceSlug}/`,
      url: `/groomers/${cityPath}/${slug}/`,
    };
  });
}

function loadListingCorrections() {
  if (!fs.existsSync(LISTING_CORRECTIONS_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(LISTING_CORRECTIONS_FILE, "utf8"));
  return Array.isArray(raw) ? raw : raw.listings || [];
}

function applyListingCorrections(listings, corrections) {
  const byUrl = new Map(corrections.filter((item) => item && item.url).map((item) => [item.url, item]));
  const corrected = [];
  const redirects = [];
  const allowedFields = ["title", "address", "street", "postalCode", "phone", "phoneRaw", "website", "mapsUrl", "temporarilyClosed"];

  for (const listing of listings) {
    const correction = byUrl.get(listing.url);
    if (!correction) {
      corrected.push(listing);
      continue;
    }
    if (correction.exclude) {
      if (correction.redirectTo) redirects.push({ from: listing.url, to: correction.redirectTo });
      continue;
    }

    const fields = correction.fields || {};
    const updates = Object.fromEntries(allowedFields.filter((field) => Object.hasOwn(fields, field)).map((field) => [field, fields[field]]));
    const updated = { ...listing, ...updates };
    updated.businessSubmission = normalizeBusinessSubmission(correction.businessSubmission) || listing.businessSubmission;
    updated.description = updated.descriptionIsCustom ? listing.description : buildListingDescription(updated);
    updated.score = qualityScore(updated);
    corrected.push(updated);
  }

  return { listings: corrected, redirects };
}

function loadThinListingEnrichment() {
  if (!fs.existsSync(THIN_LISTING_ENRICHMENT_FILE)) return new Map();
  const raw = JSON.parse(fs.readFileSync(THIN_LISTING_ENRICHMENT_FILE, "utf8"));
  const entries = raw && !Array.isArray(raw) && raw.listings && typeof raw.listings === "object" ? raw.listings : {};
  return new Map(Object.entries(entries).filter(([url, value]) => url.startsWith("/groomers/") && value && typeof value === "object"));
}

function applyThinListingEnrichment(listings, enrichment) {
  if (!enrichment.size) return listings;
  return listings.map((listing) => {
    const entry = enrichment.get(listing.url);
    if (!entry || (entry.website && websiteHostname(entry.website) !== websiteHostname(listing.website))) return listing;

    const sourcePages = unique((Array.isArray(entry.sourcePages) ? entry.sourcePages : []).map(safeHttpUrl).filter(Boolean)).slice(0, 3);
    const updated = {
      ...listing,
      websiteCrawlStatus: clean(entry.crawlStatus) || "official_website_enriched",
      websiteCrawlSource: sourcePages[0] || listing.websiteCrawlSource || listing.website,
      websiteResearchPages: sourcePages,
      websiteEnrichedAt: clean(entry.crawledAt),
      websiteLocation: clean(entry.websiteLocation).slice(0, 180),
      websiteServices: unique([...(listing.websiteServices || []), ...cleanSignalArray(entry.services).map(friendlyWebsiteService)]).slice(0, 12),
      websiteConvenience: unique([...(listing.websiteConvenience || []), ...cleanSignalArray(entry.convenience).map(friendlyWebsiteSignal)]).slice(0, 12),
      websiteCredentials: unique([...(listing.websiteCredentials || []), ...cleanSignalArray(entry.credentials).map(friendlyWebsiteSignal)]).slice(0, 12),
      websiteBreedExperience: unique([...(listing.websiteBreedExperience || []), ...cleanSignalArray(entry.breedExperience)]).slice(0, 12),
      websitePricingAvailable: Boolean(listing.websitePricingAvailable || entry.pricingAvailable),
      bookingLinks: normalizeBookingLinks([...(listing.bookingLinks || []), ...(Array.isArray(entry.bookingLinks) ? entry.bookingLinks : [])]),
    };
    updated.description = updated.descriptionIsCustom ? listing.description : buildListingDescription(updated);
    return updated;
  });
}

function loadEditorialProfileReviews() {
  if (!fs.existsSync(EDITORIAL_PROFILE_REVIEWS_FILE)) return new Map();
  const raw = JSON.parse(fs.readFileSync(EDITORIAL_PROFILE_REVIEWS_FILE, "utf8"));
  const entries = raw && raw.profiles && typeof raw.profiles === "object" ? raw.profiles : {};
  return new Map(Object.entries(entries).filter(([url, value]) => url.startsWith("/groomers/") && value && typeof value === "object"));
}

function applyEditorialProfileReviews(listings, reviews) {
  if (!reviews.size) return listings;
  return listings.map((listing) => {
    const entry = reviews.get(listing.url);
    if (!entry) return listing;

    const sourcePages = unique((Array.isArray(entry.sourcePages) ? entry.sourcePages : []).map(safeHttpUrl).filter(Boolean)).slice(0, 6);
    const facts = (Array.isArray(entry.facts) ? entry.facts : [])
      .map((fact) => ({
        label: clean(fact && fact.label).slice(0, 80),
        value: clean(fact && fact.value).slice(0, 500),
        sourceUrl: safeHttpUrl(fact && fact.sourceUrl),
      }))
      .filter((fact) => fact.label && fact.value && fact.sourceUrl)
      .slice(0, 8);
    const lead = clean(entry.lead);
    const summary = clean(entry.summary);
    const reviewedAt = clean(entry.reviewedAt);
    if (!sourcePages.length || !facts.length || !summary || !reviewedAt) {
      throw new Error(`Editorial profile review is incomplete: ${listing.url}`);
    }
    if (lead && lead.split(/\s+/).filter(Boolean).length < 55) {
      throw new Error(`Editorial profile lead is too short: ${listing.url}`);
    }

    const updated = {
      ...listing,
      editorialReview: {
        reviewedAt,
        summary,
        sourcePages,
        facts,
      },
      websiteCrawlStatus: "editorially_reviewed",
      websiteCrawlSource: sourcePages[0],
      websiteResearchPages: sourcePages,
      websiteEnrichedAt: reviewedAt,
      websiteServices: unique([...(listing.websiteServices || []), ...cleanSignalArray(entry.services).map(friendlyWebsiteService)]).slice(0, 12),
      websiteConvenience: unique([...(listing.websiteConvenience || []), ...cleanSignalArray(entry.convenience).map(friendlyWebsiteSignal)]).slice(0, 12),
      websiteCredentials: unique([...(listing.websiteCredentials || []), ...cleanSignalArray(entry.credentials).map(friendlyWebsiteSignal)]).slice(0, 12),
      websiteBreedExperience: unique([...(listing.websiteBreedExperience || []), ...cleanSignalArray(entry.breedExperience)]).slice(0, 12),
      websitePricingAvailable: Boolean(listing.websitePricingAvailable || entry.pricingAvailable),
    };
    if (lead) {
      updated.description = lead;
      updated.descriptionIsCustom = true;
    }
    updated.score = qualityScore(updated);
    return updated;
  });
}

function loadProfileIndexOverrides() {
  if (!fs.existsSync(PROFILE_INDEX_OVERRIDES_FILE)) return new Set();
  const raw = JSON.parse(fs.readFileSync(PROFILE_INDEX_OVERRIDES_FILE, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.keepIndexed || [];
  return new Set(entries.filter((url) => typeof url === "string" && url.startsWith("/groomers/")));
}

function applyProfileIndexOverrides(listings, overrides) {
  return listings.map((listing) => ({ ...listing, keepIndexed: overrides.has(listing.url) }));
}

function normalizeBusinessSubmission(value) {
  if (!value || typeof value !== "object") return null;
  const receivedAt = clean(value.receivedAt);
  if (!receivedAt) return null;
  return {
    receivedAt,
    label: clean(value.label) || "Business-submitted update",
    source: clean(value.source) || "Details supplied directly to Dog Groomers Canada",
  };
}

function websiteHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function loadImageOverrides() {
  if (!fs.existsSync(IMAGE_OVERRIDES_FILE)) return new Map();
  const raw = JSON.parse(fs.readFileSync(IMAGE_OVERRIDES_FILE, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.images || [];
  return new Map(entries.filter((item) => item && item.url && item.image).map((item) => [item.url, item]));
}

function loadBrokenImageUrls() {
  if (!fs.existsSync(BROKEN_IMAGE_URLS_FILE)) return new Set();
  const raw = JSON.parse(fs.readFileSync(BROKEN_IMAGE_URLS_FILE, "utf8"));
  const entries = Array.isArray(raw) ? raw : raw.urls || [];
  return new Set(entries.filter(Boolean));
}

function applyImageOverrides(listings, overrides) {
  if (!overrides.size) return listings;
  return listings.map((listing) => {
    const override = overrides.get(listing.url);
    if (!override) return listing;
    const imageRights = normalizeImageRights(override.imageRights, override.imageCredit, override.source || override.sourcePage);
    if (!imageRights) return listing;
    const image = normalizeListingImageUrl(override.image);
    if (!image) return listing;
    const photos = unique([image, ...listing.photos]).slice(0, 8);
    return {
      ...listing,
      image,
      photos,
      imageRights,
      imageCredit: imageRights.credit,
      imageSourceUrl: imageRights.sourceUrl,
      imageSource: clean(override.source || override.sourcePage || "verified business source"),
    };
  });
}

function normalizeImageRights(value, fallbackCredit = "", fallbackSourceUrl = "") {
  const entry = typeof value === "string" ? { status: value } : value && typeof value === "object" ? value : null;
  if (!entry) return null;
  const status = clean(entry.status).toLowerCase();
  if (!DOCUMENTED_IMAGE_RIGHTS.has(status)) return null;
  const rights = {
    status,
    grantedAt: clean(entry.grantedAt),
    credit: clean(entry.credit || fallbackCredit),
    sourceUrl: safeHttpUrl(entry.sourceUrl || fallbackSourceUrl),
    license: clean(entry.license),
  };
  if (status === "owner_permission" && (!rights.grantedAt || !rights.credit)) return null;
  if (status !== "owner_permission" && (!rights.sourceUrl || !rights.license)) return null;
  return rights;
}

function hasDocumentedImageRights(listing) {
  return Boolean(listing && listing.imageRights && DOCUMENTED_IMAGE_RIGHTS.has(listing.imageRights.status));
}

function enforceListingImageRights(listings) {
  return listings.map((listing) => {
    if (hasDocumentedImageRights(listing)) return listing;
    return {
      ...listing,
      image: "",
      photos: [],
      imageRights: null,
      imageCredit: "",
      imageSourceUrl: "",
      imageSource: "",
    };
  });
}

function removeBrokenListingImages(listings, brokenImageUrls) {
  const usedPrimaryImages = new Set();
  return listings.map((listing) => {
    const photos = (listing.photos || []).filter((photo) => photo && !isUnusableListingImage(photo, brokenImageUrls));
    const candidates = unique([listing.image, ...photos]).filter((photo) => photo && !isUnusableListingImage(photo, brokenImageUrls) && !usedPrimaryImages.has(photo));
    const image = candidates[0] || "";
    if (image) usedPrimaryImages.add(image);
    if (image === listing.image && photos.length === listing.photos.length) return listing;
    return {
      ...listing,
      image,
      imageSource: image === listing.image ? listing.imageSource : "",
      photos: unique([image, ...photos]).filter(Boolean).slice(0, 8),
    };
  });
}

function isUnusableListingImage(url, brokenImageUrls) {
  if (!url) return false;
  return brokenImageUrls.has(url) || hasWordPressUrlFingerprint(url);
}

function hasWordPressUrlFingerprint(url) {
  return /(?:\/wp-(?:content|includes|admin|json)\b|wordpress\.com|(?:^|\/\/)i\d\.wp\.com|elementor\/|woocommerce\/)/i.test(url);
}

function sanitizeBusinessWebsite(url) {
  return hasWordPressUrlFingerprint(url) ? "" : url;
}

function groupProvinces(listings) {
  const map = new Map();
  for (const listing of listings) {
    if (!map.has(listing.provinceSlug)) {
      map.set(listing.provinceSlug, {
        name: listing.province,
        code: listing.provinceCode,
        slug: listing.provinceSlug,
        url: listing.provinceSlug === "canada" ? "/provinces/" : `/provinces/${listing.provinceSlug}/`,
        listings: [],
        cities: new Map(),
        lat: 0,
        lng: 0,
        geoCount: 0,
      });
    }
    const group = map.get(listing.provinceSlug);
    group.listings.push(listing);
    if (listing.city && listing.city !== "Canada") {
      const cityKey = listing.citySlug;
      if (!group.cities.has(cityKey)) {
        group.cities.set(cityKey, {
          city: listing.city,
          slug: listing.citySlug,
          province: listing.province,
          provinceCode: listing.provinceCode,
          provinceSlug: listing.provinceSlug,
          url: `/provinces/${listing.provinceSlug}/${listing.citySlug}/`,
          listings: [],
          lat: 0,
          lng: 0,
          geoCount: 0,
        });
      }
      group.cities.get(cityKey).listings.push(listing);
    }
    if (Number.isFinite(listing.lat) && Number.isFinite(listing.lng)) {
      group.lat += listing.lat;
      group.lng += listing.lng;
      group.geoCount += 1;
    }
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      count: group.listings.length,
      lat: group.geoCount ? group.lat / group.geoCount : null,
      lng: group.geoCount ? group.lng / group.geoCount : null,
      cities: [...group.cities.values()].map(finalizeCity).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
      topListings: group.listings.slice().sort(sortListings).slice(0, 12),
    }))
    .filter((group) => group.slug !== "canada")
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function groupCities(listings) {
  const map = new Map();
  for (const listing of listings) {
    if (listing.provinceSlug === "canada" || !listing.city || listing.city === "Canada") continue;
    const key = `${listing.provinceSlug}/${listing.citySlug}`;
    if (!map.has(key)) {
      map.set(key, {
        city: listing.city,
        slug: listing.citySlug,
        province: listing.province,
        provinceCode: listing.provinceCode,
        provinceSlug: listing.provinceSlug,
        url: `/provinces/${listing.provinceSlug}/${listing.citySlug}/`,
        listings: [],
        lat: 0,
        lng: 0,
        geoCount: 0,
      });
    }
    map.get(key).listings.push(listing);
  }

  return [...map.values()].map(finalizeCity).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

function finalizeCity(city) {
  for (const listing of city.listings) {
    if (Number.isFinite(listing.lat) && Number.isFinite(listing.lng)) {
      city.lat += listing.lat;
      city.lng += listing.lng;
      city.geoCount += 1;
    }
  }
  return {
    ...city,
    count: city.listings.length,
    lat: city.geoCount ? city.lat / city.geoCount : null,
    lng: city.geoCount ? city.lng / city.geoCount : null,
    topListings: city.listings.slice().sort(sortListings),
  };
}

function groupServices(listings) {
  return serviceDefinitions
    .map((service) => {
      const matching = listings.filter((listing) => matchedServiceSlugs(listing).includes(service.slug)).sort(sortListings);
      return {
        ...service,
        url: `/services/${service.slug}/`,
        listings: matching,
        count: matching.length,
      };
    })
    .filter((service) => service.count >= 8);
}

function writeStaticAssets(context) {
  fs.mkdirSync(path.join(ROOT, "assets"), { recursive: true });

  fs.writeFileSync(
    path.join(ROOT, "assets", "search-index.json"),
    JSON.stringify({
      generatedAt: BUILD_DATE,
      stats: context.stats,
      services: context.services.map((service) => ({
        slug: service.slug,
        name: service.name,
        short: service.short,
      })),
      cities: context.cities.map((city) => ({
        city: city.city,
        province: city.province,
        provinceCode: city.provinceCode,
        url: city.url,
        count: city.count,
        lat: city.lat,
        lng: city.lng,
      })),
      listings: context.listings.map((listing) => ({
        title: listing.title,
        category: listing.category,
        city: listing.city,
        province: listing.province,
        provinceCode: listing.provinceCode,
        address: listing.address,
        phone: listing.phone,
        phoneRaw: listing.phoneRaw,
        website: listing.website,
        rating: listing.rating,
        reviews: listing.reviews,
        lat: listing.lat,
        lng: listing.lng,
        image: listing.image,
        fallbackImage: sameBusinessFallbackImage(listing),
        imageSource: listing.imageSource || "",
        imageRights: listing.imageRights ? listing.imageRights.status : "",
        services: listing.services,
        serviceSlugs: matchedServiceSlugs(listing),
        url: listing.url,
        cityUrl: listing.cityUrl,
      })),
    }),
  );

  fs.writeFileSync(path.join(ROOT, "assets", "favicon.svg"), logoMarkSvg());
  fs.writeFileSync(path.join(ROOT, "assets", "logo-mark.svg"), logoMarkSvg());
  fs.writeFileSync(path.join(ROOT, "assets", "logo.svg"), logoWordmarkSvg());
  fs.writeFileSync(path.join(ROOT, "assets", "og-image.svg"), ogImageSvg(context.stats));
  fs.writeFileSync(path.join(ROOT, "assets", "site.webmanifest"), siteManifest());
}

function writeHomePage(context) {
  const topCities = context.cities.slice(0, 16);
  const recentListings = context.listings.filter((item) => item.provinceSlug !== "canada").slice(0, 8);
  const featuredGuides = guideArticles.filter((article) => article.featured).slice(0, 3);
  const body = `
    <section class="hero">
      <div class="wrap hero-grid">
        <aside class="sidebar" aria-label="Browse directory">
          <h2>Browse by Province</h2>
          ${linkList(
            context.provinces,
            (province) => province.url,
            (province) => province.name,
            (province) => `${province.count.toLocaleString()}`,
          )}
          <h2>Popular Cities</h2>
          ${linkList(
            topCities.slice(0, 9),
            (city) => city.url,
            (city) => `${city.city}, ${city.provinceCode}`,
            (city) => `${city.count}`,
          )}
        </aside>
        <div class="hero-main">
          ${searchPanel()}
          <div class="hero-copy">
            <h1>Dog Grooming Canada: Find Groomers and Learn What Your Dog Needs</h1>
            <p class="lead">Search ${context.stats.listings.toLocaleString()} Canadian dog grooming businesses and use original grooming guides to compare coat care, seasonal risks, breed needs, costs, services, and booking questions before you choose a groomer.</p>
            <div class="stat-strip">
              <div class="stat"><strong>${context.stats.listings.toLocaleString()}</strong><span>Grooming listings</span></div>
              <div class="stat"><strong>${context.stats.cities.toLocaleString()}</strong><span>City pages</span></div>
              <div class="stat"><strong>${guideArticles.length}</strong><span>Original grooming guides</span></div>
            </div>
            <p data-nearest-city class="muted" style="margin-top:14px"></p>
          </div>
          <div class="guide-rail" aria-label="Featured grooming guides">
            ${featuredGuides.map((article) => guideCard(article, "compact")).join("")}
          </div>
          <div class="section-head">
            <div>
              <h2>Dog groomer profiles</h2>
              <p>Open detailed profiles with contact information, services mentioned, booking guidance, and nearby alternatives.</p>
            </div>
            <a class="link-arrow" href="/cities/">View all cities -></a>
          </div>
          <div class="listing-stack">${recentListings.map((item) => listingCard(item)).join("")}</div>
        </div>
      </div>
    </section>
    ${homeGuideSection(context)}
    ${homeCostSection(context)}
    ${homeToolSection(context)}
    ${directoryMethodSection(context)}
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Explore popular grooming cities</h2>
            <p>Each city page links directly to local business profiles, making it easy to compare contact details, services, and nearby options.</p>
          </div>
          <a class="link-arrow" href="/sitemap/">HTML sitemap -></a>
        </div>
        <div class="grid-4">${topCities
          .map(
            (city) =>
              `<a class="province-card" href="${city.url}"><span><strong>${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${countLabel(city.count, "groomer")} listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">
        <div class="info-card">
          <h2>Location based</h2>
          <p>Use your location to jump to the nearest city page, compare nearby groomers by distance, or narrow the list to mobile dog grooming that may serve your area. Location is only requested when you press the button.</p>
          <a class="btn btn-dark" href="/dog-grooming-near-me/">Find dog grooming near me</a>
          <p><a class="link-arrow" href="/mobile-dog-grooming-near-me/">Find mobile grooming near me -></a></p>
        </div>
        <div class="info-card">
          <h2>Easy ways to browse</h2>
          <p>Browse by province, city, service, or business profile, or use the HTML sitemap for a complete directory index.</p>
          <a class="btn btn-light" href="/provinces/">Browse provinces</a>
          <p><a class="link-arrow" href="https://doggroomersus.com/">In the United States? Visit Dog Groomers US -&gt;</a></p>
        </div>
        <div class="info-card">
          <h2>Helpful before booking</h2>
          <p>Profiles surface phone numbers, websites, Google Maps links, hours, services, ratings, and nearby alternatives so pet owners can choose faster.</p>
          <a class="btn btn-light" href="/services/">Browse services</a>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>How to choose a dog groomer</h2>
            <p>Call ahead to confirm pricing, breed experience, de-matting policies, vaccination requirements, appointment length, and whether add-ons such as nail grinding or teeth brushing are available.</p>
          </div>
        </div>
        <div class="grid-3">
          <div class="info-card"><h3>Check fit first</h3><p>Ask about coat type, temperament, senior dogs, puppies, double coats, hand scissoring, and any special handling your dog needs.</p></div>
          <div class="info-card"><h3>Compare convenience</h3><p>Use city pages, maps links, hours, mobile-service notes, and phone numbers to shortlist groomers that are realistic for your schedule.</p></div>
          <div class="info-card"><h3>Verify current details</h3><p>Directory data can change. Confirm availability, website details, services, and prices directly with the business before booking.</p></div>
        </div>
      </div>
    </section>`;

  const schema = [
    websiteSchema(),
    organizationSchema(),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Dog groomers in Canada",
      itemListElement: recentListings.map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(listing.url),
        name: listing.title,
      })),
    },
  ];

  writePage(context, "/", "Dog Grooming Canada | Find Groomers and Grooming Guides", homeMetaDescription(context), body, schema);
}

function writeProvinceIndex(context) {
  const body = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Provinces" }])}
        <h1 class="city-title">Browse Dog Grooming by Province</h1>
        <p class="lead">Choose a province to find dog grooming near you, including city pages and local businesses with ratings, phone numbers, websites, hours, and profile pages.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">
        ${context.provinces
          .map(
            (province) =>
              `<a class="province-card" href="${province.url}"><span><strong>${esc(province.name)}</strong><span>${province.count.toLocaleString()} listings across ${province.cities.length.toLocaleString()} cities</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}
      </div>
    </section>`;
  writePage(context, "/provinces/", "Dog Grooming by Province | Dog Groomers Canada", "Dog grooming by province in Canada: browse local dog groomers near you by city, rating, service, phone number, website, and profile page.", body, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Provinces", url: "/provinces/" }]));
}

function writeCityIndex(context) {
  const rows = context.cities
    .map(
      (city) => `<tr><td><a href="${city.url}">${esc(city.city)}, ${esc(city.provinceCode)}</a></td><td>${esc(city.province)}</td><td>${city.count.toLocaleString()}</td></tr>`,
    )
    .join("");
  const body = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Cities" }])}
        <h1 class="city-title">All Dog Grooming City Pages</h1>
        <p class="lead">This index links to ${context.cities.length.toLocaleString()} local dog grooming directory pages across Canada.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="search-panel compact">${searchForm()}</div>
        <table class="directory-table">
          <thead><tr><th>City</th><th>Province</th><th>Listings</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
  writePage(context, "/cities/", "Dog Grooming Near Me by City | Dog Groomers Canada", cityIndexMetaDescription(context), body, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Cities", url: "/cities/" }]));
}

function writeProvincePages(context) {
  for (const province of context.provinces) {
    const topCities = province.cities.slice(0, 30);
    const withPhones = province.listings.filter((item) => item.phone).length;
    const withWebsites = province.listings.filter((item) => item.website).length;
    const serviceNames = cityServices(province.listings, context.services)
      .slice(0, 5)
      .map((service) => service.short)
      .join(", ");
    const body = `
      <section class="page-intro">
        <div class="wrap">
          ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Provinces", url: "/provinces/" }, { label: province.name }])}
          <h1 class="city-title">Dog Grooming in ${esc(province.name)}</h1>
          <p class="lead">Browse ${province.count.toLocaleString()} dog grooming businesses across ${province.cities.length.toLocaleString()} ${province.name} cities. Compare dog groomers near you by profile, rating, service, phone number, website, and local contact details.</p>
          ${searchPanel("compact")}
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            <div class="section-head">
              <div><h2>Top ${esc(province.name)} dog groomer listings</h2><p>Profiles are sorted by rating strength, review volume, contact completeness, and listing quality.</p></div>
            </div>
            <section class="section">
              <h2>Using this ${esc(province.name)} directory</h2>
              <p>Start with the city links below if you need a local shortlist, or compare the strongest province-wide listings when you are flexible on location. Confirm current services, pricing, and appointment availability directly with each business.</p>
              <div class="grid-3">
                <div class="info-card"><h3>Contact coverage</h3><p>${withPhones.toLocaleString()} listings include phone numbers and ${withWebsites.toLocaleString()} include website links for deeper service research.</p></div>
                <div class="info-card"><h3>Service signals</h3><p>${serviceNames ? `Common service signals include ${esc(serviceNames)}.` : "Service details vary by listing."} Ask each groomer what is included before booking.</p></div>
                <div class="info-card"><h3>Local browsing</h3><p>Browse ${province.cities.length.toLocaleString()} city pages to compare groomers by location, ratings, hours, and nearby alternatives.</p></div>
              </div>
            </section>
            <div class="listing-stack">${province.topListings.map((item) => listingCard(item)).join("")}</div>
            <h2>Cities in ${esc(province.name)}</h2>
            <div class="grid-3">${topCities
              .map(
                (city) =>
                  `<a class="province-card" href="${city.url}"><span><strong>${esc(city.city)}</strong><span>${countLabel(city.count, "groomer")} listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </main>
          <aside class="side-panel">
            <div class="info-card"><h2>Province snapshot</h2><p>${province.count.toLocaleString()} listings</p><p>${province.cities.length.toLocaleString()} city pages</p><p>${province.listings.filter((item) => item.phone).length.toLocaleString()} with phone numbers</p></div>
          </aside>
        </div>
      </section>`;

    const schema = [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Provinces", url: "/provinces/" }, { label: province.name, url: province.url }]),
      itemListSchema(`Dog groomers in ${province.name}`, province.topListings.slice(0, 20)),
    ];
    writePage(context, province.url, `Dog Grooming in ${province.name} | Dog Groomers Canada`, provinceMetaDescription(province), body, schema);
  }
}

function writeCityPages(context) {
  const costMap = costCityMap(context);
  for (const city of context.cities) {
    const listings = city.topListings;
    const province = context.provinces.find((item) => item.slug === city.provinceSlug);
    const nearby = nearbyCities(city, context.cities).slice(0, 10);
    const services = cityServices(listings, context.services).slice(0, 8);
    const body = `
      <section class="page-intro">
        <div class="wrap">
          ${breadcrumbs([
            { label: "Home", url: "/" },
            { label: "Provinces", url: "/provinces/" },
            { label: city.province, url: province ? province.url : "/provinces/" },
            { label: city.city },
          ])}
          <h1 class="city-title">Dog Grooming in ${esc(city.city)}, ${esc(city.provinceCode)}</h1>
          <p class="lead">Compare ${countLabel(city.count, "dog grooming business", "dog grooming businesses")} in ${esc(city.city)}, ${esc(city.province)}. Find dog groomers near you with ratings, contact details, websites, services, hours, maps, and profile pages before booking.</p>
          ${searchPanel("compact")}
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            <div class="filter-bar" id="results">
              <strong>${countLabel(city.count, "groomer")} found</strong>
              <div class="tag-cloud">${services.map((service) => `<a class="tag" href="${localServiceSearchUrl(city, service)}">${esc(service.short)}</a>`).join("")}</div>
            </div>
            <div class="listing-stack" data-city-listings>${listings.map((item) => listingCard(item)).join("")}</div>
            ${cityQualitySection(city, services, nearby)}
            ${cityServicePlannerSection(city, services)}
            ${citySeasonalCareSection(city)}
            ${cityBookingQuestionsSection(city, services, province, costMap)}
            <section class="section">
              <h2>Choosing a groomer in ${esc(city.city)}</h2>
              <p>Use the listings above to compare location, rating volume, phone availability, website links, and services mentioned in each profile. Always confirm current pricing, appointment availability, coat-specific experience, and any special handling needs directly with the groomer.</p>
              <div class="grid-3">
                <div class="info-card"><h3>Ask about services</h3><p>Confirm bath, brush, haircut, nail trim, de-shedding, de-matting, puppy grooming, and add-on availability.</p></div>
                <div class="info-card"><h3>Check logistics</h3><p>Review hours, address, parking, mobile-service notes, and whether the business is taking new dogs.</p></div>
                <div class="info-card"><h3>Match the coat</h3><p>For double coats, curly coats, senior dogs, nervous dogs, or breed-specific trims, ask about recent experience.</p></div>
              </div>
            </section>
          </main>
          <aside class="side-panel">
            <div class="info-card">
              <h2>Nearby city pages</h2>
              ${linkList(
                nearby,
                (item) => item.url,
                (item) => `${item.city}, ${item.provinceCode}`,
                (item) => `${item.count}`,
              )}
            </div>
            <div class="info-card">
              <h2>${esc(city.province)} directory</h2>
              <p>Browse all ${esc(city.province)} dog grooming locations from the province page.</p>
              <a class="btn btn-light" href="${province ? province.url : "/provinces/"}">View province</a>
            </div>
          </aside>
        </div>
      </section>`;

    const schema = [
      breadcrumbSchema([
        { label: "Home", url: "/" },
        { label: "Provinces", url: "/provinces/" },
        { label: city.province, url: province ? province.url : "/provinces/" },
        { label: city.city, url: city.url },
      ]),
      itemListSchema(`Dog groomers in ${city.city}, ${city.provinceCode}`, listings.slice(0, 50)),
      faqSchema(city.city),
    ];
    writePage(context, city.url, `Dog Grooming in ${city.city}, ${city.provinceCode} | Dog Groomers Canada`, cityMetaDescription(city), body, schema);
  }
}

function writeListingPages(context) {
  const cityMap = new Map(context.cities.map((city) => [`${city.provinceSlug}/${city.slug}`, city]));
  const costMap = costCityMap(context);
  for (const listing of context.listings) {
    const city = cityMap.get(`${listing.provinceSlug}/${listing.citySlug}`);
    const province = context.provinces.find((item) => item.slug === listing.provinceSlug);
    const related = relatedListings(listing, context.listings).slice(0, 6);
    const correctionUrl = correctionMailto(listing);
    const photoPermissionUrl = photoPermissionMailto(listing);
    const costGuideUrl = costGuideUrlForCity(city, province, costMap);
    const indexable = shouldIndexListing(listing);
    const photos = listing.photos.length
      ? `<section class="section"><h2>Photos</h2><div class="photo-grid">${listing.photos
          .map((photo) => {
            const fallbackImage = sameBusinessFallbackImage(listing, photo);
            return `<a href="${escAttr(photo)}" target="_blank" rel="noopener nofollow"><img src="${escAttr(photo)}" alt="${escAttr(listing.title)} photo" loading="lazy" referrerpolicy="no-referrer"${listingImageRightsAttr(listing)}${fallbackImage ? ` data-fallback-image="${escAttr(fallbackImage)}" data-fallback-alt="${escAttr(listingImageAlt(listing, "profile"))}"` : ""}></a>`;
          })
          .join("")}</div>${listingImageSourceNote(listing, "photos")}</section>`
      : "";
    const hours = listing.hours.length
      ? `<section class="section"><h2>Hours listed</h2><ul class="hours-list">${listing.hours
          .map((item) => `<li><strong>${esc(item.day)}</strong><span>${esc(item.hours)}</span></li>`)
          .join("")}</ul></section>`
      : "";
    const profileServices = listingProfileServices(listing);
    const services = profileServices.length
      ? `<div class="tag-cloud">${profileServices.map((item) => `<span class="tag">${esc(item)}</span>`).join("")}</div>`
      : `<p class="muted">Call ahead to confirm bath, haircut, nail trim, de-shedding, puppy groom, de-matting, and breed-specific services.</p>`;
    const contact = `
      <dl class="detail-list">
        ${detailRow("Phone", listing.phone ? `<a href="tel:${escAttr(listing.phoneRaw || listing.phone)}">${esc(listing.phone)}</a>` : "Call to confirm")}${listing.email ? `
        ${detailRow("Email", `<a href="mailto:${escAttr(listing.email)}">${esc(listing.email)}</a>`)}` : ""}
        ${detailRow("Website", listing.website ? `<a href="${escAttr(listing.website)}" target="_blank" rel="nofollow noopener">${esc(cleanDisplayUrl(listing.website))}</a>` : "Not listed")}
        ${detailRow("Address", listing.address ? esc(listing.address) : `${esc(listing.city)}, ${esc(listing.province)}`)}
        ${detailRow("Maps", listing.mapsUrl ? `<a href="${escAttr(listing.mapsUrl)}" target="_blank" rel="nofollow noopener">Open in Google Maps</a>` : "Map link not listed")}
        ${detailRow("Category", esc(listing.category || "Pet groomer"))}
        ${detailRow("Status", listing.temporarilyClosed ? "Temporarily closed in source data" : "Call business to confirm current availability")}
      </dl>`;

    const body = `
      <section class="page-intro">
        <div class="wrap">
          ${breadcrumbs([
            { label: "Home", url: "/" },
            { label: listing.province, url: province ? province.url : "/provinces/" },
            { label: listing.city, url: city ? city.url : listing.cityUrl },
            { label: listing.title },
          ])}
          <div class="profile-hero">
            <div>
              <h1 class="city-title">${esc(listing.title)}</h1>
              ${profileProvenanceLine(listing)}
              <p class="lead">${esc(listing.description)}</p>
              <div class="meta-line">${ratingLine(listing)}<span>${esc(listing.city)}, ${esc(listing.provinceCode)}</span></div>
              <div class="tag-cloud" style="margin-top:18px">${listing.phone ? `<a class="btn btn-dark" href="tel:${escAttr(listing.phoneRaw || listing.phone)}">Call ${esc(listing.phone)}</a>` : ""}${listing.website ? `<a class="btn btn-primary" href="${escAttr(listing.website)}" target="_blank" rel="nofollow noopener">Visit Website</a>` : ""}${listing.mapsUrl ? `<a class="btn btn-light" href="${escAttr(listing.mapsUrl)}" target="_blank" rel="nofollow noopener">Open Map</a>` : ""}<button class="btn btn-light shortlist-toggle" type="button" data-shortlist-toggle data-listing-url="${escAttr(listing.url)}" data-listing-name="${escAttr(listing.title)}" aria-label="Save ${escAttr(listing.title)} to compare" aria-pressed="false">☆ Save to compare</button></div>
            </div>
            <div class="profile-photo-wrap"><div class="profile-photo">${listing.image ? `<img src="${escAttr(listing.image)}" alt="${escAttr(listingImageAlt(listing, "profile"))}" loading="eager" referrerpolicy="no-referrer"${listingImageRightsAttr(listing)}${sameBusinessFallbackImage(listing) ? ` data-fallback-image="${escAttr(sameBusinessFallbackImage(listing))}" data-fallback-alt="${escAttr(listingImageAlt(listing, "profile"))}"` : ""}>` : imageUnavailable(listing, "profile")}</div>${listingImageSourceNote(listing)}</div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            <section>
              <h2>Business details</h2>
              ${contact}
            </section>${listing.offer ? `
            ${listingOfferSection(listing)}` : ""}
            <section class="section">
              <h2>Services mentioned</h2>
              ${services}
              <p class="muted" style="margin-top:14px">Service information is summarized from available listing data and may not be complete. Confirm current services and prices directly with the groomer.</p>
            </section>
            ${listingSpecificSignalsSection(listing)}
            ${editorialProfileReviewSection(listing)}
            ${listingReviewThemesSection(listing)}
            ${listingGuidanceSection(listing, related, correctionUrl)}
            ${profileCostAndQuoteSection(listing, city, province, costMap)}
            ${profileQuestionsSection(listing)}
            ${profileCorrectionSection(listing, correctionUrl, photoPermissionUrl)}
            ${hours}
            ${photos}
            <section class="section">
              <h2>Nearby dog groomers</h2>
              <div class="listing-stack">${related.map((item) => listingCard(item, true)).join("")}</div>
            </section>
          </main>
          <aside class="side-panel">
            <div class="info-card">
              <h2>Local directory</h2>
              <p>Compare more dog groomers in ${esc(listing.city)}, ${esc(listing.provinceCode)}.</p>
              <a class="btn btn-light" href="${city ? city.url : listing.cityUrl}">View city page</a>
            </div>
            <div class="info-card">
              <h2>Before booking</h2>
              <p>Ask about appointment availability, grooming package details, add-ons, cancellation policy, vaccination requirements, and breed-specific experience.</p>
            </div>
            <div class="info-card">
              <h2>Local cost guide</h2>
              <p>Check planning ranges and quote questions before asking ${esc(listing.title)} for a current price.</p>
              <a class="btn btn-light" href="${costGuideUrl}">View cost guide</a>
            </div>
            <div class="info-card">
              <h2>Update this profile</h2>
              <p>See an outdated phone number, website, address, image, service, or business status?</p>
              <a class="btn btn-light" href="${escAttr(correctionUrl)}">Send correction</a>
            </div>
          </aside>
        </div>
      </section>`;

    const schema = [
      breadcrumbSchema([
        { label: "Home", url: "/" },
        { label: listing.province, url: province ? province.url : "/provinces/" },
        { label: listing.city, url: city ? city.url : listing.cityUrl },
        { label: listing.title, url: listing.url },
      ]),
      localBusinessSchema(listing),
    ];
    writePage(
      context,
      listing.url,
      `${listing.title} | Dog Grooming in ${listing.city}, ${listing.provinceCode}`,
      listingMetaDescription(listing),
      body,
      schema,
      {
        noSitemap: !indexable,
        robotsContent: indexable ? "index,follow,max-image-preview:large" : "noindex,follow",
        bodyAttrs: `data-content-type="directory-record" data-profile-depth="${listingInformationDepth(listing)}" data-profile-index-status="${indexable ? "index" : "noindex"}"`,
      },
    );
  }
}

function writeListingRedirects(redirects) {
  for (const redirect of redirects) {
    const target = path.join(ROOT, trimSlashes(redirect.from), "index.html");
    const destination = absoluteUrl(redirect.to);
    const html = `<!doctype html>
<html lang="en-CA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=${escAttr(redirect.to)}">
  <link rel="canonical" href="${escAttr(destination)}">
  <meta name="robots" content="noindex, follow">
  <title>Listing moved | ${BRAND_NAME}</title>
</head>
<body>
  <p>This listing has moved to <a href="${escAttr(redirect.to)}">the current business profile</a>.</p>
</body>
</html>`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, cleanGeneratedHtml(html));
  }
}

function writeServicePages(context) {
  const indexBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Services" }])}
        <h1 class="city-title">Dog Grooming Services in Canada</h1>
        <p class="lead">Browse service-focused directory pages built from the grooming services mentioned in listing data. Always confirm exact availability and prices directly with the business.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">${context.services
        .map(
          (service) =>
            `<a class="province-card" href="${service.url}"><span><strong>${esc(service.name)}</strong><span>${service.count.toLocaleString()} matching listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
        )
        .join("")}</div>
    </section>`;
  writePage(context, "/services/", "Dog Grooming Services in Canada | Dog Groomers Canada", "Dog grooming services in Canada: compare haircuts, nail trims, puppy grooming, bath and brush, de-shedding, mobile grooming, and local groomers.", indexBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Services", url: "/services/" }]));

  for (const service of context.services) {
    const top = service.listings.slice(0, 80);
    const provinceCounts = countBy(service.listings, (item) => item.province).slice(0, 12);
    const body = `
      <section class="page-intro">
        <div class="wrap">
          ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Services", url: "/services/" }, { label: service.name }])}
          <h1 class="city-title">${esc(service.name)} in Canada</h1>
          <p class="lead">${esc(service.intro)} This page includes ${service.count.toLocaleString()} matching dog grooming listings from across Canada.</p>
          ${searchPanel("compact")}
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            ${serviceGuidanceSection(service)}
            <div class="listing-stack">${top.map((item) => listingCard(item)).join("")}</div>
          </main>
          <aside class="side-panel">
            <div class="info-card">
              <h2>Top provinces</h2>
              ${linkList(
                provinceCounts,
                (item) => context.provinces.find((province) => province.name === item.name)?.url || "/provinces/",
                (item) => item.name,
                (item) => `${item.count}`,
              )}
            </div>
            ${
              service.slug === "mobile-dog-grooming"
                ? `<div class="info-card"><h2>Use your location</h2><p>Sort mobile grooming listings by distance and compare companies that mention mobile, in-home, or house-call grooming.</p><a class="btn btn-light" href="/mobile-dog-grooming-near-me/">Mobile grooming near me</a></div>`
                : ""
            }
            <div class="info-card"><h2>Confirm before booking</h2><p>Service data can be incomplete. Ask the groomer about the exact package, timing, price, coat requirements, and whether your dog needs a consultation.</p></div>
          </aside>
        </div>
      </section>`;
    writePage(context, service.url, `${service.name} in Canada | Dog Groomers Canada`, serviceMetaDescription(service), body, [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Services", url: "/services/" }, { label: service.name, url: service.url }]),
      itemListSchema(`${service.name} listings in Canada`, top.slice(0, 50)),
    ]);
  }
}

function writeCostPages(context) {
  const costCities = costCityPages(context);
  const costMap = costCityMap(context);
  const hubTitle = "Dog Grooming Cost in Canada | Price Ranges and Quote Tips";
  const hubDescription = "Dog grooming cost in Canada: planning ranges for baths, haircuts, nail trims, de-shedding, de-matting, mobile grooming, add-ons, and quote questions.";

  writePage(
    context,
    "/dog-grooming-cost/",
    hubTitle,
    hubDescription,
    costHubBody(context, costCities),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Dog Grooming Cost", url: "/dog-grooming-cost/" }]),
      costArticleSchema("/dog-grooming-cost/", "Dog Grooming Cost in Canada", hubDescription, "Costs and booking"),
      costFaqSchema("Canada dog grooming cost"),
      itemListSchema("Dog grooming cost guides by province", context.provinces.map((province) => ({ title: `${province.name} dog grooming cost`, url: provinceCostRoute(province) }))),
    ],
  );

  for (const province of context.provinces) {
    const provinceCities = costCities.filter((city) => city.provinceSlug === province.slug);
    const title = `Dog Grooming Cost in ${province.name} | Price Ranges and Tips`;
    const description = metaDescription(
      `Dog grooming cost in ${province.name}: planning ranges for full grooms, bath and brush, nails, de-shedding, de-matting, mobile fees, and quote questions.`,
    );
    writePage(
      context,
      provinceCostRoute(province),
      title,
      description,
      provinceCostBody(province, provinceCities, context),
      [
        breadcrumbSchema([
          { label: "Home", url: "/" },
          { label: "Dog Grooming Cost", url: "/dog-grooming-cost/" },
          { label: province.name, url: provinceCostRoute(province) },
        ]),
        costArticleSchema(provinceCostRoute(province), `Dog Grooming Cost in ${province.name}`, description, "Costs and booking"),
        costFaqSchema(`${province.name} dog grooming cost`),
        itemListSchema(`${province.name} dog grooming cost pages`, provinceCities.map((city) => ({ title: `${city.city}, ${city.provinceCode} dog grooming cost`, url: cityCostRoute(city) }))),
      ],
    );
  }

  for (const city of costCities) {
    const province = context.provinces.find((item) => item.slug === city.provinceSlug);
    const services = cityServices(city.listings, context.services).slice(0, 6);
    const title = `Dog Grooming Cost in ${city.city}, ${city.provinceCode} | Price Guide`;
    const description = metaDescription(
      `Dog grooming cost in ${city.city}, ${city.provinceCode}: compare planning ranges, local service signals, add-ons, mobile fees, and quote questions before booking.`,
    );
    writePage(
      context,
      cityCostRoute(city),
      title,
      description,
      cityCostBody(city, province, services, costMap),
      [
        breadcrumbSchema([
          { label: "Home", url: "/" },
          { label: "Dog Grooming Cost", url: "/dog-grooming-cost/" },
          { label: province ? province.name : city.province, url: province ? provinceCostRoute(province) : "/dog-grooming-cost/" },
          { label: city.city, url: cityCostRoute(city) },
        ]),
        costArticleSchema(cityCostRoute(city), `Dog Grooming Cost in ${city.city}, ${city.provinceCode}`, description, "Costs and booking"),
        costFaqSchema(`${city.city} dog grooming cost`),
        itemListSchema(`Dog groomers in ${city.city}`, city.topListings.slice(0, 20)),
      ],
    );
  }
}

function costHubBody(context, costCities) {
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Dog Grooming Cost" }])}
        <h1 class="city-title">Dog Grooming Cost in Canada</h1>
        <p class="lead">Use these Canadian grooming price ranges as planning estimates before you call a groomer. The real quote depends on size, coat condition, haircut style, matting, handling, local demand, and what the business includes in the package.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          ${costRangeTable("Canada")}
          ${costAdjustmentSection()}
          ${costQuoteChecklist("Canada")}
          ${costFaqSection("Canada")}
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Cost estimator</h2><p>Estimate a planning range by dog size, service type, coat condition, and mobile grooming needs.</p><a class="btn btn-primary" href="/grooming-tools/dog-grooming-cost-estimator/">Open estimator</a></div>
          <div class="info-card"><h2>Pricing references reviewed</h2>${costReferenceLinks()}</div>
          <div class="info-card"><h2>Directory snapshot</h2><p>${context.stats.listings.toLocaleString()} Canadian grooming listings across ${context.stats.cities.toLocaleString()} city pages.</p><a class="btn btn-light" href="/cities/">Browse cities</a></div>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><h2>Dog grooming cost by province</h2><p>Province pages explain regional booking factors such as city demand, travel distance, winter coat care, mobile grooming availability, and appointment supply.</p></div>
        </div>
        <div class="grid-3">${context.provinces
          .map(
            (province) =>
              `<a class="province-card" href="${provinceCostRoute(province)}"><span><strong>${esc(province.name)} dog grooming cost</strong><span>${province.count.toLocaleString()} listings across ${province.cities.length.toLocaleString()} cities</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><h2>Major city cost guides</h2><p>City pages are generated only where there is enough local directory data to support a useful page.</p></div>
        </div>
        <div class="grid-4">${costCities
          .slice(0, 32)
          .map(
            (city) =>
              `<a class="province-card" href="${cityCostRoute(city)}"><span><strong>${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} local listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}</div>
      </div>
    </section>`;
}

function provinceCostBody(province, provinceCities, context) {
  const factors = provinceCostFactors(province);
  const services = cityServices(province.listings, context.services).slice(0, 6);
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Dog Grooming Cost", url: "/dog-grooming-cost/" }, { label: province.name }])}
        <h1 class="city-title">Dog Grooming Cost in ${esc(province.name)}</h1>
        <p class="lead">Plan a realistic grooming budget for ${esc(province.name)} dogs, then confirm the final quote directly with the groomer. This page combines Canadian price-range research with local directory signals from ${province.count.toLocaleString()} listings across ${province.cities.length.toLocaleString()} cities.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          ${costRangeTable(province.name)}
          <section class="section">
            <h2>${esc(province.name)} price factors to ask about</h2>
            <p>${esc(factors.intro)}</p>
            <div class="grid-3">${factors.cards.map((card) => `<div class="info-card"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></div>`).join("")}</div>
          </section>
          ${serviceCostSignalSection(services, province)}
          ${costQuoteChecklist(province.name)}
          ${costFaqSection(province.name)}
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>${esc(province.name)} directory</h2><p>Compare ${province.count.toLocaleString()} dog grooming listings by city, rating, service signal, phone, website, hours, and profile notes.</p><a class="btn btn-light" href="${province.url}">Browse ${esc(province.name)}</a></div>
          <div class="info-card"><h2>Cost estimator</h2><p>Use the estimator before calling so you can describe size, coat, matting, and package scope clearly.</p><a class="btn btn-primary" href="/grooming-tools/dog-grooming-cost-estimator/">Open estimator</a></div>
          <div class="info-card"><h2>Pricing references</h2>${costReferenceLinks()}</div>
        </aside>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><h2>${esc(province.name)} city cost guides</h2><p>These city pages have enough local listings to support more specific booking notes.</p></div>
        </div>
        <div class="grid-4">${
          provinceCities.length
            ? provinceCities
                .map(
                  (city) =>
                    `<a class="province-card" href="${cityCostRoute(city)}"><span><strong>${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} local listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
                )
                .join("")
            : `<div class="info-card"><h3>City pages coming from the directory</h3><p>This province currently has fewer major-city cost pages. Use the province range, then compare local directory pages and call groomers directly.</p></div>`
        }</div>
      </div>
    </section>`;
}

function cityCostBody(city, province, services, costMap) {
  const notes = cityCostLocalNotes(city);
  const nearby = province ? nearbyCities(city, province.cities) : [];
  const nearbyCostPages = nearby.filter((item) => costMap.has(costCityKey(item))).slice(0, 8);
  const nearbyCostMarkup = nearbyCostPages.length
    ? linkList(
        nearbyCostPages,
        cityCostRoute,
        (item) => `${item.city}, ${item.provinceCode}`,
        (item) => `${item.count}`,
      )
    : `<p>No other same-province city cost guides are available yet.</p><a class="btn btn-light" href="${province ? provinceCostRoute(province) : "/dog-grooming-cost/"}">View ${esc(province ? province.name : "Canada")} cost guide</a>`;
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([
          { label: "Home", url: "/" },
          { label: "Dog Grooming Cost", url: "/dog-grooming-cost/" },
          { label: province ? province.name : city.province, url: province ? provinceCostRoute(province) : "/dog-grooming-cost/" },
          { label: city.city },
        ])}
        <h1 class="city-title">Dog Grooming Cost in ${esc(city.city)}, ${esc(city.provinceCode)}</h1>
        <p class="lead">Use this ${esc(city.city)} cost guide to prepare a better quote request. It is based on Canadian grooming price-range research plus local directory signals from ${city.count.toLocaleString()} dog grooming listings.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          ${costRangeTable(`${city.city}, ${city.provinceCode}`)}
          <section class="section">
            <h2>Local price notes for ${esc(city.city)}</h2>
            <p>${esc(notes.body)}</p>
            <div class="grid-3">
              <div class="info-card"><h3>Directory supply</h3><p>${city.count.toLocaleString()} local profiles are available for comparison. More options can help you compare quote scope, appointment windows, and add-ons.</p></div>
              <div class="info-card"><h3>Market pressure</h3><p>${esc(notes.market)}</p></div>
              <div class="info-card"><h3>Best next step</h3><p>Call two or three groomers with the same dog details: weight, coat type, last groom date, matting, temperament, and desired finish.</p></div>
            </div>
          </section>
          ${serviceCostSignalSection(services, city)}
          ${costQuoteChecklist(city.city)}
          <section class="section">
            <h2>Compare ${esc(city.city)} groomers after checking cost</h2>
            <p>Use the local directory page to compare phone numbers, websites, hours, services mentioned, ratings, map links, and nearby alternatives before choosing who to call.</p>
            <a class="btn btn-primary" href="${city.url}">View ${esc(city.city)} groomers</a>
          </section>
          ${costFaqSection(city.city)}
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Cost estimator</h2><p>Estimate a planning range before requesting a quote from ${esc(city.city)} groomers.</p><a class="btn btn-primary" href="/grooming-tools/dog-grooming-cost-estimator/">Open estimator</a></div>
          <div class="info-card"><h2>Nearby cost pages</h2>${nearbyCostMarkup}</div>
          <div class="info-card"><h2>Pricing references</h2>${costReferenceLinks()}</div>
        </aside>
      </div>
    </section>`;
}

function costRangeTable(placeName) {
  const rows = [
    ["Nail trim", "Most dogs", COST_RANGES.nailTrim, "Ask if grinding, difficult handling, or walk-in nail visits cost extra."],
    ["Nail grinding", "Most dogs", COST_RANGES.nailGrind, "Often priced as an add-on or upgraded nail finish."],
    ["Bath and brush", "Small dog", COST_RANGES.bathBrush.small, "Short coat or maintenance bath, assuming coat is not matted."],
    ["Bath and brush", "Medium dog", COST_RANGES.bathBrush.medium, "Price rises with coat density, drying time, undercoat, and skin products."],
    ["Bath and brush", "Large dog", COST_RANGES.bathBrush.large, "Heavy coats, long drying time, or de-shedding can raise the quote."],
    ["Full groom with haircut", "Small dog", COST_RANGES.fullGroom.small, "Typically includes bath, dry, haircut, brush, nails, and basic tidy work."],
    ["Full groom with haircut", "Medium dog", COST_RANGES.fullGroom.medium, "Curly, wool, drop, or long coats need more hands-on time."],
    ["Full groom with haircut", "Large dog", COST_RANGES.fullGroom.large, "Large size, thick coat, de-shedding, and styling detail drive the range."],
    ["Giant or very dense coat", "Giant dog", COST_RANGES.fullGroom.giant, "Confirm whether the business accepts the dog size and how time is billed."],
    ["De-shedding add-on", "Double coat", COST_RANGES.deshedding, "Best confirmed by breed, undercoat condition, and seasonal coat blow."],
    ["De-matting or coat rescue", "Matted coat", COST_RANGES.dematting, "Can be quoted by time or severity; severe matting may require a shorter shave."],
    ["Mobile grooming premium", "House-call or van", COST_RANGES.mobile, "Travel area, parking, minimum visit fees, and route availability matter."],
  ];
  return `<section class="section">
      <h2>Typical ${esc(placeName)} dog grooming price ranges</h2>
      <p>These are planning ranges in Canadian dollars, not guaranteed quotes. Public Canadian pricing examples show that add-ons such as nail grinding, medicated shampoo, de-matting, express service, and behavior handling can change the final price.</p>
      <table class="directory-table cost-table">
        <thead><tr><th>Service</th><th>Dog or coat</th><th>Planning range</th><th>What to confirm</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td></tr>`).join("")}</tbody>
      </table>
    </section>`;
}

function costAdjustmentSection() {
  return `<section class="section">
      <h2>What changes a dog grooming quote?</h2>
      <div class="grid-3">
        <div class="info-card"><h3>Dog size and coat density</h3><p>A small short-coated dog usually takes less time than a large doodle, Samoyed, Newfoundland, husky, shepherd, collie, or heavily feathered breed.</p></div>
        <div class="info-card"><h3>Coat condition</h3><p>Mats, packed undercoat, burrs, skunk odor, fleas, sensitive skin, or a long gap since the last groom can add time or require a different plan.</p></div>
        <div class="info-card"><h3>Package scope</h3><p>Ask whether the quote includes bath, blow dry, haircut, nails, sanitary trim, paw pads, ear cleaning, de-shedding, de-matting, teeth brushing, or special shampoo.</p></div>
        <div class="info-card"><h3>Handling and comfort</h3><p>Puppies, seniors, anxious dogs, dogs with mobility limits, and dogs needing extra breaks may need shorter sessions or extra handling time.</p></div>
        <div class="info-card"><h3>Location and demand</h3><p>Large cities, high-rent neighbourhoods, mobile routes, remote areas, and peak holiday seasons can all affect appointment availability and price.</p></div>
        <div class="info-card"><h3>Maintenance schedule</h3><p>Dogs kept on a regular 4-8 week schedule are often easier to quote than dogs with overgrown coat, long nails, or unknown coat condition.</p></div>
      </div>
    </section>`;
}

function costQuoteChecklist(placeName) {
  const questions = [
    `For a dog in ${placeName}, what is included in the base groom for this size and coat?`,
    "What could change the quote after you see the coat in person?",
    "Are nail grinding, teeth brushing, medicated shampoo, de-shedding, or de-matting separate add-ons?",
    "How do you handle mats: brush out, clip shorter, call first, or stop for a consultation?",
    "Do you charge extra for behavior handling, senior comfort breaks, express service, or late pickup?",
    "How often should this dog return if we want to keep the coat comfortable and predictable?",
  ];
  return `<section class="section">
      <h2>Questions to ask before accepting a grooming price</h2>
      <ul class="check-list">${questions.map((question) => `<li>${esc(question)}</li>`).join("")}</ul>
      <div class="tag-cloud" style="margin-top:16px">
        <a class="btn btn-primary" href="/grooming-tools/dog-groomer-call-script/">Use the call script</a>
        <a class="btn btn-light" href="/grooming-tools/dog-grooming-frequency-calculator/">Estimate frequency</a>
      </div>
    </section>`;
}

function serviceCostSignalSection(services, place) {
  const placeName = servicePlaceName(place);
  if (!services.length) {
    return `<section class="section">
      <h2>Service signals for ${esc(placeName)}</h2>
      <p>Service details are limited in the directory data for this area. Ask shortlisted groomers to confirm haircut, bath and brush, nails, de-shedding, de-matting, puppy grooming, senior care, and mobile options before relying on a price.</p>
    </section>`;
  }
  return `<section class="section">
      <h2>Local service signals that can affect price</h2>
      <p>These service signals appear in local directory data. Use them as prompts for quote questions, not as a guarantee that the service is currently available.</p>
      <div class="grid-3">${services
        .map(
          (service) => {
            const compareText = placeName ? `Compare ${service.short.toLowerCase()} in ${placeName}` : `Compare ${service.short.toLowerCase()}`;
            return `<div class="info-card"><h3>${esc(service.short)}</h3><p>${countLabel(service.localCount, "local listing signal")}. ${esc(serviceCostAdvice(service.slug))}</p><a class="link-arrow" href="${serviceComparisonUrl(place, service)}">${esc(compareText)} -></a></div>`;
          },
        )
        .join("")}</div>
    </section>`;
}

function servicePlaceName(place) {
  if (!place) return "";
  if (typeof place === "string") return place;
  if (place.city) return place.city;
  return place.name || place.province || "";
}

function serviceComparisonUrl(place, service) {
  if (!place || typeof place === "string") return service.url;
  if (place.city && place.provinceCode) return localServiceSearchUrl(place, service);
  const where = place.name || place.province || place.code;
  if (!where) return service.url;
  const params = new URLSearchParams({
    service: service.slug,
    where,
    near: "1",
  });
  return `/search/?${params.toString()}#results`;
}

function serviceCostAdvice(slug) {
  const advice = {
    "dog-haircuts": "Haircut quotes depend on coat length, matting, styling detail, and whether hand-scissoring or breed-specific work is needed.",
    "nail-trimming": "Ask whether clipping and grinding are priced differently and whether walk-in nail appointments are available.",
    "puppy-grooming": "Puppy intro visits may be shorter and priced differently from adult full grooms.",
    "bath-and-brush": "Bath pricing can change with coat density, drying time, skin products, and de-shedding needs.",
    deshedding: "De-shedding is often time-sensitive during seasonal coat blow and may be quoted as an add-on.",
    "mobile-dog-grooming": "Mobile grooming may include travel fees, route minimums, parking requirements, or service-area limits.",
    "teeth-cleaning": "Teeth brushing is usually an add-on and is not a substitute for veterinary dental care.",
    dematting: "De-matting can be quoted by severity or time, and comfort should come before saving coat length.",
    "cat-grooming": "Cat grooming has different handling and safety requirements; confirm whether the groomer accepts cats before booking.",
  };
  return advice[slug] || "Ask what is included, what costs extra, and whether your dog's coat needs a consultation.";
}

function costReferenceLinks() {
  return `<ul class="link-list">${COST_REFERENCE_SOURCES.map((source) => `<li class="link-row"><a href="${escAttr(source.url)}" target="_blank" rel="nofollow noopener">${esc(source.name)}</a><span class="count">source</span></li>`).join("")}</ul>`;
}

function costFaqSection(placeName) {
  return `<section class="section faq-section">
      <h2>Dog grooming cost FAQ for ${esc(placeName)}</h2>
      <details><summary>Why do grooming prices vary so much?</summary><p>Time is the biggest driver. Size, coat density, haircut style, matting, behavior, drying time, special shampoo, de-shedding, and local demand all affect the final quote.</p></details>
      <details><summary>Should I ask for a quote before booking?</summary><p>Yes. Share breed or mix, weight, coat length, matting, last groom date, temperament, health notes, and the exact services you want. Ask what could change after the groomer sees the dog.</p></details>
      <details><summary>Is the cheapest groomer always the best value?</summary><p>Not necessarily. A clear package, safe handling, coat-specific experience, realistic appointment time, and honest de-matting policy can matter more than the lowest starting price.</p></details>
    </section>`;
}

function provinceCostFactors(province) {
  const code = String(province.code || "").toUpperCase();
  const common = {
    intro: `${province.name} pricing can vary between dense urban areas, smaller towns, and mobile service routes. Use the range as a starting point, then confirm package scope directly.`,
    cards: [
      { title: "Urban demand", body: "Large city groomers may book out earlier, especially before holidays, spring shed season, and summer travel." },
      { title: "Travel and mobile routes", body: "Mobile grooming, rural addresses, ferry routes, or long drives can add travel costs or minimum service fees." },
      { title: "Seasonal coat changes", body: "Winter salt, spring mud, summer lakes, fall burrs, and shedding season can all change the time required." },
    ],
  };
  const byCode = {
    BC: {
      intro: "British Columbia quotes can reflect coastal dampness, high-demand urban markets, mountain weather, and frequent wet-coat maintenance.",
      cards: [
        { title: "Coastal moisture", body: "Rain, mud, beach trips, and damp gear can tighten tangles and increase drying or brushing time." },
        { title: "Metro demand", body: "Vancouver-area demand, rent, traffic, and mobile-route limits can affect appointment availability and minimums." },
        { title: "Outdoor coats", body: "Hiking, lake water, burrs, and undercoat season can shift bath, de-shedding, and paw-care needs." },
      ],
    },
    ON: {
      intro: "Ontario pricing can differ sharply between the GTA, Ottawa, mid-sized cities, cottage areas, and smaller communities.",
      cards: [
        { title: "High-demand cities", body: "Toronto, Ottawa, Mississauga, Brampton, Hamilton, and nearby cities often need earlier booking and clearer quote confirmation." },
        { title: "Seasonal extremes", body: "Salt and freeze-thaw winter, spring mud, humid summers, and fall burrs can all affect coat maintenance." },
        { title: "Commute and mobile fit", body: "Mobile routes and parking rules can change travel fees or whether house-call grooming is practical." },
      ],
    },
    QC: {
      intro: "Quebec grooming costs can vary between Montreal, Quebec City, suburban markets, and smaller communities, with winter coat care often affecting timing.",
      cards: [
        { title: "Urban and suburban demand", body: "Ask how far out full grooms book and whether new clients are accepted." },
        { title: "Winter maintenance", body: "Salt, snow, sweaters, and wet sidewalks can add paw, belly, and friction-zone work." },
        { title: "Language and package clarity", body: "Confirm the exact included services, add-ons, and pickup expectations in the language you are most comfortable using." },
      ],
    },
    AB: {
      intro: "Alberta grooming budgets should account for dry winter air, large dogs, heavy undercoats, and busy city markets such as Calgary and Edmonton.",
      cards: [
        { title: "Double coats", body: "Huskies, shepherds, retrievers, and mountain breeds may need de-shedding time during coat changes." },
        { title: "Dry climate", body: "Skin sensitivity, static, salt, and paw care can influence shampoo and conditioning choices." },
        { title: "City demand", body: "Calgary and Edmonton groomers may book peak slots quickly, especially for full grooms and large breeds." },
      ],
    },
  };
  return byCode[code] || common;
}

function cityCostLocalNotes(city) {
  const name = normalizeKey(city.city);
  const highDemand = ["toronto", "vancouver", "mississauga", "brampton", "ottawa", "calgary", "edmonton", "montreal", "victoria", "burnaby", "richmond", "markham", "surrey", "hamilton"];
  const remoteCodes = ["YT", "NT", "NU", "NL"];
  if (highDemand.includes(name)) {
    return {
      body: `${city.city} has a larger grooming market, but high demand can also mean waitlists, premium locations, mobile-route limits, and a wider spread between budget and specialty grooming quotes.`,
      market: "Expect the final quote to depend heavily on coat condition, package scope, parking or travel logistics, and how soon you need the appointment.",
    };
  }
  if (remoteCodes.includes(String(city.provinceCode || "").toUpperCase())) {
    return {
      body: `${city.city} owners may need to plan farther ahead because appointment supply, travel distance, and seasonal weather can matter as much as the base grooming package.`,
      market: "Ask about route timing, cancellation windows, severe-weather policies, and whether large or matted dogs require a separate assessment.",
    };
  }
  if (city.count >= 30) {
    return {
      body: `${city.city} has enough local listings to compare several quote styles. Expect differences between salons, home-based groomers, mobile groomers, and businesses that focus on specialty coats.`,
      market: "Call multiple groomers with the same details so you compare like-for-like packages rather than only starting prices.",
    };
  }
  return {
    body: `${city.city} has a smaller local directory footprint, so the best approach is to compare nearby options and ask each groomer for a clear package quote before booking.`,
    market: "Smaller markets may have fewer appointment choices, so availability and travel fit can affect value as much as the posted price.",
  };
}

function costCityPages(context) {
  return context.cities.filter((city) => city.count >= CITY_COST_MIN_LISTINGS).slice(0, CITY_COST_PAGE_LIMIT);
}

function costCityMap(context) {
  return new Map(costCityPages(context).map((city) => [costCityKey(city), city]));
}

function costCityKey(city) {
  return `${city.provinceSlug}/${city.slug}`;
}

function provinceCostRoute(province) {
  return `/dog-grooming-cost/${province.slug}/`;
}

function cityCostRoute(city) {
  return `/dog-grooming-cost/${city.provinceSlug}/${city.slug}/`;
}

function costGuideUrlForCity(city, province, costMap) {
  if (city && costMap && costMap.has(costCityKey(city))) return cityCostRoute(city);
  if (province) return provinceCostRoute(province);
  return "/dog-grooming-cost/";
}

function costArticleSchema(route, title, description, articleSection) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: CONTENT_UPDATED_DATE,
    dateModified: CONTENT_UPDATED_DATE,
    author: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
    },
    publisher: organizationSchema(),
    mainEntityOfPage: absoluteUrl(route),
    articleSection,
  };
}

function costFaqSchema(topic) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How much does dog grooming cost for ${topic}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "A small bath or basic groom can be much less than a large full groom. The final quote depends on dog size, coat condition, haircut style, matting, handling, local demand, and what the package includes.",
        },
      },
      {
        "@type": "Question",
        name: "What grooming add-ons can increase the final price?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Common add-ons include nail grinding, de-shedding, de-matting, medicated shampoo, teeth brushing, express service, behavior handling, mobile travel fees, and extra time for heavy coats.",
        },
      },
    ],
  };
}

function writeGuidePages(context) {
  const featured = guideArticles.filter((article) => article.featured).slice(0, 6);
  const indexBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Guides" }])}
        <h1 class="city-title">Dog Grooming Guides for Canadian Pet Owners</h1>
        <p class="lead">Original grooming articles for Canadian dog owners: practical technique guides, seasonal coat-care advice, breed-specific grooming needs, cost planning, and booking questions.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><h2>Start with the guide category that fits your dog</h2><p>Use these articles with the directory pages to compare groomers, understand coat needs, and plan safer appointments.</p></div>
        </div>
        <div class="grid-4">${guideCategories
          .map(
            (category) =>
              `<a class="guide-card guide-category-card" href="/guides/${category.slug}/"><span class="guide-card-meta">${esc(category.shortName)}</span><h3>${esc(category.name)}</h3><p>${esc(category.description)}</p><strong>${guideArticlesForCategory(category.slug).length} guides</strong></a>`,
          )
          .join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><h2>Featured grooming guides</h2><p>High-intent dog grooming topics that answer real owner questions before they call a groomer.</p></div>
        </div>
        <div class="guide-grid">${featured.map((article) => guideCard(article)).join("")}</div>
      </div>
    </section>
    ${guideCategories
      .map((category) => {
        const articles = guideArticlesForCategory(category.slug);
        return `<section class="section"><div class="wrap"><div class="section-head"><div><h2>${esc(category.name)}</h2><p>${esc(category.description)}</p></div><a class="link-arrow" href="/guides/${category.slug}/">View ${esc(category.shortName).toLowerCase()} -></a></div><div class="guide-list">${articles
          .slice(0, 6)
          .map((article) => guideCard(article, "row"))
          .join("")}</div></div></section>`;
      })
      .join("")}`;

  writePage(
    context,
    "/guides/",
    "Dog Grooming Guides Canada | Coat, Breed, Seasonal and Cost Care",
    "Dog grooming guides for Canada: learn coat care, brushing, de-matting, de-shedding, seasonal grooming, breed needs, costs, and booking questions.",
    indexBody,
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Guides", url: "/guides/" }]),
      itemListSchema("Dog grooming guides for Canada", guideArticles.map((article) => ({ title: article.title, url: guideArticleRoute(article) }))),
    ],
  );

  for (const category of guideCategories) {
    const articles = guideArticlesForCategory(category.slug);
    const body = `
      <section class="page-intro">
        <div class="wrap">
          ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Guides", url: "/guides/" }, { label: category.name }])}
          <h1 class="city-title">${esc(category.name)}</h1>
          <p class="lead">${esc(category.description)} These original guides are written for Canadian dog owners comparing grooming needs, at-home maintenance, and professional grooming services.</p>
        </div>
      </section>
      <section class="section">
        <div class="wrap">
          <div class="guide-grid">${articles.map((article) => guideCard(article)).join("")}</div>
        </div>
      </section>`;
    writePage(
      context,
      `/guides/${category.slug}/`,
      `${category.name} | Dog Groomers Canada`,
      `${category.description} Browse original dog grooming guides for Canadian pet owners.`,
      body,
      [
        breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Guides", url: "/guides/" }, { label: category.name, url: `/guides/${category.slug}/` }]),
        itemListSchema(category.name, articles.map((article) => ({ title: article.title, url: guideArticleRoute(article) }))),
      ],
    );
  }

  for (const article of guideArticles) {
    const category = guideCategoryBySlug(article.category);
    writePage(
      context,
      guideArticleRoute(article),
      article.metaTitle || article.title,
      article.description,
      guideArticleBody(article, context),
      [
        breadcrumbSchema([
          { label: "Home", url: "/" },
          { label: "Guides", url: "/guides/" },
          { label: category.name, url: `/guides/${category.slug}/` },
          { label: article.title, url: guideArticleRoute(article) },
        ]),
        guideArticleSchema(article),
        guideFaqSchema(article),
      ],
    );
  }
}

function writeToolPages(context) {
  const tools = ownerToolPages();
  const indexBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools" }])}
        <h1 class="city-title">Dog Grooming Tools for Canadian Owners</h1>
        <p class="lead">Use these free grooming planning tools before you call a groomer: estimate cost, plan appointment frequency, check matting and winter paw risk, prepare a puppy first groom, and ask better booking questions.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="grid-3">${tools
          .map(
            (tool) =>
              `<a class="tool-card" href="${tool.url}"><span class="guide-card-meta">${esc(tool.kind)}</span><h2>${esc(tool.name)}</h2><p>${esc(tool.summary)}</p><strong>Open tool</strong></a>`,
          )
          .join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">
        <div class="info-card"><h2>Use with local pages</h2><p>After you understand the grooming need, compare groomers by city, service, contact details, and profile notes.</p><a class="link-arrow" href="/cities/">Browse city pages -></a></div>
        <div class="info-card"><h2>Use with guide pages</h2><p>Each tool links back to original grooming guides for coat type, seasonal care, breed needs, de-matting, and nail maintenance.</p><a class="link-arrow" href="/guides/">Read guides -></a></div>
        <div class="info-card"><h2>Confirm with a pro</h2><p>Tools are planning aids. A groomer or veterinarian should confirm decisions involving pain, skin problems, severe matting, or medical concerns.</p></div>
      </div>
    </section>`;

  writePage(
    context,
    "/grooming-tools/",
    "Dog Grooming Tools Canada | Cost, Frequency, Matting and Booking",
    "Free dog grooming tools for Canadian owners: cost estimator, grooming frequency calculator, matting risk checklist, coat planner, puppy planner, winter paw checklist, and call script.",
    indexBody,
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }]),
      itemListSchema("Dog grooming tools", tools.map((tool) => ({ title: tool.name, url: tool.url }))),
    ],
  );

  writePage(
    context,
    "/grooming-tools/dog-grooming-cost-estimator/",
    "Dog Grooming Cost Estimator Canada | Planning Range Tool",
    "Estimate a Canadian dog grooming cost planning range by dog size, service type, coat condition, add-ons, mobile grooming, and handling needs.",
    costEstimatorToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Dog Grooming Cost Estimator", url: "/grooming-tools/dog-grooming-cost-estimator/" }]),
      toolSchema("Dog Grooming Cost Estimator", "/grooming-tools/dog-grooming-cost-estimator/"),
    ],
    { bodyAttrs: 'data-page="cost-estimator-tool"' },
  );

  writePage(
    context,
    "/grooming-tools/dog-grooming-frequency-calculator/",
    "Dog Grooming Frequency Calculator | Canada",
    "Estimate how often to book dog grooming based on coat type, coat length, mat risk, shedding, season, lifestyle, and home brushing.",
    frequencyToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Grooming Frequency Calculator", url: "/grooming-tools/dog-grooming-frequency-calculator/" }]),
      toolSchema("Dog Grooming Frequency Calculator", "/grooming-tools/dog-grooming-frequency-calculator/"),
    ],
    { bodyAttrs: 'data-page="frequency-tool"' },
  );

  writePage(
    context,
    "/grooming-tools/matting-risk-checklist/",
    "Dog Matting Risk Checklist | Dog Groomers Canada",
    "Check dog matting risk from coat type, brushing, moisture, harnesses, sweaters, shedding, and seasonal Canadian grooming conditions.",
    mattingToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Matting Risk Checklist", url: "/grooming-tools/matting-risk-checklist/" }]),
      toolSchema("Dog Matting Risk Checklist", "/grooming-tools/matting-risk-checklist/"),
    ],
    { bodyAttrs: 'data-page="matting-tool"' },
  );

  writePage(
    context,
    "/grooming-tools/dog-groomer-call-script/",
    "Dog Groomer Call Script | Questions Before Booking",
    "Use this dog groomer call script to ask about pricing, services, coat type, de-matting, puppies, seniors, anxious dogs, and appointment policies.",
    callScriptToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Dog Groomer Call Script", url: "/grooming-tools/dog-groomer-call-script/" }]),
      toolSchema("Dog Groomer Call Script", "/grooming-tools/dog-groomer-call-script/"),
    ],
  );

  writePage(
    context,
    "/grooming-tools/coat-maintenance-planner/",
    "Dog Coat Maintenance Planner | Canada",
    "Create an at-home dog coat maintenance plan for brushing, comb checks, bath timing, paw care, and seasonal grooming challenges in Canada.",
    coatPlannerToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Coat Maintenance Planner", url: "/grooming-tools/coat-maintenance-planner/" }]),
      toolSchema("Dog Coat Maintenance Planner", "/grooming-tools/coat-maintenance-planner/"),
    ],
    { bodyAttrs: 'data-page="coat-planner-tool"' },
  );

  writePage(
    context,
    "/grooming-tools/puppy-first-groom-planner/",
    "Puppy First Groom Planner | Canada",
    "Plan a puppy's first groom with age, vaccine timing, coat type, handling comfort, appointment goals, and questions for Canadian groomers.",
    puppyPlannerToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Puppy First Groom Planner", url: "/grooming-tools/puppy-first-groom-planner/" }]),
      toolSchema("Puppy First Groom Planner", "/grooming-tools/puppy-first-groom-planner/"),
    ],
    { bodyAttrs: 'data-page="puppy-planner-tool"' },
  );

  writePage(
    context,
    "/grooming-tools/winter-paw-care-checklist/",
    "Winter Paw Care Checklist for Dogs in Canada",
    "Check winter paw-care risks for Canadian dogs: salt, ice balls, cracked pads, nail traction, boots, sweaters, and coat friction.",
    winterPawToolBody(context),
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Winter Paw Care Checklist", url: "/grooming-tools/winter-paw-care-checklist/" }]),
      toolSchema("Winter Paw Care Checklist", "/grooming-tools/winter-paw-care-checklist/"),
    ],
    { bodyAttrs: 'data-page="winter-paw-tool"' },
  );
}

function writeKeywordPages(context) {
  const topCities = context.cities.slice(0, 24);
  const topCostCities = costCityPages(context).slice(0, 12);
  const topListings = context.listings.filter((item) => item.provinceSlug !== "canada").slice(0, 12);
  const mobileService = context.services.find((service) => service.slug === "mobile-dog-grooming");
  const groomingBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Dog Grooming" }])}
        <h1 class="city-title">Dog Grooming in Canada</h1>
        <p class="lead">Find dog grooming businesses across Canada and compare local dog groomers by city, province, service, rating, phone number, website, hours, maps, and profile details.</p>
        ${searchPanel("compact")}
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <div class="section-head">
            <div>
              <h2>Find dog grooming near you</h2>
              <p>Start with a city page for local dog grooming results, or use the near-me page to sort listings by distance in your browser.</p>
            </div>
            <a class="link-arrow" href="/dog-grooming-near-me/">Dog grooming near me -></a>
          </div>
          <div class="grid-3">${topCities
            .map(
              (city) =>
                `<a class="province-card" href="${city.url}"><span><strong>Dog grooming in ${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} local groomers</span></span><span aria-hidden="true">&rarr;</span></a>`,
            )
            .join("")}</div>
          <div class="notice" style="margin-top:18px"><strong>Need grooming at home?</strong> <a href="/mobile-dog-grooming-near-me/">Find mobile dog grooming near you</a> and sort explicit mobile-service matches by distance.</div>
          <section class="section">
            <h2>Popular dog grooming services</h2>
            <div class="grid-3">${context.services
              .map(
                (service) =>
                  `<a class="province-card" href="${service.url}"><span><strong>${esc(service.name)}</strong><span>${service.count.toLocaleString()} matching listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </section>
          <section class="section">
            <div class="section-head">
              <div><h2>Dog grooming guides for better booking decisions</h2><p>Learn what different coats, seasons, techniques, costs, and breeds need before you compare local groomers.</p></div>
              <a class="link-arrow" href="/guides/">All guides -></a>
            </div>
            <div class="guide-list">${guideArticles
              .filter((article) => article.featured)
              .slice(0, 4)
              .map((article) => guideCard(article, "row"))
              .join("")}</div>
          </section>
          <section class="section">
            <div class="section-head">
              <div><h2>Dog grooming cost planning</h2><p>Compare Canadian price ranges and city cost guides before requesting a quote.</p></div>
              <a class="link-arrow" href="/dog-grooming-cost/">Cost guide -></a>
            </div>
            <div class="grid-3">
              <a class="tool-card" href="/dog-grooming-cost/"><span class="guide-card-meta">Cost guide</span><h3>Dog Grooming Cost in Canada</h3><p>Planning ranges for baths, haircuts, nails, add-ons, mobile grooming, and quote questions.</p></a>
              <a class="tool-card" href="/grooming-tools/dog-grooming-cost-estimator/"><span class="guide-card-meta">Estimator</span><h3>Cost Estimator</h3><p>Build a planning range from dog size, service, coat condition, add-ons, and service style.</p></a>
              <a class="tool-card" href="${topCostCities[0] ? cityCostRoute(topCostCities[0]) : "/dog-grooming-cost/"}"><span class="guide-card-meta">City costs</span><h3>Major City Cost Guides</h3><p>Use city-specific pages where local directory data is strong enough to support useful cost notes.</p></a>
            </div>
          </section>
          <section class="section">
            <div class="section-head">
              <div><h2>Plan the appointment before you call</h2><p>Use practical tools for grooming frequency, matting risk, and booking questions.</p></div>
              <a class="link-arrow" href="/grooming-tools/">All tools -></a>
            </div>
            <div class="grid-3">${ownerToolPages()
              .map((tool) => `<a class="tool-card" href="${tool.url}"><span class="guide-card-meta">${esc(tool.kind)}</span><h3>${esc(tool.name)}</h3><p>${esc(tool.summary)}</p></a>`)
              .join("")}</div>
          </section>
          <section class="section">
            <h2>Top dog grooming listings</h2>
            <div class="listing-stack">${topListings.map((item) => listingCard(item)).join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Dog grooming checklist</h2><p>Before booking, confirm bath, brush, haircut, nail trim, de-shedding, de-matting, puppy groom, appointment length, and breed-specific experience.</p></div>
          <div class="info-card"><h2>Browse all cities</h2><p>Use the complete city index to browse local dog grooming options across Canada.</p><a class="btn btn-light" href="/cities/">All city pages</a></div>
        </aside>
      </div>
    </section>`;

  writePage(
    context,
    "/dog-grooming/",
    "Dog Grooming in Canada | Find Dog Groomers Near You",
    "Dog grooming in Canada: compare local dog groomers near you by city, service, rating, phone, website, hours, maps, and profiles.",
    groomingBody,
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Dog Grooming", url: "/dog-grooming/" }]),
      itemListSchema("Dog grooming listings in Canada", topListings),
      faqSchema("Canada"),
    ],
  );

  const nearBody = nearMeBody(context);
  writePage(
    context,
    "/dog-grooming-near-me/",
    "Dog Grooming Near Me | Find Local Dog Groomers",
    nearMeMetaDescription(),
    nearBody,
    [
      breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Dog Grooming Near Me", url: "/dog-grooming-near-me/" }]),
      itemListSchema("Popular dog grooming near me city pages", topCities.slice(0, 20).map((city) => ({ title: `Dog grooming in ${city.city}, ${city.provinceCode}`, url: city.url }))),
    ],
    { bodyAttrs: 'data-page="near-me"' },
  );

  if (mobileService) {
    writePage(
      context,
      "/mobile-dog-grooming-near-me/",
      "Mobile Dog Grooming Near Me | Find In-Home Dog Groomers",
      mobileGroomingNearMeMetaDescription(mobileService),
      mobileDogGroomingNearMeBody(context, mobileService),
      [
        breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Mobile Dog Grooming Near Me", url: "/mobile-dog-grooming-near-me/" }]),
        itemListSchema("Mobile dog grooming companies in Canada", mobileService.listings.slice(0, 50)),
        mobileGroomingFaqSchema(mobileService),
      ],
      { bodyAttrs: 'data-page="near-me" data-near-service="mobile-dog-grooming"' },
    );
  }
}

function nearMeBody(context) {
  const topCities = context.cities.slice(0, 24);
  const topProvinces = context.provinces.slice(0, 12);
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Dog Grooming Near Me" }])}
        <h1 class="city-title">Dog Grooming Near Me</h1>
        <p class="lead">Use your current location to find dog grooming near you, compare nearby dog groomers by distance, or browse local dog grooming pages by city and province. Your location stays in your browser.</p>
        <button class="btn btn-dark" type="button" data-use-location data-status-target="[data-location-status]">Use my location</button>
        <p class="muted" data-location-status style="margin-top:12px">Press the button to compare nearby listings.</p>
        <p class="muted"><span data-result-count></span></p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <div class="search-results" id="results" data-nearby-results><div class="empty-state"><h2>Location required</h2><p>Click "Use my location" to sort dog grooming listings by distance. You can also browse the city links below.</p></div></div>
          <section class="section">
            <div class="section-head">
              <div><h2>Popular dog grooming near me city pages</h2><p>These local pages include dog groomer profiles, contact details, rating snapshots, and services mentioned in listing data.</p></div>
            </div>
            <div class="grid-3">${topCities
              .map(
                (city) =>
                  `<a class="province-card" href="${city.url}"><span><strong>Dog grooming in ${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${countLabel(city.count, "groomer")} listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Mobile grooming</h2><p>Need grooming at your home or curbside? Use the mobile grooming page to show only listings that mention mobile, in-home, or house-call grooming.</p><a class="btn btn-light" href="/mobile-dog-grooming-near-me/">Mobile grooming near me</a></div>
          <div class="info-card">
            <h2>Browse by province</h2>
            ${linkList(
              topProvinces,
              (province) => province.url,
              (province) => `${province.name} dog grooming`,
              (province) => `${province.count}`,
            )}
          </div>
          <div class="info-card"><h2>Booking tip</h2><p>For the best dog grooming match near you, confirm coat type experience, package details, wait time, pricing, de-matting policy, and whether the groomer is accepting new dogs.</p></div>
        </aside>
      </div>
    </section>`;
}

function mobileDogGroomingNearMeBody(context, service) {
  const topCities = serviceTopCities(service, context, 24);
  const topListings = service.listings.slice(0, 12);
  const provinceCounts = countBy(
    service.listings.filter((item) => item.province !== "Canada"),
    (item) => item.province,
  ).slice(0, 12);
  const phoneCount = service.listings.filter((item) => item.phone).length;
  const websiteCount = service.listings.filter((item) => item.website).length;
  const cityCount = new Set(service.listings.map((item) => item.cityUrl).filter(Boolean)).size;
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Mobile Dog Grooming Near Me" }])}
        <h1 class="city-title">Mobile Dog Grooming Near Me</h1>
        <p class="lead">Use your location to find nearby companies with explicit mobile grooming, mobile pet salon, mobile nail-care, in-home grooming, or house-call grooming wording. This directory currently has ${service.count.toLocaleString()} mobile dog grooming matches across Canada.</p>
        <button class="btn btn-dark" type="button" data-use-location data-status-target="[data-location-status]">Use my location</button>
        <p class="muted" data-location-status style="margin-top:12px">Press the button to sort mobile grooming listings by distance. Your location stays in your browser.</p>
        <p class="muted"><span data-result-count></span></p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <div class="search-results" id="results" data-nearby-results><div class="empty-state"><h2>Location required</h2><p>Click "Use my location" to sort mobile dog grooming listings by distance. You can also browse top mobile grooming cities below.</p></div></div>
          <section class="section">
            <div class="section-head">
              <div><h2>Mobile dog grooming companies in this directory</h2><p>These listings use explicit mobile, in-home, house-call, mobile salon/spa, or mobile nail-care wording. Always confirm route coverage, travel fees, package scope, and current availability before booking.</p></div>
              <a class="link-arrow" href="/services/mobile-dog-grooming/">Browse all mobile grooming listings -></a>
            </div>
            <div class="listing-stack">${topListings.map((item) => listingCard(item)).join("")}</div>
          </section>
          <section class="section">
            <h2>What to confirm before booking mobile grooming</h2>
            <div class="grid-3">
              <div class="info-card"><h3>Service area and fees</h3><p>Ask whether your address is inside the groomer's current route, whether there is a travel fee, and whether your postal code has a minimum package or waitlist.</p></div>
              <div class="info-card"><h3>Parking and setup</h3><p>Confirm driveway, condo, street parking, power, water, winter access, and weather policies. Mobile vans may need level parking and enough space around the vehicle.</p></div>
              <div class="info-card"><h3>Dog fit and package</h3><p>Share your dog's breed, size, coat condition, age, temperament, and last groom date. Ask what is included, what costs extra, and whether large or matted dogs need approval first.</p></div>
            </div>
          </section>
          <section class="section">
            <div class="section-head">
              <div><h2>Top cities for mobile dog grooming</h2><p>City links open filtered mobile grooming results and can include nearby matches when you use location.</p></div>
            </div>
            <div class="grid-3">${topCities
              .map(
                (city) =>
                  `<a class="province-card" href="${localServiceSearchUrl(city, service)}"><span><strong>Mobile dog grooming in ${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.serviceCount.toLocaleString()} explicit matches</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          <div class="info-card">
            <h2>Mobile grooming snapshot</h2>
            <ul class="check-list">
              <li>${service.count.toLocaleString()} explicit mobile-service matches</li>
              <li>${phoneCount.toLocaleString()} listings with phone numbers</li>
              <li>${websiteCount.toLocaleString()} listings with websites</li>
              <li>${cityCount.toLocaleString()} city or area pages represented</li>
            </ul>
          </div>
          <div class="info-card">
            <h2>Top provinces</h2>
            ${linkList(
              provinceCounts,
              (item) => context.provinces.find((province) => province.name === item.name)?.url || "/provinces/",
              (item) => `${item.name} mobile grooming`,
              (item) => `${item.count}`,
            )}
          </div>
          <div class="info-card"><h2>Search instead</h2><p>Use directory search if you want mobile grooming plus a specific city, postal area, or business name.</p><a class="btn btn-light" href="/search/?service=mobile-dog-grooming#results">Search mobile groomers</a></div>
        </aside>
      </div>
    </section>`;
}

function writeUtilityPages(context) {
  const searchBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Search" }])}
        <h1 class="city-title">Search Dog Groomers Canada</h1>
        <p class="lead">Search by business name, city, province, or grooming service, then open a profile to compare the available details.</p>
        ${searchPanel("compact")}
        <p class="muted"><span data-result-count></span></p>
      </div>
    </section>
    <section class="section" id="results"><div class="wrap"><div class="listing-stack search-results" data-search-results></div></div></section>`;
  writePage(context, "/search/", "Search Dog Groomers Canada", "Search dog grooming in Canada by business name, city, province, service, rating, phone number, website, and local profile page.", searchBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Search", url: "/search/" }]), { bodyAttrs: 'data-page="search"' });

  writePage(context, "/near-me/", "Dog Grooming Near Me | Dog Groomers Canada", nearMeMetaDescription(), nearMeBody(context), breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Dog Grooming Near Me", url: "/dog-grooming-near-me/" }]), { bodyAttrs: 'data-page="near-me"', canonicalRoute: "/dog-grooming-near-me/", noSitemap: true });

  const aboutBody = simpleContentPage(
    "About Dog Groomers Canada",
    "Dog Groomers Canada helps pet owners compare local grooming options without needing to jump between dozens of business pages, map results, and service notes.",
    `<div class="grid-3">
      <div class="info-card"><h2>What we publish</h2><p>We organize dog grooming businesses by province, city, services mentioned, contact details, ratings and review counts, and nearby alternatives, then support the directory with original guides and planning tools.</p></div>
      <div class="info-card"><h2>How to use it</h2><p>Start with a city, service, guide, or tool page, shortlist a few businesses, then confirm current services, prices, hours, appointment availability, and coat-specific experience directly with the groomer.</p></div>
      <div class="info-card"><h2>What we do not do</h2><p>We do not endorse, certify, or guarantee any groomer. Listings are informational and can change, so direct confirmation is always part of the booking process.</p></div>
    </div>
    <section class="section">
      <h2>Why the directory exists</h2>
      <p>Dog grooming searches are often local, urgent, and detail-heavy: owners need to know who serves their city, which businesses list phone numbers or websites, what services are mentioned, and what questions to ask before booking. Dog Groomers Canada brings those comparison points together in one easy-to-browse Canadian directory.</p>
      <p>Every profile is intended to be a practical starting point rather than a final recommendation. We add original guidance around coat type, de-matting, puppy grooming, mobile grooming, senior dogs, costs, seasonal care, breed needs, and appointment logistics so visitors can make more confident calls.</p>
      <p><a class="link-arrow" href="/editorial-policy/">Read the editorial policy -></a></p>
    </section>
    <section class="section">
      <h2>Who maintains the site</h2>
      <p>Dog Groomers Canada is independently maintained. The publisher reviews correction requests, maintains the directory tools, and writes the site's comparison and booking guidance. The site does not claim veterinary or professional grooming certification, and health or safety concerns should be discussed with a qualified veterinarian or groomer.</p>
      <p>Questions, corrections, removal requests, and source updates can be sent to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
    </section>
    <section class="section">
      <h2>Looking for a groomer in the United States?</h2>
      <p>Our sister directory, <a href="https://doggroomersus.com/">Dog Groomers US</a>, helps dog owners browse grooming businesses by state and city, compare documented service and access details, and use free appointment-planning tools.</p>
    </section>`,
  );
  writePage(context, "/about/", "About Dog Groomers Canada", "About Dog Groomers Canada, a Canadian dog grooming directory with city, service, profile, correction, and booking guidance.", aboutBody, [
    breadcrumbSchema([{ label: "Home", url: "/" }, { label: "About", url: "/about/" }]),
    organizationSchema(),
  ]);

  const contactBody = simpleContentPage(
    "Contact Dog Groomers Canada",
    "Send corrections, listing updates, removal requests, and general questions about Dog Groomers Canada.",
    `<div class="grid-3">
      <div class="info-card"><h2>Listing corrections</h2><p>Email the business name, city, current page URL, and the details that should be corrected.</p><p><a class="btn btn-primary" href="mailto:${CONTACT_EMAIL}?subject=Dog%20Groomers%20Canada%20listing%20correction">Email corrections</a></p></div>
      <div class="info-card"><h2>Claim or update</h2><p>Business owners can request profile updates, image removal, service changes, city placement review, or removal from the directory.</p><p><a class="btn btn-light" href="/add-your-business/">Add or update listing</a></p></div>
      <div class="info-card"><h2>General contact</h2><p>For privacy, advertising, partnership, or site questions, contact the directory owner by email.</p><p><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p></div>
    </div>
    <section class="section">
      <h2>Helpful details to include</h2>
      <p>For the fastest correction, include a source URL such as the business website, a page URL from this directory, and the exact field that changed: phone number, website, address, opening hours, services, business name, or city placement.</p>
      <p>If you are requesting a business-owner update, include a business email address, website, or public profile that helps verify the request before the directory is updated.</p>
    </section>`,
  );
  writePage(context, "/contact/", "Contact Dog Groomers Canada", "Contact Dog Groomers Canada for listing updates, corrections, removals, privacy, advertising, and general directory questions.", contactBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Contact", url: "/contact/" }]));

  const editorialBody = simpleContentPage(
    "Editorial Policy",
    "Dog Groomers Canada is built to help people compare grooming options with clear navigation, source transparency, and original booking guidance.",
    `<div class="grid-3">
      <div class="info-card"><h2>Directory records</h2><p>Profiles organize structured business facts such as name, city, address, phone, website, rating, hours, services mentioned, and map links. They are labelled as directory records rather than individually reported articles.</p></div>
      <div class="info-card"><h2>Original guidance</h2><p>City, service, profile, guide, and tool pages add practical comparison notes so visitors know what to confirm before booking a grooming appointment.</p></div>
      <div class="info-card"><h2>Corrections</h2><p>Businesses and visitors can request updates, removals, or corrections by email. Changed details are reviewed before the directory is updated.</p></div>
    </div>
    <section class="section">
      <h2>Editorial standards</h2>
      <p>Guide articles are written for Canadian dog owners who need practical grooming context before contacting a business. Articles focus on coat care, seasonal risks, breed needs, safety questions, appointment preparation, and what to confirm with a groomer or veterinarian.</p>
      <p>We avoid presenting directory listings as endorsements. Ratings, maps, websites, photos, and service notes are treated as comparison signals, not guarantees. Visitors should confirm current details directly with the business before booking.</p>
    </section>
    <section class="section">
      <h2>Automation and human review</h2>
      <p>Automated tools, including language-assisted drafting and validation, help normalize public listing fields, identify missing information, and prepare first-pass profile summaries at directory scale. Automation is not treated as business testimony or independent verification.</p>
      <p>Profiles checked against first-party source pages are visibly labelled with the review date and linked evidence. Business-submitted changes are labelled separately. High-traffic profiles and correction requests receive priority for source review, while records with too little useful evidence are kept out of search indexing until their source coverage improves.</p>
      <p>In the current build, ${context.stats.indexableListings.toLocaleString()} of ${context.stats.listings.toLocaleString()} business profiles meet the indexable quality gate. The remaining ${(context.stats.listings - context.stats.indexableListings).toLocaleString()} records remain accessible for corrections and discovery links but use <code>noindex,follow</code> until their evidence improves.</p>
    </section>
    <section class="section">
      <h2>Review and updates</h2>
      <p>Directory pages are updated when listing data or editorial content changes. Correction requests should include the page URL, business name, city, requested change, and a source such as the business website or official social profile when available.</p>
      <p>When enough written comments are available in the source snapshot, profile pages may paraphrase themes that recur across multiple comments. These summaries never reproduce review text, are clearly identified as customer opinion, and are not treated as independently verified facts or endorsements.</p>
      <p>A business-submitted update label records where a change came from; it does not mean the business paid for placement or received a certification. An official-source review label means the listed source pages were checked on the displayed date.</p>
    </section>
    <section class="section">
      <h2>Advertising and independence</h2>
      <p>Listings are not endorsements and are not ranked because a business paid for placement. Advertising may appear on the site after review approval, but ads do not change directory facts, city pages, service pages, or correction handling.</p>
      <p>The site does not currently serve display ads or reserve blank spaces for them.</p>
    </section>
    <section class="section">
      <h2>Images and copyrighted material</h2>
      <p>Business-specific photos are displayed only when Dog Groomers Canada has documented owner permission, a reusable licence, or a public-domain basis. A public listing, source link, or credit by itself is not treated as permission. Profiles without documented rights use a site-owned placeholder.</p>
      <p>Business owners and authorized representatives can submit original files with an explicit display authorization and requested credit. Every approved image includes a visible rights note and a direct correction or removal option.</p>
      <p class="muted">Last updated July 28, 2026.</p>
    </section>`,
  );
  writePage(context, "/editorial-policy/", "Editorial Policy | Dog Groomers Canada", "Editorial policy for Dog Groomers Canada, including listing data, corrections, advertising independence, and business profile image handling.", editorialBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Editorial Policy", url: "/editorial-policy/" }]));

  const addBody = simpleContentPage(
    "Add Your Dog Grooming Business",
    "Want to update or add a listing? Send the business name, website, phone number, address, services, and the city page where it should appear.",
    `<form class="search-panel compact" id="add-business-form">
      <div class="grid-2">
        <label>Business name<input required name="business" class="input-shell" style="width:100%;margin-top:6px;padding:12px" placeholder="Business name"></label>
        <label>City / Province<input required name="location" class="input-shell" style="width:100%;margin-top:6px;padding:12px" placeholder="City, province"></label>
      </div>
      <label style="display:block;margin-top:12px">Business email<input type="email" name="email" class="input-shell" style="width:100%;margin-top:6px;padding:12px" placeholder="name@business.ca"></label>
      <label style="display:block;margin-top:12px">Details<textarea name="details" class="input-shell" style="width:100%;min-height:120px;margin-top:6px;padding:12px" placeholder="Website, phone, services, hours, notes"></textarea></label>
      <label class="check-option" style="margin-top:12px"><input type="checkbox" name="photoRights" value="yes"><span>I plan to attach photos that I own or have permission from the rights holder to authorize for this profile.</span></label>
      <p class="muted">After your email opens, attach the original photo files and include the photographer or requested credit. Photos are optional.</p>
      <button class="btn btn-primary" type="submit" style="margin-top:12px">Prepare Email</button>
    </form>
    <script>
      document.getElementById("add-business-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(event.currentTarget);
        var photoStatement = data.get("photoRights") ? "\\n\\nPhoto authorization: I confirm that I own the attached images or have permission from the rights holder, and I authorize Dog Groomers Canada to display them on this business profile and related directory cards.\\nPhoto credit / source:" : "";
        var body = "Business: " + (data.get("business") || "") + "\\nLocation: " + (data.get("location") || "") + "\\nBusiness email: " + (data.get("email") || "") + "\\nDetails: " + (data.get("details") || "") + photoStatement;
        window.location.href = "mailto:${CONTACT_EMAIL}?subject=Dog%20Groomers%20Canada%20listing%20update&body=" + encodeURIComponent(body);
      });
    </script>`,
  );
  writePage(context, "/add-your-business/", "Add Your Business | Dog Groomers Canada", "Add or update a dog grooming business listing in Canada with services, phone number, website, address, hours, and local city page details.", addBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Add Your Business", url: "/add-your-business/" }]));

  writePage(
    context,
    "/for-businesses/",
    "For Dog Grooming Businesses | Dog Groomers Canada",
    "Dog grooming businesses can request listing updates for services, phone numbers, websites, addresses, hours, city pages, and local profile details.",
    simpleContentPage(
      "For Dog Grooming Businesses",
      "Dog Groomers Canada is a directory designed to help pet owners find local grooming options. Businesses can request listing updates, service corrections, website changes, and contact detail updates.",
      `<div class="grid-3"><div class="info-card"><h2>Update details</h2><p>Keep phone numbers, websites, service notes, and hours accurate so customers can contact you quickly.</p></div><div class="info-card"><h2>Document the source</h2><p>Business-submitted changes are labelled on the profile so readers can distinguish them from public listing snapshots and official-site reviews.</p></div><div class="info-card"><h2>Request removal</h2><p>If your business should not appear, send the profile URL and verification source so the listing can be reviewed.</p></div></div>
      <section class="section"><h2>What businesses can update</h2><p>Business owners and authorized representatives can request corrections for business name, phone number, website, address, city placement, opening hours, services, business status, and duplicate listings.</p><p><a class="btn btn-primary" href="mailto:${CONTACT_EMAIL}?subject=Dog%20Groomers%20Canada%20business%20profile%20update">Email a business update</a></p></section>
      <section class="section"><h2>Submit profile photos</h2><p>Attach original files only when you own the images or have permission from the rights holder. Include the profile URL, photographer or requested credit, and the statement: “I authorize Dog Groomers Canada to display these images on this business profile and related directory cards.” Public availability or a source link alone is not enough.</p><p><a class="btn btn-light" href="mailto:${CONTACT_EMAIL}?subject=Authorized%20business%20profile%20photos&body=Profile%20URL%3A%0ABusiness%3A%0APhoto%20credit%20%2F%20source%3A%0A%0AI%20confirm%20that%20I%20own%20the%20attached%20images%20or%20have%20permission%20from%20the%20rights%20holder%2C%20and%20I%20authorize%20Dog%20Groomers%20Canada%20to%20display%20them%20on%20this%20business%20profile%20and%20related%20directory%20cards.">Submit authorized photos</a></p></section>`,
    ),
    breadcrumbSchema([{ label: "Home", url: "/" }, { label: "For Businesses", url: "/for-businesses/" }]),
  );

  writePage(
    context,
    "/privacy/",
    "Privacy Policy | Dog Groomers Canada",
    "Privacy policy for Dog Groomers Canada, including browser-based dog grooming near me location features, advertising, and analytics notes.",
    simpleContentPage(
      "Privacy Policy",
      "Dog Groomers Canada is a directory that uses limited browser features to help visitors search, compare, and find nearby dog grooming pages.",
      `<div class="grid-3">
        <div class="info-card"><h2>Location and shortlist tools</h2><p>The near-me feature asks for your browser location only after you press the location button. Coordinates are used in your browser to sort nearby listings. Saved groomer shortlists and location preferences are kept in this site's local browser storage for convenience and are not submitted to us.</p></div>
        <div class="info-card"><h2>Analytics</h2><p>We use Google Analytics to understand aggregate site usage, such as page visits and search or navigation patterns. Analytics may use cookies and device, browser, network, and interaction information.</p></div>
        <div class="info-card"><h2>Grow by Mediavine</h2><p>Grow provides reader features such as saving, sharing, subscribing, and recommended content. It may use cookies, local storage, identifiers, and interaction data to provide those features and measure site engagement.</p></div>
      </div>
      <section class="section">
        <h2>Grow and Mediavine data</h2>
        <p>Grow by Mediavine helps readers save content, receive recommendations, and choose whether to subscribe. If you use a Grow feature, Mediavine may process information needed to provide it, including account or subscription information you choose to submit and information about how you interact with this site.</p>
        <p>Learn more in the <a href="https://www.mediavine.com/legal-and-privacy-center/" rel="nofollow noopener" target="_blank">Mediavine Legal and Privacy Center</a>, which includes privacy notices and request options for Grow users.</p>
      </section>
      <section class="section">
        <h2>Google Analytics</h2>
        <p>Google Analytics helps us measure aggregate traffic and understand which directory, guide, and tool pages are useful. Google may process cookies, IP addresses, device and browser information, page URLs, and interaction events for this purpose. Learn more about <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow noopener" target="_blank">how Google uses information from sites that use its services</a>.</p>
      </section>
      <section class="section">
        <h2>Directory information</h2>
        <p>Business profile pages include public listing facts such as business name, city, contact details, services, ratings, hours, websites, and map links when available. We do not republish review text, reviewer names, or reviewer profiles. When enough comments are present, a profile may show a neutral summary of topics repeated across several comments. Businesses can request updates or corrections by contacting <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
      </section>
      <section class="section">
        <h2>Contact by email</h2>
        <p>If you email a correction, removal request, or listing update, we receive the information you choose to send, such as your email address, business details, supporting source links, and requested changes.</p>
      </section>
      <section class="section">
        <h2>Data choices</h2>
        <p>You can clear saved location and groomer-shortlist data by using the shortlist's clear button or clearing this site's browser storage. You can also block or delete cookies in your browser settings. Some Grow or analytics features may work differently when storage is blocked. Grow users can use Mediavine's privacy request options, and you can contact <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> about information sent directly to this site.</p>
        <p class="muted">Last updated July 20, 2026.</p>
      </section>`,
    ),
    breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Privacy", url: "/privacy/" }]),
  );

  writePage(
    context,
    "/terms/",
    "Terms of Use | Dog Groomers Canada",
    "Terms for using Dog Groomers Canada, a dog grooming directory with local business profiles, ratings, services, websites, maps, and phone numbers.",
    simpleContentPage(
      "Terms of Use",
      "Directory information can change. Dog Groomers Canada provides listing information to help users compare options, but visitors should confirm services, prices, hours, and availability directly with each business before booking.",
      `<div class="grid-3">
        <div class="info-card"><h2>No endorsement</h2><p>Listings, ratings, and links do not constitute a guarantee, certification, recommendation, or endorsement. Grooming decisions should be based on direct communication with the business and your dog's needs.</p></div>
        <div class="info-card"><h2>Confirm before booking</h2><p>Prices, hours, websites, services, appointment availability, and business status can change. Confirm current details directly with the groomer before visiting or booking.</p></div>
        <div class="info-card"><h2>Corrections</h2><p>Businesses may request updates, removals, or corrections by email. Include the page URL and the details that should change.</p></div>
      </div>
      <section class="section">
        <h2>Using profile information</h2>
        <p>Dog Groomers Canada is an informational directory. Profile pages are designed for comparison and may include public business facts such as phone numbers, websites, address details, map links, hours, ratings, and services when available. Do not rely on directory information as the only source for appointment, safety, medical, pricing, or business-status decisions.</p>
      </section>
      <section class="section">
        <h2>Advertising</h2>
        <p>Advertising may appear after the site is approved for ad serving. Ads do not indicate that Dog Groomers Canada endorses the advertiser or any listed business.</p>
      </section>`,
    ),
    breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Terms", url: "/terms/" }]),
  );

  const notFoundBody = `
    <section class="page-intro">
      <div class="wrap">
        <h1 class="city-title">Page not found</h1>
        <p class="lead">Search the directory or browse by province to find Canadian dog groomers.</p>
        ${searchPanel("compact")}
      </div>
    </section>
    <section class="section"><div class="wrap grid-3">${context.provinces
      .slice(0, 9)
      .map(
        (province) =>
          `<a class="province-card" href="${province.url}"><span><strong>${esc(province.name)}</strong><span>${province.count.toLocaleString()} listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
      )
      .join("")}</div></section>`;
  writeStandaloneFile("404.html", pageHtml("/404.html", "Page Not Found | Dog Groomers Canada", "Search Dog Groomers Canada or browse by province.", notFoundBody, []));
}

function writeSitemap(context) {
  const tools = ownerToolPages();
  const costCities = costCityPages(context);
  const cityLinks = context.cities
    .map((city) => `<li><a href="${city.url}">${esc(city.city)}, ${esc(city.provinceCode)}</a> <span class="count">${city.count}</span></li>`)
    .join("");
  const listingLinks = context.listings
    .map((listing) => `<li><a href="${listing.url}">${esc(listing.title)} in ${esc(listing.city)}, ${esc(listing.provinceCode)}</a></li>`)
    .join("");
  const guideLinks = guideArticles
    .map((article) => `<li><a href="${guideArticleRoute(article)}">${esc(article.title)}</a></li>`)
    .join("");
  const toolLinks = tools.map((tool) => `<li><a href="${tool.url}">${esc(tool.name)}</a></li>`).join("");
  const costLinks = [
    `<li><a href="/dog-grooming-cost/">Dog Grooming Cost in Canada</a></li>`,
    ...context.provinces.map((province) => `<li><a href="${provinceCostRoute(province)}">Dog grooming cost in ${esc(province.name)}</a></li>`),
    ...costCities.map((city) => `<li><a href="${cityCostRoute(city)}">Dog grooming cost in ${esc(city.city)}, ${esc(city.provinceCode)}</a></li>`),
  ].join("");
  const body = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Sitemap" }])}
        <h1 class="city-title">Dog Groomers Canada HTML Sitemap</h1>
        <p class="lead">Crawlable links to province pages, city pages, service pages, original grooming guides, grooming tools, and every dog groomer profile page.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-4">
        <div class="info-card"><h2>Provinces</h2>${linkList(context.provinces, (item) => item.url, (item) => item.name, (item) => `${item.count}`)}</div>
        <div class="info-card"><h2>Services</h2>${linkList(context.services, (item) => item.url, (item) => item.name, (item) => `${item.count}`)}</div>
        <div class="info-card"><h2>Guides</h2>${linkList(
          [
            { url: "/guides/", name: "Guide Hub", count: guideArticles.length },
            ...guideCategories.map((category) => ({ url: `/guides/${category.slug}/`, name: category.name, count: guideArticlesForCategory(category.slug).length })),
          ],
          (item) => item.url,
          (item) => item.name,
          (item) => `${item.count}`,
        )}</div>
        <div class="info-card"><h2>Tools</h2>${linkList(
          [{ url: "/grooming-tools/", name: "Tools Hub", count: tools.length }, ...tools.map((tool) => ({ url: tool.url, name: tool.name, count: "" }))],
          (item) => item.url,
          (item) => item.name,
          (item) => `${item.count}`,
        )}</div>
        <div class="info-card"><h2>Costs</h2>${linkList(
          [
            { url: "/dog-grooming-cost/", name: "Cost Hub", count: context.provinces.length + costCities.length },
            ...context.provinces.slice(0, 8).map((province) => ({ url: provinceCostRoute(province), name: province.name, count: province.count })),
          ],
          (item) => item.url,
          (item) => item.name,
          (item) => `${item.count}`,
        )}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="info-card"><h2>Core pages</h2>${linkList(
          [
            { url: "/dog-grooming/", name: "Dog Grooming", count: "" },
            { url: "/dog-grooming-cost/", name: "Dog Grooming Cost", count: context.provinces.length + costCities.length },
            { url: "/dog-grooming-near-me/", name: "Dog Grooming Near Me", count: "" },
            { url: "/mobile-dog-grooming-near-me/", name: "Mobile Dog Grooming Near Me", count: "" },
            { url: "/cities/", name: "All Cities", count: context.cities.length },
            { url: "/search/", name: "Search", count: "" },
            { url: "/about/", name: "About", count: "" },
            { url: "/contact/", name: "Contact", count: "" },
            { url: "/editorial-policy/", name: "Editorial Policy", count: "" },
            { url: "/privacy/", name: "Privacy Policy", count: "" },
          ],
          (item) => item.url,
          (item) => item.name,
          (item) => `${item.count}`,
        )}</div>
      </div>
    </section>
    <section class="section"><div class="wrap"><h2>Dog grooming cost pages</h2><ul class="link-list">${costLinks}</ul></div></section>
    <section class="section"><div class="wrap"><h2>Dog grooming guide pages</h2><ul class="link-list">${guideLinks}</ul></div></section>
    <section class="section"><div class="wrap"><h2>Dog grooming tool pages</h2><ul class="link-list">${toolLinks}</ul></div></section>
    <section class="section"><div class="wrap"><h2>City pages</h2><ul class="link-list">${cityLinks}</ul></div></section>
    <section class="section"><div class="wrap"><h2>Dog groomer profile pages</h2><ul class="link-list">${listingLinks}</ul></div></section>`;
  writePage(context, "/sitemap/", "HTML Sitemap | Dog Groomers Canada", "HTML sitemap for Dog Groomers Canada with crawlable dog grooming links by province, city, service, guide, grooming tool, near me page, and groomer profile.", body, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Sitemap", url: "/sitemap/" }]));

  const urls = context.pages
    .filter((page) => page.route !== "/404.html")
    .map((page) => `  <url><loc>${escapeXml(absoluteUrl(page.route))}</loc><lastmod>${CONTENT_UPDATED_DATE}</lastmod></url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
}

function writeRobotsAndDomain() {
  fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  fs.writeFileSync(path.join(ROOT, "ads.txt"), "");
  fs.writeFileSync(path.join(ROOT, "sw.js"), LEGACY_AD_SERVICE_WORKER_TOMBSTONE);
  fs.writeFileSync(path.join(ROOT, "CNAME"), "doggroomerscanada.ca\n");
  fs.writeFileSync(path.join(ROOT, ".nojekyll"), "");
}

function writePage(context, route, title, description, body, schema, options = {}) {
  const html = cleanGeneratedHtml(pageHtml(route, title, description, body, schema, options));
  const target = route === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, trimSlashes(route), "index.html");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  if (!options.noSitemap) context.pages.push({ route, title });
}

function writeStandaloneFile(file, html) {
  fs.writeFileSync(path.join(ROOT, file), cleanGeneratedHtml(html));
}

function cleanGeneratedHtml(html) {
  return html.replace(/[ \t]+$/gm, "");
}

function pageHtml(route, title, description, body, schema = [], options = {}) {
  const routePath = route === "/404.html" ? "/404.html" : route;
  const canonical = options.canonicalUrl || absoluteUrl(options.canonicalRoute || routePath);
  const meta = metaDescription(description);
  const robotsContent = options.robotsContent || "index,follow,max-image-preview:large";
  const schemaItems = Array.isArray(schema) ? schema.filter(Boolean) : [schema].filter(Boolean);
  const pageContainerTag = /<main(?:\s|>)/i.test(body) ? "div" : "main";
  return `<!doctype html>
<html lang="en-CA">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="dgc-base-path" content="">
  <meta name="theme-color" content="${THEME_COLOR}">
  ${googleIntegrationHead()}
  <title>${esc(title)}</title>
  <meta name="description" content="${escAttr(meta)}">
  <link rel="canonical" href="${escAttr(canonical)}">
  <meta name="robots" content="${escAttr(robotsContent)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_CA">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(meta)}">
  <meta property="og:url" content="${escAttr(canonical)}">
  <meta property="og:image" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta property="og:image:secure_url" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta property="og:image:type" content="image/svg+xml">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${BRAND_NAME}: find dog grooming near me across Canada">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta name="twitter:image:alt" content="${BRAND_NAME}: find dog grooming near me across Canada">
  <link rel="icon" href="${FAVICON_PATH}" type="image/png">
  <link rel="manifest" href="/assets/site.webmanifest">
  ${routePath === "/" ? `<link rel="preload" href="${PHOTO_HERO_PATH}" as="image">` : ""}
  <link rel="preload" href="/assets/site.css?v=${ASSET_VERSION}" as="style">
  <link rel="stylesheet" href="/assets/site.css?v=${ASSET_VERSION}">
  ${schemaItems.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ")}
  <script src="/assets/main.js?v=${ASSET_VERSION}" defer></script>
</head>
<body ${options.bodyAttrs || ""}>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(route)}
  <${pageContainerTag} id="main" class="page">${body}</${pageContainerTag}>
  ${footer()}
</body>
</html>
`;
}

function header(route) {
  const nav = [
    ["/dog-grooming/", "Dog Grooming"],
    ["/dog-grooming-cost/", "Costs"],
    ["/guides/", "Guides"],
    ["/grooming-tools/", "Tools"],
    ["/provinces/", "Provinces"],
    ["/cities/", "Cities"],
    ["/dog-grooming-near-me/", "Near Me"],
    ["/add-your-business/", "Add Business"],
  ];
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${BRAND_NAME} home"><img class="brand-mark" src="${LOGO_MARK_PATH}" width="40" height="40" alt="" decoding="async"><span class="brand-name">${BRAND_NAME} <span class="maple">◆</span></span></a>
      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button>
      <nav class="site-nav" aria-label="Primary navigation">
        ${nav.map(([url, label]) => `<a href="${url}"${route === url || (url === "/dog-grooming-cost/" && route.startsWith("/dog-grooming-cost/")) || (url === "/guides/" && route.startsWith("/guides/")) || (url === "/grooming-tools/" && route.startsWith("/grooming-tools/")) ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h2>Dog Groomers Canada</h2>
        <p>Canada's directory of dog grooming businesses. Find, compare, and connect with local groomers near you.</p>
        <p class="copyright">&copy; ${new Date().getFullYear()} Dog Groomers Canada</p>
      </div>
      <div><h3>Browse</h3><a href="/dog-grooming/">Dog Grooming</a><a href="/dog-grooming-cost/">Grooming Costs</a><a href="/dog-grooming-near-me/">Dog Grooming Near Me</a><a href="/mobile-dog-grooming-near-me/">Mobile Grooming Near Me</a><a href="/provinces/">Provinces</a><a href="/cities/">Cities</a><a href="/services/">Services</a><a href="/guides/">Guides</a></div>
      <div><h3>Guides</h3><a href="/guides/techniques/">Techniques</a><a href="/guides/seasonal-care/">Seasonal Care</a><a href="/guides/breed-guides/">Breed Guides</a><a href="/guides/costs-and-booking/">Costs and Booking</a><a href="/guides/dog-grooming-cost-canada/">Cost Guide</a></div>
      <div><h3>Tools</h3><a href="/grooming-tools/">All Tools</a><a href="/grooming-tools/dog-grooming-cost-estimator/">Cost Estimator</a><a href="/grooming-tools/dog-grooming-frequency-calculator/">Frequency Calculator</a><a href="/grooming-tools/matting-risk-checklist/">Matting Checklist</a><a href="/grooming-tools/dog-groomer-call-script/">Call Script</a><a href="/search/">Search Directory</a></div>
      <div><h3>Company</h3><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/editorial-policy/">Editorial Policy</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a><a href="/sitemap/">HTML Sitemap</a></div>
      <div><h3>Businesses</h3><a href="/add-your-business/">Add Your Business</a><a href="/for-businesses/">For Businesses</a><a href="/contact/">Send Corrections</a><a href="/sitemap.xml">XML Sitemap</a><a href="/robots.txt">Robots.txt</a></div>
    </div>
  </footer>`;
}

function searchPanel(variant = "") {
  return `<div class="search-panel ${variant}">${searchForm()}</div>`;
}

function searchForm() {
  return `<form class="directory-search" data-search-form action="/search/" method="get">
    <label class="input-shell">${searchIcon()}<span class="sr-only">Search</span><input type="search" name="q" placeholder="Search name or service"></label>
    <label class="input-shell">${pinIcon()}<span class="sr-only">Location</span><input type="text" name="where" placeholder="City or postal code"></label>
    <button class="btn btn-dark" type="button" data-use-location data-status-target="[data-location-status]">${targetIcon()} Use my location</button>
    <button class="btn btn-primary" type="submit">Search</button>
  </form><p class="muted" data-location-status style="margin:10px 0 0"></p>`;
}

function listingCard(item, compact = false) {
  const actions = [];
  if (item.phone) actions.push(`<a class="plain-action" href="tel:${escAttr(item.phoneRaw || item.phone)}">${phoneIcon()} ${esc(item.phone)}</a>`);
  if (item.website) actions.push(`<a class="plain-action" href="${escAttr(item.website)}" target="_blank" rel="nofollow noopener">${globeIcon()} Website</a>`);
  actions.push(`<button class="plain-action shortlist-toggle" type="button" data-shortlist-toggle data-listing-url="${escAttr(item.url)}" data-listing-name="${escAttr(item.title)}" aria-label="Save ${escAttr(item.title)} to compare" aria-pressed="false">☆ Save to compare</button>`);
  actions.push(`<a class="btn btn-primary" href="${item.url}">View Profile</a>`);

  return `<article class="listing-card${compact ? " compact" : ""}">
    <a class="listing-image" href="${item.url}">${item.image ? `<img src="${escAttr(item.image)}" alt="${escAttr(listingImageAlt(item, "card"))}" loading="lazy" referrerpolicy="no-referrer"${listingImageRightsAttr(item)}${sameBusinessFallbackImage(item) ? ` data-fallback-image="${escAttr(sameBusinessFallbackImage(item))}" data-fallback-alt="${escAttr(listingImageAlt(item, "card"))}"` : ""}>` : imageUnavailable(item)}</a>
    <div class="listing-body">
      <h3><a class="listing-title" href="${item.url}">${esc(item.title)}</a></h3>
      <div class="meta-line">${ratingLine(item)}<span>${esc(item.city)}, ${esc(item.provinceCode)}</span></div>
      ${item.address ? `<p class="address">${pinIconInline()} ${esc(item.address)}</p>` : ""}
      ${item.services.length ? `<p class="services">${esc(item.services.slice(0, 4).join(" · "))}</p>` : ""}
    </div>
    ${
      compact
        ? ""
        : `<div class="card-actions">
          ${actions.join("\n          ")}
        </div>`
    }
  </article>`;
}

function ratingLine(item) {
  if (!item.rating) return `<span class="muted">Rating not listed</span>`;
  return `<span class="rating"><span class="stars" aria-hidden="true">★</span> ${item.rating.toFixed(1)}${item.reviews ? ` (${countLabel(item.reviews, "review")})` : ""}</span>`;
}

function linkList(items, urlFn, labelFn, countFn) {
  return `<ul class="link-list">${items
    .map((item) => `<li class="link-row"><a href="${escAttr(urlFn(item))}">${esc(labelFn(item))}</a><span class="count">${esc(countFn(item))}</span></li>`)
    .join("")}</ul>`;
}

function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items
    .map((item, index) => {
      const current = index === items.length - 1;
      return `${index ? "<span>/</span>" : ""}${current ? `<strong>${esc(item.label)}</strong>` : `<a href="${item.url}">${esc(item.label)}</a>`}`;
    })
    .join("")}</nav>`;
}

function simpleContentPage(title, lead, extra) {
  return `<section class="page-intro"><div class="wrap">${breadcrumbs([{ label: "Home", url: "/" }, { label: title }])}<h1 class="city-title">${esc(title)}</h1><p class="lead">${esc(lead)}</p></div></section><section class="section"><div class="wrap">${extra}</div></section>`;
}

function homeGuideSection(context) {
  const featured = guideArticles.filter((article) => article.featured).slice(0, 4);
  return `<section class="section guide-band">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Original dog grooming guides, not just listings</h2>
            <p>Use the directory to find local groomers, then use the guide hub to understand coat type, seasonal care in Canada, breed-specific needs, cost factors, and the questions to ask before booking.</p>
          </div>
          <a class="link-arrow" href="/guides/">View all guides -></a>
        </div>
        <div class="grid-4">${guideCategories
          .map(
            (category) =>
              `<a class="guide-card guide-category-card" href="/guides/${category.slug}/"><span class="guide-card-meta">${esc(category.shortName)}</span><h3>${esc(category.name)}</h3><p>${esc(category.description)}</p><strong>${guideArticlesForCategory(category.slug).length} guides</strong></a>`,
          )
          .join("")}</div>
        <div class="section-head guide-featured-head">
          <div><h2>Helpful starting points</h2><p>High-value owner guides that support common dog grooming searches in Canada.</p></div>
        </div>
        <div class="guide-list">${featured.map((article) => guideCard(article, "row")).join("")}</div>
      </div>
    </section>`;
}

function homeCostSection(context) {
  const topCostCities = costCityPages(context).slice(0, 8);
  return `<section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Canadian dog grooming cost planning</h2>
            <p>Compare realistic price ranges, regional booking factors, add-on questions, and city-specific grooming cost guides before requesting a quote.</p>
          </div>
          <a class="link-arrow" href="/dog-grooming-cost/">Open cost guide -></a>
        </div>
        <div class="grid-3">
          <a class="tool-card" href="/dog-grooming-cost/"><span class="guide-card-meta">Cost guide</span><h3>Dog Grooming Cost in Canada</h3><p>Planning ranges for full grooms, bath and brush visits, nails, de-shedding, de-matting, mobile grooming, and add-ons.</p><strong>Read the guide</strong></a>
          <a class="tool-card" href="/grooming-tools/dog-grooming-cost-estimator/"><span class="guide-card-meta">Estimator</span><h3>Dog Grooming Cost Estimator</h3><p>Estimate a quote range by dog size, coat type, service package, matting, handling, and mobile grooming needs.</p><strong>Open tool</strong></a>
          <a class="tool-card" href="/grooming-tools/dog-groomer-call-script/"><span class="guide-card-meta">Booking aid</span><h3>Quote Questions to Ask</h3><p>Use a practical script to compare what is included, what costs extra, and how the groomer handles coat problems.</p><strong>Prepare questions</strong></a>
        </div>
        <div class="section-head guide-featured-head">
          <div><h2>Popular city cost pages</h2><p>Major-city cost pages are limited to areas with enough local directory data.</p></div>
        </div>
        <div class="grid-4">${topCostCities
          .map(
            (city) =>
              `<a class="province-card" href="${cityCostRoute(city)}"><span><strong>${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} local listings</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}</div>
      </div>
    </section>`;
}

function homeToolSection(context) {
  return `<section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Free grooming planning tools</h2>
            <p>Estimate how often to book, check matting risk, and prepare better questions before you call a groomer.</p>
          </div>
          <a class="link-arrow" href="/grooming-tools/">All tools -></a>
        </div>
        <div class="grid-3">${ownerToolPages()
          .map(
            (tool) =>
              `<a class="tool-card" href="${tool.url}"><span class="guide-card-meta">${esc(tool.kind)}</span><h3>${esc(tool.name)}</h3><p>${esc(tool.summary)}</p><strong>Open tool</strong></a>`,
          )
          .join("")}</div>
      </div>
    </section>`;
}

function guideArticlesForCategory(slug) {
  return guideArticles.filter((article) => article.category === slug);
}

function guideCategoryBySlug(slug) {
  return guideCategories.find((category) => category.slug === slug) || guideCategories[0];
}

function guideArticleRoute(article) {
  return `/guides/${article.slug}/`;
}

function guideReadTime(article) {
  const words = [
    article.title,
    article.description,
    article.summary,
    ...(article.keywords || []),
    ...article.sections.flatMap((section) => [section.heading, ...(section.paragraphs || []), ...(section.bullets || [])]),
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(4, Math.round(words / 220))} min read`;
}

function guideCard(article, variant = "") {
  const category = guideCategoryBySlug(article.category);
  const classes = ["guide-card"];
  if (variant) classes.push(variant);
  return `<a class="${classes.join(" ")}" href="${guideArticleRoute(article)}">
      <span class="guide-card-meta">${esc(category.shortName)} · ${guideReadTime(article)}</span>
      <h3>${esc(article.title)}</h3>
      <p>${esc(article.summary)}</p>
    </a>`;
}

function guideArticleBody(article, context) {
  const category = guideCategoryBySlug(article.category);
  const related = guideRelatedArticles(article).slice(0, 4);
  const serviceLinks = guideRelevantServices(article, context.services);
  const relevantTool = guideRelevantTool(article);
  const articleSections = article.sections.map((section, index) => guideArticleSection(section, index));
  const inlineToolIndex = Math.min(2, articleSections.length);
  const toc = article.sections
    .map((section, index) => `<a href="#${escAttr(guideSectionId(section, index))}">${esc(section.heading)}</a>`)
    .join("");
  return `
    <section class="page-intro article-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Guides", url: "/guides/" }, { label: category.name, url: `/guides/${category.slug}/` }, { label: article.title }])}
        <h1 class="city-title">${esc(article.title)}</h1>
        <p class="lead">${esc(article.summary)}</p>
        <div class="article-meta">
          <span>Dog Groomers Canada</span>
          <span>${esc(category.name)}</span>
          <span>${guideReadTime(article)}</span>
          <span>Updated ${esc(CONTENT_UPDATED_DATE)}</span>
        </div>
        <div class="tag-cloud article-tags">${(article.keywords || []).map((keyword) => `<span class="tag">${esc(keyword)}</span>`).join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout article-layout">
        <main>
          <article class="article-content">
            <p class="article-summary">${esc(article.description)}</p>
            ${guideAuthorBox(article)}
            ${articleSections.slice(0, inlineToolIndex).join("")}
            ${guideRelevantToolCard(relevantTool)}
            ${articleSections.slice(inlineToolIndex).join("")}
            ${guideFaqSection(article)}
            <section class="article-section">
              <h2>Find a groomer for this need</h2>
              <p>Use this guide as preparation, then compare local groomers by city, service signals, rating strength, phone number, website, and profile details. Confirm current services, pricing, appointment length, and coat-specific experience directly with the business before booking.</p>
              <div class="tag-cloud">
                <a class="btn btn-primary" href="/dog-grooming-near-me/">Find dog grooming near me</a>
                <a class="btn btn-light" href="/grooming-tools/dog-groomer-call-script/">Build a booking brief</a>
                <a class="btn btn-light" href="/services/">Browse grooming services</a>
                <a class="btn btn-light" href="/cities/">Browse city pages</a>
              </div>
            </section>
          </article>
        </main>
        <aside class="side-panel">
          <div class="info-card article-toc">
            <h2>On this page</h2>
            <nav aria-label="Guide sections">${toc}</nav>
          </div>
          <div class="info-card">
            <h2>Related services</h2>
            ${linkList(
              serviceLinks,
              (service) => service.url,
              (service) => service.name,
              (service) => `${service.count}`,
            )}
          </div>
          <div class="info-card">
            <h2>Related guides</h2>
            <div class="mini-guide-list">${related.map((item) => `<a href="${guideArticleRoute(item)}">${esc(item.title)}</a>`).join("")}</div>
          </div>
        </aside>
      </div>
    </section>`;
}

function guideRelevantTool(article) {
  const subject = normalizeKey(`${article.slug} ${article.title}`);
  const text = normalizeKey(`${article.slug} ${article.title} ${(article.keywords || []).join(" ")}`);
  let route = "/grooming-tools/coat-maintenance-planner/";
  if (/\b(?:mat|mats|matted|matting|demat|dematting)\b/.test(text)) route = "/grooming-tools/matting-risk-checklist/";
  else if (/puppy/.test(text)) route = "/grooming-tools/puppy-first-groom-planner/";
  else if (/nail/.test(subject)) route = "/grooming-tools/dog-grooming-frequency-calculator/";
  else if (/cost|price|quote/.test(text)) route = "/grooming-tools/dog-grooming-cost-estimator/";
  else if (article.slug.includes("winter") || /\b(?:salt|ice|snow)\b/.test(subject)) route = "/grooming-tools/winter-paw-care-checklist/";
  else if (/compare|appointment|booking|call|mobile|senior|comfort/.test(text)) route = "/grooming-tools/dog-groomer-call-script/";
  else if (/frequency|schedule|interval|bath|nail/.test(text)) route = "/grooming-tools/dog-grooming-frequency-calculator/";
  return ownerToolPages().find((tool) => tool.url === route) || ownerToolPages()[0];
}

function guideRelevantToolCard(tool) {
  if (!tool) return "";
  return `<aside class="article-tool-card" aria-label="Recommended interactive tool">
      <div><span class="guide-card-meta">Try this next · ${esc(tool.kind)}</span><h2>${esc(tool.name)}</h2><p>${esc(tool.summary)}</p></div>
      <a class="btn btn-primary" href="${escAttr(tool.url)}">Open the free tool</a>
    </aside>`;
}

function guideAuthorBox(article) {
  const category = guideCategoryBySlug(article.category);
  return `<aside class="author-box" aria-label="Article publisher information">
      <div>
        <strong>Written and maintained by Dog Groomers Canada</strong>
        <p>Prepared for Canadian dog owners comparing groomers, coat care, seasonal risks, breed needs, costs, and booking questions. Updated ${esc(CONTENT_UPDATED_DATE)} in the ${esc(category.name)} section.</p>
      </div>
      <div class="author-links"><a class="link-arrow" href="/about/">About the publisher -></a><a class="link-arrow" href="/editorial-policy/">Editorial standards -></a></div>
    </aside>`;
}

function guideArticleSection(section, index) {
  return `<section class="article-section" id="${escAttr(guideSectionId(section, index))}">
      <h2>${esc(section.heading)}</h2>
      ${(section.paragraphs || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
      ${
        section.bullets && section.bullets.length
          ? `<ul class="check-list">${section.bullets.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
          : ""
      }
    </section>`;
}

function guideFaqSection(article) {
  if (!article.faqs || !article.faqs.length) return "";
  return `<section class="article-section faq-section">
      <h2>Frequently asked questions</h2>
      ${article.faqs.map((faq) => `<details><summary>${esc(faq.question)}</summary><p>${esc(faq.answer)}</p></details>`).join("")}
    </section>`;
}

function guideSectionId(section, index) {
  return slugify(section.heading) || `section-${index + 1}`;
}

function guideRelatedArticles(article) {
  return uniqueBy(
    [
      ...guideArticles.filter((item) => item.category === article.category && item.slug !== article.slug),
      ...guideArticles.filter((item) => item.featured && item.slug !== article.slug),
    ],
    (item) => item.slug,
  );
}

function guideRelevantServices(article, services) {
  const text = normalizeKey(`${article.slug} ${article.title} ${(article.keywords || []).join(" ")}`);
  const desired = [];
  if (/nail/.test(text)) desired.push("nail-trimming");
  if (/mat|demat/.test(text)) desired.push("dematting");
  if (/shed|undercoat|double coat|husky|shepherd|golden|bernese|labrador/.test(text)) desired.push("deshedding");
  if (/puppy/.test(text)) desired.push("puppy-grooming");
  if (/mobile/.test(text)) desired.push("mobile-dog-grooming");
  if (/cost|quote|booking|compare|appointment|price/.test(text)) desired.push("dog-haircuts", "bath-and-brush", "nail-trimming");
  if (/bath|skin|winter|spring|summer|fall|salt|mud|lake|french|rain/.test(text)) desired.push("bath-and-brush");
  if (/haircut|poodle|doodle|shih|yorkie|curly|coat|line brushing/.test(text)) desired.push("dog-haircuts");
  const matched = desired.map((slug) => services.find((service) => service.slug === slug)).filter(Boolean);
  return uniqueBy([...matched, ...services], (service) => service.slug).slice(0, 6);
}

function ownerToolPages() {
  return [
    {
      url: "/grooming-tools/dog-grooming-cost-estimator/",
      name: "Dog Grooming Cost Estimator",
      kind: "Estimator",
      summary: "Build a Canadian grooming price planning range from dog size, service type, coat condition, add-ons, and mobile grooming needs.",
    },
    {
      url: "/grooming-tools/dog-grooming-frequency-calculator/",
      name: "Grooming Frequency Calculator",
      kind: "Calculator",
      summary: "Estimate a practical grooming interval from coat type, coat length, mat risk, lifestyle, season, and home brushing.",
    },
    {
      url: "/grooming-tools/matting-risk-checklist/",
      name: "Matting Risk Checklist",
      kind: "Checklist",
      summary: "Score common matting triggers such as curly coat, moisture, sweaters, harness friction, missed comb checks, and coat change.",
    },
    {
      url: "/grooming-tools/dog-groomer-call-script/",
      name: "Dog Groomer Call Script",
      kind: "Booking aid",
      summary: "Prepare the exact questions to ask before booking a groom, including quote scope, safety policies, and coat-specific experience.",
    },
    {
      url: "/grooming-tools/coat-maintenance-planner/",
      name: "Coat Maintenance Planner",
      kind: "Planner",
      summary: "Create an at-home brushing and comb-check routine based on coat type, season, lifestyle, and grooming interval.",
    },
    {
      url: "/grooming-tools/puppy-first-groom-planner/",
      name: "Puppy First Groom Planner",
      kind: "Planner",
      summary: "Plan a gentle first grooming appointment by puppy age, coat type, handling comfort, and vaccine timing.",
    },
    {
      url: "/grooming-tools/winter-paw-care-checklist/",
      name: "Winter Paw Care Checklist",
      kind: "Checklist",
      summary: "Check winter paw, nail, salt, ice, boot, sweater, and coat-friction risks for Canadian dogs.",
    },
  ];
}

function costEstimatorToolBody(context) {
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Dog Grooming Cost Estimator" }])}
        <h1 class="city-title">Dog Grooming Cost Estimator</h1>
        <p class="lead">Estimate a Canadian dog grooming planning range before you call. This is not a quote; it helps you ask clearer questions about package scope and add-ons.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel" data-cost-estimator-tool>
            <div class="grid-2">
              ${toolSelect("size", "Dog size", [["small", "Small, under 25 lb"], ["medium", "Medium, 25-50 lb"], ["large", "Large, 50-90 lb"], ["giant", "Giant or very dense coat"]])}
              ${toolSelect("service", "Main service", [["full", "Full groom with haircut"], ["bath", "Bath and brush"], ["nails", "Nails only"], ["deshed", "De-shedding appointment"], ["mobile", "Mobile grooming visit"]])}
              ${toolSelect("coat", "Coat type", [["short", "Short or smooth"], ["double", "Double coat"], ["curly", "Curly or wool"], ["drop", "Long drop coat"], ["wire", "Wire or mixed"]])}
              ${toolSelect("condition", "Coat condition", [["maintained", "Maintained, combable"], ["long", "Long or overdue"], ["tangled", "Some tangles"], ["matted", "Matted or packed coat"]])}
              ${toolSelect("extras", "Likely add-ons", [["none", "No major add-ons"], ["basic", "Nail grinding or teeth brushing"], ["skin", "Special shampoo or skin products"], ["time", "Extra handling, express, or de-matting"]])}
              ${toolSelect("area", "Service style", [["salon", "Salon or shop visit"], ["mobile", "Mobile or house-call grooming"], ["remote", "Remote route or limited local options"]])}
            </div>
            <button class="btn btn-primary" type="submit">Estimate cost range</button>
          </form>
          <div class="tool-result" data-cost-estimator-result aria-live="polite">
            <h2>Estimated planning range</h2>
            <p>Choose your dog's size, coat, service, and add-ons to build a realistic range to discuss with a groomer.</p>
          </div>
          <section class="section">
            <h2>How to use this estimate</h2>
            <p>Use the result as a conversation starter. Call the groomer with your dog's breed or mix, weight, coat length, last groom date, matting, skin concerns, behavior notes, and the exact finish you want.</p>
          </section>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Read the cost guide</h2><p>See Canadian grooming cost ranges and the add-ons that commonly change a quote.</p><a class="btn btn-light" href="/dog-grooming-cost/">Dog grooming cost guide</a></div>
          <div class="info-card"><h2>Use with city pages</h2><p>After estimating, compare groomers by local page and call two or three with the same details.</p><a class="btn btn-light" href="/cities/">Browse city pages</a></div>
          <div class="info-card"><h2>Pricing references</h2>${costReferenceLinks()}</div>
        </aside>
      </div>
    </section>`;
}

function frequencyToolBody(context) {
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Grooming Frequency Calculator" }])}
        <h1 class="city-title">Dog Grooming Frequency Calculator</h1>
        <p class="lead">Estimate how often your dog may need professional grooming. This tool is a planning aid, not a medical or pricing quote.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel" data-frequency-tool>
            <div class="grid-2">
              ${toolSelect("coat", "Coat type", [["short", "Short coat"], ["double", "Double coat"], ["curly", "Curly or wool coat"], ["drop", "Long drop coat"], ["wire", "Wire or mixed coat"]])}
              ${toolSelect("length", "Current coat length", [["short", "Short practical trim"], ["medium", "Medium length"], ["long", "Long or fluffy"]])}
              ${toolSelect("brushing", "Home brushing", [["daily", "Daily or near daily"], ["weekly", "A few times a week"], ["rare", "Rarely or not yet consistent"]])}
              ${toolSelect("lifestyle", "Lifestyle", [["low", "Mostly indoor or low mess"], ["active", "Active walks, daycare, or dog parks"], ["wet", "Swimming, mud, snow, or rain often"]])}
              ${toolSelect("matting", "Matting history", [["none", "No matting history"], ["some", "Occasional tangles"], ["high", "Mats or shave-down before"]])}
              ${toolSelect("season", "Current season", [["normal", "No major seasonal challenge"], ["winter", "Winter salt, sweaters, snow, or ice"], ["spring", "Spring mud, shedding, or rain"], ["summer", "Summer heat, lake water, or ticks"], ["fall", "Fall burrs, coat change, or wet leaves"]])}
            </div>
            <button class="btn btn-primary" type="submit">Estimate schedule</button>
          </form>
          <div class="tool-result" data-frequency-result aria-live="polite">
            <h2>Estimated grooming interval</h2>
            <p>Choose your dog's coat and care details to see a recommended professional grooming range and at-home maintenance notes.</p>
          </div>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Helpful guides</h2>${linkList(
            guideArticles.filter((article) => ["line-brushing-curly-coated-dogs", "safe-dematting-dogs", "double-coat-deshedding-guide", "dog-grooming-cost-canada"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
          <div class="info-card"><h2>Find local help</h2><p>Once you know the likely schedule, compare groomers by city and service.</p><a class="btn btn-light" href="/dog-grooming-near-me/">Find grooming near me</a></div>
        </aside>
      </div>
    </section>`;
}

function coatPlannerToolBody(context) {
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Coat Maintenance Planner" }])}
        <h1 class="city-title">Dog Coat Maintenance Planner</h1>
        <p class="lead">Build a simple at-home brushing and comb-check routine for Canadian weather, coat type, and grooming interval.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel" data-coat-planner-tool>
            <div class="grid-2">
              ${toolSelect("coat", "Coat type", [["short", "Short or smooth"], ["double", "Double coat"], ["curly", "Curly or wool"], ["drop", "Long drop coat"], ["wire", "Wire or mixed"]])}
              ${toolSelect("length", "Coat length goal", [["short", "Short practical trim"], ["medium", "Medium pet trim"], ["long", "Long or fluffy"]])}
              ${toolSelect("season", "Season challenge", [["normal", "No major challenge"], ["winter", "Winter salt, snow, sweaters"], ["spring", "Spring mud and shedding"], ["summer", "Summer heat, lake, ticks"], ["fall", "Fall burrs and wet leaves"]])}
              ${toolSelect("lifestyle", "Lifestyle", [["quiet", "Mostly indoor"], ["active", "Dog parks, daycare, trails"], ["wet", "Often wet, muddy, or swimming"]])}
              ${toolSelect("interval", "Professional grooming interval", [["short", "Every 4-6 weeks"], ["medium", "Every 7-10 weeks"], ["long", "More than 10 weeks or unsure"]])}
              ${toolSelect("tools", "Current home tools", [["basic", "Brush only"], ["comb", "Brush and metal comb"], ["coat", "Coat-specific tools"], ["none", "Need a starter kit"]])}
            </div>
            <button class="btn btn-primary" type="submit">Build maintenance plan</button>
          </form>
          <div class="tool-result" data-coat-planner-result aria-live="polite">
            <h2>Your coat plan</h2>
            <p>Choose the coat and lifestyle details to see brushing frequency, comb-check zones, and appointment notes.</p>
          </div>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Related guides</h2>${linkList(
            guideArticles.filter((article) => ["line-brushing-curly-coated-dogs", "double-coat-deshedding-guide", "safe-dematting-dogs", "winter-dog-grooming-canada"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
          <div class="info-card"><h2>Find maintenance help</h2><p>Use service pages for bath and brush, haircuts, de-shedding, and de-matting support.</p><a class="btn btn-light" href="/services/">Browse services</a></div>
        </aside>
      </div>
    </section>`;
}

function puppyPlannerToolBody(context) {
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Puppy First Groom Planner" }])}
        <h1 class="city-title">Puppy First Groom Planner</h1>
        <p class="lead">Plan a calmer first grooming appointment by matching puppy age, vaccine timing, coat type, handling comfort, and appointment goals.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel" data-puppy-planner-tool>
            <div class="grid-2">
              ${toolSelect("age", "Puppy age", [["young", "Under 12 weeks"], ["starter", "12-16 weeks"], ["older", "4-7 months"], ["late", "Older than 7 months"]])}
              ${toolSelect("vaccines", "Vaccine status", [["ask", "Need to ask vet/groomer"], ["started", "Started puppy vaccines"], ["current", "Current for age"], ["unknown", "Unknown"]])}
              ${toolSelect("coat", "Coat type", [["short", "Short coat"], ["double", "Double coat"], ["curly", "Curly or wool"], ["drop", "Long drop coat"], ["mixed", "Mixed or unsure"]])}
              ${toolSelect("handling", "Handling comfort", [["comfortable", "Comfortable with paws/ears/brush"], ["learning", "Learning but wiggly"], ["sensitive", "Sensitive, mouthy, or fearful"], ["unknown", "Not sure yet"]])}
              ${toolSelect("goal", "First-visit goal", [["intro", "Gentle intro visit"], ["bath", "Bath, dry, nails"], ["tidy", "Face, feet, sanitary tidy"], ["full", "Full haircut if safe"]])}
              ${toolSelect("home", "Home practice", [["daily", "Daily short practice"], ["some", "A few times a week"], ["rare", "Rare so far"], ["none", "Need a plan"]])}
            </div>
            <button class="btn btn-primary" type="submit">Plan first groom</button>
          </form>
          <div class="tool-result" data-puppy-planner-result aria-live="polite">
            <h2>First groom plan</h2>
            <p>Choose the puppy details to see appointment goals, questions, and home prep steps.</p>
          </div>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Related guides</h2>${linkList(
            guideArticles.filter((article) => ["puppy-first-grooming-guide", "dog-grooming-appointment-checklist", "how-to-compare-dog-groomers-canada"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
          <div class="info-card"><h2>Puppy groomers</h2><p>Compare listings that mention puppy grooming signals.</p><a class="btn btn-light" href="/services/puppy-grooming/">Puppy grooming services</a></div>
        </aside>
      </div>
    </section>`;
}

function winterPawToolBody(context) {
  const checks = [
    ["salt", 2, "Walks include salted sidewalks, roads, parking lots, or condo paths"],
    ["ice", 2, "Ice balls collect between toes, paw pads, legs, belly, or feathering"],
    ["cracks", 3, "Pads look cracked, red, tender, bleeding, or the dog licks paws after walks"],
    ["nails", 2, "Nails are long enough to affect traction on ice or indoor floors"],
    ["boots", 1, "Boots or paw balm are not used when salt or cold is intense"],
    ["sweaters", 2, "Sweaters, coats, or harnesses rub armpits, chest, belly, or legs"],
    ["longcoat", 2, "Paw hair, leg feathering, or belly coat is long enough to trap slush"],
    ["senior", 2, "Dog is senior, small, short-coated, arthritic, or sensitive to cold"],
  ];
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Winter Paw Care Checklist" }])}
        <h1 class="city-title">Winter Paw Care Checklist for Dogs in Canada</h1>
        <p class="lead">Check salt, ice, nails, boot fit, cracked pads, and coat-friction risks before winter walks turn into grooming problems.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel checklist-tool" data-winter-paw-tool>
            ${checks
              .map(
                ([name, points, label]) =>
                  `<label class="check-option"><input type="checkbox" name="${escAttr(name)}" data-points="${points}"><span>${esc(label)}</span></label>`,
              )
              .join("")}
          </form>
          <div class="tool-result" data-winter-paw-result aria-live="polite">
            <h2>Winter paw risk score: 0</h2>
            <p>Check the items that apply. The result will update automatically.</p>
          </div>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Related guides</h2>${linkList(
            guideArticles.filter((article) => ["winter-dog-grooming-canada", "dog-nail-trimming-grinding-guide", "rainy-weather-dog-grooming"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
          <div class="info-card"><h2>Local help</h2><p>Look for nail trims, bath and brush appointments, paw tidy trims, and winter coat maintenance.</p><a class="btn btn-light" href="/dog-grooming-near-me/">Find grooming near me</a></div>
        </aside>
      </div>
    </section>`;
}

function mattingToolBody(context) {
  const checks = [
    ["curly", 3, "Curly, wool, doodle, poodle, bichon, Shih Tzu, Maltese, Havanese, or similar coat"],
    ["long", 2, "Coat is medium-long, fluffy, or kept longer than a practical pet trim"],
    ["missed", 3, "A metal comb does not glide to the skin after brushing"],
    ["moisture", 2, "Dog is often wet from snow, rain, swimming, daycare, or baths at home"],
    ["gear", 2, "Dog wears sweaters, coats, harnesses, boots, or collars for long periods"],
    ["friction", 2, "Tangles appear behind ears, armpits, chest, belly, legs, feet, or tail base"],
    ["season", 1, "Current season adds salt, mud, burrs, shedding, or wet leaves"],
    ["history", 3, "Dog has needed de-matting or a shave-down before"],
  ];
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Matting Risk Checklist" }])}
        <h1 class="city-title">Dog Matting Risk Checklist</h1>
        <p class="lead">Check common matting triggers before the coat becomes painful. This tool helps you decide when to brush more, book sooner, or ask a groomer for an assessment.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel checklist-tool" data-matting-tool>
            ${checks
              .map(
                ([name, points, label]) =>
                  `<label class="check-option"><input type="checkbox" name="${escAttr(name)}" data-points="${points}"><span>${esc(label)}</span></label>`,
              )
              .join("")}
          </form>
          <div class="tool-result" data-matting-result aria-live="polite">
            <h2>Risk score: 0</h2>
            <p>Check the items that apply to your dog. The result will update automatically.</p>
          </div>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Related guides</h2>${linkList(
            guideArticles.filter((article) => ["safe-dematting-dogs", "line-brushing-curly-coated-dogs", "doodle-dematting-haircut-guide", "winter-dog-grooming-canada"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
          <div class="info-card"><h2>Compare services</h2><p>Look for groomers that mention de-matting, haircuts, bath and brush, or breed-specific grooming.</p><a class="btn btn-light" href="/services/dematting/">De-matting services</a></div>
        </aside>
      </div>
    </section>`;
}

function callScriptToolBody(context) {
  const blocks = [
    { title: "Start the call", lines: ["Hi, I am looking for a grooming appointment for my dog. Can I ask a few questions before booking?", "My dog is a [breed or mix], about [weight], [age], with a [coat type] coat.", "The last groom was [date], and the main need is [bath, haircut, nails, de-shedding, de-matting, puppy intro, senior comfort groom]."] },
    { title: "Ask about fit", lines: ["Do you have recent experience with this coat type or breed?", "What would you recommend for the current coat length and condition?", "If you find mats, do you brush them out, clip shorter, or call before changing the plan?"] },
    { title: "Ask about quote and package", lines: ["What is included in the quoted package?", "What could change the price after you see the dog?", "Are nail grinding, teeth brushing, special shampoo, de-matting, or de-shedding separate add-ons?"] },
    { title: "Ask about safety and logistics", lines: ["How long does the appointment usually take?", "What are your vaccination, cancellation, late pickup, and new-client policies?", "How do you handle nervous dogs, puppies, senior dogs, or dogs that need breaks?"] },
  ];
  return `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Grooming Tools", url: "/grooming-tools/" }, { label: "Dog Groomer Call Script" }])}
        <h1 class="city-title">Dog Groomer Call Script</h1>
        <p class="lead">Use this script when calling a groomer so you can compare services, package scope, coat experience, quote clarity, and appointment policies.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap content-layout">
        <main>
          <form class="tool-panel" data-call-script-tool>
            <div class="grid-2">
              <label class="tool-field">Dog's name (optional)<input type="text" name="dogName" maxlength="40" autocomplete="off" placeholder="For example, Maple"></label>
              <label class="tool-field">Breed or mix (optional)<input type="text" name="breed" maxlength="80" autocomplete="off" placeholder="For example, Golden Retriever mix"></label>
              ${toolSelect("service", "Main appointment need", [["full", "Full groom or haircut"], ["bath", "Bath and brush"], ["deshed", "De-shedding"], ["nails", "Nails or paw care"], ["puppy", "Puppy introduction"], ["comfort", "Senior or comfort-focused groom"], ["unsure", "Not sure yet"]])}
              ${toolSelect("coat", "Coat type", [["short", "Short or smooth"], ["double", "Double coat"], ["curly", "Curly or wool"], ["long", "Long drop coat"], ["wire", "Wire or mixed"], ["unsure", "Not sure"]])}
              ${toolSelect("condition", "Current coat condition", [["maintained", "Maintained and combable"], ["overdue", "Overdue or extra long"], ["tangled", "Tangled in some areas"], ["matted", "Matted or packed coat"], ["skin", "Skin, ear, paw, or medical concern"], ["unsure", "Not sure"]])}
              ${toolSelect("comfort", "Handling comfort", [["comfortable", "Generally comfortable"], ["nervous", "Nervous or noise-sensitive"], ["touch", "Sensitive about paws, face, or body"], ["senior", "Senior or mobility needs"], ["puppy", "Puppy still learning"], ["unknown", "Unknown with a new groomer"]])}
              <label class="tool-field">Approximate weight (optional)<input type="text" name="weight" maxlength="30" autocomplete="off" placeholder="For example, 22 kg / 48 lb"></label>
              <label class="tool-field">Last groom (optional)<input type="text" name="lastGroom" maxlength="60" autocomplete="off" placeholder="For example, 8 weeks ago"></label>
            </div>
            <label class="tool-field">Anything the groomer should know? (optional)<textarea name="notes" maxlength="280" rows="4" placeholder="Mention health guidance, handling triggers, mat locations, preferred haircut, or timing needs."></textarea></label>
            <p class="muted tool-privacy-note">Your answers stay on this page unless you choose to copy or print the brief.</p>
            <button class="btn btn-primary" type="submit">Build my booking brief</button>
          </form>
          <div class="tool-result" data-call-script-result aria-live="polite" tabindex="-1">
            <h2>Your personalized booking brief</h2>
            <p>Add the details you know, then build a concise script, comparison questions, and appointment-preparation notes.</p>
          </div>
          <section class="section">
            <h2>Questions worth asking every groomer</h2>
            <p>Use the same core questions with each business so you can compare coat experience, package scope, price changes, comfort handling, and appointment policies fairly.</p>
            <div class="script-stack">${blocks
              .map((block) => `<section class="script-block"><h3>${esc(block.title)}</h3><ul class="check-list">${block.lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></section>`)
              .join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          <div class="info-card"><h2>Use with the directory</h2><p>Open a few local profiles, call realistic options, and compare answers in your notes.</p><a class="btn btn-light" href="/cities/">Browse city pages</a></div>
          <div class="info-card"><h2>Related guides</h2>${linkList(
            guideArticles.filter((article) => ["how-to-compare-dog-groomers-canada", "dog-grooming-cost-canada", "dog-grooming-appointment-checklist"].includes(article.slug)),
            guideArticleRoute,
            (article) => article.title,
            guideReadTime,
          )}</div>
        </aside>
      </div>
    </section>`;
}

function toolSelect(name, label, options) {
  return `<label class="tool-field">${esc(label)}<select name="${escAttr(name)}">${options.map(([value, optionLabel]) => `<option value="${escAttr(value)}">${esc(optionLabel)}</option>`).join("")}</select></label>`;
}

function cityServicePlannerSection(city, services) {
  const localServices = services.slice(0, 4);
  const cards = localServices.length
    ? localServices
        .map((service) => {
          const advice = serviceAdvice(service.slug);
          return `<div class="info-card">
            <h3>${esc(service.short)} in ${esc(city.city)}</h3>
            <p>${esc(advice.intro)}</p>
            <p><strong>${service.localCount.toLocaleString()} local listing signals.</strong></p>
            <a class="link-arrow" href="${localServiceSearchUrl(city, service)}">Compare ${esc(service.short.toLowerCase())} in ${esc(city.city)} -></a>
          </div>`;
        })
        .join("")
    : `<div class="info-card"><h3>Service confirmation</h3><p>Service data is limited for this city. Call shortlisted groomers to confirm bath, brush, haircut, nail, de-shedding, de-matting, puppy, senior, and mobile options.</p></div>
       <div class="info-card"><h3>Coat-first questions</h3><p>Describe your dog's breed, coat condition, age, size, behavior, and last groom date before asking for a quote.</p></div>
       <div class="info-card"><h3>Use nearby pages</h3><p>If the city has limited options, compare nearby city pages and mobile groomers that may serve the area.</p></div>`;
  return `<section class="section">
      <h2>Popular grooming needs in ${esc(city.city)}</h2>
      <p>Use these service signals to prepare better booking questions. A listing signal does not guarantee current availability, so confirm the exact package, price, timing, and coat requirements directly with the business.</p>
      <div class="grid-3">${cards}</div>
    </section>`;
}

function localServiceSearchUrl(city, service) {
  const params = new URLSearchParams({
    service: service.slug,
    where: `${city.city}, ${city.provinceCode}`,
    near: "1",
  });
  return `/search/?${params.toString()}#results`;
}

function serviceTopCities(service, context, limit = 24) {
  const cityMap = new Map(context.cities.map((city) => [city.url, city]));
  const counts = new Map();
  for (const listing of service.listings) {
    const city = cityMap.get(listing.cityUrl);
    if (!city || city.city === "Canada") continue;
    const existing = counts.get(city.url) || { ...city, serviceCount: 0 };
    existing.serviceCount += 1;
    counts.set(city.url, existing);
  }
  return [...counts.values()]
    .sort((a, b) => b.serviceCount - a.serviceCount || b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, limit);
}

function cityBookingQuestionsSection(city, services, province, costMap) {
  const costUrl = costGuideUrlForCity(city, province, costMap);
  const serviceQuestions = services.flatMap((service) => bookingQuestionsForService(service.slug));
  const questions = unique([
    `For a dog in ${city.city}, what is included in the base quote and what is an add-on?`,
    "Do you have recent experience with this breed, coat type, age, and temperament?",
    "What should I do before the appointment if the coat has tangles, salt, mud, burrs, or shedding undercoat?",
    "How long will the appointment take, and what pickup window should I plan for?",
    "Are you accepting new dogs, and how far ahead should I book during busy seasons?",
    ...serviceQuestions,
    ...seasonalBookingQuestions(city.provinceCode),
  ]).slice(0, 10);
  return `<section class="section">
      <div class="section-head">
        <div>
          <h2>Best questions to ask ${esc(city.city)} dog groomers</h2>
          <p>Use the same questions with each shortlisted groomer so you can compare package scope, coat experience, safety policies, and price fairly.</p>
        </div>
        <a class="link-arrow" href="${costUrl}">Check local cost guide -></a>
      </div>
      <div class="grid-3">
        <div class="info-card"><h3>Quote clarity</h3><p>Ask what is included, what costs extra, and what could change after the groomer sees the dog in person.</p></div>
        <div class="info-card"><h3>Coat and comfort</h3><p>Share breed or mix, size, coat length, matting, last groom date, health notes, and handling concerns before booking.</p></div>
        <div class="info-card"><h3>Local logistics</h3><p>Confirm drop-off, pickup, parking, mobile service area, cancellation policy, vaccination rules, and new-client availability.</p></div>
      </div>
      <ul class="check-list city-question-list">${questions.map((question) => `<li>${esc(question)}</li>`).join("")}</ul>
    </section>`;
}

function bookingQuestionsForService(slug) {
  const questions = {
    "dog-haircuts": [
      "Can you keep the coat at the requested length, or would matting make a shorter haircut safer?",
      "Are face, feet, sanitary trim, ears, nails, and finish work included in the haircut package?",
    ],
    "nail-trimming": [
      "Do you offer nail grinding as well as clipping, and is it priced separately?",
      "Can you work with dogs that are nervous about feet or have thick or dark nails?",
    ],
    "puppy-grooming": [
      "Do you offer short puppy intro appointments before a full adult groom?",
      "What age and vaccination timing do you recommend for a first grooming visit?",
    ],
    "bath-and-brush": [
      "Which shampoo and conditioner would you use for this coat and skin condition?",
      "Is blow drying included, and how do you handle anxious dogs around dryers?",
    ],
    deshedding: [
      "What de-shedding tools do you use, and how do you avoid damaging double coats?",
      "How much loose undercoat can realistically be removed in one appointment?",
    ],
    "mobile-dog-grooming": [
      "Is my address inside your mobile grooming route, and are travel fees or minimums added?",
      "What parking, power, water, weather, or driveway access do you need?",
    ],
    "teeth-cleaning": [
      "Is this teeth brushing, cosmetic cleaning, or a referral for veterinary dental care?",
      "What signs mean I should call a veterinarian instead of booking a grooming add-on?",
    ],
    dematting: [
      "At what point do you stop brushing out mats and recommend clipping shorter for comfort?",
      "Will you call before changing the haircut plan if you find tight or pelted mats?",
    ],
    "cat-grooming": [
      "Do you currently accept cats, and what handling, carrier, or vaccination rules apply?",
      "What happens if the cat is too stressed or too matted to finish safely?",
    ],
  };
  return questions[slug] || ["What is included in the package, and what coat conditions would require a consultation?"];
}

function seasonalBookingQuestions(provinceCode) {
  const code = String(provinceCode || "").toUpperCase();
  if (["BC", "NB", "NS", "NL", "PE"].includes(code)) {
    return ["How should I manage wet coat, salt, sand, mud, or coastal moisture between appointments?"];
  }
  if (["AB", "SK", "MB"].includes(code)) {
    return ["Should I book de-shedding before spring coat blow or winter coat buildup becomes packed?"];
  }
  if (["YT", "NT", "NU"].includes(code)) {
    return ["How far ahead should I book during extreme weather or limited appointment periods?"];
  }
  return ["How should I handle winter salt, spring mud, humid summers, ticks, and fall burrs between appointments?"];
}

function citySeasonalCareSection(city) {
  const care = regionalSeasonalCare(city.provinceCode);
  return `<section class="section">
      <h2>Seasonal dog grooming challenges in ${esc(city.city)}, ${esc(city.provinceCode)}</h2>
      <p>${esc(care.intro(city))}</p>
      <div class="grid-4 seasonal-grid">
        <div class="info-card"><h3>Winter</h3><p>${esc(care.winter)}</p><a class="link-arrow" href="/guides/winter-dog-grooming-canada/">Winter guide -></a></div>
        <div class="info-card"><h3>Spring</h3><p>${esc(care.spring)}</p><a class="link-arrow" href="/guides/spring-dog-shedding-mud-care/">Spring guide -></a></div>
        <div class="info-card"><h3>Summer</h3><p>${esc(care.summer)}</p><a class="link-arrow" href="/guides/summer-dog-grooming-canada/">Summer guide -></a></div>
        <div class="info-card"><h3>Fall</h3><p>${esc(care.fall)}</p><a class="link-arrow" href="/guides/fall-dog-coat-care-canada/">Fall guide -></a></div>
      </div>
    </section>`;
}

function regionalSeasonalCare(provinceCode) {
  const code = String(provinceCode || "").toUpperCase();
  const profiles = {
    coastal: {
      intro: (city) => `${city.city} owners should plan grooming around wet sidewalks, rain, mud, coastal dampness, and seasonal shedding. Moisture can tighten tangles and make skin checks more important.`,
      winter: "Rain, slush, and wet gear can mat belly, chest, and armpit coat. Dry dogs thoroughly after walks.",
      spring: "Mud and pollen build up around paws, legs, ears, and belly coat. Brush before baths if tangles are present.",
      summer: "Beach days, lakes, and hiking can add sand, burrs, ticks, and moisture. Dry ears and coat after swimming.",
      fall: "Wet leaves and burrs can cling to feathering, tails, and feet. Check coats after trail walks.",
    },
    prairie: {
      intro: (city) => `${city.city} grooming routines often need to account for dry winter air, road salt, wind, spring mud, and heavy seasonal shedding from double-coated breeds.`,
      winter: "Cold, dry air and salt can irritate paws. Sweaters and harnesses can create friction mats on longer coats.",
      spring: "Mud, melting snow, and coat blow season can pack undercoat and tangle feet, pants, and belly coat.",
      summer: "Heat, dust, lake trips, and ticks can change bath and brushing needs. Avoid overheated grooming sessions.",
      fall: "Coat transitions, burrs, and wet fields make undercoat checks and paw care useful before winter.",
    },
    central: {
      intro: (city) => `${city.city} dogs may face salt and freeze-thaw cycles in winter, muddy springs, humid summers, and fall burrs, so grooming needs can shift several times a year.`,
      winter: "Salt, ice balls, and damp sidewalks make paw rinsing, nail care, and sweater-friction checks important.",
      spring: "Mud and shedding can combine with longer winter coat. Brush before bathing and book de-shedding early.",
      summer: "Humidity, swimming, ticks, and hot pavement can affect skin, ears, paws, and appointment timing.",
      fall: "Rain, burrs, and coat transition season are good reasons to check legs, tail, ears, and undercoat more often.",
    },
    atlantic: {
      intro: (city) => `${city.city} grooming plans should consider wet coastal weather, salt air, mud, snow, and frequent coat dampness that can hide skin or matting issues.`,
      winter: "Wet snow, salt, and damp coat can irritate paws and tighten tangles if dogs are not dried after walks.",
      spring: "Mud season can affect paws, belly coat, and feathering. Keep comb checks frequent before baths.",
      summer: "Ocean, lake, and trail time can leave salt, sand, ticks, and moisture in the coat and ears.",
      fall: "Rain and burrs can collect in feathering and feet. A tidy trim can make cleanup easier.",
    },
    north: {
      intro: (city) => `${city.city} grooming routines may need extra planning around extreme cold, dry indoor air, heavy undercoat, snow, ice, and limited appointment availability.`,
      winter: "Extreme cold, snow, and dry indoor air make paw care, nail traction, and coat protection especially important.",
      spring: "Melting snow and shedding can create packed coat. Book ahead if local grooming availability is limited.",
      summer: "Short warm seasons can still bring heat, dust, insects, and lake water. Dry dense coats after swimming.",
      fall: "Prepare coats, paws, and nails before winter. Check undercoat and friction zones as weather changes.",
    },
  };
  if (code === "BC") return profiles.coastal;
  if (["AB", "SK", "MB"].includes(code)) return profiles.prairie;
  if (["ON", "QC"].includes(code)) return profiles.central;
  if (["NB", "NS", "NL", "PE"].includes(code)) return profiles.atlantic;
  if (["YT", "NT", "NU"].includes(code)) return profiles.north;
  return profiles.central;
}

function profileCorrectionSection(listing, correctionUrl, photoPermissionUrl) {
  return `<section class="section correction-panel">
      <h2>Help keep this listing accurate</h2>
      <p>Dog grooming business details can change quickly. If you own this business or spot outdated information, send the profile URL and the corrected phone number, website, address, hours, service notes, or business status. Business-specific photos are displayed only after permission or a reusable licence is documented.</p>
      <div class="tag-cloud">
        <a class="btn btn-primary" href="${escAttr(correctionUrl)}">Send a correction</a>
        <a class="btn btn-light" href="${escAttr(photoPermissionUrl)}">Submit authorized photos</a>
        <a class="btn btn-light" href="/editorial-policy/">Review our editorial policy</a>
      </div>
    </section>`;
}

function correctionMailto(listing) {
  const subject = encodeURIComponent(`Dog Groomers Canada correction: ${listing.title}`);
  const body = encodeURIComponent(
    [
      `Profile: ${absoluteUrl(listing.url)}`,
      `Business: ${listing.title}`,
      `City: ${listing.city}, ${listing.provinceCode}`,
      "",
      "Correction requested:",
      "",
      "Source or business website:",
    ].join("\n"),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function photoPermissionMailto(listing) {
  const subject = encodeURIComponent(`Authorized profile photos: ${listing.title}`);
  const body = encodeURIComponent(
    [
      `Profile: ${absoluteUrl(listing.url)}`,
      `Business: ${listing.title}`,
      `City: ${listing.city}, ${listing.provinceCode}`,
      "",
      "Please attach the original photo files to this email.",
      "Photo credit:",
      "Source or photographer:",
      "",
      "Permission statement:",
      "I confirm that I own these images or have permission from the rights holder, and I authorize Dog Groomers Canada to display them on this business profile and related directory cards.",
      "",
      "Name and relationship to the business:",
    ].join("\n"),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

function profileProvenanceLine(listing) {
  const items = ["Directory record"];
  if (listing.editorialReview) items.push(`Official source reviewed ${listing.editorialReview.reviewedAt}`);
  if (listing.businessSubmission) items.push(`${listing.businessSubmission.label} received ${listing.businessSubmission.receivedAt}`);
  if (hasDocumentedImageRights(listing)) items.push("Photo permission documented");
  return `<p class="profile-provenance" aria-label="Profile provenance">${items.map((item) => `<span>${esc(item)}</span>`).join("")}</p>`;
}

function editorialProfileReviewSection(listing) {
  const review = listing.editorialReview;
  if (!review) return "";
  const facts = review.facts
    .map(
      (fact) =>
        profileSignalRow(
          fact.label,
          `${esc(fact.value)} <a class="signal-source-link" href="${escAttr(fact.sourceUrl)}" target="_blank" rel="nofollow noopener">Official source</a>`,
        ),
    )
    .join("");
  return `<section class="section editorial-profile-review" data-editorial-profile-review>
      <h2>Official-source profile review</h2>
      <p>${esc(review.summary)}</p>
      <dl class="profile-signal-list">${facts}</dl>
      <p class="muted">Reviewed ${esc(review.reviewedAt)} against ${countLabel(review.sourcePages.length, "first-party source page")}. This is an editorial synthesis of the linked source material, not an endorsement.</p>
    </section>`;
}

function directoryMethodSection(context) {
  return `<section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>How Dog Groomers Canada adds value</h2>
            <p>The directory organizes public business details into city, service, and profile pages, then adds practical booking checks for pet owners.</p>
          </div>
          <a class="link-arrow" href="/editorial-policy/">Editorial policy -></a>
        </div>
        <div class="grid-3">
          <div class="info-card"><h3>Organized for decisions</h3><p>Listings are grouped by province, city, services mentioned, contact availability, ratings and review counts, and nearby alternatives so visitors can compare options quickly.</p></div>
          <div class="info-card"><h3>Practical owner guidance</h3><p>City, service, and profile pages include original reminders about coat type, appointment fit, de-matting, puppy handling, senior dogs, cancellation policies, and price confirmation.</p></div>
          <div class="info-card"><h3>Corrections welcome</h3><p>Because business details change, every page links to update and contact options. Groomers can request corrections for names, websites, phone numbers, hours, services, and city placement.</p></div>
        </div>
        <p class="muted" style="margin-top:16px">Current directory snapshot: ${context.stats.listings.toLocaleString()} listings, ${context.stats.cities.toLocaleString()} city pages, ${context.stats.withPhones.toLocaleString()} listings with phone numbers, and ${context.stats.withWebsites.toLocaleString()} listings with websites.</p>
      </div>
    </section>`;
}

function cityQualitySection(city, services, nearby) {
  const withPhones = city.listings.filter((item) => item.phone).length;
  const withWebsites = city.listings.filter((item) => item.website).length;
  const withHours = city.listings.filter((item) => item.hours.length).length;
  const serviceText = services.length ? services.slice(0, 5).map((service) => service.short).join(", ") : "bath, brush, haircut, nail trim, and coat-care";
  const nearbyText = nearby.length ? nearby.slice(0, 3).map((item) => `${item.city}, ${item.provinceCode}`).join("; ") : `${city.province} cities nearby`;
  return `<section class="section" data-city-compare-guide>
      <h2>What to compare in ${esc(city.city)}</h2>
      <p>Use this local page as a shortlist, then confirm the details that matter for your dog before booking. When comparing options, look for clear contact details, meaningful review volume, relevant coat-care experience, and appointment availability that fits your needs.</p>
      <div class="grid-3">
        <div class="info-card"><h3>Contact coverage</h3><p>Phone number listed: ${withPhones.toLocaleString()} of ${city.count.toLocaleString()}. Website listed: ${withWebsites.toLocaleString()} of ${city.count.toLocaleString()}.</p></div>
        <div class="info-card"><h3>Services mentioned</h3><p>Services mentioned on this page include ${esc(serviceText)}. Ask the groomer what is included, what costs extra, and whether your dog's coat needs a consultation.</p></div>
        <div class="info-card"><h3>Hours and nearby options</h3><p>${countLabel(withHours, "listing")} ${withHours === 1 ? "includes" : "include"} hours in the source data. Nearby pages to compare include ${esc(nearbyText)}.</p></div>
      </div>
    </section>`;
}

function listingSpecificSignalsSection(listing) {
  const rows = [];
  const profileServices = listingProfileServices(listing);
  const listedFocus = profileServices.length
    ? `${listing.category || "Pet groomer"}; services named include ${joinWithAnd(profileServices.slice(0, 6))}.`
    : `${listing.category || "Pet groomer"}; the source did not include a complete service menu.`;
  rows.push(profileSignalRow("Listed focus", esc(listedFocus)));

  const reputation = listing.rating
    ? `${listing.rating.toFixed(1)} stars${listing.reviews ? ` from ${countLabel(listing.reviews, "review")}` : ""} in the public listing snapshot.`
    : "No public rating was included in the source snapshot.";
  rows.push(profileSignalRow("Reputation", esc(reputation)));

  const contactSignals = listingContactSignals(listing);
  rows.push(profileSignalRow(
    "Contact paths",
    esc(contactSignals.length ? `${joinWithAnd(contactSignals)} are included on this profile.` : "No direct contact path was included in the source snapshot."),
  ));

  if (listing.websiteServices && listing.websiteServices.length) {
    rows.push(profileSignalRow("Website services", esc(joinWithAnd(listing.websiteServices.slice(0, 8)))));
  }
  if (listing.websiteConvenience && listing.websiteConvenience.length) {
    rows.push(profileSignalRow("Website access", esc(joinWithAnd(listing.websiteConvenience.slice(0, 5)))));
  }
  if (listing.websiteCredentials && listing.websiteCredentials.length) {
    rows.push(profileSignalRow("Website policies", esc(joinWithAnd(listing.websiteCredentials.slice(0, 5)))));
  }
  if (listing.websiteBreedExperience && listing.websiteBreedExperience.length) {
    rows.push(profileSignalRow("Breed and coat mentions", `${esc(joinWithAnd(listing.websiteBreedExperience.slice(0, 6)))} <span class="signal-qualifier">mentioned on the business website</span>`));
  }
  if (listing.websitePricingAvailable) {
    const pricingSignal = listing.websiteCrawlStatus === "owner_provided" && listing.offer
      ? "The owner-provided offer includes pricing or discount information. Confirm eligibility, current rates, and package scope directly."
      : "The business website crawl found published grooming price information. Confirm current rates and package scope directly.";
    rows.push(profileSignalRow("Pricing signal", pricingSignal));
  }

  const bookingLink = preferredBookingLink(listing);
  if (bookingLink) {
    rows.push(profileSignalRow(
      "Appointments",
      `<a href="${escAttr(bookingLink.url)}" target="_blank" rel="nofollow noopener">${esc(bookingLink.name)}</a> <span class="signal-qualifier">link included in the source listing</span>`,
    ));
  }
  if (listing.accessibility && listing.accessibility.length) {
    rows.push(profileSignalRow("Accessibility", esc(joinWithAnd(listing.accessibility))));
  }
  if (listing.amenities && listing.amenities.length) {
    rows.push(profileSignalRow("Amenities", esc(joinWithAnd(listing.amenities))));
  }
  if (listing.ownerUpdateCount) {
    rows.push(profileSignalRow("Business updates", `${esc(countLabel(listing.ownerUpdateCount, "owner update"))} appeared in the public listing snapshot.`));
  }
  if (listing.businessSubmission) {
    rows.push(profileSignalRow(
      "Business-submitted details",
      `${esc(listing.businessSubmission.source)}. Received ${esc(listing.businessSubmission.receivedAt)}; this label records provenance and does not imply paid placement or third-party certification.`,
    ));
  }
  if (listing.websiteLocation) {
    rows.push(profileSignalRow(
      "Website location",
      `${esc(listing.websiteLocation)} <span class="signal-qualifier">from structured data on the business website; confirm it matches the current service location</span>`,
    ));
  }

  const snapshot = profileSnapshotLabel(listing.scrapedAt);
  const sourceLabel = listing.businessSubmission || listing.websiteCrawlStatus === "owner_provided"
    ? "Business-submitted profile details"
    : "Public listing details";
  const sourceDate = snapshot ? ` gathered in ${snapshot}` : "";
  const hasSupplementalWebsiteEnrichment = ["official_website_enriched", "editorially_reviewed"].includes(listing.websiteCrawlStatus);
  const hasThinWebsiteEnrichment = listing.websiteCrawlStatus === "official_website_enriched";
  const websiteResearchDate = profileSnapshotLabel(listing.websiteEnrichedAt);
  const websitePageCount = listing.websiteResearchPages && listing.websiteResearchPages.length;
  const websiteSource = hasSupplementalWebsiteEnrichment && listing.websiteCrawlSource
    ? ` Website findings came from <a href="${escAttr(listing.websiteCrawlSource)}" target="_blank" rel="nofollow noopener">the official business website</a>${websitePageCount ? ` and ${countLabel(websitePageCount, "relevant page")} were reviewed` : ""}${websiteResearchDate ? ` in ${websiteResearchDate}` : ""}.`
    : listing.websiteCrawlStatus === "website_crawled" && listing.websiteCrawlSource
      ? ` Website findings came from <a href="${escAttr(listing.websiteCrawlSource)}" target="_blank" rel="nofollow noopener">the business website page crawled for this profile</a>.`
      : "";
  rows.push(profileSignalRow("Source timing", `${esc(sourceLabel)}${esc(sourceDate)}.${websiteSource}`));

  return `<section class="section profile-signals" data-profile-signals${hasThinWebsiteEnrichment ? " data-official-website-enrichment" : ""}>
      <h2>Business-specific signals</h2>
      <p>These details separate core profile data from findings on a business website when website evidence is available. They support comparison, but they are not an endorsement or a guarantee that every detail is still current.</p>
      <dl class="profile-signal-list">${rows.join("")}</dl>
    </section>`;
}

function profileSignalRow(label, value) {
  return `<div class="profile-signal-row"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
}

function listingReviewThemesSection(listing) {
  if (!listing.reviewThemes || !listing.reviewThemes.length) return "";
  const currentReviews = listing.mapsUrl
    ? ` <a href="${escAttr(listing.mapsUrl)}" target="_blank" rel="nofollow noopener">Check the current source listing</a> before booking.`
    : " Check current reviews before booking.";
  return `<section class="section review-theme-summary">
      <h2>What customers commonly mention</h2>
      <p>Among ${listing.reviewCommentCount.toLocaleString()} written comments included in the public listing snapshot, recurring discussion topics include ${esc(joinWithAnd(listing.reviewThemes))}.</p>
      <p class="muted">This is a neutral paraphrase of recurring customer opinions, not a quote, endorsement, or independent verification.${currentReviews}</p>
    </section>`;
}

function listingGuidanceSection(listing, related, correctionUrl) {
  if (isLimitedInformationListing(listing)) return limitedListingGuidanceSection(listing, related, correctionUrl);
  const profileServices = listingProfileServices(listing);
  const serviceText = profileServices.length ? profileServices.slice(0, 5).join(", ") : "bath, haircut, nail trim, de-shedding, de-matting, and puppy grooming";
  return `<section class="section">
      <h2>Before you contact ${esc(listing.title)}</h2>
      <p>This profile is a starting point for comparing ${esc(listing.city)} grooming options. Confirm current availability, exact services, pricing, vaccination requirements, appointment length, and whether the groomer has recent experience with your dog's coat and temperament.</p>
      <div class="grid-3">
        <div class="info-card"><h3>Services to confirm</h3><p>Confirm whether these services are currently offered: ${esc(serviceText)}. Also ask whether breed-specific trims, senior dogs, anxious dogs, or heavy matting require a consultation.</p></div>
        <div class="info-card"><h3>Booking details</h3><p>Check drop-off timing, pickup windows, cancellation policy, quote ranges, payment methods, and whether the business is accepting new clients.</p></div>
        <div class="info-card"><h3>Listing accuracy</h3><p>Directory details can change. Use the phone, website, and map links above when available, and send corrections if a detail is outdated.</p></div>
      </div>
    </section>`;
}

function limitedListingGuidanceSection(listing, related, correctionUrl) {
  const services = substantiveProfileServices(listing);
  const available = [
    `${listing.city}, ${listing.provinceCode} location`,
    listing.address ? "a listed street address" : "",
    listing.phone ? "a phone number" : "",
    listing.website ? "a business website" : "",
    listing.rating ? `${listing.rating.toFixed(1)} stars${listing.reviews ? ` from ${countLabel(listing.reviews, "review")}` : ""}` : "",
    services.length ? `named services including ${joinWithAnd(services.slice(0, 4))}` : "",
    listing.hours.length ? "listed hours" : "",
    preferredBookingLink(listing) ? "an appointment link" : "",
  ].filter(Boolean);
  const missing = [
    services.length ? "" : "a detailed current service menu",
    listing.hours.length ? "" : "current hours or appointment schedule",
    preferredBookingLink(listing) ? "" : "the preferred booking method and new-client availability",
    listing.websitePricingAvailable ? "" : "current package scope and pricing",
    listing.reviewThemes && listing.reviewThemes.length ? "" : "enough written feedback to summarize recurring customer themes",
    listing.website ? "" : "a first-party website or policy page",
  ].filter(Boolean);
  const nextCheck = !services.length
    ? `Describe your dog's breed, size, coat condition, temperament, and requested finish when contacting ${listing.title}; ask what is included before accepting a quote.`
    : !listing.hours.length
      ? `Confirm that ${listing.title} is accepting new clients and ask for its current appointment schedule before planning a visit.`
      : !listing.reviewThemes.length
        ? `Ask for recent examples involving a coat or temperament similar to your dog's, then confirm handling, pickup timing, and price scope.`
        : `Confirm the service package, current price, timing, and policies directly before booking.`;
  const sameProvinceComparisons = related.filter((item) => item.provinceCode === listing.provinceCode && item.provinceSlug !== "canada");
  const comparisons = (sameProvinceComparisons.length ? sameProvinceComparisons : related).slice(0, 3);
  const comparisonLinks = comparisons.length
    ? `${comparisons.map((item) => `<a href="${escAttr(item.url)}">${esc(item.title)}</a>`).join(", ")}, and the <a href="${escAttr(listing.cityUrl)}">${esc(listing.city)} directory</a>.`
    : `the <a href="${escAttr(listing.cityUrl)}">${esc(listing.city)} directory</a> for other profiles with stronger source coverage.`;

  return `<section class="section limited-profile-context" data-limited-profile-context data-information-depth="${listingInformationDepth(listing)}">
      <h2>What this profile can and cannot confirm</h2>
      <p>The available public evidence for ${esc(listing.title)} is limited. That is not a judgment about service quality; it means fewer business-specific details were available to independently summarize.</p>
      <dl class="profile-signal-list limited-profile-list">
        ${profileSignalRow("Included in the snapshot", esc(joinWithAnd(available.slice(0, 7))))}
        ${profileSignalRow("Still to confirm", esc(joinWithAnd(missing.slice(0, 5))))}
        ${profileSignalRow("Best next check", esc(nextCheck))}
        ${profileSignalRow("Compare locally", comparisonLinks)}
      </dl>
      <p class="muted">Business owner or customer with a reliable correction? <a href="${escAttr(correctionUrl)}">Send updated services, hours, booking details, or other source information</a>.</p>
    </section>`;
}

function listingInformationDepth(listing) {
  let depth = 0;
  if (substantiveProfileServices(listing).length) depth += 2;
  if (listingWebsiteEvidence(listing).length) depth += 2;
  if (listing.reviewThemes && listing.reviewThemes.length) depth += 2;
  if (listing.hours && listing.hours.length) depth += 1;
  if (preferredBookingLink(listing)) depth += 1;
  if (listing.ownerUpdateCount) depth += 1;
  if (listing.reviews) depth += 1;
  if (listing.descriptionIsCustom) depth += 2;
  if (listing.offer) depth += 1;
  if (listing.editorialReview) depth += 4;
  if (listing.businessSubmission) depth += 2;
  if (hasDocumentedImageRights(listing)) depth += 1;
  return depth;
}

function shouldIndexListing(listing) {
  return Boolean(
    listing.keepIndexed ||
      listing.editorialReview ||
      listing.businessSubmission ||
      hasDocumentedImageRights(listing) ||
      listingInformationDepth(listing) > 1
  );
}

function isLimitedInformationListing(listing) {
  return listingInformationDepth(listing) <= 3;
}

function substantiveProfileServices(listing) {
  return listingProfileServices(listing).filter(
    (item) => !/^(?:dog grooming|pet grooming|cat grooming|grooming|groomer|pet groomer|dog groomer|cat groomer|general dog grooming)$/i.test(clean(item)),
  );
}

function profileCostAndQuoteSection(listing, city, province, costMap) {
  const costUrl = costGuideUrlForCity(city, province, costMap);
  const profileServices = listingProfileServices(listing);
  const serviceText = profileServices.length ? profileServices.slice(0, 4).join(", ") : "the grooming services you need";
  const ratingText = listing.rating
    ? `${listing.rating.toFixed(1)} stars${listing.reviews ? ` from ${countLabel(listing.reviews, "review")}` : ""}`
    : "rating not listed in the source data";
  const contactText = [
    listing.phone ? "phone number" : "",
    listing.website ? "website" : "",
    listing.hours.length ? "listed hours" : "",
    listing.mapsUrl ? "map link" : "",
  ].filter(Boolean);
  return `<section class="section">
      <h2>Cost and quote notes for ${esc(listing.title)}</h2>
      <p>Use this profile to prepare a specific quote request instead of asking for a vague grooming price. Share your dog's size, coat type, coat condition, last groom date, temperament, and the finish you want.</p>
      <div class="grid-3">
        <div class="info-card"><h3>Profile signals</h3><p>This listing shows ${esc(ratingText)} in ${esc(listing.city)}, ${esc(listing.provinceCode)}. Service signals include ${esc(serviceText)}.</p></div>
        <div class="info-card"><h3>Contact completeness</h3><p>${contactText.length ? `Available follow-up signals include ${esc(joinWithAnd(contactText))}.` : "Public contact signals are limited, so confirm details from another trusted source if needed."} Directory details can change.</p></div>
        <div class="info-card"><h3>Local cost context</h3><p>Review local planning ranges before calling so you can compare package scope, add-ons, and coat-condition fees fairly.</p><a class="link-arrow" href="${costUrl}">Open cost guide -></a></div>
      </div>
    </section>`;
}

function profileQuestionsSection(listing) {
  const serviceSlugs = listingServiceSlugs(listing);
  const serviceQuestions = serviceSlugs.flatMap(bookingQuestionsForService);
  const questions = unique([
    `Are you currently accepting new dogs in ${listing.city}, and how soon is your next full-groom appointment?`,
    `For my dog's size and coat, what is included in the quote from ${listing.title}?`,
    "What add-ons or coat conditions could change the price after you see the dog?",
    "How do you handle anxious dogs, senior dogs, puppies, or dogs that need breaks?",
    ...serviceQuestions,
    ...seasonalBookingQuestions(listing.provinceCode),
    "What should I bring or avoid before drop-off, and when should I expect pickup?",
  ]).slice(0, 9);
  return `<section class="section">
      <h2>Questions worth asking this groomer</h2>
      <p>These questions are customized from the profile's location and service signals. They help you compare comfort, safety, price scope, and coat fit before booking.</p>
      <ul class="check-list profile-question-list">${questions.map((question) => `<li>${esc(question)}</li>`).join("")}</ul>
    </section>`;
}

function listingServiceSlugs(listing) {
  const matches = matchedServiceSlugs(listing);
  return matches.length ? matches.slice(0, 4) : ["dog-haircuts", "bath-and-brush", "nail-trimming"];
}

function matchedServiceSlugs(listing) {
  return serviceDefinitions
    .filter((service) => {
      if (service.slug === "mobile-dog-grooming") return hasMobileGroomingSignal(listing);
      return service.patterns.some((pattern) => pattern.test(serviceMatchText(listing, service.slug)));
    })
    .map((service) => service.slug);
}

function hasMobileGroomingSignal(listing) {
  const title = `${listing.title || ""}`.trim();
  const category = `${listing.category || ""}`.trim();
  const serviceText = `${listing.serviceText || ""} ${listing.websiteServiceText || ""}`;
  const website = `${listing.website || ""}`.trim();
  const serviceContext = `${title} ${category} ${serviceText}`;

  if (negativeMobileSignal(title)) return false;
  if (titleHasMobileGroomingSignal(title, serviceContext)) return true;
  if (explicitMobileGroomingText(serviceText)) return true;
  return mobileGroomingUrl(website) && /\b(groom|salon|spa|spaw|pet|dog|cat|pooch|paw|fur|toilettage)\b/i.test(serviceContext);
}

function negativeMobileSignal(text) {
  return /\b(not|no|non)\s+(a\s+)?mobile\b|nous\s+ne\s+sommes\s+pas\s+le\s+mobile|not\s+the\s+mobile|not\s+mobile/i.test(text);
}

function titleHasMobileGroomingSignal(title, serviceContext) {
  const groomingTerms = "groom|groomer|grooming|salon|spa|spaw|wash|clip|clippers|pawdicure|pedicure|nail|toilettage|pooch|parlour|parlor";
  const mobileAndGrooming = new RegExp(`\\bmobile\\b.*\\b(${groomingTerms})\\b|\\b(${groomingTerms})\\b.*\\bmobile\\b`, "i");
  if (mobileAndGrooming.test(title)) return true;
  if (/\bmobile\s+(dog|pet|cat)\s+services?\b/i.test(title)) {
    return /\b(groom|groomer|grooming|salon|spa|spaw|nail|pawdicure|pedicure|toilettage)\b/i.test(serviceContext);
  }
  return false;
}

function explicitMobileGroomingText(text) {
  return /\b(mobile\s+(dog|pet|cat)?\s*(groom|groomer|grooming|salon|spa|spaw|wash|clip|styling|nail|pawdicure|pedicure)|mobile\s+grooming|grooming\s+(van|trailer)|hydrobath\s+van|in[-\s]?home\s+(dog|pet|cat)?\s*groom|at[-\s]?home\s+(dog|pet|cat)?\s*groom|house[-\s]?call\s+(dog|pet|cat)?\s*groom|dog\s+grooming\s+at\s+home|pet\s+grooming\s+at\s+home)\b/i.test(text);
}

function mobileGroomingUrl(website) {
  return /\b(mobilegroom|mobile-groom|mobilepet|mobile-pet|mobiledog|mobile-dog|mobilecat|mobile-cat)\b/i.test(website);
}

function serviceMatchText(listing, serviceSlug) {
  const explicitServices = listing.services.join(" ");
  if (serviceSlug === "mobile-dog-grooming") {
    return `${explicitServices} ${listing.serviceText || ""} ${listing.websiteServiceText || ""} ${listing.title} ${listing.category}`;
  }
  if (serviceSlug === "cat-grooming") {
    return `${explicitServices} ${listing.title} ${listing.category}`;
  }
  if (serviceSlug === "bath-and-brush") {
    return explicitServices.replace(/\b(teeth|tooth|dental)\s+brushing\b/gi, "");
  }
  return explicitServices;
}

function serviceGuidanceSection(service) {
  const advice = serviceAdvice(service.slug);
  return `<section class="section">
      <h2>How to compare ${esc(service.name.toLowerCase())}</h2>
      <p>${esc(advice.intro)}</p>
      <div class="grid-3">${advice.cards
        .map((card) => `<div class="info-card"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></div>`)
        .join("")}</div>
    </section>`;
}

function serviceAdvice(slug) {
  const common = {
    intro: "Use the service listings as a shortlist, then call the business to confirm what is included, how pricing works, and whether your dog's coat or temperament needs extra time.",
    cards: [
      { title: "Package scope", body: "Ask what is included, what is an add-on, and whether the groomer recommends a full groom, tidy-up, or maintenance visit." },
      { title: "Dog fit", body: "Mention coat type, age, size, temperament, health notes, and past grooming issues before booking." },
      { title: "Practical details", body: "Confirm appointment length, arrival instructions, cancellation policy, current pricing, and pickup timing." },
    ],
  };
  const bySlug = {
    "dog-haircuts": {
      intro: "Haircut and styling quality depends on coat type, matting, breed expectations, and how much length you want to keep.",
      cards: [
        { title: "Bring reference notes", body: "Describe the trim you want, areas to keep longer, sanitary trim needs, and whether breed-standard styling matters." },
        { title: "Discuss coat condition", body: "Mats, double coats, and pelted areas can change what is possible without discomfort." },
        { title: "Ask about finish work", body: "Confirm face, feet, tail, ears, nail trim, bath, blow dry, and any hand-scissoring add-ons." },
      ],
    },
    "nail-trimming": {
      intro: "Nail appointments are quick, but they still depend on the dog's comfort level, nail length, and whether grinding is available.",
      cards: [
        { title: "Trim or grind", body: "Ask whether the business clips, grinds, or offers both, especially for thick or dark nails." },
        { title: "Handling needs", body: "Mention fear, sensitivity, past quicking, senior mobility, or whether two handlers may be needed." },
        { title: "Walk-in rules", body: "Confirm whether nail trims need an appointment, proof of vaccination, or a bundled grooming package." },
      ],
    },
    "puppy-grooming": {
      intro: "Puppy grooming is about building comfort as much as getting clean, so short, gentle appointments matter.",
      cards: [
        { title: "First-groom plan", body: "Ask whether the appointment focuses on bath, brush, nails, face tidy, and positive handling instead of a long full groom." },
        { title: "Vaccination timing", body: "Confirm age requirements, vaccine expectations, and whether the puppy should visit before the adult coat changes." },
        { title: "At-home prep", body: "Ask what brushing, paw handling, and sound exposure will make future visits easier." },
      ],
    },
    "bath-and-brush": {
      intro: "Bath and brush visits can maintain skin and coat health between full grooms when the package matches the dog's coat.",
      cards: [
        { title: "Coat-specific shampoo", body: "Ask about sensitive skin, shedding, odor, allergies, and whether conditioner or medicated products are appropriate." },
        { title: "Drying method", body: "Confirm how the dog will be dried, especially for anxious dogs, seniors, puppies, or heavy-coated breeds." },
        { title: "Maintenance schedule", body: "Ask how often your dog should return based on shedding, lifestyle, coat length, and brushing at home." },
      ],
    },
    deshedding: {
      intro: "De-shedding works best when the groomer understands undercoat, skin sensitivity, and seasonal coat changes.",
      cards: [
        { title: "Undercoat approach", body: "Ask what tools are used and whether the groomer avoids coat damage on double-coated breeds." },
        { title: "Realistic results", body: "Confirm that de-shedding reduces loose coat but does not stop natural shedding." },
        { title: "Home care", body: "Ask what brushing tools and schedule can maintain the result between visits." },
      ],
    },
    "mobile-dog-grooming": {
      intro: "Mobile grooming is convenient, but availability, parking, water, power, dog size, and service area can affect fit.",
      cards: [
        { title: "Service radius", body: "Confirm that your address is inside the groomer's route and ask about travel fees." },
        { title: "Setup needs", body: "Ask about driveway access, parking space, power or water requirements, and weather limitations." },
        { title: "Dog comfort", body: "Mobile grooming can suit anxious dogs, but confirm noise level, crate use, and owner presence rules." },
      ],
    },
    "teeth-cleaning": {
      intro: "Non-veterinary teeth brushing or cosmetic cleaning is not a substitute for veterinary dental care.",
      cards: [
        { title: "Scope of service", body: "Ask whether the service is brushing, breath care, cosmetic cleaning, or a referral to a veterinarian." },
        { title: "Health concerns", body: "If gums bleed, teeth are loose, or pain is present, contact a veterinarian before grooming add-ons." },
        { title: "Maintenance", body: "Confirm how often brushing is recommended and what at-home products are safe for dogs." },
      ],
    },
    dematting: {
      intro: "De-matting can be uncomfortable if a coat is tight, so safety and comfort should lead the decision.",
      cards: [
        { title: "Comfort first", body: "Ask when shaving is safer than brushing out mats and whether severe matting requires multiple visits." },
        { title: "Skin checks", body: "Mats can hide irritation or sores, so confirm how the groomer handles sensitive areas." },
        { title: "Prevention plan", body: "Ask what brush, comb, and schedule will prevent the same matting from returning." },
      ],
    },
    "cat-grooming": {
      intro: "Cat grooming needs different handling, timing, and safety expectations than dog grooming.",
      cards: [
        { title: "Cat experience", body: "Ask how often the groomer works with cats and whether they handle senior or nervous cats." },
        { title: "Safety limits", body: "Confirm matting, sedation, vaccination, carrier, and temperament requirements before booking." },
        { title: "Service scope", body: "Clarify whether the visit includes brushing, sanitary trims, nail trims, lion cuts, or bath services." },
      ],
    },
  };
  return bySlug[slug] || common;
}

function detailRow(label, value) {
  return `<div class="detail-row"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
}

function listingOfferSection(listing) {
  if (!listing.offer) return "";
  const source = listing.offer.sourceUrl
    ? `<p class="offer-source"><a href="${escAttr(listing.offer.sourceUrl)}" target="_blank" rel="nofollow noopener">Confirm offer with the business</a></p>`
    : "";
  return `<section class="section profile-offer" aria-label="${escAttr(listing.offer.label)}">
    <p class="offer-label">${esc(listing.offer.label)}</p>
    <h2>${esc(listing.offer.title)}</h2>
    <p>${esc(listing.offer.description)}</p>
    ${source}
  </section>`;
}

function homeMetaDescription(context) {
  return metaDescription(
    `Find dog grooming near you in Canada and read original grooming guides for coat care, seasonal care, breed needs, costs, services, ratings, phone, website, and maps.`,
  );
}

function cityIndexMetaDescription(context) {
  return metaDescription(
    `Dog grooming near me by city: browse ${context.cities.length.toLocaleString()} Canadian city pages with dog groomers, ratings, services, phone numbers, websites, and maps.`,
  );
}

function provinceMetaDescription(province) {
  return metaDescription(
    `Dog grooming in ${province.name}: browse ${province.count.toLocaleString()} dog groomers across ${province.cities.length.toLocaleString()} cities by rating, service, phone, website, hours, and map.`,
  );
}

function cityMetaDescription(city) {
  return metaDescription(
    `Dog grooming in ${city.city}, ${city.provinceCode}: compare ${city.count.toLocaleString()} dog groomers near you by rating, service, phone, website, hours, map, and profile.`,
  );
}

function listingMetaDescription(listing) {
  const pieces = [`${shortText(listing.title, 54)} dog grooming in ${listing.city}, ${listing.provinceCode}`];
  if (listing.rating && listing.reviews) pieces.push(`${listing.rating.toFixed(1)} stars from ${countLabel(listing.reviews, "review")}`);
  if (listing.offer) pieces.push(listing.offer.title);
  if (listing.services.length) pieces.push(listing.services.slice(0, 2).join(" and "));
  const street = clean(listing.street || listing.address.split(",")[0]);
  if (street && street.length < 50) pieces.push(street);
  pieces.push("phone, website, hours, map, and nearby groomers");
  return metaDescription(`${pieces.join(". ")}.`);
}

function serviceMetaDescription(service) {
  return metaDescription(
    `${service.name} in Canada: compare ${service.count.toLocaleString()} dog grooming listings with ratings, phone numbers, websites, services, city pages, and profiles.`,
  );
}

function nearMeMetaDescription() {
  return metaDescription(
    "Dog grooming near me: use your location to compare nearby dog groomers, or browse Canadian city pages by rating, service, phone, website, hours, and map.",
  );
}

function mobileGroomingNearMeMetaDescription(service) {
  return metaDescription(
    `Mobile dog grooming near me: use your location to compare ${service.count.toLocaleString()} explicit mobile, in-home, house-call, and mobile nail-care grooming matches across Canada.`,
  );
}

function metaDescription(value, maxLength = 156) {
  const cleanValue = clean(String(value || ""));
  if (cleanValue.length <= maxLength) return cleanValue;
  const clipped = cleanValue.slice(0, maxLength + 1);
  const sentence = clipped.lastIndexOf(".");
  if (sentence >= 95) return cleanValue.slice(0, sentence + 1);
  const space = clipped.lastIndexOf(" ");
  return `${cleanValue.slice(0, space > 90 ? space : maxLength).replace(/[,\s.;:]+$/, "")}.`;
}

function shortText(value, maxLength) {
  const text = clean(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1);
  const space = clipped.lastIndexOf(" ");
  return `${text.slice(0, space > 25 ? space : maxLength).replace(/[,\s.;:]+$/, "")}`;
}

function nearbyCities(city, cities) {
  if (!Number.isFinite(city.lat) || !Number.isFinite(city.lng)) {
    return cities.filter((item) => item.provinceSlug === city.provinceSlug && item.url !== city.url).slice(0, 10);
  }
  return cities
    .filter((item) => item.url !== city.url && Number.isFinite(item.lat) && Number.isFinite(item.lng))
    .map((item) => ({ ...item, distance: haversineKm(city, item) }))
    .sort((a, b) => a.distance - b.distance);
}

function relatedListings(listing, listings) {
  const sameCity = listings.filter((item) => item.url !== listing.url && item.provinceSlug === listing.provinceSlug && item.citySlug === listing.citySlug);
  if (sameCity.length >= 6) return sameCity.sort(sortListings);
  const nearby = listings
    .filter((item) => item.url !== listing.url && Number.isFinite(item.lat) && Number.isFinite(item.lng) && Number.isFinite(listing.lat) && Number.isFinite(listing.lng))
    .map((item) => ({ ...item, distance: haversineKm(listing, item) }))
    .sort((a, b) => a.distance - b.distance);
  return uniqueBy([...sameCity.sort(sortListings), ...nearby], (item) => item.url);
}

function cityServices(listings, services) {
  return services
    .map((service) => ({
      ...service,
      localCount: listings.filter((listing) => matchedServiceSlugs(listing).includes(service.slug)).length,
    }))
    .filter((service) => service.localCount > 0)
    .sort((a, b) => b.localCount - a.localCount);
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Dog Groomers Canada",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}${LOGO_PATH}`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}${OG_IMAGE_PATH}`,
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
      contactType: "customer support",
      areaServed: "CA",
      availableLanguage: ["English"],
    },
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.url ? absoluteUrl(item.url) : undefined,
    })),
  };
}

function itemListSchema(name, listings) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: listings.length,
    itemListElement: listings.map((listing, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(listing.url),
      name: listing.title,
    })),
  };
}

function localBusinessSchema(listing) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.title,
    url: absoluteUrl(listing.url),
    description: listing.description,
    telephone: listing.phone || undefined,
    email: listing.email || undefined,
    image: listing.photos.length ? listing.photos.map(absoluteUrl) : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.street || listing.address,
      addressLocality: listing.city,
      addressRegion: listing.provinceCode,
      postalCode: listing.postalCode || undefined,
      addressCountry: "CA",
    },
    geo:
      Number.isFinite(listing.lat) && Number.isFinite(listing.lng)
        ? {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          }
        : undefined,
    openingHours: listing.hours.length ? listing.hours.map((item) => `${item.day} ${item.hours}`) : undefined,
    sameAs: listing.website ? [listing.website] : undefined,
    makesOffer: listing.offer
      ? {
          "@type": "Offer",
          name: listing.offer.title,
          description: listing.offer.description,
          url: listing.offer.sourceUrl || listing.website || undefined,
        }
      : undefined,
  };
  return prune(schema);
}

function faqSchema(city) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How do I choose a dog groomer in ${city}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Compare location, ratings, review volume, listed services, hours, website details, and phone availability. Confirm pricing, appointment availability, coat-specific experience, and handling needs directly with the groomer.",
        },
      },
      {
        "@type": "Question",
        name: "Should I confirm services before booking?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Directory data can change, so confirm bath, haircut, nail trim, de-shedding, puppy grooming, de-matting, teeth brushing, mobile service, and pricing directly with the business.",
        },
      },
    ],
  };
}

function mobileGroomingFaqSchema(service) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find mobile dog grooming near me?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Use the location button to sort mobile grooming listings by distance, or browse city links filtered to businesses with explicit mobile grooming, in-home grooming, house-call grooming, mobile pet salon, or mobile nail-care wording. This directory currently has ${service.count.toLocaleString()} mobile grooming matches across Canada.`,
        },
      },
      {
        "@type": "Question",
        name: "What should I ask before booking a mobile dog groomer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Confirm that your address is inside the groomer's current route, ask about travel fees, parking or setup requirements, package inclusions, dog size limits, coat-condition fees, and current availability.",
        },
      },
      {
        "@type": "Question",
        name: "Is mobile dog grooming good for anxious dogs?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mobile grooming can be helpful for some anxious dogs because there is less travel and less salon traffic, but fit depends on the dog, van noise, handling rules, owner presence policies, and the groomer's experience.",
        },
      },
    ],
  };
}

function guideArticleSchema(article) {
  const category = guideCategoryBySlug(article.category);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: CONTENT_UPDATED_DATE,
    dateModified: CONTENT_UPDATED_DATE,
    author: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
    },
    publisher: organizationSchema(),
    mainEntityOfPage: absoluteUrl(guideArticleRoute(article)),
    articleSection: category.name,
    keywords: (article.keywords || []).join(", "),
    wordCount: articleWordCount(article),
  };
}

function guideFaqSchema(article) {
  if (!article.faqs || !article.faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function toolSchema(name, route) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    url: absoluteUrl(route),
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    publisher: organizationSchema(),
  };
}

function articleWordCount(article) {
  return [
    article.title,
    article.description,
    article.summary,
    ...article.sections.flatMap((section) => [section.heading, ...(section.paragraphs || []), ...(section.bullets || [])]),
    ...(article.faqs || []).flatMap((faq) => [faq.question, faq.answer]),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeProvince(value, address) {
  const direct = provinceMap.get(normalizeKey(value));
  if (direct) return provinceRecord(direct[0], direct[1]);
  const addressText = normalizeKey(address);
  for (const [key, [name, code]] of provinceMap.entries()) {
    if (key.length === 2) {
      const regex = new RegExp(`(?:^|,|\\s)${key.toUpperCase()}(?:\\s|,|$)`);
      if (regex.test(String(address || "").toUpperCase())) return provinceRecord(name, code);
    } else if (addressText.includes(key)) {
      return provinceRecord(name, code);
    }
  }
  return provinceRecord("Canada", "CA");
}

function provinceRecord(name, code) {
  return { name, code, slug: code === "CA" ? "canada" : slugify(name) };
}

function inferCity(address, provinceCode) {
  if (!address) return "";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3].replace(/\b[A-Z]\d[A-Z].*$/i, "").trim();
  const match = address.match(new RegExp(`,\\s*([^,]+?)\\s+${provinceCode}\\b`, "i"));
  return match ? match[1].trim() : "";
}

function bestImage(get) {
  return firstPresent([clean(get("imageUrl")), clean(get("imageUrls/0")), clean(get("images/0/imageUrl"))]);
}

function normalizeListingImageUrl(value) {
  const url = clean(value);
  if (!url) return "";
  return url.replace(/^http:/i, "https:");
}

function getNestedImages(get) {
  const images = [];
  for (let i = 0; i <= 4; i += 1) images.push(clean(get(`images/${i}/imageUrl`)));
  return images;
}

function getGoogleFallbackImages(get) {
  const images = [];
  for (let i = 0; i <= 9; i += 1) images.push(clean(get(`ownerUpdates/${i}/imageUrl`)));
  for (let reviewIndex = 0; reviewIndex <= 9; reviewIndex += 1) {
    for (let imageIndex = 0; imageIndex <= 2; imageIndex += 1) {
      images.push(clean(get(`reviews/${reviewIndex}/reviewImageUrls/${imageIndex}`)));
    }
  }
  return images;
}

function getHours(get) {
  const hours = [];
  for (let i = 0; i <= 6; i += 1) {
    const day = clean(get(`openingHours/${i}/day`));
    const range = clean(get(`openingHours/${i}/hours`));
    if (day && range) hours.push({ day, hours: range });
  }
  return hours;
}

function getServices(get) {
  const direct = clean(get("servicesOffered"));
  const web = clean(get("websiteServicesFound"));
  const directPrimary = direct.split("|")[0] || "";
  const values = `${directPrimary}; ${web}`
    .split(/[;|,]/)
    .map((item) => clean(item.replace(/^Common must-haves to confirm:/i, "")))
    .filter((item) => item && item.length < 64 && !/^common must/i.test(item));
  return unique(values).slice(0, 8);
}

function getWebsiteSignals(get) {
  return {
    services: cleanSignalArray(get("websiteServicesFound")),
    convenience: unique(cleanSignalArray(get("websiteConvenienceFound")).map(friendlyWebsiteSignal)).filter(Boolean),
    credentials: unique(cleanSignalArray(get("websiteCredentialsFound")).map(friendlyWebsiteSignal)).filter(Boolean),
    breedExperience: cleanSignalArray(get("websiteBreedExperienceFound")),
    pricingAvailable: hasMeaningfulWebsitePricing(get("websitePricesFound")),
  };
}

function getBookingLinks(get) {
  const links = [];
  for (let i = 0; i <= 2; i += 1) {
    const url = safeHttpUrl(get(`bookingLinks/${i}/url`));
    if (!url) continue;
    links.push({
      name: clean(get(`bookingLinks/${i}/name`)) || "Appointment link",
      url,
    });
  }
  return uniqueBy(links, (link) => link.url).slice(0, 3);
}

function normalizeBookingLinks(value) {
  if (!Array.isArray(value)) return [];
  return uniqueBy(
    value
      .map((link) => ({
        name: clean(link && link.name) || "Appointment link",
        url: safeHttpUrl(link && link.url),
      }))
      .filter((link) => link.url),
    (link) => link.url,
  ).slice(0, 3);
}

function preferredBookingLink(listing) {
  const links = listing.bookingLinks || [];
  return links.find((link) => /book|appoint|schedul|reserve/i.test(`${link.name} ${link.url}`)) || links[0] || null;
}

function getProfileAttributes(get) {
  const accessibility = getAdditionalInfoSignals(get, "Accessibility", PROFILE_ACCESSIBILITY_SIGNALS, 4);
  let amenities = getAdditionalInfoSignals(get, "Amenities", PROFILE_AMENITY_SIGNALS, 5);
  if (amenities.includes("Public restroom")) amenities = amenities.filter((item) => item !== "Restroom");
  return { accessibility, amenities };
}

function getAdditionalInfoSignals(get, group, definitions, maxIndex) {
  const found = [];
  for (const [field, label] of definitions) {
    for (let i = 0; i <= maxIndex; i += 1) {
      if (!isTruthy(get(`additionalInfo/${group}/${i}/${field}`))) continue;
      found.push(label);
      break;
    }
  }
  return unique(found);
}

function getOwnerUpdateCount(get) {
  let count = 0;
  for (let i = 0; i <= 9; i += 1) {
    if (firstPresent([
      get(`ownerUpdates/${i}/text`),
      get(`ownerUpdates/${i}/date`),
      get(`ownerUpdates/${i}/imageUrl`),
      get(`ownerUpdates/${i}/buttonLink`),
    ])) count += 1;
  }
  return count;
}

function cleanSignalArray(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[;|]/);
  return unique(values.map(clean).filter((item) => item && item.length <= 120)).slice(0, 12);
}

function friendlyWebsiteSignal(value) {
  const labels = {
    "mobile grooming": "Mobile grooming",
    "online booking": "Online booking",
    "pickup/drop-off flow": "Pickup or drop-off details",
    "certification/license mentioned": "Certification or licensing information",
    "insured/first-aid mentioned": "Insurance or pet first-aid information",
    "professional policies mentioned": "Professional policies",
  };
  const cleaned = clean(value);
  return labels[cleaned.toLowerCase()] || cleaned;
}

function friendlyWebsiteService(value) {
  const labels = {
    "full groom or haircut": "Haircut / styling",
    "bath or bath-and-brush": "Bath / bath and brush",
    "nail trim or grinding": "Nail trim / grind",
    "de-shedding": "Deshedding",
    "puppy grooming": "Puppy groom",
  };
  const cleaned = clean(value);
  return labels[cleaned.toLowerCase()] || cleaned;
}

function hasMeaningfulWebsitePricing(value) {
  const text = clean(value);
  if (!text || /^(?:no|none)\b/i.test(text) || /not found|not available|no grooming-specific/i.test(text)) return false;
  return /\$\s?\d|\b(?:prices?|pricing|rates?|starting at|starts at)\b/i.test(text);
}

function safeHttpUrl(value) {
  const cleaned = clean(value);
  if (!cleaned) return "";
  const candidate = /^www\./i.test(cleaned) ? `https://${cleaned}` : cleaned;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function getReviewTexts(get) {
  const comments = [];
  for (let i = 0; i <= 9; i += 1) {
    const comment = clean(get(`reviews/${i}/textTranslated`)) || clean(get(`reviews/${i}/text`));
    if (comment) comments.push(comment);
  }
  return unique(comments);
}

function buildReviewThemes(category, comments) {
  if (!/groom/i.test(category) || comments.length < 5) return [];
  if (comments.filter((comment) => GROOMING_COMMENT_PATTERN.test(comment)).length < 3) return [];
  return REVIEW_THEME_DEFINITIONS
    .map((theme, index) => ({
      label: theme.label,
      index,
      count: comments.filter((comment) => theme.pattern.test(comment)).length,
    }))
    .filter((theme) => theme.count >= 3)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, 4)
    .map((theme) => theme.label);
}

function getRange(get, prefix, from, to) {
  const values = [];
  for (let i = from; i <= to; i += 1) values.push(clean(get(`${prefix}${i}`)));
  return values.filter(Boolean);
}

function buildListingDescription(listing) {
  const category = listing.category && /groom|pet|dog|cat/i.test(listing.category) ? listing.category.toLowerCase() : "dog grooming business";
  const profileServices = listingProfileServices(listing);
  const street = clean(listing.street || String(listing.address || "").split(",")[0]);
  const locationDetail = street && !normalizeKey(street).includes(normalizeKey(listing.city)) ? ` at ${street}` : "";
  const pieces = [
    `${listing.title} is listed as ${indefiniteArticle(category)} ${category} in ${profileLocationText(listing)}${locationDetail}`,
  ];
  if (listing.rating) {
    pieces.push(`The public listing snapshot reports a ${listing.rating.toFixed(1)} star rating${listing.reviews ? ` from ${countLabel(listing.reviews, "review")}` : ""}`);
  }
  if (profileServices.length) {
    pieces.push(`Available source data names ${joinWithAnd(profileServices.slice(0, 4))}`);
  }
  const websiteEvidence = listingWebsiteEvidence(listing);
  if (websiteEvidence.length) {
    pieces.push(`A crawl of the business website found ${websiteEvidence.slice(0, 3).join("; ")}`);
  }
  if (listing.reviewThemes && listing.reviewThemes.length) {
    pieces.push(`Across ${countLabel(listing.reviewCommentCount, "written comment")} sampled for this profile, recurring topics include ${joinTopics(listing.reviewThemes)}`);
  }
  const contactSignals = listingContactSignals(listing);
  const hasDeepEvidence = websiteEvidence.length && listing.reviewThemes && listing.reviewThemes.length;
  if (contactSignals.length && !hasDeepEvidence) {
    pieces.push(`The profile provides ${joinWithAnd(contactSignals.slice(0, 5))} for comparison and follow-up`);
  }
  const snapshot = profileSnapshotLabel(listing.scrapedAt);
  if (snapshot) pieces.push(`Source details were gathered in ${snapshot}`);
  pieces.push("Confirm current services, prices, availability, and coat-specific needs directly with the business before booking");
  return `${pieces.join(". ")}.`;
}

function listingProfileServices(listing) {
  const services = unique([...(listing.services || []), ...(listing.websiteServices || [])])
    .filter((item) => !/^(?:confirm|call|contact|ask|check)\b/i.test(item));
  return listing.websiteCrawlStatus === "official_website_enriched" ? uniqueBy(services, profileServiceKey) : services;
}

function profileServiceKey(value) {
  const key = normalizeKey(value);
  if (/full groom|haircut|hair cut|styling|breed cut|breed clip/.test(key)) return "haircut";
  if (/bath|shampoo/.test(key)) return "bath";
  if (/nail|dremel/.test(key)) return "nails";
  if (/de[-\s]?shed|deshed|undercoat/.test(key)) return "deshedding";
  if (/de[-\s]?mat|demat/.test(key)) return "dematting";
  if (/puppy/.test(key)) return "puppy";
  if (/cat|feline/.test(key)) return "cat";
  if (/teeth|tooth|dental/.test(key)) return "teeth";
  return key;
}

function listingWebsiteEvidence(listing) {
  const evidence = [];
  if (listing.websiteServices && listing.websiteServices.length) {
    evidence.push(`service information for ${joinWithAnd(listing.websiteServices.slice(0, 3))}`);
  }
  if (listing.websiteConvenience && listing.websiteConvenience.length) {
    evidence.push(`references to ${joinWithAnd(listing.websiteConvenience.slice(0, 2).map(lowerFirst))}`);
  }
  if (listing.websiteCredentials && listing.websiteCredentials.length) {
    evidence.push(joinWithAnd(listing.websiteCredentials.slice(0, 2).map(lowerFirst)));
  }
  if (listing.websiteBreedExperience && listing.websiteBreedExperience.length) {
    evidence.push(`breed or coat-type references to ${joinWithAnd(listing.websiteBreedExperience.slice(0, 3))}`);
  }
  if (listing.websitePricingAvailable) evidence.push("published grooming price information");
  return evidence;
}

function listingContactSignals(listing) {
  return [
    listing.phone ? "a phone number" : "",
    listing.website ? "a business website" : "",
    preferredBookingLink(listing) ? "an appointment link" : "",
    listing.hours && listing.hours.length ? "listed hours" : "",
    listing.mapsUrl ? "a map link" : "",
    listing.photos && listing.photos.length ? "source photos" : "",
  ].filter(Boolean);
}

function profileSnapshotLabel(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return "";
  const month = Number(match[2]);
  if (month < 1 || month > 12) return "";
  const monthName = new Intl.DateTimeFormat("en-CA", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2000, month - 1, 1)));
  return `${monthName} ${match[1]}`;
}

function profileLocationText(listing) {
  const city = clean(listing.city);
  const province = clean(listing.province);
  if (listing.provinceCode === "CA" || normalizeKey(province) === "canada") {
    return city && normalizeKey(city) !== "canada" ? `${city}, Canada` : "Canada";
  }
  if (!city) return province || "Canada";
  return `${city}, ${province}`;
}

function joinTopics(values) {
  if (values.length <= 2) return joinWithAnd(values);
  return `${values.slice(0, -1).join("; ")}; and ${values[values.length - 1]}`;
}

function indefiniteArticle(value) {
  return /^[aeiou]/i.test(clean(value)) ? "an" : "a";
}

function lowerFirst(value) {
  const text = clean(value);
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : "";
}

function qualityScore(listing) {
  return (
    (listing.category && /groom/i.test(listing.category) ? 20 : 0) +
    (listing.rating || 0) * 12 +
    Math.min(listing.reviews, 500) / 12 +
    (listing.phone ? 8 : 0) +
    (listing.website ? 8 : 0) +
    (listing.services.length ? 4 : 0) -
    (listing.temporarilyClosed ? 25 : 0)
  );
}

function sortListings(a, b) {
  return b.score - a.score || b.reviews - a.reviews || a.title.localeCompare(b.title);
}

function countBy(items, fn) {
  const map = new Map();
  for (const item of items) {
    const name = fn(item);
    map.set(name, (map.get(name) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 82);
}

function uniqueSlug(base, used) {
  let slug = base || "page";
  let candidate = slug;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function shortHash(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 8);
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numberOrNull(value) {
  const cleaned = String(value || "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function integerOrZero(value) {
  const number = parseInt(String(value || "").replace(/,/g, ""), 10);
  return Number.isFinite(number) ? number : 0;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstPresent(values) {
  return values.find((value) => clean(value)) || "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function joinWithAnd(values) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function countLabel(count, singular, plural = `${singular}s`) {
  return `${Number(count || 0).toLocaleString()} ${Number(count || 0) === 1 ? singular : plural}`;
}

function uniqueBy(items, fn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = fn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isTruthy(value) {
  return ["true", "1", "yes"].includes(normalizeKey(value));
}

function extractPostalCode(value) {
  const match = String(value || "").match(/[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d/i);
  return match ? match[0].toUpperCase() : "";
}

function cleanDisplayUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch (error) {
    return value;
  }
}

function haversineKm(a, b) {
  const radius = 6371;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function absoluteUrl(route) {
  if (/^https?:\/\//i.test(route)) return route;
  if (route === "/") return `${SITE_URL}/`;
  if (route === "/404.html") return `${SITE_URL}/404.html`;
  return `${SITE_URL}${route}`;
}

function trimSlashes(value) {
  return String(value).replace(/^\/+|\/+$/g, "");
}

function prune(value) {
  if (Array.isArray(value)) return value.map(prune).filter((item) => item !== undefined && item !== null && item !== "");
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, child]) => [key, prune(child)])
        .filter(([, child]) => child !== undefined && child !== null && child !== "" && !(Array.isArray(child) && !child.length)),
    );
  }
  return value;
}

function safeJson(value) {
  return JSON.stringify(prune(value)).replace(/</g, "\\u003c");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escAttr(value) {
  return esc(value).replace(/`/g, "&#096;");
}

function logoMarkSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-labelledby="title desc">
  <title id="title">Dog Groomers Canada logo mark</title>
  <desc id="desc">A cream dog grooming silhouette on a deep green square with a red maple leaf accent.</desc>
  <rect width="256" height="256" rx="46" fill="#073b2a"/>
  <path fill="#f8f4ec" d="M71 144c-8.8 0-14.7-9-11.2-17.1l11-25.4C78 84.8 94.5 74 112.8 74h30.5c8.7 0 17 4.1 22.3 11l10.1 13.2h16.2c5.5 0 10.8 2.2 14.7 6.1l16.9 16.9c5 5 4.1 13.3-1.8 17.2L201 152v39.2c0 5.4-4.4 9.8-9.8 9.8h-18.4c-5.4 0-9.8-4.4-9.8-9.8V171H98v20.2c0 5.4-4.4 9.8-9.8 9.8H69.8c-5.4 0-9.8-4.4-9.8-9.8V144h11Z"/>
  <path fill="#073b2a" d="M116 105.8a10.8 10.8 0 1 1-21.6 0 10.8 10.8 0 0 1 21.6 0Zm84.5 18.4a7.6 7.6 0 1 1-15.2 0 7.6 7.6 0 0 1 15.2 0Z"/>
  <path fill="#d94f45" d="m144 118 8.8-9.9 4.7 12.4 13.2-2.7-6.9 11.4 10.5 8.2-13.2 1.3.6 13.3-10.1-8.7-9.6 9.1.1-13.4-13.3-1 10.2-8.5-7.3-11.2 13.3 2.3Z"/>
  <path fill="#c79a3b" d="M84 158h94v8H84z"/>
</svg>
`;
}

function logoWordmarkSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="180" viewBox="0 0 760 180" role="img" aria-labelledby="title desc">
  <title id="title">Dog Groomers Canada</title>
  <desc id="desc">Dog Groomers Canada wordmark with a dog grooming mark and maple leaf accent.</desc>
  <rect width="760" height="180" rx="24" fill="#f8f4ec"/>
  <g transform="translate(30 30) scale(.47)">
    <rect width="256" height="256" rx="46" fill="#073b2a"/>
    <path fill="#f8f4ec" d="M71 144c-8.8 0-14.7-9-11.2-17.1l11-25.4C78 84.8 94.5 74 112.8 74h30.5c8.7 0 17 4.1 22.3 11l10.1 13.2h16.2c5.5 0 10.8 2.2 14.7 6.1l16.9 16.9c5 5 4.1 13.3-1.8 17.2L201 152v39.2c0 5.4-4.4 9.8-9.8 9.8h-18.4c-5.4 0-9.8-4.4-9.8-9.8V171H98v20.2c0 5.4-4.4 9.8-9.8 9.8H69.8c-5.4 0-9.8-4.4-9.8-9.8V144h11Z"/>
    <path fill="#073b2a" d="M116 105.8a10.8 10.8 0 1 1-21.6 0 10.8 10.8 0 0 1 21.6 0Zm84.5 18.4a7.6 7.6 0 1 1-15.2 0 7.6 7.6 0 0 1 15.2 0Z"/>
    <path fill="#d94f45" d="m144 118 8.8-9.9 4.7 12.4 13.2-2.7-6.9 11.4 10.5 8.2-13.2 1.3.6 13.3-10.1-8.7-9.6 9.1.1-13.4-13.3-1 10.2-8.5-7.3-11.2 13.3 2.3Z"/>
    <path fill="#c79a3b" d="M84 158h94v8H84z"/>
  </g>
  <text x="175" y="82" fill="#073b2a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800" letter-spacing="0">Dog Groomers</text>
  <text x="175" y="128" fill="#073b2a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800" letter-spacing="0">Canada</text>
  <text x="178" y="154" fill="#50635b" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="0">Local dog grooming directory</text>
</svg>
`;
}

function ogImageSvg(stats) {
  const listingCount = Number(stats?.listings || 0).toLocaleString("en-CA");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Dog Groomers Canada</title>
  <desc id="desc">Social sharing image for Dog Groomers Canada, a dog grooming near me directory.</desc>
  <rect width="1200" height="630" fill="#073b2a"/>
  <circle cx="980" cy="74" r="210" fill="#0e5a42" opacity=".72"/>
  <circle cx="1016" cy="560" r="220" fill="#c79a3b" opacity=".18"/>
  <g transform="translate(92 112)">
    <rect width="164" height="164" rx="34" fill="#f8f4ec"/>
    <g transform="translate(18 18) scale(.5)">
      <rect width="256" height="256" rx="46" fill="#073b2a"/>
      <path fill="#f8f4ec" d="M71 144c-8.8 0-14.7-9-11.2-17.1l11-25.4C78 84.8 94.5 74 112.8 74h30.5c8.7 0 17 4.1 22.3 11l10.1 13.2h16.2c5.5 0 10.8 2.2 14.7 6.1l16.9 16.9c5 5 4.1 13.3-1.8 17.2L201 152v39.2c0 5.4-4.4 9.8-9.8 9.8h-18.4c-5.4 0-9.8-4.4-9.8-9.8V171H98v20.2c0 5.4-4.4 9.8-9.8 9.8H69.8c-5.4 0-9.8-4.4-9.8-9.8V144h11Z"/>
      <path fill="#073b2a" d="M116 105.8a10.8 10.8 0 1 1-21.6 0 10.8 10.8 0 0 1 21.6 0Zm84.5 18.4a7.6 7.6 0 1 1-15.2 0 7.6 7.6 0 0 1 15.2 0Z"/>
      <path fill="#d94f45" d="m144 118 8.8-9.9 4.7 12.4 13.2-2.7-6.9 11.4 10.5 8.2-13.2 1.3.6 13.3-10.1-8.7-9.6 9.1.1-13.4-13.3-1 10.2-8.5-7.3-11.2 13.3 2.3Z"/>
      <path fill="#c79a3b" d="M84 158h94v8H84z"/>
    </g>
  </g>
  <text x="92" y="352" fill="#f8f4ec" font-family="Inter, Arial, sans-serif" font-size="78" font-weight="800" letter-spacing="0">Dog Groomers Canada</text>
  <text x="96" y="420" fill="#e7d6ad" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="0">Find dog grooming near me across Canada</text>
  <text x="98" y="492" fill="#f8f4ec" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="0">${listingCount} local listings | city pages | ratings | services | maps</text>
  <path fill="#d94f45" d="m1012 286 23-26 13 32 35-7-18 31 28 21-35 4 2 35-27-23-25 24v-35l-35-3 27-22-20-30 35 6Z"/>
</svg>
`;
}

function siteManifest() {
  return `${JSON.stringify(
    {
      name: BRAND_NAME,
      short_name: "DGC",
      description: "Find dog grooming near me across Canada.",
      start_url: "/",
      display: "standalone",
      background_color: "#f8f4ec",
      theme_color: THEME_COLOR,
      icons: [
        {
          src: LOGO_MARK_PATH,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function googleIntegrationHead() {
  const scripts = [];
  if (GOOGLE_ANALYTICS_ID) {
    scripts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}"></script>`);
    scripts.push(`<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());
  gtag("config", "${GOOGLE_ANALYTICS_ID}");
</script>`);
  }
  if (GROW_SITE_ID) {
    scripts.push(growInitializerScript());
  }
  scripts.push(legacyAdServiceWorkerCleanupScript());
  return scripts.join("\n  ");
}

function growInitializerScript() {
  return `<script data-grow-initializer="">!(function(){window.growMe||((window.growMe=function(e){window.growMe._.push(e);}),(window.growMe._=[]));var e=document.createElement("script");(e.type="text/javascript"),(e.src="https://faves.grow.me/main.js"),(e.defer=!0),e.setAttribute("data-grow-faves-site-id","${GROW_SITE_ID}");var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t);})();</script>`;
}

function legacyAdServiceWorkerCleanupScript() {
  return `<script>(function(){if(!("serviceWorker" in navigator))return;navigator.serviceWorker.getRegistrations().then(function(registrations){registrations.forEach(function(registration){var worker=registration.active||registration.waiting||registration.installing;if(worker&&/\\/sw\\.js(?:[?#].*)?$/.test(worker.scriptURL)){registration.unregister();}});}).catch(function(){});}())</script>`;
}

function dogLogo() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20 17c-4.8 0-8.9 2.9-10.8 7.3L5.7 33c-.6 1.4.4 3 1.9 3H12v12.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V42h20v6.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V34l5.7-3.8c1.4-.9 1.6-2.9.4-4.1l-5.9-5.9c-.7-.7-1.6-1-2.5-1H38l-3.8-5.1c-.5-.7-1.2-1-2-1H25l-5 3.9Zm-.2 9.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Zm24.8 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Z"/></svg>`;
}

function imageUnavailable(listing = null, context = "card") {
  if (context === "profile" && listing) {
    return `<span class="fallback image-unavailable profile-image-unavailable">${dogLogo()}<span class="fallback-copy"><strong>Photo not displayed</strong><span>Business photos appear only when usage permission or a reusable licence is documented.</span><a href="${escAttr(photoPermissionMailto(listing))}">Submit authorized photos</a></span></span>`;
  }
  return `<span class="fallback image-unavailable" aria-hidden="true">${dogLogo()}</span>`;
}

function sameBusinessFallbackImage(listing, sourceImage = listing.image) {
  return (listing.photos || []).find((photo) => photo && photo !== sourceImage) || "";
}

function listingImageAlt(listing, context = "card") {
  return context === "profile" ? `${listing.title} listing photo` : `${listing.title} dog grooming listing photo`;
}

function listingImageRightsAttr(listing) {
  return hasDocumentedImageRights(listing) ? ` data-image-rights="${escAttr(listing.imageRights.status)}"` : "";
}

function listingImageSourceNote(listing, scope = "image") {
  if (!listing.image || !hasDocumentedImageRights(listing)) return "";
  const rights = listing.imageRights;
  const sourceLink = rights.sourceUrl
    ? ` <a href="${escAttr(rights.sourceUrl)}" target="_blank" rel="nofollow noopener">View the source website</a>.`
    : "";
  const rightsLabel = rights.status === "owner_permission"
    ? `Permission documented ${rights.grantedAt}.`
    : `${esc(rights.license)} usage basis documented.`;
  return `<p class="image-source-note" data-image-rights-note="${escAttr(rights.status)}">${esc(rights.credit)} ${rightsLabel}${sourceLink} <a href="${escAttr(correctionMailto(listing))}">Request an image correction or removal</a>.</p>`;
}

function searchIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m20.7 19.3-4.2-4.2a7.5 7.5 0 1 0-1.4 1.4l4.2 4.2 1.4-1.4ZM4.5 10.5a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z"/></svg>`;
}

function pinIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>`;
}

function pinIconInline() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="display:inline;width:1em;height:1em;vertical-align:-.13em"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>`;
}

function targetIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 2h2v3.1a7 7 0 0 1 5.9 5.9H22v2h-3.1a7 7 0 0 1-5.9 5.9V22h-2v-3.1A7 7 0 0 1 5.1 13H2v-2h3.1A7 7 0 0 1 11 5.1V2Zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>`;
}

function phoneIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.5c0 .7-.5 1.2-1.2 1.2C10.2 22 2 13.8 2 3.4 2 2.7 2.5 2.2 3.2 2.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.8.6 4 .1.4 0 .8-.3 1.2l-1.6 2.2Z"/></svg>`;
}

function globeIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.3a15.8 15.8 0 0 0-1.1-5 8.1 8.1 0 0 1 4.4 5ZM12 4.1c.7 1 1.5 3.1 1.8 6.9h-3.6c.3-3.8 1.1-5.9 1.8-6.9ZM4.3 13h3.9c.1 1.7.4 3.3.8 4.6A8.1 8.1 0 0 1 4.3 13Zm3.9-2H4.3A8.1 8.1 0 0 1 9 6.4 19 19 0 0 0 8.2 11Zm3.8 8.9c-.7-1-1.5-3-1.8-6.9h3.6c-.3 3.9-1.1 5.9-1.8 6.9Zm3-2.3c.4-1.3.7-2.9.8-4.6h3.9a8.1 8.1 0 0 1-4.7 4.6Z"/></svg>`;
}

main();
