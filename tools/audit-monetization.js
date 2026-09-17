#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SITE_ID = "0268a860-d0bb-483b-b355-599bfc6e3594";
const SCRIPT_URL = `//scripts.scriptwrapper.com/tags/${SITE_ID}.js`;
const EXCLUDED_ROUTES = new Set([
  "/about/", "/add-your-business/", "/contact/", "/editorial-policy/",
  "/for-businesses/", "/privacy/", "/sitemap/", "/terms/",
]);
const files = execFileSync("git", ["ls-files", "-z", "--", "*.html"], { cwd: ROOT, maxBuffer: 10e6 })
  .toString().split("\0").filter(Boolean);
let eligible = 0;
let held = 0;
let excluded = 0;

for (const file of files) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const route = file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
  const noAds = file === "404.html" || /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  const journey = scripts.filter((match) => match[1].includes("scripts.scriptwrapper.com"));
  assert(!/adsbygoogle|ca-pub-2494233247909241|data-ad-placement=|class="ad-label"/i.test(html), `${file}: old AdSense integration remains`);
  assert.equal(journey.length, noAds ? 0 : 1, `${file}: incorrect Journey wrapper count`);
  if (noAds) {
    held += 1;
    continue;
  }
  eligible += 1;
  assert.equal(journey[0][1], SCRIPT_URL, `${file}: wrong Journey site ID`);
  assert(/async="async"/.test(journey[0][0]) && /data-noptimize="1"/.test(journey[0][0]) && /data-cfasync="false"/.test(journey[0][0]), `${file}: wrapper attributes changed`);
  assert(html.indexOf(journey[0][0]) < html.indexOf("</head>"), `${file}: wrapper is not in the head`);
  assert(html.includes("G-BY1BF23TD7"), `${file}: Google Analytics missing`);
  assert(html.includes("faves.grow.me/main.js"), `${file}: Grow missing`);
  const blocklists = [...html.matchAll(/id="ad-management-config-settings" data-blocklist-all="1"/g)];
  assert.equal(blocklists.length, EXCLUDED_ROUTES.has(route) ? 1 : 0, `${file}: incorrect ad exclusion`);
  if (blocklists.length) excluded += 1;
}

const source = fs.readFileSync(path.join(ROOT, "data/journey-ads.txt"), "utf8");
assert.equal(fs.readFileSync(path.join(ROOT, "ads.txt"), "utf8"), source, "Published ads.txt differs from the vendor file");
assert(source.includes("ownerdomain=doggroomerscanada.ca"), "Incorrect ads.txt owner domain");
assert(source.includes(`journeymv.com, ${SITE_ID}, DIRECT`), "Incorrect Journey seller ID");
assert(!source.includes("pub-2494233247909241"), "Old direct AdSense seller remains");
assert.equal(excluded, EXCLUDED_ROUTES.size, "An excluded route is missing");
console.log(`Monetization audit passed: ${files.length} HTML files, ${eligible} Journey wrappers, ${held} held/error/redirect pages without ads, ${excluded} explicit trust-page exclusions.`);
console.log("AdSense removed; Journey seller file, Google Analytics, and Grow verified.");
