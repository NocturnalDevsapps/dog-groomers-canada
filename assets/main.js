(function () {
  "use strict";

  const DATA_URL = "/assets/search-index.json";
  const locationKey = "dgc:last-location";
  const shortlistKey = "dgc:groomer-shortlist:v1";
  const shortlistLimit = 4;
  const nearbySearchRadiusKm = 35;
  let indexPromise;
  let shortlistUrls = readShortlistUrls();

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
      indexPromise = fetch(withBase(DATA_URL), { credentials: "same-origin", cache: "no-cache" }).then((response) => {
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

  function normalizePlace(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function serviceKeywordMap(services) {
    const aliases = {
      "dog-haircuts": "dog haircuts haircut haircuts full groom full grooming styling trim clipping breed cut breed specific grooming",
      "nail-trimming": "dog nail trimming nail trims nail trim nails clipping grinding nail grind pawdicure",
      "puppy-grooming": "puppy grooming puppy groom first groom intro groom puppy bath",
      "bath-and-brush": "bath and brush bath brush dog bath dog wash washing coat cleaning tidy up brush out",
      deshedding: "dog de-shedding deshedding de shedding shedding undercoat blowout undercoat removal",
      "mobile-dog-grooming": "mobile dog grooming mobile grooming house call at home grooming van grooming",
      "teeth-cleaning": "dog teeth brushing teeth cleaning tooth brushing dental add on breath",
      dematting: "dog de-matting dematting de matting matted coat mat removal tangled coat coat rescue",
      "cat-grooming": "cat grooming cats feline grooming",
    };
    return new Map(
      (services || []).map((service) => [
        service.slug,
        `${service.slug.replace(/-/g, " ")} ${service.name || ""} ${service.short || ""} ${aliases[service.slug] || ""}`,
      ]),
    );
  }

  function listingSearchHaystack(item, serviceTerms) {
    const serviceText = (item.serviceSlugs || []).map((slug) => serviceTerms.get(slug) || slug.replace(/-/g, " ")).join(" ");
    return normalizeText(`${item.title} ${item.category || ""} ${item.services.join(" ")} ${serviceText} ${item.city} ${item.province} ${item.provinceCode || ""}`);
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

  function uniqueListings(listings) {
    const seen = new Set();
    return listings.filter((item) => {
      const key = item.url || `${item.title}|${item.address}|${item.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function listingMatchesCity(item, city) {
    return normalizePlace(item.city) === normalizePlace(city.city) && normalizePlace(item.provinceCode || item.province) === normalizePlace(city.provinceCode || city.province);
  }

  function resultsUrl(url) {
    if (!url) return withBase("/search/#results");
    const path = withBase(url);
    return path.includes("#") ? path : `${path}#results`;
  }

  function serviceCitySearchUrl(city, serviceSlug) {
    const params = new URLSearchParams({
      service: serviceSlug,
      where: `${city.city}, ${city.provinceCode || city.province}`,
      near: "1",
    });
    return withBase(`/search/?${params.toString()}#results`);
  }

  function ratingMarkup(item) {
    const rating = Number(item.rating || 0);
    if (!rating) return "";
    const reviews = Number(item.reviews || 0);
    const reviewLabel = reviews === 1 ? "review" : "reviews";
    return `<span class="rating"><span class="stars" aria-hidden="true">★</span> ${rating.toFixed(1)}${reviews ? ` (${reviews.toLocaleString()} ${reviewLabel})` : ""}</span>`;
  }

  function imageMarkup(item) {
    if (!item.image) return `<span class="fallback image-unavailable" aria-hidden="true">${fallbackDogIcon()}</span>`;
    const fallbackAttrs = item.fallbackImage && item.fallbackImage !== item.image ? ` data-fallback-image="${escapeAttr(item.fallbackImage)}" data-fallback-alt="${escapeAttr(`${item.title} dog grooming listing photo`)}"` : "";
    return `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(`${item.title} dog grooming listing photo`)}" loading="lazy" referrerpolicy="no-referrer"${fallbackAttrs}>`;
  }

  function fallbackDogIcon() {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20 17c-4.8 0-8.9 2.9-10.8 7.3L5.7 33c-.6 1.4.4 3 1.9 3H12v12.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V42h20v6.2c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V34l5.7-3.8c1.4-.9 1.6-2.9.4-4.1l-5.9-5.9c-.7-.7-1.6-1-2.5-1H38l-3.8-5.1c-.5-.7-1.2-1-2-1H25l-5 3.9Zm-.2 9.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Zm24.8 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2Z"/></svg>`;
  }

  function replaceBrokenListingImage(img) {
    if (!img || !img.closest) return;
    if (!img.matches("[data-fallback-image]") && !img.closest(".listing-image, .profile-photo, .photo-grid")) return;
    const fallbackImage = img.getAttribute("data-fallback-image") || "";
    if (!fallbackImage) {
      img.hidden = true;
      img.style.display = "none";
      img.classList.add("is-broken");
      return;
    }
    if (img.getAttribute("src") === fallbackImage || img.dataset.fallbackApplied === "1") {
      img.hidden = true;
      img.style.display = "none";
      img.classList.add("is-broken");
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.hidden = false;
    img.style.display = "";
    img.classList.remove("is-broken");
    img.src = fallbackImage;
    img.alt = img.getAttribute("data-fallback-alt") || img.alt;
  }

  function revealLoadedListingImage(img) {
    if (!img || !img.closest || !img.closest(".listing-image, .profile-photo, .photo-grid")) return;
    if (!img.naturalWidth) return;
    img.hidden = false;
    img.style.display = "";
    img.classList.remove("is-broken");
  }

  function initImageFallbacks() {
    $$("img").forEach((img) => {
      if (!img.matches("[data-fallback-image]") && !img.closest(".listing-image, .profile-photo, .photo-grid")) return;
      if (img.dataset.imageFallbackBound === "1") return;
      img.dataset.imageFallbackBound = "1";
      img.addEventListener("load", () => revealLoadedListingImage(img));
      if (img.complete && img.naturalWidth === 0) {
        replaceBrokenListingImage(img);
        return;
      }
      if (img.complete) revealLoadedListingImage(img);
      img.addEventListener("error", () => replaceBrokenListingImage(img), { once: true });
    });
  }

  window.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) replaceBrokenListingImage(event.target);
    },
    true,
  );

  function cardMarkup(item) {
    const distance = typeof item.distance === "number" ? `<span>${item.distance.toFixed(1)} km away</span>` : "";
    const serviceText = item.services && item.services.length ? `<p class="services">${escapeHtml(item.services.slice(0, 4).join(" · "))}</p>` : "";
    const website = item.website
      ? `<a class="plain-action" href="${escapeAttr(item.website)}" rel="nofollow noopener" target="_blank">${globeIcon()} Website</a>`
      : "";
    const phone = item.phone ? `<a class="plain-action" href="tel:${escapeAttr(item.phoneRaw || item.phone)}">${phoneIcon()} ${escapeHtml(item.phone)}</a>` : "";
    const isSaved = shortlistUrls.includes(item.url);
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
        <button class="plain-action shortlist-toggle" type="button" data-shortlist-toggle data-listing-url="${escapeAttr(item.url)}" data-listing-name="${escapeAttr(item.title)}" aria-label="${isSaved ? "Remove" : "Save"} ${escapeAttr(item.title)} ${isSaved ? "from saved groomers" : "to compare"}" aria-pressed="${isSaved ? "true" : "false"}">${isSaved ? "★ Saved" : "☆ Save to compare"}</button>
        <a class="btn btn-primary" href="${escapeAttr(withBase(item.url))}">View Profile</a>
      </div>
    </article>`;
  }

  function readShortlistUrls() {
    try {
      const saved = JSON.parse(localStorage.getItem(shortlistKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return [...new Set(saved.filter((url) => typeof url === "string" && url.startsWith("/groomers/")))].slice(0, shortlistLimit);
    } catch (error) {
      return [];
    }
  }

  function persistShortlist() {
    try {
      if (shortlistUrls.length) localStorage.setItem(shortlistKey, JSON.stringify(shortlistUrls));
      else localStorage.removeItem(shortlistKey);
    } catch (error) {
      // The shortlist still works for this page view when browser storage is blocked.
    }
  }

  function updateShortlistControls() {
    $$('[data-shortlist-toggle]').forEach((button) => {
      const isSaved = shortlistUrls.includes(button.dataset.listingUrl || "");
      const name = button.dataset.listingName || "this groomer";
      button.setAttribute("aria-pressed", isSaved ? "true" : "false");
      button.setAttribute("aria-label", isSaved ? `Remove ${name} from saved groomers` : `Save ${name} to compare`);
      button.textContent = isSaved ? "★ Saved" : "☆ Save to compare";
      button.classList.toggle("is-saved", isSaved);
    });
    const openButton = $("[data-shortlist-open]");
    if (openButton) {
      openButton.hidden = shortlistUrls.length === 0;
      openButton.textContent = `Saved (${shortlistUrls.length})`;
      openButton.setAttribute("aria-label", `Compare ${shortlistUrls.length} saved ${shortlistUrls.length === 1 ? "groomer" : "groomers"}`);
    }
  }

  function shortlistListingMarkup(item) {
    const services = item.services && item.services.length ? item.services.slice(0, 4).join(" · ") : "Services not listed; call to confirm.";
    const rating = item.rating ? `${Number(item.rating).toFixed(1)} from ${Number(item.reviews || 0).toLocaleString()} ${Number(item.reviews || 0) === 1 ? "review" : "reviews"}` : "Rating not listed";
    return `<article class="shortlist-item">
      <div class="shortlist-item-head">
        <div><h3><a href="${escapeAttr(withBase(item.url))}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.city)}, ${escapeHtml(item.provinceCode || item.province)} · ${escapeHtml(rating)}</p></div>
        <button class="shortlist-remove" type="button" data-shortlist-remove="${escapeAttr(item.url)}" aria-label="Remove ${escapeAttr(item.title)} from saved groomers">Remove</button>
      </div>
      <p class="shortlist-services">${escapeHtml(services)}</p>
      <div class="shortlist-item-actions">
        ${item.phone ? `<a class="btn btn-light" href="tel:${escapeAttr(item.phoneRaw || item.phone)}">Call</a>` : ""}
        ${item.website ? `<a class="btn btn-light" href="${escapeAttr(item.website)}" target="_blank" rel="nofollow noopener">Website</a>` : ""}
        <a class="btn btn-primary" href="${escapeAttr(withBase(item.url))}">View profile</a>
      </div>
    </article>`;
  }

  async function renderShortlistDialog(message = "") {
    const list = $("[data-shortlist-list]");
    const status = $("[data-shortlist-status]");
    if (!list) return;
    if (status) status.textContent = message;
    if (!shortlistUrls.length) {
      list.innerHTML = '<div class="empty-state"><p>No groomers are saved yet. Use “Save to compare” on a directory card or profile.</p></div>';
      return;
    }
    list.innerHTML = '<div class="empty-state"><p>Loading saved groomers...</p></div>';
    try {
      const index = await loadIndex();
      const byUrl = new Map((index.listings || []).map((item) => [item.url, item]));
      const items = shortlistUrls.map((url) => byUrl.get(url)).filter(Boolean);
      list.innerHTML = items.length
        ? items.map(shortlistListingMarkup).join("")
        : '<div class="empty-state"><p>These saved profiles are no longer available in the current directory data.</p></div>';
    } catch (error) {
      list.innerHTML = '<div class="empty-state"><p>Saved groomers could not load right now. Please try again in a moment.</p></div>';
    }
  }

  function openShortlistDialog(message = "") {
    const dialog = $("[data-shortlist-dialog]");
    if (!dialog) return;
    renderShortlistDialog(message);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function initShortlist() {
    const nav = $(".site-nav");
    if (!nav || $("[data-shortlist-dialog]")) return;

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "shortlist-nav-button";
    openButton.dataset.shortlistOpen = "";
    openButton.hidden = true;
    nav.appendChild(openButton);

    const dialog = document.createElement("dialog");
    dialog.className = "shortlist-dialog";
    dialog.dataset.shortlistDialog = "";
    dialog.setAttribute("aria-labelledby", "shortlist-dialog-title");
    dialog.innerHTML = `<div class="shortlist-dialog-head"><div><span class="guide-card-meta">Private on-device list</span><h2 id="shortlist-dialog-title">Compare saved groomers</h2></div><button class="shortlist-close" type="button" data-shortlist-close aria-label="Close saved groomers">×</button></div>
      <p>Save up to ${shortlistLimit} businesses, then compare location, ratings, listed services, and contact options. Your list stays in this browser.</p>
      <p class="shortlist-status" data-shortlist-status aria-live="polite"></p>
      <div class="shortlist-list" data-shortlist-list></div>
      <div class="shortlist-footer"><a class="btn btn-primary" href="/grooming-tools/dog-groomer-call-script/">Build a booking brief</a><button class="btn btn-light" type="button" data-shortlist-clear>Clear saved list</button></div>`;
    document.body.appendChild(dialog);

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-shortlist-toggle]");
      if (toggle) {
        const url = toggle.dataset.listingUrl || "";
        const existingIndex = shortlistUrls.indexOf(url);
        if (existingIndex >= 0) {
          shortlistUrls.splice(existingIndex, 1);
          persistShortlist();
          updateShortlistControls();
          renderShortlistDialog("Removed from your saved groomers.");
          return;
        }
        if (!url.startsWith("/groomers/")) return;
        if (shortlistUrls.length >= shortlistLimit) {
          openShortlistDialog(`You can compare up to ${shortlistLimit} groomers. Remove one before adding another.`);
          return;
        }
        shortlistUrls.push(url);
        persistShortlist();
        updateShortlistControls();
        renderShortlistDialog("Saved for comparison.");
        return;
      }

      if (event.target.closest("[data-shortlist-open]")) {
        openShortlistDialog();
        return;
      }

      if (event.target.closest("[data-shortlist-close]")) {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
        return;
      }

      const remove = event.target.closest("[data-shortlist-remove]");
      if (remove) {
        shortlistUrls = shortlistUrls.filter((url) => url !== remove.dataset.shortlistRemove);
        persistShortlist();
        updateShortlistControls();
        renderShortlistDialog("Removed from your saved groomers.");
        return;
      }

      if (event.target.closest("[data-shortlist-clear]")) {
        if (!shortlistUrls.length || window.confirm("Clear all saved groomers from this browser?")) {
          shortlistUrls = [];
          persistShortlist();
          updateShortlistControls();
          renderShortlistDialog("Your saved groomer list is clear.");
        }
      }
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog && typeof dialog.close === "function") dialog.close();
    });
    updateShortlistControls();
  }

  function runSearch(index, query, where, options = {}) {
    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    const whereText = normalizeText(where);
    const wherePlace = normalizePlace(where);
    const queryText = normalizeText(query);
    const serviceSlug = options.serviceSlug || "";
    const coords = options.coords;
    const includeNearby = Boolean(options.includeNearby && coords);
    const serviceTerms = serviceKeywordMap(index.services || []);
    let results = index.listings;

    if (serviceSlug) {
      results = results.filter((item) => Array.isArray(item.serviceSlugs) && item.serviceSlugs.includes(serviceSlug));
    }

    if (whereText) {
      const exactCities = index.cities.filter((city) => {
        const cityText = normalizePlace(city.city);
        return (
          wherePlace === cityText ||
          wherePlace === normalizePlace(`${city.city} ${city.province}`) ||
          wherePlace === normalizePlace(`${city.city} ${city.provinceCode}`)
        );
      });

      if (exactCities.length) {
        const cityResults = results.filter((item) => exactCities.some((city) => listingMatchesCity(item, city)));
        if (includeNearby) {
          const provinceCodes = new Set(exactCities.map((city) => normalizePlace(city.provinceCode || city.province)).filter(Boolean));
          const nearbyResults = results.filter((item) => {
            if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return false;
            const itemProvince = normalizePlace(item.provinceCode || item.province);
            if (provinceCodes.size && !provinceCodes.has(itemProvince)) return false;
            return haversineKm(coords, item) <= nearbySearchRadiusKm;
          });
          results = uniqueListings([...cityResults, ...nearbyResults]);
        } else {
          results = cityResults;
        }
      } else {
        const exactProvinces = uniqueProvincePlaces(index.cities).filter((province) => wherePlace === province.name || wherePlace === province.code);
        if (exactProvinces.length) {
          results = results.filter((item) => exactProvinces.some((province) => normalizePlace(item.province) === province.name || normalizePlace(item.provinceCode) === province.code));
        } else {
          results = results.filter((item) => {
            const place = normalizePlace(`${item.city} ${item.province} ${item.provinceCode} ${item.address}`);
            return place.includes(wherePlace) || wherePlace.includes(normalizePlace(item.city));
          });
        }
      }
    }

    if (queryText) {
      results = results.filter((item) => {
        const haystack = listingSearchHaystack(item, serviceTerms);
        return terms.every((term) => haystack.includes(term));
      });
    }

    const ranked = results
      .map((item) => {
        const haystack = listingSearchHaystack(item, serviceTerms);
        const distance = coords && Number.isFinite(item.lat) && Number.isFinite(item.lng) ? haversineKm(coords, item) : null;
        const score =
          (normalizeText(item.title).includes(queryText) ? 8 : 0) +
          (wherePlace && normalizePlace(item.city).includes(wherePlace) ? 6 : 0) +
          Number(item.rating || 0) +
          Math.min(Number(item.reviews || 0) / 100, 5) +
          terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { ...item, score, distance };
      })
      .sort((a, b) => {
        if (coords) return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY) || b.score - a.score;
        return b.score - a.score;
      });
    return {
      results: ranked.slice(0, 80),
      total: ranked.length,
    };
  }

  function uniqueProvincePlaces(cities) {
    const seen = new Set();
    return (cities || [])
      .map((city) => ({
        name: normalizePlace(city.province),
        code: normalizePlace(city.provinceCode),
      }))
      .filter((province) => {
        const key = `${province.name}|${province.code}`;
        if (!province.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
              window.location.href = resultsUrl(exactCity.url);
              return;
            }
          }
        } catch (error) {
          // Search page can still handle the query if data is temporarily unavailable here.
        }

        window.location.href = `${withBase("/search/")}${params.toString() ? `?${params.toString()}` : ""}#results`;
      });
    });
  }

  function initLocationButtons() {
    $$("[data-use-location]").forEach((button) => {
      bindLocationButton(button);
    });
  }

  function bindLocationButton(button) {
    if (!button || button.dataset.locationBound === "1") return;
    button.dataset.locationBound = "1";
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

        const searchParams = new URLSearchParams(window.location.search);
        const hasSearchFilters = document.body.dataset.page === "search" && (searchParams.get("service") || searchParams.get("q") || searchParams.get("where"));
        if (document.body.dataset.page === "near-me") {
          renderNearMe(coords, index);
          scheduleResultsScroll();
        } else if (hasSearchFilters) {
          searchParams.set("near", "1");
          window.history.replaceState(null, "", `${withBase("/search/")}?${searchParams.toString()}#results`);
          await initSearchPage();
          scheduleResultsScroll();
        } else if (city) {
          window.location.href = `${withBase(city.url)}?near=1#results`;
        }
      } catch (error) {
        setStatus(status, error.message || "Location permission was not granted.");
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  }

  async function initSearchPage() {
    const mount = $("[data-search-results]");
    if (!mount) return;
    const count = $("[data-result-count]");
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || "";
    const where = params.get("where") || "";
    const serviceSlug = params.get("service") || "";
    const nearRequested = params.get("near") === "1";
    const qInput = document.querySelector("[name='q']");
    const whereInput = document.querySelector("[name='where']");
    if (qInput) qInput.value = q;
    if (whereInput) whereInput.value = where;

    mount.innerHTML = `<div class="empty-state">Loading directory results...</div>`;
    try {
      const index = await loadIndex();
      const service = serviceSlug ? (index.services || []).find((item) => item.slug === serviceSlug) : null;
      const coords = getSavedLocation();
      const useDistance = nearRequested && coords ? coords : null;
      const search = runSearch(index, q, where, { serviceSlug, coords: useDistance, includeNearby: Boolean(useDistance && where) });
      const results = search.results;
      if (count) count.textContent = search.total === results.length ? `${results.length.toLocaleString()} results` : `${search.total.toLocaleString()} results, showing ${results.length.toLocaleString()}`;
      const summary = searchSummaryMarkup(results, { query: q, where, service, nearRequested, coords: useDistance, total: search.total });
      mount.innerHTML = results.length
        ? `${summary}<div class="listing-stack">${results.map(cardMarkup).join("")}</div>`
        : `${summary}<div class="empty-state"><h2>No exact matches found</h2><p>Try searching by city, province, service, or business name.</p></div>`;
      initLocationButtons();
      initImageFallbacks();
      updateShortlistControls();
    } catch (error) {
      mount.innerHTML = `<div class="empty-state"><h2>Search data could not load</h2><p>Please try again in a moment, or browse by province from the links below.</p></div>`;
    }
    if (window.location.hash === "#results") scheduleResultsScroll();
  }

  function searchSummaryMarkup(results, options) {
    const serviceText = options.service ? `${options.service.short.toLowerCase()} matches` : options.query ? `matches for "${options.query}"` : "directory matches";
    const placeText = options.where ? (options.coords ? ` close to you around ${options.where}` : ` in ${options.where}`) : "";
    const total = typeof options.total === "number" ? options.total : results.length;
    const countText = `${total.toLocaleString()} ${serviceText}${placeText}`;
    const shownText = total > results.length ? ` Showing the first ${results.length.toLocaleString()} matching listings.` : "";
    const distanceText = options.coords
      ? `Sorted by distance from your location. The selected service stays filtered, and nearby matches within about ${nearbySearchRadiusKm} km are included.${shownText}`
      : `Use your location to include nearby matching groomers and sort by closest to you.${shownText}`;
    const locationButton = options.coords
      ? ""
      : `<button class="btn btn-light" type="button" data-use-location data-status-target="[data-location-status-results]">Use my location</button><p class="muted" data-location-status-results></p>`;
    return `<div class="notice result-summary"><strong>${escapeHtml(countText)}</strong><p>${escapeHtml(distanceText)}</p>${locationButton}</div>`;
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
    const serviceSlug = document.body.dataset.nearService || "";
    const service = serviceSlug ? (index.services || []).find((item) => item.slug === serviceSlug) : null;
    const sourceListings = serviceSlug ? index.listings.filter((item) => Array.isArray(item.serviceSlugs) && item.serviceSlugs.includes(serviceSlug)) : index.listings;
    const city = nearestCity(index.cities, coords);
    const listings = nearestListings(sourceListings, coords, 36);
    if (count) count.textContent = nearMeCountText(listings.length, serviceSlug, service);
    const cityMarkup = city
      ? `<div class="notice"><strong>${serviceSlug ? "Closest filtered search" : "Closest city page"}:</strong> <a href="${escapeAttr(serviceSlug ? serviceCitySearchUrl(city, serviceSlug) : resultsUrl(city.url))}">${escapeHtml(city.city)}, ${escapeHtml(city.provinceCode || city.province)}</a> (${city.distance.toFixed(1)} km away)</div>`
      : "";
    const emptyMarkup = `<div class="empty-state"><h2>No nearby matches found</h2><p>Try searching by city or province, or contact mobile groomers to confirm their current service area.</p></div>`;
    mount.innerHTML = `${cityMarkup}${listings.length ? `<div class="listing-stack">${listings.map(cardMarkup).join("")}</div>` : emptyMarkup}`;
    initImageFallbacks();
    updateShortlistControls();
  }

  function nearMeCountText(count, serviceSlug, service) {
    if (serviceSlug === "mobile-dog-grooming") return `${count.toLocaleString()} nearby mobile groomers`;
    if (service) return `${count.toLocaleString()} nearby ${service.short.toLowerCase()} matches`;
    return `${count.toLocaleString()} nearby groomers`;
  }

  function initNearbyHint() {
    const mount = $("[data-nearest-city]");
    const saved = getSavedLocation();
    if (!mount || !saved) return;
    loadIndex()
      .then((index) => {
        const city = nearestCity(index.cities, saved);
        if (!city) return;
        mount.innerHTML = `<a class="link-arrow" href="${escapeAttr(resultsUrl(city.url))}">Browse groomers near ${escapeHtml(city.city)} →</a>`;
      })
      .catch(() => {});
  }

  function initLocationResultLayout() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("near") !== "1") return;
    const guide = $("[data-city-compare-guide]");
    const listings = $("[data-city-listings]");
    if (!guide || !listings || (guide.compareDocumentPosition(listings) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
    listings.parentNode.insertBefore(guide, listings);
  }

  function enhanceToolResult(result, options = {}) {
    if (!result) return;
    const oldActions = $(".tool-result-actions", result);
    if (oldActions) oldActions.remove();
    const actions = document.createElement("div");
    actions.className = "tool-result-actions";
    actions.innerHTML = `<button class="btn btn-light" type="button" data-tool-result-copy>Copy result</button>
      <button class="btn btn-light" type="button" data-tool-result-print>Print result</button>
      <a class="btn btn-primary" href="${escapeAttr(options.href || "/dog-grooming-near-me/")}">${escapeHtml(options.label || "Find groomers near me")}</a>
      <span class="tool-action-status" data-tool-action-status aria-live="polite"></span>`;
    result.appendChild(actions);
  }

  function toolResultPlainText(result) {
    const clone = result.cloneNode(true);
    const actions = $(".tool-result-actions", clone);
    if (actions) actions.remove();
    return clone.innerText.trim();
  }

  async function copyPlainText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy was not available.");
  }

  function initToolResultActions() {
    document.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-tool-result-copy]");
      if (copyButton) {
        const result = copyButton.closest(".tool-result");
        const status = result ? $("[data-tool-action-status]", result) : null;
        try {
          await copyPlainText(toolResultPlainText(result));
          setStatus(status, "Copied to your clipboard.");
        } catch (error) {
          setStatus(status, "Copy was blocked. Select the result text and copy it manually.");
        }
        return;
      }

      const printButton = event.target.closest("[data-tool-result-print]");
      if (!printButton) return;
      const result = printButton.closest(".tool-result");
      if (!result) return;
      const printSheet = document.createElement("section");
      printSheet.className = "tool-print-sheet";
      const printResult = result.cloneNode(true);
      const printActions = $(".tool-result-actions", printResult);
      if (printActions) printActions.remove();
      printResult.removeAttribute("aria-live");
      printResult.removeAttribute("tabindex");
      printSheet.appendChild(printResult);
      document.body.appendChild(printSheet);
      document.body.classList.add("tool-print-active");
      const cleanup = () => {
        document.body.classList.remove("tool-print-active");
        printSheet.remove();
      };
      window.addEventListener("afterprint", cleanup, { once: true });
      window.print();
      window.setTimeout(cleanup, 1000);
    });
  }

  function initCostEstimatorTool() {
    const form = $("[data-cost-estimator-tool]");
    const result = $("[data-cost-estimator-result]");
    if (!form || !result) return;

    const ranges = {
      full: { small: [75, 130], medium: [95, 170], large: [130, 230], giant: [180, 320] },
      bath: { small: [45, 85], medium: [60, 110], large: [80, 150], giant: [110, 220] },
      nails: { small: [15, 35], medium: [15, 35], large: [20, 40], giant: [25, 45] },
      deshed: { small: [70, 135], medium: [90, 175], large: [125, 240], giant: [175, 330] },
      mobile: { small: [110, 190], medium: [135, 235], large: [175, 310], giant: [235, 390] },
    };

    function estimate() {
      const size = fieldValue(form, "size") || "medium";
      const service = fieldValue(form, "service") || "full";
      const coat = fieldValue(form, "coat");
      const condition = fieldValue(form, "condition");
      const extras = fieldValue(form, "extras");
      const area = fieldValue(form, "area");
      const base = (ranges[service] || ranges.full)[size] || ranges.full.medium;
      let low = base[0];
      let high = base[1];
      const notes = [];

      if (coat === "curly" || coat === "drop") {
        low += 15;
        high += 45;
        notes.push("Curly, wool, and long drop coats often need more brushing, clipping, and finish time.");
      } else if (coat === "double") {
        low += 10;
        high += service === "bath" || service === "deshed" ? 65 : 40;
        notes.push("Double coats can need extra drying and undercoat removal, especially during seasonal coat blow.");
      } else if (coat === "wire") {
        high += 25;
        notes.push("Wire or mixed coats can vary by technique, coat density, and finish expectations.");
      }

      if (condition === "long") {
        low += 10;
        high += 35;
        notes.push("An overdue coat usually takes longer to bathe, dry, brush, and finish.");
      } else if (condition === "tangled") {
        low += 20;
        high += 70;
        notes.push("Tangles can add brushing, clipping, or consultation time.");
      } else if (condition === "matted") {
        low += 35;
        high += 120;
        notes.push("Matted or packed coat may require de-matting fees, a shorter shave, or a comfort-first assessment.");
      }

      if (extras === "basic") {
        low += 10;
        high += 30;
        notes.push("Nail grinding, teeth brushing, or small add-ons are often priced separately.");
      } else if (extras === "skin") {
        low += 10;
        high += 35;
        notes.push("Special shampoo, conditioner, skunk, flea, or sensitive-skin products can change the quote.");
      } else if (extras === "time") {
        low += 25;
        high += 90;
        notes.push("Extra handling, express service, or de-matting can add time-based fees.");
      }

      if (area === "mobile" && service !== "mobile") {
        low += 25;
        high += 85;
        notes.push("Mobile grooming can include travel fees, service-area minimums, parking limits, or route availability.");
      } else if (area === "remote") {
        low += 15;
        high += 75;
        notes.push("Remote routes or limited local appointment supply can affect travel cost and availability.");
      }

      low = Math.max(15, Math.round(low / 5) * 5);
      high = Math.max(low + 15, Math.round(high / 5) * 5);
      result.innerHTML = `<h2>Estimated planning range: $${low}-$${high} CAD</h2>
        <p>Use this range to prepare a quote request. The groomer should confirm the final price after hearing the dog's details or seeing the coat.</p>
        <ul class="check-list">${notes.slice(0, 5).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        <p class="muted">Ask what is included in the package, what add-ons cost extra, and what could change after check-in.</p>`;
      enhanceToolResult(result, { label: "Compare nearby groomers" });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      estimate();
    });
    form.addEventListener("change", estimate);
  }

  function initFrequencyTool() {
    const form = $("[data-frequency-tool]");
    const result = $("[data-frequency-result]");
    if (!form || !result) return;

    function estimate() {
      const coat = fieldValue(form, "coat");
      const length = fieldValue(form, "length");
      const brushing = fieldValue(form, "brushing");
      const lifestyle = fieldValue(form, "lifestyle");
      const matting = fieldValue(form, "matting");
      const season = fieldValue(form, "season");
      let weeks = 10;
      const notes = [];

      if (coat === "curly" || coat === "drop") {
        weeks -= 3;
        notes.push("Curly and drop coats usually need closer appointment spacing because tangles can form near the skin.");
      } else if (coat === "double") {
        weeks -= 1;
        notes.push("Double coats often need seasonal bath, blowout, and undercoat removal.");
      } else if (coat === "short") {
        weeks += 2;
        notes.push("Short coats may go longer between full appointments, but nails, paws, ears, and skin still need routine checks.");
      }

      if (length === "long") weeks -= 2;
      if (length === "medium") weeks -= 1;
      if (brushing === "rare") {
        weeks -= 2;
        notes.push("Rare brushing raises matting risk. A shorter trim or earlier maintenance visit may be more comfortable.");
      } else if (brushing === "daily") {
        weeks += 1;
        notes.push("Consistent brushing can help maintain a longer interval if the coat stays combable.");
      }
      if (lifestyle === "wet") weeks -= 2;
      if (lifestyle === "active") weeks -= 1;
      if (matting === "high") {
        weeks -= 3;
        notes.push("A history of mats or shave-downs usually means the schedule should be shorter until the coat is stable.");
      } else if (matting === "some") {
        weeks -= 1;
      }
      if (season !== "normal") {
        weeks -= 1;
        notes.push("Seasonal conditions can change the schedule. Salt, mud, shedding, swimming, burrs, and sweaters all add maintenance needs.");
      }

      weeks = Math.max(3, Math.min(14, weeks));
      const low = Math.max(3, weeks - 1);
      const high = Math.min(16, weeks + 1);
      const homeCare =
        coat === "short"
          ? "Brush weekly, keep nails on schedule, and wipe paws after salt, mud, or heat exposure."
          : "Brush in sections, check with a metal comb, and inspect ears, armpits, belly, legs, feet, and tail base.";

      result.innerHTML = `<h2>Estimated grooming interval: every ${low}-${high} weeks</h2>
        <p>${homeCare}</p>
        <ul class="check-list">${notes.slice(0, 4).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        <p class="muted">Ask a groomer to adjust this after seeing your dog's coat, skin, nails, behavior, and haircut goals.</p>`;
      enhanceToolResult(result, { label: "Find a groomer for this schedule" });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      estimate();
    });
    form.addEventListener("change", estimate);
  }

  function initMattingTool() {
    const form = $("[data-matting-tool]");
    const result = $("[data-matting-result]");
    if (!form || !result) return;

    function update() {
      const score = $$("input[type='checkbox']:checked", form).reduce((sum, input) => sum + Number(input.dataset.points || 0), 0);
      let level = "Low";
      let advice = "Keep checking friction zones and maintain your normal brushing and nail routine.";
      if (score >= 11) {
        level = "High";
        advice = "Book a grooming assessment soon. Avoid bathing a tangled coat and do not cut tight mats with scissors.";
      } else if (score >= 6) {
        level = "Moderate";
        advice = "Increase comb checks, shorten brushing sessions, and consider booking earlier than usual.";
      }
      result.innerHTML = `<h2>Risk score: ${score} (${level})</h2>
        <p>${escapeHtml(advice)}</p>
        <p class="muted">If mats are tight, close to the skin, painful, damp, or pelted, ask a professional groomer or veterinarian for guidance.</p>`;
      enhanceToolResult(result, { href: "/services/dematting/", label: "Compare de-matting services" });
    }

    form.addEventListener("change", update);
    update();
  }

  function initCoatPlannerTool() {
    const form = $("[data-coat-planner-tool]");
    const result = $("[data-coat-planner-result]");
    if (!form || !result) return;

    function plan() {
      const coat = fieldValue(form, "coat");
      const length = fieldValue(form, "length");
      const season = fieldValue(form, "season");
      const lifestyle = fieldValue(form, "lifestyle");
      const interval = fieldValue(form, "interval");
      const tools = fieldValue(form, "tools");
      const notes = [];
      let frequency = "Brush 1-2 times per week and check nails, paws, ears, and skin weekly.";

      if (coat === "curly" || coat === "drop") {
        frequency = length === "long" ? "Brush and comb in sections daily or every other day." : "Brush and comb 3-4 times per week.";
        notes.push("A metal comb should glide to the skin after brushing, especially behind ears, armpits, belly, legs, feet, and tail base.");
      } else if (coat === "double") {
        frequency = "Brush 2-3 times per week, with extra undercoat work during seasonal shedding.";
        notes.push("Avoid shaving double coats unless a veterinarian or groomer recommends it for a specific health or comfort reason.");
      } else if (coat === "short") {
        frequency = "Brush weekly, wipe paws as needed, and keep nails on a predictable schedule.";
        notes.push("Short coats still need skin checks, paw care, nail trims, and seasonal bath planning.");
      }

      if (season !== "normal") notes.push("Add quick coat checks after salt, mud, lake water, burrs, wet leaves, sweaters, or harness use.");
      if (lifestyle === "wet") notes.push("Dry the coat fully after rain, swimming, snow, or baths because moisture can tighten tangles.");
      if (lifestyle === "active") notes.push("Check friction zones after daycare, trails, dog parks, harness walks, or long outings.");
      if (interval === "long") notes.push("If professional grooming is more than 10 weeks apart, keep the coat shorter or increase comb checks.");
      if (tools === "none" || tools === "basic") notes.push("Ask a groomer which brush and comb match your dog's coat instead of buying every tool at once.");

      result.innerHTML = `<h2>Recommended home plan</h2>
        <p>${escapeHtml(frequency)}</p>
        <ul class="check-list">${notes.slice(0, 6).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        <p class="muted">If the comb catches near the skin, book earlier and avoid bathing until the coat is assessed.</p>`;
      enhanceToolResult(result, { label: "Find coat-care help" });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      plan();
    });
    form.addEventListener("change", plan);
  }

  function initPuppyPlannerTool() {
    const form = $("[data-puppy-planner-tool]");
    const result = $("[data-puppy-planner-result]");
    if (!form || !result) return;

    function plan() {
      const age = fieldValue(form, "age");
      const vaccines = fieldValue(form, "vaccines");
      const coat = fieldValue(form, "coat");
      const handling = fieldValue(form, "handling");
      const goal = fieldValue(form, "goal");
      const home = fieldValue(form, "home");
      const notes = [];
      let appointment = "Ask for a gentle intro appointment focused on handling comfort, short breaks, and positive exposure.";

      if (age === "young") {
        notes.push("Ask your veterinarian and groomer about safe timing before visiting a salon.");
      } else if (age === "starter") {
        appointment = "A short puppy intro, bath, dry, nails, and light tidy may be a better first step than a long full haircut.";
      } else if (age === "late") {
        notes.push("Older puppies with adult coat changes may need a more careful matting and comfort assessment.");
      }

      if (vaccines !== "current") notes.push("Confirm vaccine requirements and age policy before booking.");
      if (coat === "curly" || coat === "drop") notes.push("Start comb checks early because puppy coat changes can mat close to the skin.");
      if (handling === "sensitive") notes.push("Choose a groomer who is comfortable with short sessions, breaks, and slower handling.");
      if (goal === "full") notes.push("Ask whether a full haircut is realistic for a first visit or whether a tidy intro is kinder.");
      if (home === "rare" || home === "none") notes.push("Practice touching paws, ears, face, tail, brushing, combing, and dryer sounds for a few seconds at a time.");

      result.innerHTML = `<h2>Suggested first-groom plan</h2>
        <p>${escapeHtml(appointment)}</p>
        <ul class="check-list">${notes.slice(0, 6).map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        <p class="muted">The first visit should build trust. A perfect haircut can wait if the puppy needs a shorter, calmer appointment.</p>`;
      enhanceToolResult(result, { href: "/services/puppy-grooming/", label: "Compare puppy groomers" });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      plan();
    });
    form.addEventListener("change", plan);
  }

  function initWinterPawTool() {
    const form = $("[data-winter-paw-tool]");
    const result = $("[data-winter-paw-result]");
    if (!form || !result) return;

    function update() {
      const score = $$("input[type='checkbox']:checked", form).reduce((sum, input) => sum + Number(input.dataset.points || 0), 0);
      let level = "Low";
      let advice = "Keep wiping paws after walks, checking nails, and watching for salt irritation.";
      if (score >= 11) {
        level = "High";
        advice = "Book paw, nail, or coat maintenance soon and ask about winter-safe trimming. Call a veterinarian for cracked, bleeding, painful, or infected pads.";
      } else if (score >= 6) {
        level = "Moderate";
        advice = "Add paw rinsing, drying, nail checks, friction-zone combing, and boot or balm planning before conditions worsen.";
      }
      result.innerHTML = `<h2>Winter paw risk score: ${score} (${level})</h2>
        <p>${escapeHtml(advice)}</p>
        <p class="muted">Avoid cutting mats or paw hair tightly with scissors at home. Ask a groomer if ice balls, salt, or coat friction keep returning.</p>`;
      enhanceToolResult(result, { href: "/services/nail-trimming/", label: "Find paw and nail care" });
    }

    form.addEventListener("change", update);
    update();
  }

  function initCallScriptTool() {
    const form = $("[data-call-script-tool]");
    const result = $("[data-call-script-result]");
    if (!form || !result) return;

    function selectedLabel(name) {
      const select = form.elements.namedItem(name);
      return select && select.selectedOptions && select.selectedOptions[0] ? select.selectedOptions[0].textContent.trim() : "";
    }

    function listMarkup(items) {
      return `<ul class="check-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }

    function buildBrief() {
      const dogName = fieldValue(form, "dogName").trim();
      const breed = fieldValue(form, "breed").trim();
      const weight = fieldValue(form, "weight").trim();
      const lastGroom = fieldValue(form, "lastGroom").trim();
      const notesValue = fieldValue(form, "notes").trim();
      const service = fieldValue(form, "service");
      const coat = fieldValue(form, "coat");
      const condition = fieldValue(form, "condition");
      const comfort = fieldValue(form, "comfort");
      const subject = dogName || "my dog";
      const share = [`I am looking for ${selectedLabel("service").toLowerCase()} for ${subject}.`];
      const questions = [
        "What is included in the package, and which add-ons cost extra?",
        "What could change the quote after you see the coat or meet the dog?",
        `Do you have recent experience with ${selectedLabel("coat").toLowerCase()} coats and this type of appointment?`,
        "How long should I plan for drop-off, the appointment, and pickup?",
        "What are your vaccination, cancellation, late-pickup, and new-client policies?",
      ];
      const prep = [
        "Take a current coat photo and, for a haircut, save one realistic finish photo.",
        "Confirm the address or mobile service area, arrival instructions, and best contact number.",
        "Share coat, behavior, mobility, skin, medication, or veterinarian guidance before the appointment begins.",
      ];

      if (breed) share.push(`${subject} is a ${breed}.`);
      if (weight) share.push(`Approximate weight: ${weight}.`);
      share.push(`Coat: ${selectedLabel("coat")}. Current condition: ${selectedLabel("condition")}.`);
      share.push(`Handling comfort: ${selectedLabel("comfort")}.`);
      if (lastGroom) share.push(`Last groom: ${lastGroom}.`);
      if (notesValue) share.push(`Additional note: ${notesValue}`);

      if (service === "full") questions.push("Is the requested length realistic for the current coat, or would a shorter comfort trim be safer?");
      if (service === "deshed" || coat === "double") questions.push("How do you remove loose undercoat without shaving or damaging a healthy double coat?");
      if (service === "nails") questions.push("Do you offer grinding as well as clipping, and how do you handle paw sensitivity?");
      if (service === "puppy" || comfort === "puppy") questions.push("Can the first visit be a shorter introduction with breaks instead of a long full groom?");
      if (service === "comfort" || comfort === "senior") questions.push("Can you adapt the appointment for standing limits, mobility, rest breaks, or a quieter schedule?");
      if (condition === "tangled" || condition === "matted") {
        questions.push("If the tangles cannot be removed comfortably, will you call before changing the haircut plan?");
        prep.push("Do not cut tight mats with scissors or bathe a matted coat; ask the groomer for a comfort-first assessment.");
      }
      if (condition === "skin") questions.push("What information from my veterinarian do you need before working around the concern?");
      if (comfort === "nervous" || comfort === "touch") {
        questions.push("How do you handle fear or touch sensitivity, and can you use shorter sessions or breaks?");
        prep.push("Describe known triggers and helpful handling cues before drop-off; do not surprise the groomer at check-in.");
      }
      if (service === "unsure" || coat === "unsure" || condition === "unsure") questions.push("Can you assess what is realistic and confirm the plan and price before work begins?");

      result.innerHTML = `<h2>${dogName ? `${escapeHtml(dogName)}'s` : "Your"} groomer-ready booking brief</h2>
        <div class="booking-brief-grid">
          <section><h3>What to say first</h3>${listMarkup(share)}</section>
          <section><h3>Questions to compare</h3>${listMarkup(questions)}</section>
          <section><h3>Before the appointment</h3>${listMarkup(prep)}</section>
        </div>
        <p class="muted">This brief helps with booking and comparison. A groomer or veterinarian should assess pain, infection, severe matting, or medical concerns.</p>`;
      enhanceToolResult(result, { label: "Find groomers to contact" });
      result.focus({ preventScroll: true });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      buildBrief();
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initResultsHashScroll() {
    if (window.location.hash !== "#results") return;
    scheduleResultsScroll();
  }

  function scheduleResultsScroll() {
    const target = document.getElementById("results");
    if (!target) return;
    const scrollToResults = () => target.scrollIntoView({ block: "start" });
    requestAnimationFrame(scrollToResults);
    window.setTimeout(scrollToResults, 150);
  }

  function fieldValue(form, name) {
    return form.querySelector(`[name='${name}']`)?.value || "";
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
    initShortlist();
    initSearchPage();
    initNearMePage();
    initNearbyHint();
    initLocationResultLayout();
    initImageFallbacks();
    initToolResultActions();
    initCostEstimatorTool();
    initFrequencyTool();
    initMattingTool();
    initCoatPlannerTool();
    initPuppyPlannerTool();
    initWinterPawTool();
    initCallScriptTool();
    initResultsHashScroll();
  });
})();
