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
const coverage = {
  websiteServices: 0,
  websiteAccess: 0,
  websitePolicies: 0,
  breedExperience: 0,
  pricing: 0,
  appointments: 0,
  accessibility: 0,
  amenities: 0,
  reviewThemes: 0,
};

const files = findIndexFiles(GROOMERS_DIR);
let crawlableCount = 0;
let redirectCount = 0;
const crawlableRoutes = new Set();

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  const isNoindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (isNoindex) {
    redirectCount += 1;
    if (!/<meta\s+http-equiv="refresh"/i.test(html)) fail(relative, "noindex page is not a redirect");
    continue;
  }

  crawlableCount += 1;
  const expectedRoute = `/${relative.replace(/index\.html$/, "")}`;
  crawlableRoutes.add(expectedRoute);
  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const canonicalMatches = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/gi)];
  const leadMatches = [...html.matchAll(/<p\s+class="lead">([\s\S]*?)<\/p>/gi)];
  const signalSections = [...html.matchAll(/data-profile-signals/g)];

  if (h1Matches.length !== 1) fail(relative, `expected one H1, found ${h1Matches.length}`);
  if (canonicalMatches.length !== 1) fail(relative, `expected one canonical, found ${canonicalMatches.length}`);
  if (leadMatches.length !== 1) fail(relative, `expected one profile lead, found ${leadMatches.length}`);
  if (signalSections.length !== 1) fail(relative, `expected one business-specific signal section, found ${signalSections.length}`);
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
    websitePolicies: "Website policies",
    breedExperience: "Breed experience",
    pricing: "Pricing signal",
    appointments: "Appointments",
    accessibility: "Accessibility",
    amenities: "Amenities",
  })) {
    if (signalBlock.includes(`>${label}<`)) coverage[key] += 1;
  }
  if (html.includes("review-theme-summary")) coverage.reviewThemes += 1;

  const localBusiness = getLocalBusinessSchema(html);
  if (!localBusiness) {
    fail(relative, "missing valid LocalBusiness schema");
  } else {
    if (normalizeText(localBusiness.name) !== h1) fail(relative, "schema name differs from H1");
    if (normalizeText(localBusiness.description) !== lead) fail(relative, "schema description differs from visible lead");
    if (localBusiness.url !== `${SITE_ORIGIN}${expectedRoute}`) fail(relative, "schema URL differs from canonical route");
  }
  if (/\b(?:undefined|NaN)\b/.test(stripScripts(html))) fail(relative, "rendered page contains undefined or NaN");
}

reportDuplicates("description", descriptions);
reportDuplicates("meta description", metaDescriptions);
auditSitemap(crawlableRoutes);

wordCounts.sort((a, b) => a - b);
console.log(`Listing profiles: ${crawlableCount.toLocaleString()} crawlable, ${redirectCount.toLocaleString()} redirects`);
console.log(`Unique leads: ${descriptions.size.toLocaleString()} of ${crawlableCount.toLocaleString()}`);
console.log(
  `Lead words: min ${percentile(wordCounts, 0)}, p10 ${percentile(wordCounts, 0.1)}, median ${percentile(wordCounts, 0.5)}, p90 ${percentile(wordCounts, 0.9)}, max ${percentile(wordCounts, 1)}`,
);
console.log(
  `Signal coverage: website services ${coverage.websiteServices.toLocaleString()}, website access ${coverage.websiteAccess.toLocaleString()}, website policies ${coverage.websitePolicies.toLocaleString()}, breed experience ${coverage.breedExperience.toLocaleString()}, pricing ${coverage.pricing.toLocaleString()}, appointment links ${coverage.appointments.toLocaleString()}, accessibility ${coverage.accessibility.toLocaleString()}, amenities ${coverage.amenities.toLocaleString()}, review themes ${coverage.reviewThemes.toLocaleString()}`,
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
