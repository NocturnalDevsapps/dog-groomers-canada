#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://doggroomerscanada.ca";
const CSV_FILE =
  process.argv[2] ||
  path.join(ROOT, "Apify Google Maps Scraper jJzJjRpnTviQKBwns - dog grooming only.csv");
const NOW = new Date().toISOString().slice(0, 10);
const BRAND_NAME = "Dog Groomers Canada";
const THEME_COLOR = "#073b2a";
const LOGO_MARK_PATH = "/assets/logo-mark.svg";
const LOGO_PATH = "/assets/logo.png";
const OG_IMAGE_PATH = "/assets/og-image.png";
const ADSENSE_CLIENT = "ca-pub-2494233247909241";
const GOOGLE_ANALYTICS_ID = "G-BY1BF23TD7";
const AD_SLOTS = Object.freeze({
  inContent: "8427489237",
  sidebar: "4819416718",
  leaderboard: "9035205346",
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
  "add-your-business",
  "for-businesses",
  "privacy",
  "terms",
  "sitemap",
];

const ROOT_FILES = ["index.html", "404.html", "robots.txt", "sitemap.xml", "ads.txt", "CNAME", ".nojekyll"];

function adUnit(slotName, options = {}) {
  const slot = AD_SLOTS[slotName];
  if (!ADSENSE_CLIENT || !slot) return "";
  const classes = ["ad-slot"];
  if (options.sidebar) classes.push("ad-sidebar");
  if (options.leaderboard) classes.push("ad-leaderboard");
  if (options.inContent) classes.push("ad-in-content");
  const format = options.format || "auto";
  const fullWidth = options.fullWidthResponsive === false ? "false" : "true";
  return `<div class="${classes.join(" ")}" aria-label="Advertisement"><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${slot}" data-ad-format="${format}" data-full-width-responsive="${fullWidth}"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
}

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
    patterns: [/nail/i, /grind/i],
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
      "Browse listings that mention mobile, in-home, house-call, or convenient location-based grooming options.",
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

function main() {
  if (!fs.existsSync(CSV_FILE)) {
    throw new Error(`CSV file not found: ${CSV_FILE}`);
  }

  cleanGeneratedFiles();

  const rawListings = loadListings(CSV_FILE);
  const listings = buildListingUrls(rawListings);
  const provinceGroups = groupProvinces(listings);
  const cityGroups = groupCities(listings);
  const serviceGroups = groupServices(listings);

  const context = {
    listings,
    provinces: provinceGroups,
    cities: cityGroups,
    services: serviceGroups,
    stats: {
      listings: listings.length,
      provinces: provinceGroups.length,
      cities: cityGroups.length,
      withPhones: listings.filter((item) => item.phone).length,
      withWebsites: listings.filter((item) => item.website).length,
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
  writeServicePages(context);
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
    const image = bestImage(get);
    const photos = unique([image, ...getRange(get, "imageUrls/", 0, 4), ...getNestedImages(get)]).filter(Boolean).slice(0, 8);
    const hours = getHours(get);
    const services = getServices(get);
    const description = firstPresent([
      clean(get("generatedDescription")),
      clean(get("websiteEnrichedDescription")),
      clean(get("description")),
      buildFallbackDescription(title, city, province.name, rating, reviews),
    ]);
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
      website: clean(get("website")),
      mapsUrl: clean(get("url")),
      rating,
      reviews,
      lat,
      lng,
      image,
      photos,
      hours,
      services,
      serviceText: clean(get("servicesOffered")),
      convenienceText: clean(get("convenientLocationOrMobileService")),
      description,
      temporarilyClosed: isTruthy(get("temporarilyClosed")),
      scrapedAt: clean(get("scrapedAt")),
      score: 0,
    };
    listing.score = qualityScore(listing);
    listings.push(listing);
  });

  return listings.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
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
      const matching = listings
        .filter((listing) => service.patterns.some((pattern) => pattern.test(`${listing.services.join(" ")} ${listing.serviceText} ${listing.convenienceText}`)))
        .sort(sortListings);
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
      generatedAt: NOW,
      stats: context.stats,
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
        services: listing.services,
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
          ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
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
            <h1>Find Dog Grooming in Canada</h1>
            <p class="lead">Search and browse ${context.stats.listings.toLocaleString()} dog grooming businesses across Canada. Compare dog groomers near you by rating, services, website, phone number, hours, and local profile pages before you book.</p>
            <div class="stat-strip">
              <div class="stat"><strong>${context.stats.listings.toLocaleString()}</strong><span>Grooming listings</span></div>
              <div class="stat"><strong>${context.stats.cities.toLocaleString()}</strong><span>City pages</span></div>
              <div class="stat"><strong>${context.stats.withPhones.toLocaleString()}</strong><span>Listings with phone numbers</span></div>
            </div>
            <p data-nearest-city class="muted" style="margin-top:14px"></p>
          </div>
          ${adUnit("leaderboard", { leaderboard: true, format: "horizontal" })}
          <div class="section-head">
            <div>
              <h2>Top dog groomer listings</h2>
              <p>Fast paths into detailed, crawlable profile pages with contact details, services, and nearby alternatives.</p>
            </div>
            <a class="link-arrow" href="/cities/">View all cities -></a>
          </div>
          <div class="listing-stack">${recentListings.map((item) => listingCard(item)).join("")}</div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <h2>Explore popular grooming cities</h2>
            <p>Every city page includes direct links to local groomer profiles, so search engines and visitors can move through the directory without relying on JavaScript.</p>
          </div>
          <a class="link-arrow" href="/sitemap/">HTML sitemap -></a>
        </div>
        <div class="grid-4">${topCities
          .map(
            (city) =>
              `<a class="province-card" href="${city.url}"><span><strong>${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} groomers listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
          )
          .join("")}</div>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">
        <div class="info-card">
          <h2>Location based</h2>
          <p>Use your location to jump to the nearest city page or compare nearby groomers by distance. Location is only requested when you press the button.</p>
          <a class="btn btn-dark" href="/dog-grooming-near-me/">Find dog grooming near me</a>
        </div>
        <div class="info-card">
          <h2>Built for discovery</h2>
          <p>Province pages, city pages, profile pages, service pages, canonical URLs, structured data, and XML + HTML sitemaps help search engines find the directory.</p>
          <a class="btn btn-light" href="/provinces/">Browse provinces</a>
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

  writePage(context, "/", "Dog Grooming Canada | Dog Grooming Near Me Directory", homeMetaDescription(context), body, schema);
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
            <div class="listing-stack">${province.topListings.map((item) => listingCard(item)).join("")}</div>
            ${adUnit("inContent", { inContent: true })}
            <h2>Cities in ${esc(province.name)}</h2>
            <div class="grid-3">${topCities
              .map(
                (city) =>
                  `<a class="province-card" href="${city.url}"><span><strong>${esc(city.city)}</strong><span>${city.count.toLocaleString()} groomers listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </main>
          <aside class="side-panel">
            ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
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
          <p class="lead">Compare ${city.count.toLocaleString()} dog grooming businesses in ${esc(city.city)}, ${esc(city.province)}. Find dog groomers near you with ratings, contact details, websites, services, photos, hours, and profile pages before booking.</p>
          ${searchPanel("compact")}
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            <div class="filter-bar">
              <strong>${city.count.toLocaleString()} groomers found</strong>
              <div class="tag-cloud">${services.map((service) => `<a class="tag" href="${service.url}">${esc(service.short)}</a>`).join("")}</div>
            </div>
            ${adUnit("inContent", { inContent: true })}
            <div class="listing-stack">${listings.map((item) => listingCard(item)).join("")}</div>
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
            ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
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
  for (const listing of context.listings) {
    const city = cityMap.get(`${listing.provinceSlug}/${listing.citySlug}`);
    const province = context.provinces.find((item) => item.slug === listing.provinceSlug);
    const related = relatedListings(listing, context.listings).slice(0, 6);
    const photos = listing.photos.length
      ? `<section class="section"><h2>Photos</h2><div class="photo-grid">${listing.photos
          .map((photo) => `<a href="${escAttr(photo)}" target="_blank" rel="noopener nofollow"><img src="${escAttr(photo)}" alt="${escAttr(listing.title)} photo" loading="lazy" referrerpolicy="no-referrer"></a>`)
          .join("")}</div></section>`
      : "";
    const hours = listing.hours.length
      ? `<section class="section"><h2>Hours listed</h2><ul class="hours-list">${listing.hours
          .map((item) => `<li><strong>${esc(item.day)}</strong><span>${esc(item.hours)}</span></li>`)
          .join("")}</ul></section>`
      : "";
    const services = listing.services.length
      ? `<div class="tag-cloud">${listing.services.map((item) => `<span class="tag">${esc(item)}</span>`).join("")}</div>`
      : `<p class="muted">Call ahead to confirm bath, haircut, nail trim, de-shedding, puppy groom, de-matting, and breed-specific services.</p>`;
    const contact = `
      <dl class="detail-list">
        ${detailRow("Phone", listing.phone ? `<a href="tel:${escAttr(listing.phoneRaw || listing.phone)}">${esc(listing.phone)}</a>` : "Call to confirm")}
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
              <p class="lead">${esc(listing.description)}</p>
              <div class="meta-line">${ratingLine(listing)}<span>${esc(listing.city)}, ${esc(listing.provinceCode)}</span></div>
              <div class="tag-cloud" style="margin-top:18px">${listing.phone ? `<a class="btn btn-dark" href="tel:${escAttr(listing.phoneRaw || listing.phone)}">Call ${esc(listing.phone)}</a>` : ""}${listing.website ? `<a class="btn btn-primary" href="${escAttr(listing.website)}" target="_blank" rel="nofollow noopener">Visit Website</a>` : ""}${listing.mapsUrl ? `<a class="btn btn-light" href="${escAttr(listing.mapsUrl)}" target="_blank" rel="nofollow noopener">Open Map</a>` : ""}</div>
            </div>
            <div class="profile-photo">${listing.image ? `<img src="${escAttr(listing.image)}" alt="${escAttr(listing.title)} listing photo" loading="eager" referrerpolicy="no-referrer">` : dogFallback()}</div>
          </div>
        </div>
      </section>
      <section class="section">
        <div class="wrap content-layout">
          <main>
            <section>
              <h2>Business details</h2>
              ${contact}
            </section>
            <section class="section">
              <h2>Services mentioned</h2>
              ${services}
              <p class="muted" style="margin-top:14px">Service information is summarized from available listing data and may not be complete. Confirm current services and prices directly with the groomer.</p>
            </section>
            ${hours}
            ${photos}
            <section class="section">
              <h2>Nearby dog groomers</h2>
              <div class="listing-stack">${related.map((item) => listingCard(item, true)).join("")}</div>
            </section>
          </main>
          <aside class="side-panel">
            ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
            <div class="info-card">
              <h2>Local directory</h2>
              <p>Compare more dog groomers in ${esc(listing.city)}, ${esc(listing.provinceCode)}.</p>
              <a class="btn btn-light" href="${city ? city.url : listing.cityUrl}">View city page</a>
            </div>
            <div class="info-card">
              <h2>Before booking</h2>
              <p>Ask about appointment availability, grooming package details, add-ons, cancellation policy, vaccination requirements, and breed-specific experience.</p>
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
    writePage(context, listing.url, `${listing.title} | Dog Grooming in ${listing.city}, ${listing.provinceCode}`, listingMetaDescription(listing), body, schema);
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
            <div class="listing-stack">${top.map((item) => listingCard(item)).join("")}</div>
          </main>
          <aside class="side-panel">
            ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
            <div class="info-card">
              <h2>Top provinces</h2>
              ${linkList(
                provinceCounts,
                (item) => context.provinces.find((province) => province.name === item.name)?.url || "/provinces/",
                (item) => item.name,
                (item) => `${item.count}`,
              )}
            </div>
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

function writeKeywordPages(context) {
  const topCities = context.cities.slice(0, 24);
  const topListings = context.listings.filter((item) => item.provinceSlug !== "canada").slice(0, 12);
  const groomingBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Dog Grooming" }])}
        <h1 class="city-title">Dog Grooming in Canada</h1>
        <p class="lead">Find dog grooming businesses across Canada and compare local dog groomers by city, province, service, rating, phone number, website, hours, photos, and profile details.</p>
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
            <h2>Top dog grooming listings</h2>
            <div class="listing-stack">${topListings.map((item) => listingCard(item)).join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
          <div class="info-card"><h2>Dog grooming checklist</h2><p>Before booking, confirm bath, brush, haircut, nail trim, de-shedding, de-matting, puppy groom, appointment length, and breed-specific experience.</p></div>
          <div class="info-card"><h2>Browse all cities</h2><p>Use the complete city index for crawlable local dog grooming pages across Canada.</p><a class="btn btn-light" href="/cities/">All city pages</a></div>
        </aside>
      </div>
    </section>`;

  writePage(
    context,
    "/dog-grooming/",
    "Dog Grooming in Canada | Find Dog Groomers Near You",
    "Dog grooming in Canada: compare local dog groomers near you by city, service, rating, phone, website, hours, photos, maps, and profiles.",
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
          <div class="search-results" data-nearby-results><div class="empty-state"><h2>Location required</h2><p>Click "Use my location" to sort dog grooming listings by distance. You can also browse the city links below.</p></div></div>
          <section class="section">
            <div class="section-head">
              <div><h2>Popular dog grooming near me city pages</h2><p>These local pages are fully crawlable and include dog groomer profile links, contact details, ratings, and services.</p></div>
            </div>
            <div class="grid-3">${topCities
              .map(
                (city) =>
                  `<a class="province-card" href="${city.url}"><span><strong>Dog grooming in ${esc(city.city)}, ${esc(city.provinceCode)}</strong><span>${city.count.toLocaleString()} groomers listed</span></span><span aria-hidden="true">&rarr;</span></a>`,
              )
              .join("")}</div>
          </section>
        </main>
        <aside class="side-panel">
          ${adUnit("sidebar", { sidebar: true, format: "rectangle" })}
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

function writeUtilityPages(context) {
  const searchBody = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Search" }])}
        <h1 class="city-title">Search Dog Groomers Canada</h1>
        <p class="lead">Search by business name, city, province, or grooming service. Results load from a lightweight static JSON index.</p>
        ${searchPanel("compact")}
        <p class="muted"><span data-result-count></span></p>
      </div>
    </section>
    <section class="section"><div class="wrap"><div class="listing-stack search-results" data-search-results></div></div></section>`;
  writePage(context, "/search/", "Search Dog Groomers Canada", "Search dog grooming in Canada by business name, city, province, service, rating, phone number, website, and local profile page.", searchBody, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Search", url: "/search/" }]), { bodyAttrs: 'data-page="search"' });

  writePage(context, "/near-me/", "Dog Grooming Near Me | Dog Groomers Canada", nearMeMetaDescription(), nearMeBody(context), breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Dog Grooming Near Me", url: "/dog-grooming-near-me/" }]), { bodyAttrs: 'data-page="near-me"', canonicalRoute: "/dog-grooming-near-me/", noSitemap: true });

  const addBody = simpleContentPage(
    "Add Your Dog Grooming Business",
    "Want to update or add a listing? Send the business name, website, phone number, address, services, and the city page where it should appear.",
    `<form class="search-panel compact" id="add-business-form">
      <div class="grid-2">
        <label>Business name<input required name="business" class="input-shell" style="width:100%;margin-top:6px;padding:12px" placeholder="Business name"></label>
        <label>City / Province<input required name="location" class="input-shell" style="width:100%;margin-top:6px;padding:12px" placeholder="City, province"></label>
      </div>
      <label style="display:block;margin-top:12px">Details<textarea name="details" class="input-shell" style="width:100%;min-height:120px;margin-top:6px;padding:12px" placeholder="Website, phone, services, hours, notes"></textarea></label>
      <button class="btn btn-primary" type="submit" style="margin-top:12px">Prepare Email</button>
    </form>
    <script>
      document.getElementById("add-business-form").addEventListener("submit", function (event) {
        event.preventDefault();
        var data = new FormData(event.currentTarget);
        var body = "Business: " + (data.get("business") || "") + "\\nLocation: " + (data.get("location") || "") + "\\nDetails: " + (data.get("details") || "");
        window.location.href = "mailto:hello@doggroomerscanada.ca?subject=Dog%20Groomers%20Canada%20listing%20update&body=" + encodeURIComponent(body);
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
      "Dog Groomers Canada is a static directory designed to help pet owners find local grooming options. Businesses can request listing updates, service corrections, website changes, and contact detail updates.",
      `<div class="grid-3"><div class="info-card"><h2>Update details</h2><p>Keep phone numbers, websites, service notes, and hours accurate so customers can contact you quickly.</p></div><div class="info-card"><h2>Improve trust</h2><p>A clear website, current address, and service details help owners decide whether your grooming style fits their dog.</p></div><div class="info-card"><h2>Advertise locally</h2><p>Ad placements can be added beside relevant city, province, service, or profile pages.</p></div></div>`,
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
      "Dog Groomers Canada is built as a static website. Location features run in your browser after you choose to use them; your precise location is not sent to a directory server by this static site.",
      `<div class="info-card"><h2>Advertising and analytics</h2><p>If advertising or analytics tools are added, they may use cookies or similar technologies according to their own policies. Update this page before enabling any third-party tracking.</p></div>`,
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
      `<div class="info-card"><h2>No endorsement</h2><p>Listings, ratings, and links do not constitute a guarantee or endorsement. Grooming decisions should be based on direct communication with the business and your dog's needs.</p></div>`,
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
  const cityLinks = context.cities
    .map((city) => `<li><a href="${city.url}">${esc(city.city)}, ${esc(city.provinceCode)}</a> <span class="count">${city.count}</span></li>`)
    .join("");
  const listingLinks = context.listings
    .map((listing) => `<li><a href="${listing.url}">${esc(listing.title)} in ${esc(listing.city)}, ${esc(listing.provinceCode)}</a></li>`)
    .join("");
  const body = `
    <section class="page-intro">
      <div class="wrap">
        ${breadcrumbs([{ label: "Home", url: "/" }, { label: "Sitemap" }])}
        <h1 class="city-title">Dog Groomers Canada HTML Sitemap</h1>
        <p class="lead">Crawlable links to province pages, city pages, service pages, and every dog groomer profile page.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap grid-3">
        <div class="info-card"><h2>Provinces</h2>${linkList(context.provinces, (item) => item.url, (item) => item.name, (item) => `${item.count}`)}</div>
        <div class="info-card"><h2>Services</h2>${linkList(context.services, (item) => item.url, (item) => item.name, (item) => `${item.count}`)}</div>
        <div class="info-card"><h2>Core pages</h2>${linkList(
          [
            { url: "/dog-grooming/", name: "Dog Grooming", count: "" },
            { url: "/dog-grooming-near-me/", name: "Dog Grooming Near Me", count: "" },
            { url: "/cities/", name: "All Cities", count: context.cities.length },
            { url: "/search/", name: "Search", count: "" },
          ],
          (item) => item.url,
          (item) => item.name,
          (item) => `${item.count}`,
        )}</div>
      </div>
    </section>
    <section class="section"><div class="wrap"><h2>City pages</h2><ul class="link-list">${cityLinks}</ul></div></section>
    <section class="section"><div class="wrap"><h2>Dog groomer profile pages</h2><ul class="link-list">${listingLinks}</ul></div></section>`;
  writePage(context, "/sitemap/", "HTML Sitemap | Dog Groomers Canada", "HTML sitemap for Dog Groomers Canada with crawlable dog grooming links by province, city, service, near me page, and groomer profile.", body, breadcrumbSchema([{ label: "Home", url: "/" }, { label: "Sitemap", url: "/sitemap/" }]));

  const urls = context.pages
    .filter((page) => page.route !== "/404.html")
    .map((page) => `  <url><loc>${escapeXml(absoluteUrl(page.route))}</loc><lastmod>${NOW}</lastmod></url>`)
    .join("\n");
  fs.writeFileSync(
    path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
}

function writeRobotsAndDomain() {
  fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  fs.writeFileSync(path.join(ROOT, "ads.txt"), "google.com, pub-2494233247909241, DIRECT, f08c47fec0942fa0\n");
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
  const schemaItems = Array.isArray(schema) ? schema.filter(Boolean) : [schema].filter(Boolean);
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
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_CA">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(meta)}">
  <meta property="og:url" content="${escAttr(canonical)}">
  <meta property="og:image" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta property="og:image:secure_url" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${BRAND_NAME}: find dog grooming near me across Canada">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${SITE_URL}${OG_IMAGE_PATH}">
  <meta name="twitter:image:alt" content="${BRAND_NAME}: find dog grooming near me across Canada">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/assets/site.webmanifest">
  <link rel="preload" href="/assets/site.css" as="style">
  <link rel="stylesheet" href="/assets/site.css">
  ${schemaItems.map((item) => `<script type="application/ld+json">${safeJson(item)}</script>`).join("\n  ")}
  <script src="/assets/main.js" defer></script>
</head>
<body ${options.bodyAttrs || ""}>
  <a class="skip-link" href="#main">Skip to content</a>
  ${header(route)}
  <main id="main" class="page">${body}</main>
  ${footer()}
</body>
</html>
`;
}

function header(route) {
  const nav = [
    ["/dog-grooming/", "Dog Grooming"],
    ["/provinces/", "Browse by Province"],
    ["/cities/", "Cities"],
    ["/dog-grooming-near-me/", "Near Me"],
    ["/add-your-business/", "Add Your Business"],
  ];
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${BRAND_NAME} home"><img class="brand-mark" src="${LOGO_MARK_PATH}" width="40" height="40" alt="" decoding="async"><span class="brand-name">${BRAND_NAME} <span class="maple">◆</span></span></a>
      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false"><span></span></button>
      <nav class="site-nav" aria-label="Primary navigation">
        ${nav.map(([url, label]) => `<a href="${url}"${route === url ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h2>Dog Groomers Canada</h2>
        <p>Canada's static directory of dog grooming businesses. Find, compare, and connect with trusted local groomers near you.</p>
        <p class="copyright">&copy; ${new Date().getFullYear()} Dog Groomers Canada</p>
      </div>
      <div><h3>Browse</h3><a href="/dog-grooming/">Dog Grooming</a><a href="/dog-grooming-near-me/">Dog Grooming Near Me</a><a href="/provinces/">Provinces</a><a href="/cities/">Cities</a><a href="/services/">Services</a></div>
      <div><h3>Businesses</h3><a href="/add-your-business/">Add Your Business</a><a href="/for-businesses/">For Businesses</a><a href="/search/">Search Directory</a></div>
      <div><h3>Company</h3><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms of Use</a><a href="/sitemap/">HTML Sitemap</a></div>
      <div><h3>SEO</h3><a href="/sitemap.xml">XML Sitemap</a><a href="/robots.txt">Robots.txt</a><a href="/">doggroomerscanada.ca</a></div>
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
  actions.push(`<a class="btn btn-primary" href="${item.url}">View Profile</a>`);

  return `<article class="listing-card${compact ? " compact" : ""}">
    <a class="listing-image" href="${item.url}">${item.image ? `<img src="${escAttr(item.image)}" alt="${escAttr(item.title)} dog grooming listing photo" loading="lazy" referrerpolicy="no-referrer">` : dogFallback()}</a>
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
  return `<span class="rating"><span class="stars" aria-hidden="true">★★★★★</span> ${item.rating.toFixed(1)}${item.reviews ? ` (${item.reviews.toLocaleString()} reviews)` : ""}</span>`;
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

function detailRow(label, value) {
  return `<div class="detail-row"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
}

function homeMetaDescription(context) {
  return metaDescription(
    `Find dog grooming near you in Canada. Browse ${context.stats.listings.toLocaleString()} dog groomers by city, province, service, rating, phone, website, and map.`,
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
  if (listing.rating && listing.reviews) pieces.push(`${listing.rating.toFixed(1)} stars from ${listing.reviews.toLocaleString()} reviews`);
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
      localCount: listings.filter((listing) => service.patterns.some((pattern) => pattern.test(`${listing.services.join(" ")} ${listing.serviceText} ${listing.convenienceText}`))).length,
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
      width: 760,
      height: 180,
    },
    image: `${SITE_URL}${OG_IMAGE_PATH}`,
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
    image: listing.photos.length ? listing.photos : undefined,
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

function getNestedImages(get) {
  const images = [];
  for (let i = 0; i <= 4; i += 1) images.push(clean(get(`images/${i}/imageUrl`)));
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

function getRange(get, prefix, from, to) {
  const values = [];
  for (let i = from; i <= to; i += 1) values.push(clean(get(`${prefix}${i}`)));
  return values.filter(Boolean);
}

function buildFallbackDescription(title, city, province, rating, reviews) {
  const ratingText = rating ? ` with a ${rating.toFixed(1)} star rating${reviews ? ` from ${reviews.toLocaleString()} reviews` : ""}` : "";
  return `${title} is a dog grooming business in ${city}, ${province}${ratingText}. Confirm services, pricing, hours, and availability directly before booking.`;
}

function qualityScore(listing) {
  return (
    (listing.category && /groom/i.test(listing.category) ? 20 : 0) +
    (listing.rating || 0) * 12 +
    Math.min(listing.reviews, 500) / 12 +
    (listing.phone ? 8 : 0) +
    (listing.website ? 8 : 0) +
    (listing.image ? 5 : 0) +
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
          src: "/assets/apple-touch-icon.png",
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
  if (ADSENSE_CLIENT) {
    scripts.push(`<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">`);
    scripts.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`);
  }
  if (GOOGLE_ANALYTICS_ID) {
    scripts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}"></script>`);
    scripts.push(`<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());
  gtag("config", "${GOOGLE_ANALYTICS_ID}");
</script>`);
  }
  return scripts.join("\n  ");
}

function dogLogo() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20 17c-4.8 0-8.9 2.9-10.8 7.3L5.7 33c-.6 1.4.4 3 1.9 3H12v12.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V42h20v6.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V34l5.7-3.8c1.4-.9 1.6-2.9.4-4.1l-5.9-5.9c-.7-.7-1.6-1-2.5-1H38l-3.8-5.1c-.5-.7-1.2-1-2-1H25l-5 3.9Zm-.2 9.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Zm24.8 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Z"/></svg>`;
}

function dogFallback() {
  return `<span class="fallback" aria-hidden="true">${dogLogo()}</span>`;
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
