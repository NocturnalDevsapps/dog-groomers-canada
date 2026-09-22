"use strict";

const shopping = require("../data/guide-shopping.json");
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const disclosure = "As an Amazon Associate I earn from qualifying purchases.";

function amazonSearchUrl(query) {
  if (!query.trim() || !/^[-a-z0-9]+-\d{2}$/.test(shopping.associateTag)) throw new Error("Amazon links need a search term and valid Associate tag.");
  const url = new URL("https://www.amazon.ca/s");
  url.searchParams.set("k", query);
  url.searchParams.set("tag", shopping.associateTag);
  return url.href;
}

function guideShoppingDisclosure(article) {
  return shopping.guides[article.slug]
    ? `<p class="affiliate-disclosure"><strong>Affiliate disclosure:</strong> ${disclosure} This guide includes optional shopping links. <a href="/editorial-policy/#affiliate-links">How we choose links</a>.</p>`
    : "";
}

function guideShoppingSection(article) {
  const guide = shopping.guides[article.slug];
  if (!guide) return "";
  return `<section class="article-section" id="choosing-grooming-tools" style="scroll-margin-top:94px">
    <h2>${escape(guide.heading)}</h2>
    <p>${escape(guide.intro)}</p>
    <p><strong>About these links:</strong> The paid links below open Amazon.ca search results so you can compare sizes and designs. We have not tested individual products in those results. Check each seller's specifications, instructions and return terms before choosing.</p>
    ${guide.items.map((item) => `<h3>${escape(item.name)}</h3>
      <p>${escape(item.advice)}</p>
      <p>${escape(item.caution)}</p>
      <p><a href="${escape(amazonSearchUrl(item.query))}" rel="sponsored nofollow noopener" target="_blank">${escape(item.linkLabel)} (paid link)</a></p>`).join("\n")}
    <p><strong>Further reading:</strong> ${guide.sources.map((source) => `<a href="${escape(source.url)}" target="_blank" rel="noopener">${escape(source.label)}</a>`).join(" · ")}</p>
  </section>`;
}

function guideShoppingText(article) {
  const guide = shopping.guides[article.slug];
  return guide ? [guide.heading, guide.intro, ...guide.items.flatMap((item) => [item.name, item.advice, item.caution])] : [];
}

module.exports = { shopping, amazonSearchUrl, guideShoppingDisclosure, guideShoppingSection, guideShoppingText };
