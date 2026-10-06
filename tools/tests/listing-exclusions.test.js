"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadExclusions, isExcludedListing } = require("../listing-exclusions");
const cases = require("./listing-exclusion-cases.json");
const exclusions = loadExclusions();

for (const item of cases) {
  test(item.label, () => assert.equal(isExcludedListing(item.listing, exclusions), item.excluded));
}

test("a missing or malformed prevention registry fails closed", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dgc-exclusion-test-"));
  const file = path.join(directory, "registry.json");
  try {
    assert.throws(() => loadExclusions(file));
    fs.writeFileSync(file, '{"version":1,"listings":[{"name":"Invalid"}]}');
    assert.throws(() => loadExclusions(file), /Invalid listing exclusion/);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
