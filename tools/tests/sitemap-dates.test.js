"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateUpdates, lastmodTag } = require("../sitemap-dates");

test("unknown dates are omitted and rebuild dates do not alter documented lastmod", () => {
  const updates = { "/example/": { date: "2026-09-21", note: "Substantive content review" } };
  for (const today of ["2026-09-21", "2026-12-01"]) {
    validateUpdates(updates, today);
    assert.equal(lastmodTag("/example/", updates), "<lastmod>2026-09-21</lastmod>");
    assert.equal(lastmodTag("/unknown/", updates), "");
  }
});
test("future, impossible and undocumented dates fail validation", () => {
  for (const entry of [{date:"2026-09-23",note:"Future"}, {date:"2026-02-30",note:"Impossible"}, {date:"2026-09-21"}]) {
    assert.throws(() => validateUpdates({"/example/":entry}, "2026-09-21"));
  }
});
