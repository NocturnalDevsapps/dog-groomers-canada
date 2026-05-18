(function () {
  "use strict";

  const DATA_URL = "/assets/search-index.json";
  const locationKey = "dgc:last-location";
  let indexPromise;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setStatus(target, message) {
    if (!target) return;
    target.textContent = message || "";
  }

  function getBasePath() {
    const base = document.querySelector("meta[name='dgc-base-path']");
    return base ? base.getAttribute("content") || "" : "";
  }

  function withBase(path) {
    const base = getBasePath();
    if (!base || path.startsWith("http")) return path;
    return `${base}${path}`;
  }

  async function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(withBase(DATA_URL), { credentials: "same-origin" }).then((response) => {
        if (!response.ok) throw new Error("Could not load directory data.");
        return response.json();
      });
    }
    return indexPromise;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function haversineKm(a, b) {
    const radius = 6371;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function getSavedLocation() {
    try {
      const raw = localStorage.getItem(locationKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === "number" && typeof parsed.lng === "number") return parsed;
    } catch (error) {
      return null;
    }
    return null;
  }

  function saveLocation(position) {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      at: Date.now(),
    };
    localStorage.setItem(locationKey, JSON.stringify(coords));
    return coords;
  }

  function requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not available in this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 9000,
        maximumAge: 1000 * 60 * 20,
      });
    });
  }

  function nearestCity(cities, coords) {
    return cities
      .filter((city) => Number.isFinite(city.lat) && Number.isFinite(city.lng))
      .map((city) => ({ ...city, distance: haversineKm(coords, city) }))
      .sort((a, b) => a.distance - b.distance)[0];
  }

  function nearestListings(listings, coords, limit) {
    return listings
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map((item) => ({ ...item, distance: haversineKm(coords, item) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit || 24);
  }

  function ratingMarkup(item) {
    const rating = Number(item.rating || 0);
    if (!rating) return "";
    const reviews = Number(item.reviews || 0);
    return `<span class="rating"><span class="stars" aria-hidden="true">★★★★★</span> ${rating.toFixed(1)}${reviews ? ` (${reviews.toLocaleString()} reviews)` : ""}</span>`;
  }

  function imageMarkup(item) {
    if (item.image) {
      return `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)} dog grooming listing photo" loading="lazy" referrerpolicy="no-referrer">`;
    }
    return `<span class="fallback" aria-hidden="true">${dogIcon()}</span>`;
  }

  function cardMarkup(item) {
    const distance = typeof item.distance === "number" ? `<span>${item.distance.toFixed(1)} km away</span>` : "";
    const serviceText = item.services && item.services.length ? `<p class="services">${escapeHtml(item.services.slice(0, 4).join(" · "))}</p>` : "";
    const website = item.website
      ? `<a class="plain-action" href="${escapeAttr(item.website)}" rel="nofollow noopener" target="_blank">${globeIcon()} Website</a>`
      : "";
    const phone = item.phone ? `<a class="plain-action" href="tel:${escapeAttr(item.phoneRaw || item.phone)}">${phoneIcon()} ${escapeHtml(item.phone)}</a>` : "";
    return `<article class="listing-card">
      <a class="listing-image" href="${escapeAttr(withBase(item.url))}">${imageMarkup(item)}</a>
      <div class="listing-body">
        <h3><a class="listing-title" href="${escapeAttr(withBase(item.url))}">${escapeHtml(item.title)}</a></h3>
        <div class="meta-line">${ratingMarkup(item)}<span>${escapeHtml(item.city)}, ${escapeHtml(item.provinceCode || item.province)}</span>${distance}</div>
        ${item.address ? `<p class="address">${pinIcon()} ${escapeHtml(item.address)}</p>` : ""}
        ${serviceText}
      </div>
      <div class="card-actions">
        ${phone}
        ${website}
        <a class="btn btn-primary" href="${escapeAttr(withBase(item.url))}">View Profile</a>
      </div>
    </article>`;
  }

  function runSearch(index, query, where) {
    const terms = normalizeText(`${query} ${where}`).split(/\s+/).filter(Boolean);
    const whereText = normalizeText(where);
    const queryText = normalizeText(query);
    let results = index.listings;

    if (whereText) {
      results = results.filter((item) => {
        const place = normalizeText(`${item.city} ${item.province} ${item.provinceCode} ${item.address}`);
        return place.includes(whereText) || whereText.includes(normalizeText(item.city));
      });
    }

    if (queryText) {
      results = results.filter((item) => {
        const haystack = normalizeText(`${item.title} ${item.category || ""} ${item.services.join(" ")} ${item.city} ${item.province}`);
        return terms.every((term) => haystack.includes(term));
      });
    }

    return results
      .map((item) => {
        const haystack = normalizeText(`${item.title} ${item.city} ${item.province} ${item.services.join(" ")}`);
        const score =
          (normalizeText(item.title).includes(queryText) ? 8 : 0) +
          (whereText && normalizeText(item.city).includes(whereText) ? 6 : 0) +
          Number(item.rating || 0) +
          Math.min(Number(item.reviews || 0) / 100, 5) +
          terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 80);
  }

  function initNav() {
    const toggle = $(".nav-toggle");
    const nav = $(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  function initSearchForms() {
    $$("[data-search-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const q = form.querySelector("[name='q']")?.value || "";
        const where = form.querySelector("[name='where']")?.value || "";
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (where.trim()) params.set("where", where.trim());

        try {
          const index = await loadIndex();
          const place = normalizeText(where);
          if (!q.trim() && place) {
            const exactCity = index.cities.find((city) => normalizeText(`${city.city} ${city.province} ${city.provinceCode}`) === place || normalizeText(city.city) === place);
            if (exactCity) {
              window.location.href = withBase(exactCity.url);
              return;
            }
          }
        } catch (error) {
          // Search page can still handle the query if data is temporarily unavailable here.
        }

        window.location.href = `${withBase("/search/")}${params.toString() ? `?${params.toString()}` : ""}`;
      });
    });
  }

  function initLocationButtons() {
    $$("[data-use-location]").forEach((button) => {
      button.addEventListener("click", async () => {
        const status = document.querySelector(button.getAttribute("data-status-target") || "[data-location-status]");
        const original = button.textContent;
        button.disabled = true;
        setStatus(status, "Checking your location...");
        button.textContent = "Locating...";
        try {
          const position = await requestLocation();
          const coords = saveLocation(position);
          const index = await loadIndex();
          const city = nearestCity(index.cities, coords);
          setStatus(status, city ? `Nearest directory page: ${city.city}, ${city.provinceCode || city.province}.` : "Location saved.");

          if (document.body.dataset.page === "near-me") {
            renderNearMe(coords, index);
          } else if (city) {
            window.location.href = `${withBase(city.url)}?near=1`;
          }
        } catch (error) {
          setStatus(status, error.message || "Location permission was not granted.");
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      });
    });
  }

  async function initSearchPage() {
    const mount = $("[data-search-results]");
    if (!mount) return;
    const count = $("[data-result-count]");
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const where = params.get("where") || "";
    const qInput = document.querySelector("[name='q']");
    const whereInput = document.querySelector("[name='where']");
    if (qInput) qInput.value = q;
    if (whereInput) whereInput.value = where;

    mount.innerHTML = `<div class="empty-state">Loading directory results...</div>`;
    try {
      const index = await loadIndex();
      const results = runSearch(index, q, where);
      if (count) count.textContent = `${results.length.toLocaleString()} results`;
      mount.innerHTML = results.length
        ? results.map(cardMarkup).join("")
        : `<div class="empty-state"><h2>No exact matches found</h2><p>Try searching by city, province, service, or business name.</p></div>`;
    } catch (error) {
      mount.innerHTML = `<div class="empty-state"><h2>Search data could not load</h2><p>Please try again in a moment, or browse by province from the links below.</p></div>`;
    }
  }

  async function initNearMePage() {
    if (document.body.dataset.page !== "near-me") return;
    const saved = getSavedLocation();
    if (!saved) return;
    try {
      const index = await loadIndex();
      renderNearMe(saved, index);
    } catch (error) {
      setStatus($("[data-location-status]"), "Could not load nearby listings yet.");
    }
  }

  function renderNearMe(coords, index) {
    const mount = $("[data-nearby-results]");
    const count = $("[data-result-count]");
    if (!mount) return;
    const city = nearestCity(index.cities, coords);
    const listings = nearestListings(index.listings, coords, 36);
    if (count) count.textContent = `${listings.length.toLocaleString()} nearby groomers`;
    const cityMarkup = city
      ? `<div class="notice"><strong>Closest city page:</strong> <a href="${escapeAttr(withBase(city.url))}">${escapeHtml(city.city)}, ${escapeHtml(city.provinceCode || city.province)}</a> (${city.distance.toFixed(1)} km away)</div>`
      : "";
    mount.innerHTML = `${cityMarkup}<div class="listing-stack">${listings.map(cardMarkup).join("")}</div>`;
  }

  function initNearbyHint() {
    const mount = $("[data-nearest-city]");
    const saved = getSavedLocation();
    if (!mount || !saved) return;
    loadIndex()
      .then((index) => {
        const city = nearestCity(index.cities, saved);
        if (!city) return;
        mount.innerHTML = `<a class="link-arrow" href="${escapeAttr(withBase(city.url))}">Browse groomers near ${escapeHtml(city.city)} →</a>`;
      })
      .catch(() => {});
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function dogIcon() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M21 17c-4.7 0-8.8 2.8-10.6 7.1L6.7 33c-.6 1.4.4 3 1.9 3H13v12.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V42h20v6.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V34l5.5-3.7c1.4-.9 1.6-2.9.4-4.1l-5.8-5.8c-.7-.7-1.6-1-2.5-1H39l-3.8-5.1c-.5-.7-1.2-1-2-1H21Zm-2.2 9.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Zm24.8 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Z"/></svg>`;
  }

  function phoneIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.3 1.3.4 2.6.6 4 .6.7 0 1.2.5 1.2 1.2v3.5c0 .7-.5 1.2-1.2 1.2C10.2 22 2 13.8 2 3.4 2 2.7 2.5 2.2 3.2 2.2h3.5c.7 0 1.2.5 1.2 1.2 0 1.4.2 2.8.6 4 .1.4 0 .8-.3 1.2l-1.6 2.2Z"/></svg>`;
  }

  function globeIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 9h-3.3a15.8 15.8 0 0 0-1.1-5 8.1 8.1 0 0 1 4.4 5ZM12 4.1c.7 1 1.5 3.1 1.8 6.9h-3.6c.3-3.8 1.1-5.9 1.8-6.9ZM4.3 13h3.9c.1 1.7.4 3.3.8 4.6A8.1 8.1 0 0 1 4.3 13Zm3.9-2H4.3A8.1 8.1 0 0 1 9 6.4 19 19 0 0 0 8.2 11Zm3.8 8.9c-.7-1-1.5-3-1.8-6.9h3.6c-.3 3.9-1.1 5.9-1.8 6.9Zm3-2.3c.4-1.3.7-2.9.8-4.6h3.9a8.1 8.1 0 0 1-4.7 4.6Z"/></svg>`;
  }

  function pinIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" style="display:inline;width:1em;height:1em;vertical-align:-.13em"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initSearchForms();
    initLocationButtons();
    initSearchPage();
    initNearMePage();
    initNearbyHint();
  });
})();
