#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const CLIENT_ID = "ca-pub-2494233247909241";
const SELLER_RECORD = "google.com, pub-2494233247909241, DIRECT, f08c47fec0942fa0";
const AD_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
const SLOTS = new Set(["9035205346", "4819416718", "8427489237"]);
const EXCLUDED_ROUTES = new Set([
  "/about/", "/add-your-business/", "/contact/", "/editorial-policy/",
  "/for-businesses/", "/privacy/", "/sitemap/", "/terms/",
]);
const files = execFileSync("git", ["ls-files", "-z", "--", "*.html"], { cwd: ROOT, maxBuffer: 10e6 })
  .toString().split("\0").filter(Boolean);

let eligible = 0;
let held = 0;
let excluded = 0;
let units = 0;

for (const file of files) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const route = file === "index.html" ? "/" : `/${file.replace(/index\.html$/, "")}`;
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const noAds = file === "404.html" || noindex || EXCLUDED_ROUTES.has(route);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  const loaders = scripts.filter((match) => match[1].includes("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"));
  const placements = [...html.matchAll(/<div class="ad-placement[^>]*>[\s\S]*?<\/div>/g)];

  assert(!/scripts\.scriptwrapper\.com|faves\.grow\.me|data-grow-initializer|ad-management-config-settings|journeymv\.com/i.test(html), `${file}: Mediavine integration remains`);
  assert.equal(loaders.length, noAds ? 0 : 1, `${file}: incorrect AdSense loader count`);
  if (noAds) {
    assert.equal(placements.length, 0, `${file}: ad on a held, excluded, or error page`);
    if (EXCLUDED_ROUTES.has(route)) excluded++;
    else held++;
    continue;
  }

  eligible++;
  assert.equal(loaders[0][1], AD_URL, `${file}: unexpected AdSense publisher`);
  assert(/\basync\b/.test(loaders[0][0]) && /crossorigin="anonymous"/.test(loaders[0][0]), `${file}: AdSense loader attributes changed`);
  assert(html.indexOf(loaders[0][0]) < html.indexOf("</head>"), `${file}: AdSense loader is not in the head`);
  assert(html.includes("G-BY1BF23TD7"), `${file}: Google Analytics missing`);

  const pushes = [...html.matchAll(/\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\)/g)];
  assert.equal(pushes.length, placements.length, `${file}: unit initialization mismatch`);
  for (const [placement] of placements) {
    assert(placement.includes('aria-label="Advertisement"') && placement.includes('class="ad-label">Advertisement'), `${file}: missing ad label`);
    assert(placement.includes(`data-ad-client="${CLIENT_ID}"`), `${file}: wrong unit publisher`);
    const slot = /data-ad-slot="(\d+)"/.exec(placement)?.[1];
    assert(SLOTS.has(slot), `${file}: unknown unit slot`);
    assert(placement.includes('data-full-width-responsive="true"'), `${file}: nonresponsive unit`);
  }
  units += placements.length;
}

assert.equal(excluded, EXCLUDED_ROUTES.size, "A trust or submission route is missing");
assert.equal(fs.readFileSync(path.join(ROOT, "ads.txt"), "utf8"), `${SELLER_RECORD}\n`, "Root ads.txt does not match this site's AdSense seller record");
assert(!fs.existsSync(path.join(ROOT, "data/journey-ads.txt")), "Old Journey seller file remains");
console.log(`Monetization audit passed: ${files.length} HTML files, ${eligible} eligible AdSense loaders, ${units} labeled units, ${held} held/error/redirect pages and ${excluded} trust/submission pages without ads.`);
