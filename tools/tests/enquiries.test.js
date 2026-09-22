"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const script = fs.readFileSync(path.join(__dirname, "../../assets/enquiries.js"), "utf8");
const profile = "/groomers/ontario/toronto/example-toronto-on-1234abcd/";

function harness(page = profile) {
  const events = [], listeners = {};
  const window = { location: { href: `https://doggroomerscanada.ca${page}`, pathname: page }, gtag: (...args) => events.push(args) };
  vm.runInNewContext(script, { window, URL, document: { addEventListener: (name, fn) => { listeners[name] = fn; } } });
  return { events, listeners, window };
}
function click(h, href, name, card, type = "click", button = 0) {
  const anchor = { dataset: { enquiryEvent: name }, getAttribute: () => href, closest: () => card || null };
  const event = { type, button, target: { closest: () => anchor }, preventDefault: () => { throw Error("Navigation was blocked"); } };
  h.listeners[type](event);
}

test("phone intent contains a listing ID and city, never the phone number", () => {
  const h = harness(); click(h, "tel:+14165551234");
  assert.equal(h.events.length, 1);
  assert.equal(h.events[0][1], "phone_click");
  assert.equal(h.events[0][2].listing_id, "1234abcd");
  assert.equal(h.events[0][2].city_slug, "toronto");
  assert.ok(!JSON.stringify(h.events).includes("4165551234"));
});
test("explicit booking and website actions remain distinct and strip query strings", () => {
  const h = harness();
  click(h, "https://booking.example.test/start?email=private@example.test", "booking_click");
  click(h, "https://example.test/", "listing_website_click");
  assert.deepEqual(h.events.map(x => x[1]), ["booking_click", "listing_website_click"]);
  assert.equal(h.events[0][2].destination_domain, "booking.example.test");
  assert.ok(!JSON.stringify(h.events).includes("private"));
});
test("dynamically inserted search cards and shortlists retain the clicked business", () => {
  for (const shortlist of [false, true]) {
    const h = harness("/search/");
    const card = { querySelector: () => ({ href: `https://doggroomerscanada.ca${profile}` }), matches: () => shortlist };
    click(h, "tel:+14165551234", undefined, card);
    assert.equal(h.events[0][2].listing_id, "1234abcd");
    assert.equal(h.events[0][2].link_placement, shortlist ? "shortlist" : "directory_card");
  }
});
test("unmarked sources, right clicks and unrelated contact links are not enquiries", () => {
  const h = harness(); click(h, "https://example.test/source");
  click(h, "https://example.test/", "booking_click", null, "auxclick", 2);
  const unrelated = harness("/contact/"); click(unrelated, "tel:+14165551234");
  assert.equal(h.events.length + unrelated.events.length, 0);
});
test("middle-click and keyboard activation count once", () => {
  const h = harness(); click(h, "https://example.test/", "booking_click", null, "auxclick", 1);
  click(h, "https://example.test/", "booking_click", null, "click", 0);
  assert.equal(h.events.length, 2);
});
test("valid email preparation counts without reading or transmitting form fields", () => {
  const h = harness("/add-your-business/");
  h.listeners.submit({ target: { id: "add-business-form", checkValidity: () => false } });
  assert.equal(h.events.length, 0);
  h.listeners.submit({ target: { id: "add-business-form", checkValidity: () => true } });
  assert.equal(h.events[0][1], "listing_email_prepared");
  assert.deepEqual(Object.keys(h.events[0][2]).sort(), ["form_id", "link_placement"]);
});
test("blocked or failing analytics does not stop navigation", () => {
  const h = harness(); h.window.gtag = undefined; assert.doesNotThrow(() => click(h, "tel:+14165551234"));
  h.window.gtag = () => { throw Error("blocked"); }; assert.doesNotThrow(() => click(h, "tel:+14165551234"));
});
