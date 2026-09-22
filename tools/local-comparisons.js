"use strict";

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function validateReviews(cities, listings) {
  const byUrl = new Map(listings.map((listing) => [listing.url, listing]));
  for (const [route, review] of Object.entries(cities)) {
    if (!/^\/provinces\/[^/]+\/[^/]+\/$/.test(route) || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt)) throw new Error(`Invalid city review: ${route}`);
    for (const business of review.businesses) {
      const listing = byUrl.get(business.profileUrl);
      if (!listing || listing.cityUrl !== route || !business.facts.length || !business.sourceUrls.length) throw new Error(`Invalid comparison profile: ${business.profileUrl}`);
      for (const url of [...business.sourceUrls, ...(business.bookingUrl ? [business.bookingUrl] : [])]) {
        if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error(`Invalid comparison source: ${url}`);
      }
    }
  }
  return cities;
}

function sources(business) {
  return business.sourceUrls.map((url, i) => `<a href="${escape(url)}" target="_blank" rel="nofollow noopener">Official source${business.sourceUrls.length > 1 ? ` ${i + 1}` : ""}</a>`).join(" · ");
}

function booking(business) {
  return business.bookingUrl ? `<p><a class="link-arrow" data-enquiry-event="booking_click" href="${escape(business.bookingUrl)}" target="_blank" rel="nofollow noopener">Open appointment options →</a></p>` : "";
}

function cityComparison(route, cities) {
  const review = cities[route];
  if (!review) return "";
  return `<details class="info-card local-comparison" id="local-comparison">
    <summary><strong>Compare services and booking options checked on official websites</strong></summary>
    <p>${escape(review.intro)}</p>
    <p class="muted">Checked <time datetime="${review.reviewedAt}">${review.reviewedAt}</time>. These examples compare published services and logistics; they are not a ranking or an endorsement. Confirm current details with the business.</p>
    <div class="grid-3">${review.businesses.map((business) => `<article data-comparison-listing>
      <h3><a href="${escape(business.profileUrl)}">${escape(business.name)}</a></h3>
      <p><strong>${escape(business.format)}</strong></p>
      <p>${escape(business.comparison)}</p>
      <p><strong>Before booking:</strong> ${escape(business.confirm)}</p>
      <p class="muted">${sources(business)}</p>${booking(business)}
    </article>`).join("")}</div>
  </details>`;
}

function profileReview(route, cities) {
  for (const review of Object.values(cities)) {
    const business = review.businesses.find((item) => item.profileUrl === route);
    if (!business) continue;
    return `<section class="section">
      <h2>Official website details checked</h2>
      <p class="muted">Source review: <time datetime="${review.reviewedAt}">${review.reviewedAt}</time>. These are published business details, not an independent inspection or a guarantee of availability.</p>
      <ul>${business.facts.map((fact) => `<li>${escape(fact)}</li>`).join("")}</ul>
      <p><strong>Before booking:</strong> ${escape(business.confirm)}</p>
      <p>${sources(business)}</p>${booking(business)}
    </section>`;
  }
  return "";
}

module.exports = { validateReviews, cityComparison, profileReview };
