#!/usr/bin/env python3
"""Recover factual signals from official websites linked by sparse profiles.

The output is intentionally narrow: normalized services, convenience features,
policies or credentials, booking links, and structured address data. It does
not copy business prose or publish price amounts.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import ssl
import sys
from dataclasses import dataclass
from datetime import date
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "thin-listing-enrichment.json"
USER_AGENT = "DogGroomersCanadaProfileResearch/1.0 (+https://doggroomerscanada.ca/editorial-policy/)"
SOCIAL_OR_DIRECTORY_HOSTS = {
    "facebook.com",
    "instagram.com",
    "linktr.ee",
    "m.facebook.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "yellowpages.ca",
    "yelp.ca",
    "yelp.com",
}
EXCLUDED_ROUTES = {
    # The linked site currently describes a Listowel location, not these Mount Forest profiles.
    "/groomers/ontario/mount-forest/roc-n-duke-s-pet-supplies-mount-forest-on-53f00aa3/",
    "/groomers/ontario/mount-forest/roc-n-duke-s-pet-supplies-training-facility-mount-forest-on-6c49b088/",
}
REJECTED_HOST_FRAGMENTS = ("google.", "gstatic.", "googleusercontent.", "doggroomerscanada.ca")
GROOMING_CONTEXT = re.compile(
    r"\b(?:dog|pet|cat|canine|feline)\s+groom|\bgroom(?:er|ers|ing|ed|s)?\b|"
    r"\bbath\s*(?:and|&)\s*brush\b|\bnail\s+(?:trim|grind)",
    re.I,
)
PARKED_SITE = re.compile(
    r"domain (?:is )?for sale|buy this domain|parked (?:free|domain)|sedo domain|"
    r"this website is for sale|future home of|website coming soon",
    re.I,
)
BOOKING_CLUE = re.compile(r"\bbook(?:ing)?\b|\bappointments?\b|\bschedul(?:e|ed|ing)\b|\breserv(?:e|ation)\b", re.I)
NON_GROOMING_BOOKING_CLUE = re.compile(
    r"dog[-\s]?poop|boarding|daycare|day[-\s]?care|walking|training|guidebook|books?|policy|privacy|terms",
    re.I,
)

SERVICE_PATTERNS = (
    ("Full groom or haircut", r"\bfull\s+groom|\bhair\s*cuts?\b|\bbreed(?:[-\s]+specific)?\s+(?:cut|clip)|\bscissor(?:ed|ing)?\s+(?:cut|finish|work)"),
    ("Bath or bath-and-brush", r"\bbath\s*(?:and|&)\s*brush|\bbath(?:ing)?\s+(?:service|package)|\bshampoo(?:ing)?\b"),
    ("Nail trim or grinding", r"\bnail(?:s)?\s+(?:trim|trimming|clip|clipping|grind|grinding)|\bnail\s+care\b|\bdremel(?:ing)?\b"),
    ("Ear cleaning", r"\bear(?:s)?\s+clean(?:ing|ed)?\b"),
    ("De-shedding", r"\bde[-\s]?shedd?ing\b|\bundercoat\s+removal\b"),
    ("De-matting", r"\bde[-\s]?matt?ing\b|\bmat(?:ted|ting)\s+(?:coat|fur|removal)"),
    ("Puppy grooming", r"\bpuppy\s+(?:groom|grooming|intro|introduction|package|trim)"),
    ("Cat grooming", r"\bcat\s+groom|\bfeline\s+groom|\blion\s+cut\b"),
    ("Hand stripping", r"\bhand\s+stripp?ing\b"),
    ("Creative grooming", r"\bcreative\s+groom|\bcoat\s+(?:colour|color)ing\b|\bpet-safe\s+(?:dye|colour|color)"),
    ("Teeth cleaning", r"\bteeth\s+(?:brush|brushing|clean|cleaning)|\btooth\s+brushing|\bultrasonic\s+(?:dental|teeth)"),
    ("Sanitary trim", r"\bsanitary\s+(?:trim|clip|clean[-\s]?up)|\bhygiene\s+(?:trim|clip)"),
    ("Self-service dog wash", r"\bself[-\s]?serve\s+(?:dog|pet)?\s*wash|\bself[-\s]?service\s+(?:dog|pet)?\s*wash"),
)

CONVENIENCE_PATTERNS = (
    ("Mobile grooming", r"\bmobile\s+(?:(?:dog|pet|cat)\s+)?groom|\bgrooming\s+(?:van|trailer)"),
    ("In-home grooming", r"\bin[-\s]?home\s+(?:(?:dog|pet|cat)\s+)?groom|\bhouse[-\s]?call\s+(?:(?:dog|pet|cat)\s+)?groom"),
    ("One-on-one appointments", r"\bone[-\s]on[-\s]one\b|\bone\s+(?:dog|pet|family)\s+at\s+a\s+time\b"),
    ("Cage-free appointments", r"\bcage[-\s]?free\b|\bkennel[-\s]?free\b"),
    ("Pickup or drop-off details", r"\bpick[-\s]?up\s+(?:and|&|or|/)\s+drop[-\s]?off|\bpet\s+taxi\b"),
)

CREDENTIAL_PATTERNS = (
    ("Certification or licensing information", r"\bcertified\s+(?:dog|pet|cat|canine|master)?\s*groom|\bmaster\s+groomer\b|\blicensed\s+(?:dog|pet|cat)?\s*groom"),
    ("Insurance information", r"\bfully\s+insured\b|\blicensed\s+and\s+insured\b|\binsured\s+(?:dog|pet|cat)?\s*groom"),
    ("Pet first-aid or CPR information", r"\b(?:pet|canine|animal)\s+first[-\s]?aid\b|\b(?:pet|canine|animal)\s+cpr\b"),
    ("Fear Free training or handling information", r"\bfear[-\s]?free\s+(?:certified|trained|groom|handling)|\blow[-\s]?stress\s+handling\b"),
    ("Professional policies", r"\bcancellation\s+polic|\bno[-\s]?show\s+(?:fee|polic)|\bdeposit\s+(?:is\s+)?required|\bvaccination\s+(?:is\s+)?required"),
)

BREED_PATTERNS = (
    ("Poodles", r"\bpoodles?\b"),
    ("Doodles", r"\b(?:doodles?|goldendoodles?|labradoodles?|bernedoodles?)\b"),
    ("Terriers", r"\bterriers?\b"),
    ("Schnauzers", r"\bschnauzers?\b"),
    ("Spaniels", r"\bspaniels?\b"),
    ("Double-coated breeds", r"\bdouble[-\s]?coat(?:ed)?\s+(?:dog|breed)|\bdouble[-\s]?coat(?:ed)?\b"),
)


@dataclass(frozen=True)
class Target:
    route: str
    name: str
    website: str


@dataclass
class Page:
    url: str
    text: str
    links: list[tuple[str, str]]
    json_ld: list[Any]


class BusinessPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.text_parts: list[str] = []
        self.links: list[tuple[str, str]] = []
        self.json_ld_raw: list[str] = []
        self._ignored: list[str] = []
        self._json_script = False
        self._json_parts: list[str] = []
        self._anchor_href = ""
        self._anchor_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): value or "" for key, value in attrs}
        if tag == "script" and "ld+json" in attributes.get("type", "").lower():
            self._json_script = True
            self._json_parts = []
            return
        if tag in {"script", "style", "noscript", "svg", "template"}:
            self._ignored.append(tag)
            return
        if self._ignored:
            return
        if tag == "a":
            self._anchor_href = attributes.get("href", "")
            self._anchor_parts = []
        if tag == "meta":
            content = attributes.get("content", "")
            if content and attributes.get("name", "").lower() in {"description", "og:description"}:
                self.text_parts.append(content)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._json_script:
            self.json_ld_raw.append("".join(self._json_parts))
            self._json_script = False
            self._json_parts = []
            return
        if self._ignored:
            if tag == self._ignored[-1]:
                self._ignored.pop()
            return
        if tag == "a" and self._anchor_href:
            self.links.append((self._anchor_href, normalize_text(" ".join(self._anchor_parts))))
            self._anchor_href = ""
            self._anchor_parts = []

    def handle_data(self, data: str) -> None:
        if self._json_script:
            self._json_parts.append(data)
            return
        if self._ignored:
            return
        value = normalize_text(data)
        if not value:
            return
        self.text_parts.append(value)
        if self._anchor_href:
            self._anchor_parts.append(value)


class ProfileParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.name = ""
        self.links: list[tuple[str, str]] = []
        self._in_h1 = False
        self._h1_parts: list[str] = []
        self._anchor_href = ""
        self._anchor_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key.lower(): value or "" for key, value in attrs}
        if tag == "h1":
            self._in_h1 = True
            self._h1_parts = []
        if tag == "a":
            self._anchor_href = attributes.get("href", "")
            self._anchor_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1" and self._in_h1:
            self.name = normalize_text(" ".join(self._h1_parts))
            self._in_h1 = False
        if tag == "a" and self._anchor_href:
            self.links.append((self._anchor_href, normalize_text(" ".join(self._anchor_parts))))
            self._anchor_href = ""
            self._anchor_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_h1:
            self._h1_parts.append(data)
        if self._anchor_href:
            self._anchor_parts.append(data)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(str(value or ""))).strip()


def normalized_host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def blocked_host(url: str) -> bool:
    host = normalized_host(url)
    return any(host == value or host.endswith(f".{value}") for value in SOCIAL_OR_DIRECTORY_HOSTS) or any(
        fragment in host for fragment in REJECTED_HOST_FRAGMENTS
    )


def safe_url(value: str, base: str = "") -> str:
    candidate = urljoin(base, value.strip()) if base else value.strip()
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return ""
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return ""
    if "safelinks.protection.outlook.com" in (parsed.hostname or "").lower():
        wrapped = parse_qs(parsed.query).get("url", [])
        return safe_url(wrapped[0]) if wrapped else ""
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, parsed.query, ""))


def load_existing(output: Path) -> dict[str, Any]:
    if not output.exists():
        return {}
    try:
        raw = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    listings = raw.get("listings", {}) if isinstance(raw, dict) else {}
    return listings if isinstance(listings, dict) else {}


def discover_targets(existing: dict[str, Any]) -> list[Target]:
    targets: dict[str, Target] = {}
    for file in sorted((ROOT / "groomers").rglob("index.html")):
        html = file.read_text(encoding="utf-8")
        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', html, re.I):
            continue
        relative = file.relative_to(ROOT).as_posix()
        route = f"/{relative.removesuffix('index.html')}"
        if route in EXCLUDED_ROUTES:
            continue
        signal_rows = html.count('class="profile-signal-row"')
        sparse = signal_rows <= 5 and "review-theme-summary" not in html and ">Hours listed<" not in html
        if not sparse and route not in existing:
            continue
        parser = ProfileParser()
        parser.feed(html)
        website = next((safe_url(href) for href, text in parser.links if text.lower() == "visit website"), "")
        if not website:
            website = next(
                (safe_url(href) for href, text in parser.links if text and "website" in text.lower() and safe_url(href)),
                "",
            )
        if website and not blocked_host(website):
            targets[route] = Target(route=route, name=parser.name, website=website)
    return list(targets.values())


def fetch_page(url: str, timeout: float) -> Page:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    context = ssl.create_default_context()
    with urlopen(request, timeout=timeout, context=context) as response:
        final_url = safe_url(response.geturl())
        content_type = response.headers.get_content_type()
        if content_type not in {"text/html", "application/xhtml+xml"}:
            raise ValueError(f"unsupported content type {content_type}")
        raw = response.read(2_500_001)
        if len(raw) > 2_500_000:
            raise ValueError("HTML response exceeded 2.5 MB")
        charset = response.headers.get_content_charset() or "utf-8"
    html = raw.decode(charset, errors="replace")
    parser = BusinessPageParser()
    parser.feed(html)
    json_ld: list[Any] = []
    for block in parser.json_ld_raw:
        cleaned = re.sub(r"^\s*<!--|-->\s*$", "", block.strip())
        try:
            json_ld.append(json.loads(cleaned))
        except (json.JSONDecodeError, TypeError):
            continue
    return Page(
        url=final_url,
        text=normalize_text(" ".join(parser.text_parts)),
        links=parser.links,
        json_ld=json_ld,
    )


def relevant_links(page: Page, maximum: int = 2) -> list[str]:
    base_host = normalized_host(page.url)
    ranked: list[tuple[int, str]] = []
    for href, label in page.links:
        url = safe_url(href, page.url)
        if not url or normalized_host(url) != base_host or url == page.url:
            continue
        parsed = urlparse(url)
        if re.search(r"\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|docx?)$", parsed.path, re.I):
            continue
        clue = f"{parsed.path} {label}".lower()
        if re.search(r"privacy|terms|login|account|cart|checkout|blog|news|gallery|boarding|daycare|walking|training|dog[-\s]?poop", clue):
            continue
        score = 0
        if re.search(r"groom|spa|salon|treatment", clue):
            score += 12
        if re.search(r"service", clue):
            score += 4
        if re.search(r"price|pricing|rate|package|fee", clue):
            score += 10
        if re.search(r"about|team|credential|certif|faq", clue):
            score += 7
        if score:
            ranked.append((score, url))
    selected: list[str] = []
    for _, url in sorted(ranked, key=lambda item: (-item[0], item[1])):
        if url not in selected:
            selected.append(url)
        if len(selected) == maximum:
            break
    return selected


def extract_patterns(text: str, definitions: tuple[tuple[str, str], ...]) -> list[str]:
    return [label for label, pattern in definitions if re.search(pattern, text, re.I)]


def walk_json(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_json(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_json(child)


def structured_address(pages: list[Page]) -> str:
    for page in pages:
        for document in page.json_ld:
            for node in walk_json(document):
                address = node.get("address")
                if not isinstance(address, dict):
                    continue
                pieces = [
                    normalize_text(address.get("streetAddress", "")),
                    normalize_text(address.get("addressLocality", "")),
                    normalize_text(address.get("addressRegion", "")),
                    normalize_text(address.get("postalCode", "")),
                ]
                unique_pieces: list[str] = []
                for piece in pieces:
                    if piece and piece.casefold() not in {value.casefold() for value in unique_pieces}:
                        unique_pieces.append(piece)
                value = ", ".join(unique_pieces)
                if value:
                    return value
    return ""


def booking_links(pages: list[Page]) -> list[dict[str, str]]:
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    for page in pages:
        for href, label in page.links:
            url = safe_url(href, page.url)
            clue = f"{label} {url}".lower()
            path = urlparse(url).path if url else ""
            path_has_booking = bool(BOOKING_CLUE.search(path.replace("-", " ")))
            label_has_booking = bool(BOOKING_CLUE.search(label))
            if (
                not url
                or url in seen
                or blocked_host(url)
                or not (path_has_booking or label_has_booking)
                or NON_GROOMING_BOOKING_CLUE.search(clue)
                or (label_has_booking and not path_has_booking and re.search(r"/(?:services?|about|faq)(?:\.html?)?/?$", path, re.I))
            ):
                continue
            seen.add(url)
            name = normalize_text(label)
            if not BOOKING_CLUE.search(name):
                name = "Book an appointment"
            found.append({"name": name[:80], "url": url})
            if len(found) == 1:
                return found
    return found


def enrich_target(target: Target, timeout: float) -> tuple[str, dict[str, Any] | None, str]:
    try:
        home = fetch_page(target.website, timeout)
        if blocked_host(home.url):
            raise ValueError("redirected to a social or directory host")
        if not GROOMING_CONTEXT.search(home.text) or PARKED_SITE.search(home.text):
            raise ValueError("page did not pass grooming-site validation")
        pages = [home]
        for url in relevant_links(home):
            try:
                page = fetch_page(url, timeout)
            except Exception:
                continue
            if normalized_host(page.url) == normalized_host(home.url):
                pages.append(page)

        text = normalize_text(" ".join(page.text for page in pages))
        services = extract_patterns(text, SERVICE_PATTERNS)
        convenience = extract_patterns(text, CONVENIENCE_PATTERNS)
        bookings = booking_links(pages)
        if bookings and "Online booking" not in convenience:
            convenience.append("Online booking")
        credentials = extract_patterns(text, CREDENTIAL_PATTERNS)
        breeds = extract_patterns(text, BREED_PATTERNS)
        price_term = r"(?:groom|bath|nail|hair\s*cut|trim|de[-\s]?shed|de[-\s]?mat|package)"
        price_amount = r"\$\s?\d{1,4}(?:\.\d{2})?"
        pricing = bool(re.search(rf"\b{price_term}\b.{{0,140}}{price_amount}|{price_amount}.{{0,140}}\b{price_term}\b", text, re.I))
        address = structured_address(pages)
        strong_context = bool(re.search(r"\b(?:dog|pet|cat|canine|feline)\s+groom(?:er|ers|ing|ed|s)?\b", text, re.I))
        explicit_grooming_access = any(item in convenience for item in ("Mobile grooming", "In-home grooming"))
        grooming_specific_booking = any(re.search(r"groom", f"{link['name']} {link['url']}", re.I) for link in bookings)
        if not services and not explicit_grooming_access and not address and not (strong_context and grooming_specific_booking):
            raise ValueError("no business-specific grooming facts were recovered")
        if not any((services, convenience, credentials, breeds, pricing, bookings, address)):
            raise ValueError("no publishable facts were recovered")

        entry: dict[str, Any] = {
            "businessName": target.name,
            "website": target.website,
            "sourcePages": [page.url for page in pages],
            "services": services,
            "convenience": convenience,
            "credentials": credentials,
            "breedExperience": breeds,
            "pricingAvailable": pricing,
            "bookingLinks": bookings,
            "websiteLocation": address,
            "crawlStatus": "official_website_enriched",
            "crawledAt": date.today().isoformat(),
        }
        return target.route, entry, ""
    except Exception as error:
        return target.route, None, str(error)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--timeout", type=float, default=12.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    existing = load_existing(args.output)
    targets = discover_targets(existing)
    if not targets:
        print("No eligible sparse profiles with independent websites were found.")
        return 0

    enriched = dict(existing)
    failures: list[tuple[str, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        futures = {executor.submit(enrich_target, target, args.timeout): target for target in targets}
        for future in concurrent.futures.as_completed(futures):
            route, entry, error = future.result()
            if entry:
                enriched[route] = entry
            else:
                failures.append((route, error))

    payload = {
        "generatedAt": date.today().isoformat(),
        "method": "Normalized factual signals from official business websites; no marketing prose or price amounts are stored.",
        "listings": dict(sorted(enriched.items())),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

    recovered = sum(1 for route in (target.route for target in targets) if route in enriched)
    print(f"Eligible profiles: {len(targets)}")
    print(f"Profiles with retained or recovered website facts: {recovered}")
    print(f"Current crawl failures: {len(failures)}")
    for route, error in sorted(failures)[:12]:
        print(f"- {route}: {error}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
