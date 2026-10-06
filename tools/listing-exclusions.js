"use strict";

const fs = require("node:fs");
const path = require("node:path");
const DEFAULT_FILE = path.join(__dirname, "../data/listing-exclusions.json");

function identityText(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

function websiteHost(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

function routePath(value) {
  if (!value) return "";
  try { return new URL(value, "https://doggroomerscanada.ca").pathname.replace(/\/?$/, "/"); }
  catch { return ""; }
}

function loadExclusions(file = DEFAULT_FILE) {
  // Required and fail closed: a missing/malformed prevention list must stop publication.
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (raw.version !== 1 || !Array.isArray(raw.listings)) throw new Error("Invalid listing exclusions registry");
  for (const entry of raw.listings) {
    if (!entry || !entry.name || !entry.reason || !entry.excludedAt ||
        !["listingIds", "routes", "sourceIds", "websiteHosts", "phones", "nameAliases", "cityAliases"].every((key) => Array.isArray(entry[key]) && entry[key].every((value) => typeof value === "string"))) {
      throw new Error("Invalid listing exclusion entry");
    }
  }
  return raw.listings;
}

function isExcludedListing(listing, exclusions) {
  const route = routePath(listing.url || listing.route);
  const host = websiteHost(listing.website);
  const phones = [listing.phone, listing.phoneRaw].map(phoneDigits).filter(Boolean);
  const sourceIds = [...(listing.sourceIds || []), listing.cid, listing.fid, listing.kgmid, listing.placeId].filter(Boolean).map(String);
  return exclusions.some((entry) =>
    (listing.id && entry.listingIds.includes(String(listing.id))) ||
    (route && entry.routes.some((value) => routePath(value) === route)) ||
    sourceIds.some((value) => entry.sourceIds.includes(value)) ||
    (host && entry.websiteHosts.some((value) => host === value || host.endsWith(`.${value}`))) ||
    phones.some((value) => entry.phones.some((phone) => phoneDigits(phone) === value)) ||
    (entry.nameAliases.some((name) => identityText(name) === identityText(listing.title || listing.name)) &&
      entry.cityAliases.some((city) => identityText(city) === identityText(listing.city)))
  );
}

module.exports = { loadExclusions, isExcludedListing };
