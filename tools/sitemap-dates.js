"use strict";

// A build or ad/script change is not a content update. Unknown dates are omitted.
function validateUpdates(updates, today) {
  for (const [route, entry] of Object.entries(updates)) {
    const date = entry && entry.date;
    if (!route.startsWith("/") || !entry.note || !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today) {
      throw new Error(`Invalid documented content update: ${route}`);
    }
  }
  return updates;
}

function lastmodTag(route, updates) {
  return updates[route] ? `<lastmod>${updates[route].date}</lastmod>` : "";
}

module.exports = { validateUpdates, lastmodTag };
