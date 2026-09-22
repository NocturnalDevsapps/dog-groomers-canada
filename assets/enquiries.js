(function () {
  "use strict";

  // Measure intent only: these events do not prove a connected call or booking.
  function send(name, parameters) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, parameters);
    } catch (_) {
      // Analytics must never prevent a call, outbound visit, or email preparation.
    }
  }

  function context(link) {
    const card = link.closest(".listing-card, .shortlist-item, [data-comparison-listing]");
    const profile = card && card.querySelector('a[href*="/groomers/"]');
    const path = profile ? new URL(profile.href, window.location.href).pathname : window.location.pathname;
    const match = path.match(/^\/groomers\/([^/]+)\/(?:([^/]+)\/)?[^/]+-([a-f0-9]{8})\/$/);
    if (!match) return null;
    return {
      listing_id: match[3],
      city_slug: match[2] || "unspecified",
      province_slug: match[1],
      link_placement: card ? (card.matches(".shortlist-item") ? "shortlist" : "directory_card") : "profile",
    };
  }

  function trackClick(event) {
    if (event.type === "auxclick" && event.button !== 1) return;
    if (event.type === "click" && event.button > 0) return;
    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const name = /^tel:/i.test(href) ? "phone_click" : link.dataset.enquiryEvent;
    if (!["phone_click", "booking_click", "listing_website_click", "directions_click"].includes(name)) return;
    const parameters = context(link);
    if (!parameters) return;
    if (name !== "phone_click") {
      const destination = new URL(href, window.location.href);
      if (!["http:", "https:"].includes(destination.protocol)) return;
      parameters.destination_domain = destination.hostname;
    }
    // Never include phone numbers, email addresses, query strings or form values.
    send(name, parameters);
  }

  document.addEventListener("click", trackClick);
  document.addEventListener("auxclick", trackClick);
  document.addEventListener("submit", function (event) {
    const form = event.target;
    if (form.id === "add-business-form" && form.checkValidity()) {
      send("listing_email_prepared", { form_id: "add_business", link_placement: "listing_form" });
    }
  }, true);
})();
