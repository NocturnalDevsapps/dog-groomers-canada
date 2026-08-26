#!/usr/bin/env python3
"""Recover factual signals from official websites linked by directory profiles.

The output is intentionally narrow: normalized services, convenience features,
policies or credentials, booking links, and structured address data. It does
not copy business prose or publish price amounts.
"""

from __future__ import annotations

import argparse
import asyncio
import concurrent.futures
import json
import re
import ssl
import sys
import threading
import unicodedata
from collections import Counter, deque
from dataclasses import dataclass
from datetime import date
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, parse_qsl, urlencode, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "data" / "thin-listing-enrichment.json"
USER_AGENT = "DogGroomersCanadaProfileResearch/1.0 (+https://doggroomerscanada.ca/editorial-policy/)"
SOCIAL_OR_DIRECTORY_HOSTS = {
    "411sante.com",
    "catop.net",
    "dogv.net",
    "facebook.com",
    "fb.me",
    "findnl.ca",
    "instagram.com",
    "linktr.ee",
    "localcanada.net",
    "mewm.net",
    "m.facebook.com",
    "okpet.net",
    "pagesjaunes.ca",
    "petnu.net",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "yellowpages.ca",
    "yelp.ca",
    "yelp.com",
}
SHARED_PROFILE_PLATFORM_HOSTS = {
    "acuityscheduling.com",
    "book.cuddlesapp.com",
    "book.daysmart.com",
    "book.heygoldie.com",
    "book.squareup.com",
    "booking.moego.pet",
    "bookingkoala.com",
    "calendly.com",
    "crm.pawfinity.com",
    "fresha.com",
    "go.booker.com",
    "pawpartner.com",
    "planimo.ca",
    "propetware.com",
    "schedulista.com",
    "setmore.com",
    "squareup.com",
    "vagaro.com",
}
EXCLUDED_ROUTES = {
    # The linked site currently describes a Listowel location, not these Mount Forest profiles.
    "/groomers/ontario/mount-forest/roc-n-duke-s-pet-supplies-mount-forest-on-53f00aa3/",
    "/groomers/ontario/mount-forest/roc-n-duke-s-pet-supplies-training-facility-mount-forest-on-6c49b088/",
}
REJECTED_HOST_FRAGMENTS = ("google.", "gstatic.", "googleusercontent.", "doggroomerscanada.ca")
TRACKING_QUERY_KEYS = {"dclid", "fbclid", "gclid", "gbraid", "mc_cid", "mc_eid", "msclkid", "wbraid"}
GROOMING_CONTEXT = re.compile(
    r"\b(?:dog|pet|cat|canine|feline)\s+groom|\bgroom(?:er|ers|ing|ed|s)?\b|"
    r"\bbath\s*(?:and|&)\s*brush\b|\bnail\s+(?:trim|grind)|\btoilett(?:age|eur|euse)\b|"
    r"\bsalon\s+(?:de\s+)?toilettage\b|\btonte\s+(?:de\s+)?(?:chien|chat|animaux)\b",
    re.I,
)
PARKED_SITE = re.compile(
    r"domain (?:is )?for sale|buy this domain|parked (?:free|domain)|sedo domain|"
    r"this website is for sale|future home of|website coming soon",
    re.I,
)
BOOKING_URL_CLUE = re.compile(
    r"\bbook(?:ing)?\b|\bappointments?\b|\bschedul(?:e|ed|ing)\b|\brendez\s+vous\b|\brdv\b|\breserv(?:er|ation)\b",
    re.I,
)
BOOKING_ACTION_LABEL = re.compile(
    r"^(?:book|schedule|request|make|set\s+up|call\s+for)\b.{0,60}\b(?:appointment|groom|visit|online)\b|"
    r"^(?:book|schedule|request|make|set\s+up)\b.{0,30}$|^appointments?\s+(?:request|scheduling)\b|"
    r"^(?:prendre|demander)\b.{0,40}\brendez\s+vous\b|^reserv(?:er|ation)\b.{0,40}$",
    re.I,
)
BOOKING_QUESTION_LABEL = re.compile(
    r"^(?:can|comment|could|do|does|est\s+ce|how|i\b|is|ou\b|pourquoi|quand|quel(?:le)?s?|should|what|when|where|who|why|will|would)\b|\?$",
    re.I,
)
NON_GROOMING_BOOKING_CLUE = re.compile(
    r"dog[-\s]?(?:park|poop)|boarding|daycare|day[-\s]?care|walking|training|guidebook|\bbooks?\b|"
    r"policy|privacy|terms|\bclass(?:es)?\b|meet\s*(?:and|&)?\s*greet|\bstay\b|"
    r"\bpension\b|\bgarderie\b|\bpromenade\b|\bdressage\b",
    re.I,
)
SERVICE_BUSINESS_CLUE = re.compile(
    r"\b(?:groomers?|grooming\s+(?:service|appointment|package|salon)|full\s+groom|"
    r"bath\s*(?:and|&)\s*brush|one[-\s]on[-\s]one\s+groom|cage[-\s]?free\s+groom)\b|"
    r"\b(?:book(?:ing)?|appointments?|schedul(?:e|ing))\b.{0,100}\bgroom|"
    r"\bgroom.{0,100}\b(?:book(?:ing)?|appointments?|schedul(?:e|ing))\b|"
    r"\b(?:salon\s+(?:de\s+)?toilettage|toilettage\s+(?:canin|felin|complet|service|sur\s+rendez\s+vous))\b|"
    r"\b(?:rendez\s+vous|reservation)\b.{0,100}\btoilettage\b|\btoilettage\b.{0,100}\b(?:rendez\s+vous|reservation)\b",
    re.I,
)
RETAIL_CATALOG_ROUTE = re.compile(r"\b(?:collections?|products?|product\s+(?:page|category)|shop|catalog|search)\b", re.I)
EDITORIAL_ARCHIVE_ROUTE = re.compile(r"/(?:author|category|tag)/|/20\d{2}/(?:0?[1-9]|1[0-2])(?:/|$)", re.I)
GROOMING_OFFER_ROUTE = re.compile(
    r"\b(?:groom\w*|toilettage).{0,40}\b(?:appointment|booking|package|service|session|rendez\s+vous|forfait)s?\b|"
    r"\b(?:appointment|booking|package|service|session|rendez\s+vous|forfait)s?\b.{0,40}\b(?:groom\w*|toilettage)\b",
    re.I,
)
PRICE_AMOUNT = re.compile(r"(?:\$\s?\d{1,4}(?:[.,]\d{2})?|\d{1,4}(?:[.,]\d{2})?\s?\$)", re.I)
PRICE_SERVICE_CLUE = re.compile(
    r"\b(?:full|basic|premium|mini)\s+groom\b|\b(?:dog|pet|cat|puppy)\s+grooming\b|"
    r"\bgrooming\s+(?:package|service|session)\b|\bbath\s*(?:and|&)?\s*(?:brush|tidy)?\b|"
    r"\bnail\s+(?:trim|grind)|\bhair\s*cut|\bde[-\s]?(?:shed|mat)|\bsanitary\s+trim|"
    r"\btoilettage\s+(?:complet|canin|felin|pour\s+(?:chien|chat|chiot))\b|\bforfait\s+(?:toilettage|chiot)\b|"
    r"\bbain\b|\b(?:coupe|taille)\s+(?:de\s+|des\s+)?griffes\b|\b(?:coupe|tonte)\s+(?:complete|hygienique)\b|\bdemelage\b",
    re.I,
)
IDENTITY_STOPWORDS = {
    "and",
    "the",
    "dog",
    "dogs",
    "pet",
    "pets",
    "cat",
    "canin",
    "canine",
    "chez",
    "de",
    "des",
    "du",
    "groom",
    "groomer",
    "groomers",
    "grooming",
    "animal",
    "animaux",
    "chien",
    "chiens",
    "et",
    "felin",
    "feline",
    "les",
    "salon",
    "spa",
    "mobile",
    "services",
    "service",
    "pour",
    "toilettage",
    "toiletteur",
    "toiletteuse",
    "inc",
    "ltd",
}

SERVICE_PATTERNS = (
    ("Full groom or haircut", r"\bfull\s+groom|\bhair\s*cuts?\b|\bbreed(?:[-\s]+specific)?\s+(?:cut|clip)|\bscissor(?:ed|ing)?\s+(?:cut|finish|work)|\btoilettage\s+complet\b|\b(?:coupe|tonte)\s+(?:complete|standard|aux\s+ciseaux)\b"),
    ("Bath or bath-and-brush", r"\bbath\s*(?:and|&)\s*brush|\bbath(?:ing)?\s+(?:service|package)|\bshampoo(?:ing)?\b|\b(?:bain|shampoing)\b"),
    ("Nail trim or grinding", r"\bnail(?:s)?\s+(?:trim|trimming|clip|clipping|grind|grinding)|\bnail\s+care\b|\bdremel(?:ing)?\b|\b(?:coupe|taille)\s+(?:de\s+|des\s+)?griffes\b"),
    ("Ear cleaning", r"\bear(?:s)?\s+clean(?:ing|ed)?\b|\bnettoyage\s+(?:de\s+|des\s+)?oreilles\b"),
    ("De-shedding", r"\bde[-\s]?shedd?ing\b|\bundercoat\s+removal\b|\btraitement\s+(?:de\s+)?mue\b|\bretrait\s+(?:du\s+)?sous\s+poil\b|\bdebourrage\b"),
    ("De-matting", r"\bde[-\s]?matt?ing\b|\bmat(?:ted|ting)\s+(?:coat|fur|removal)|\bdemelage\b|\bnoeuds?\b"),
    ("Puppy grooming", r"\bpuppy\s+(?:groom|grooming|intro|introduction|package|trim)|\btoilettage\s+(?:pour\s+)?chiot\b|\bforfait\s+chiot\b"),
    ("Cat grooming", r"\bcat\s+groom|\bfeline\s+groom|\blion\s+cut\b|\btoilettage\s+(?:pour\s+)?(?:chat|felin)\b"),
    ("Hand stripping", r"\bhand\s+stripp?ing\b|\bepilation\s+(?:a\s+la\s+main|manuelle)\b"),
    ("Creative grooming", r"\bcreative\s+groom|\bcoat\s+(?:colour|color)ing\b|\bpet-safe\s+(?:dye|colour|color)"),
    ("Teeth cleaning", r"\bteeth\s+(?:brush|brushing|clean|cleaning)|\btooth\s+brushing|\bultrasonic\s+(?:dental|teeth)|\b(?:brossage|nettoyage)\s+(?:de\s+|des\s+)?dents\b"),
    ("Sanitary trim", r"\bsanitary\s+(?:trim|clip|clean[-\s]?up)|\bhygiene\s+(?:trim|clip)|\b(?:coupe|tonte)\s+hygienique\b"),
    ("Self-service dog wash", r"\bself[-\s]?serve\s+(?:dog|pet)?\s*wash|\bself[-\s]?service\s+(?:dog|pet)?\s*wash|\b(?:lave\s+chien|toilettage|lavage)\s+(?:en\s+)?libre\s+service\b"),
)

CONVENIENCE_PATTERNS = (
    ("Mobile grooming", r"\bmobile\s+(?:(?:dog|pet|cat)\s+)?groom|\bgrooming\s+(?:van|trailer)|\btoilettage\s+mobile\b"),
    ("In-home grooming", r"\bin[-\s]?home\s+(?:(?:dog|pet|cat)\s+)?groom|\bhouse[-\s]?call\s+(?:(?:dog|pet|cat)\s+)?groom|\btoilettage\s+(?:a\s+)?domicile\b"),
    ("One-on-one appointments", r"\bone[-\s]on[-\s]one\b|\bone\s+(?:dog|pet|family)\s+at\s+a\s+time\b|\bun\s+(?:animal|chien|client)\s+a\s+la\s+fois\b"),
    ("Cage-free appointments", r"\bcage[-\s]?free\b|\bkennel[-\s]?free\b|\bsans\s+cage\b"),
    ("Pickup or drop-off details", r"\bpick[-\s]?up\s+(?:and|&|or|/)\s+drop[-\s]?off|\bpet\s+taxi\b|\bramassage\b.{0,60}\blivraison\b"),
)

CREDENTIAL_PATTERNS = (
    ("Certification or licensing information", r"\bcertified\s+(?:dog|pet|cat|canine|master)?\s*groom|\bmaster\s+groomer\b|\blicensed\s+(?:dog|pet|cat)?\s*groom|\btoilett(?:eur|euse)\s+certifiee?\b"),
    ("Insurance information", r"\bfully\s+insured\b|\blicensed\s+and\s+insured\b|\binsured\s+(?:dog|pet|cat)?\s*groom|\b(?:entreprise|toilett(?:eur|euse))\s+assuree?\b"),
    ("Pet first-aid or CPR information", r"\b(?:pet|canine|animal)\s+first[-\s]?aid\b|\b(?:pet|canine|animal)\s+cpr\b|\bpremiers?\s+soins\s+(?:canin|animal|pour\s+animaux)\b"),
    ("Fear Free training or handling information", r"\bfear[-\s]?free\s+(?:certified|trained|groom|handling)|\blow[-\s]?stress\s+handling\b"),
    ("Professional policies", r"\bcancellation\s+polic|\bno[-\s]?show\s+(?:fee|polic)|\bdeposit\s+(?:is\s+)?required|\bvaccination\s+(?:is\s+)?required|\bpolitique\s+d\s+annulation\b|\bdepot\s+(?:est\s+)?requis|\bvaccination\s+(?:est\s+)?requise"),
)

BREED_PATTERNS = (
    ("Poodles", r"\bpoodles?\b|\bcaniches?\b"),
    ("Doodles", r"\b(?:doodles?|goldendoodles?|labradoodles?|bernedoodles?)\b"),
    ("Terriers", r"\bterriers?\b"),
    ("Schnauzers", r"\bschnauzers?\b"),
    ("Spaniels", r"\bspaniels?\b|\bepagneuls?\b"),
    ("Double-coated breeds", r"\bdouble[-\s]?coat(?:ed)?\s+(?:dog|breed)|\bdouble[-\s]?coat(?:ed)?\b|\bdouble\s+pelage\b"),
)

_FETCH_STATE_LOCK = threading.Lock()
_FETCH_CACHE: dict[str, Any] = {}
_FETCH_ERRORS: dict[str, str] = {}
_HOST_LOCKS: dict[str, threading.Lock] = {}
_SSL_CONTEXT = ssl.create_default_context()


@dataclass(frozen=True)
class Target:
    route: str
    name: str
    website: str
    city: str
    shared_host_profiles: int = 1
    address: str = ""
    shared_city_profiles: int = 1
    category: str = ""


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
        self._suppressed: list[str] = []
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
        if tag in {"header", "nav", "footer", "aside"}:
            self._suppressed.append(tag)
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
        if self._suppressed and tag == self._suppressed[-1]:
            self._suppressed.pop()

    def handle_data(self, data: str) -> None:
        if self._json_script:
            self._json_parts.append(data)
            return
        if self._ignored:
            return
        if self._suppressed:
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


def comparable_text(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", normalize_text(value)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.casefold()).strip()


def normalized_host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host[4:] if host.startswith("www.") else host


def blocked_host(url: str) -> bool:
    host = normalized_host(url)
    return any(host == value or host.endswith(f".{value}") for value in SOCIAL_OR_DIRECTORY_HOSTS) or any(
        fragment in host for fragment in REJECTED_HOST_FRAGMENTS
    )


def is_shared_profile_platform(url: str) -> bool:
    host = normalized_host(url)
    return any(host == value or host.endswith(f".{value}") for value in SHARED_PROFILE_PLATFORM_HOSTS)


def is_unrelated_retail_route(url: str) -> bool:
    path = comparable_text(urlparse(url).path)
    return bool(RETAIL_CATALOG_ROUTE.search(path) and not GROOMING_OFFER_ROUTE.search(path))


def has_grooming_price(text: str) -> bool:
    for amount in PRICE_AMOUNT.finditer(text):
        context = text[max(0, amount.start() - 180) : min(len(text), amount.end() + 180)]
        if PRICE_SERVICE_CLUE.search(context):
            return True
    return False


def identity_matches(target: Target, page: Page) -> bool:
    name_tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", comparable_text(target.name))
        if len(token) >= 3 and token not in IDENTITY_STOPWORDS
    ]
    if not name_tokens:
        return not is_shared_profile_platform(target.website)
    haystack = comparable_text(f"{page.text} {normalized_host(page.url).replace('-', ' ')}")
    return any(token in haystack for token in name_tokens)


def target_location_tokens(target: Target) -> list[str]:
    host_key = re.sub(r"[^a-z0-9]", "", comparable_text(normalized_host(target.website)))
    city_tokens = set(comparable_text(target.city).split())
    return [
        token
        for token in comparable_text(target.name).split()
        if len(token) >= 4 and token not in IDENTITY_STOPWORDS and token not in host_key and token not in city_tokens
    ]


def addresses_match(source_address: str, target_address: str, target_city: str = "") -> bool:
    if not source_address or not target_address:
        return False
    source_compact = re.sub(r"[^a-z0-9]", "", comparable_text(source_address))
    target_compact = re.sub(r"[^a-z0-9]", "", comparable_text(target_address))
    postal_pattern = re.compile(r"[a-z]\d[a-z]\d[a-z]\d")
    source_postal = postal_pattern.search(source_compact)
    target_postal = postal_pattern.search(target_compact)
    if source_postal and target_postal:
        return source_postal.group() == target_postal.group()
    source_number = re.search(r"\b\d+[a-z]?\b", comparable_text(source_address))
    target_number = re.search(r"\b\d+[a-z]?\b", comparable_text(target_address))
    if not source_number or not target_number or source_number.group() != target_number.group():
        return False
    ignored = {"avenue", "boulevard", "canada", "drive", "highway", "road", "route", "rue", "street", "suite", "unit"}
    city_tokens = set(comparable_text(target_city).split())
    street_tokens = {
        token
        for token in comparable_text(target_address).split()
        if len(token) >= 4 and token not in ignored and token not in city_tokens
    }
    return any(token in comparable_text(source_address).split() for token in street_tokens)


def page_address_matches_target(page: Page, target: Target) -> bool:
    return addresses_match(structured_address([page]), target.address, target.city)


def enrichment_confirms_target_branch(entry: dict[str, Any], target: Target) -> bool:
    if target.shared_city_profiles <= 1:
        return True
    if addresses_match(entry.get("websiteLocation", ""), target.address, target.city):
        return True
    source_urls = comparable_text(" ".join(entry.get("sourcePages", [])))
    return any(token in source_urls for token in target_location_tokens(target))


def page_confirms_location_service(page: Page, target: Target) -> bool:
    comparable_city = comparable_text(target.city)
    if not comparable_city:
        return True
    comparable_page = comparable_text(f"{page.url} {page.text}")
    if comparable_city not in comparable_page or not SERVICE_BUSINESS_CLUE.search(comparable_text(page.text)):
        return False
    city_pattern = re.escape(comparable_city)
    city_and_service = bool(
        comparable_city in comparable_text(page.url)
        or re.search(
            rf"{city_pattern}.{{0,500}}\b(?:groom\w*|toilett\w*|tonte)\b|"
            rf"\b(?:groom\w*|toilett\w*|tonte)\b.{{0,500}}{city_pattern}",
            comparable_page,
        )
    )
    if not city_and_service:
        return False
    if target.shared_city_profiles <= 1:
        return True
    if page_address_matches_target(page, target):
        return True
    for token in target_location_tokens(target):
        token_pattern = re.escape(token)
        if token in comparable_text(page.url) or re.search(
            rf"{token_pattern}.{{0,500}}\b(?:groom\w*|toilett\w*|tonte)\b|"
            rf"\b(?:groom\w*|toilett\w*|tonte)\b.{{0,500}}{token_pattern}",
            comparable_page,
        ):
            return True
    return False


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
    query = urlencode(
        [
            (key, item)
            for key, item in parse_qsl(parsed.query, keep_blank_values=True)
            if key.casefold() not in TRACKING_QUERY_KEYS and not key.casefold().startswith("utm_")
        ],
        doseq=True,
    )
    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, query, ""))


def load_existing(output: Path) -> dict[str, Any]:
    if not output.exists():
        return {}
    try:
        raw = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    listings = raw.get("listings", {}) if isinstance(raw, dict) else {}
    if not isinstance(listings, dict):
        return {}
    sanitized: dict[str, Any] = {}
    for route, entry in listings.items():
        if not isinstance(entry, dict):
            continue
        normalized = dict(entry)
        normalized["website"] = safe_url(normalized.get("website", ""))
        source_pages = normalized.get("sourcePages", [])
        normalized["sourcePages"] = list(
            dict.fromkeys(safe_url(url) for url in source_pages if safe_url(url))
        )[:3] if isinstance(source_pages, list) else []
        booking_records = sanitize_booking_records(
            normalized.get("bookingLinks", []),
            normalized["sourcePages"],
        )
        normalized["bookingLinks"] = booking_records
        raw_convenience = normalized.get("convenience", [])
        convenience = [item for item in raw_convenience if item != "Online booking"] if isinstance(raw_convenience, list) else []
        if booking_records:
            convenience.append("Online booking")
        normalized["convenience"] = list(dict.fromkeys(convenience))
        sanitized[route] = normalized
    return sanitized


def enrichment_uses_blocked_source(entry: dict[str, Any]) -> bool:
    urls = [entry.get("website", ""), *(entry.get("sourcePages", []) if isinstance(entry.get("sourcePages"), list) else [])]
    return any(blocked_host(safe_url(url)) for url in urls if url)


def enrichment_has_usable_sources(entry: dict[str, Any]) -> bool:
    sources = entry.get("sourcePages", [])
    return bool(safe_url(entry.get("website", "")) and isinstance(sources, list) and any(safe_url(url) for url in sources))


def discover_targets(
    existing: dict[str, Any],
    scope: str = "sparse",
    refresh_existing: bool = False,
) -> list[Target]:
    candidates: list[Target] = []
    for file in sorted((ROOT / "groomers").rglob("index.html")):
        html = file.read_text(encoding="utf-8")
        if scope == "sparse" and re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', html, re.I):
            continue
        relative = file.relative_to(ROOT).as_posix()
        route = f"/{relative.removesuffix('index.html')}"
        if route in EXCLUDED_ROUTES:
            continue
        signal_rows = html.count('class="profile-signal-row"')
        sparse = signal_rows <= 5 and "review-theme-summary" not in html and ">Hours listed<" not in html
        if scope == "sparse" and not sparse and route not in existing:
            continue
        parser = ProfileParser()
        parser.feed(html)
        website = next((safe_url(href) for href, text in parser.links if text.lower() == "visit website"), "")
        if not website:
            website = next(
                (safe_url(href) for href, text in parser.links if text and "website" in text.lower() and safe_url(href)),
                "",
            )
        if not website or blocked_host(website):
            continue
        city_match = re.search(r"<span>([^<>]+),\s*([A-Z]{2})</span>", html)
        city = normalize_text(city_match.group(1)) if city_match else ""
        address_match = re.search(r"<dt>Address</dt><dd>([\s\S]*?)</dd>", html, re.I)
        address = normalize_text(re.sub(r"<[^>]+>", " ", address_match.group(1))) if address_match else ""
        category_match = re.search(r"<dt>Category</dt><dd>([\s\S]*?)</dd>", html, re.I)
        category = normalize_text(re.sub(r"<[^>]+>", " ", category_match.group(1))) if category_match else ""
        candidates.append(Target(route=route, name=parser.name, website=website, city=city, address=address, category=category))

    host_counts = Counter(normalized_host(target.website) for target in candidates)
    host_city_counts = Counter((normalized_host(target.website), comparable_text(target.city)) for target in candidates)
    targets: dict[str, Target] = {}
    for target in candidates:
        route = target.route
        website = target.website
        existing_entry = existing.get(route, {})
        same_existing_host = existing_entry and normalized_host(existing_entry.get("website", "")) == normalized_host(website)
        if same_existing_host and not refresh_existing:
            continue
        targets[route] = Target(
            route=route,
            name=target.name,
            website=website,
            city=target.city,
            shared_host_profiles=host_counts[normalized_host(website)],
            address=target.address,
            shared_city_profiles=host_city_counts[(normalized_host(website), comparable_text(target.city))],
            category=target.category,
        )
    return list(targets.values())


def interleave_targets_by_host(targets: list[Target]) -> list[Target]:
    buckets: dict[str, deque[Target]] = {}
    for target in sorted(targets, key=lambda item: item.route):
        buckets.setdefault(normalized_host(target.website), deque()).append(target)
    active_hosts = sorted(buckets)
    interleaved: list[Target] = []
    while active_hosts:
        next_hosts: list[str] = []
        for host in active_hosts:
            interleaved.append(buckets[host].popleft())
            if buckets[host]:
                next_hosts.append(host)
        active_hosts = next_hosts
    return interleaved


def parse_page(final_url: str, html: str) -> Page:
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


def fetch_page(url: str, timeout: float) -> Page:
    key = safe_url(url)
    host = normalized_host(key)
    with _FETCH_STATE_LOCK:
        if key in _FETCH_CACHE:
            return _FETCH_CACHE[key]
        if key in _FETCH_ERRORS:
            raise ValueError(_FETCH_ERRORS[key])
        host_lock = _HOST_LOCKS.setdefault(host, threading.Lock())

    with host_lock:
        with _FETCH_STATE_LOCK:
            if key in _FETCH_CACHE:
                return _FETCH_CACHE[key]
            if key in _FETCH_ERRORS:
                raise ValueError(_FETCH_ERRORS[key])
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
            with urlopen(request, timeout=timeout, context=_SSL_CONTEXT) as response:
                final_url = safe_url(response.geturl())
                content_type = response.headers.get_content_type()
                if content_type not in {"text/html", "application/xhtml+xml"}:
                    raise ValueError(f"unsupported content type {content_type}")
                raw = response.read(2_500_001)
                if len(raw) > 2_500_000:
                    raise ValueError("HTML response exceeded 2.5 MB")
                charset = response.headers.get_content_charset() or "utf-8"
            page = parse_page(final_url, raw.decode(charset, errors="replace"))
        except Exception as error:
            with _FETCH_STATE_LOCK:
                _FETCH_ERRORS[key] = str(error)
            raise
        with _FETCH_STATE_LOCK:
            _FETCH_CACHE[key] = page
            if final_url:
                _FETCH_CACHE[final_url] = page
        return page


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
        if is_unrelated_retail_route(url):
            continue
        if EDITORIAL_ARCHIVE_ROUTE.search(parsed.path):
            continue
        clue = comparable_text(f"{parsed.path} {label}")
        if re.search(r"privacy|terms|login|account|cart|checkout|blog|news|gallery|boarding|daycare|walking|training|dog[-\s]?poop|confidentialite|conditions|connexion|panier|nouvelles|galerie|pension|garderie|promenade|dressage", clue):
            continue
        score = 0
        if re.search(r"groom|toilett|spa|salon|traitement", clue):
            score += 12
        if re.search(r"service", clue):
            score += 4
        if re.search(r"price|pricing|rate|package|fee|prix|tarif|forfait", clue):
            score += 10
        if re.search(r"about|team|credential|certif|faq|a propos|equipe", clue):
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


def booking_url_has_intent(url: str) -> bool:
    parsed = urlparse(url)
    clue = comparable_text(f"{parsed.hostname or ''} {parsed.path} {parsed.query}")
    return bool(BOOKING_URL_CLUE.search(clue))


def canonical_booking_name(label: str) -> str:
    return "Request an appointment" if re.search(r"\b(?:request|demander)\b", comparable_text(label), re.I) else "Book an appointment"


def sanitize_booking_records(value: Any, source_pages: Any = None) -> list[dict[str, str]]:
    sources = {safe_url(url) for url in source_pages or [] if safe_url(url)}
    records = value if isinstance(value, list) else []
    for item in records:
        if not isinstance(item, dict):
            continue
        url = safe_url(item.get("url", ""))
        label = normalize_text(item.get("name", ""))
        url_has_intent = booking_url_has_intent(url)
        comparable_label = comparable_text(label)
        actionable_label = bool(label and len(label) <= 80 and BOOKING_ACTION_LABEL.search(comparable_label))
        if (
            not url
            or NON_GROOMING_BOOKING_CLUE.search(comparable_text(f"{label} {url}"))
            or BOOKING_QUESTION_LABEL.search(comparable_label)
            or (url in sources and not url_has_intent)
            or not (url_has_intent or actionable_label)
        ):
            continue
        return [{"name": canonical_booking_name(label), "url": url}]
    return []


def booking_links(pages: list[Page]) -> list[dict[str, str]]:
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    for page in pages:
        page_url = safe_url(page.url)
        if page_url not in seen and booking_url_has_intent(page_url) and not NON_GROOMING_BOOKING_CLUE.search(comparable_text(page_url)):
            return [{"name": "Book an appointment", "url": page_url}]
        for href, label in page.links:
            url = safe_url(href, page.url)
            clue = comparable_text(f"{label} {url}")
            url_has_booking = booking_url_has_intent(url)
            comparable_label = comparable_text(label)
            actionable_label = bool(label and len(label) <= 80 and BOOKING_ACTION_LABEL.search(comparable_label))
            if (
                not url
                or url in seen
                or blocked_host(url)
                or not (url_has_booking or actionable_label)
                or NON_GROOMING_BOOKING_CLUE.search(clue)
                or BOOKING_QUESTION_LABEL.search(comparable_label)
                or (url == page_url and not url_has_booking)
            ):
                continue
            seen.add(url)
            found.append({"name": canonical_booking_name(label), "url": url})
            if len(found) == 1:
                return found
    return found


def build_enrichment_entry(target: Target, pages: list[Page], research_method: str) -> dict[str, Any]:
    home = pages[0]
    if blocked_host(home.url):
        raise ValueError("redirected to a social or directory host")
    if is_unrelated_retail_route(home.url):
        raise ValueError("website points to a retail catalog route")
    if EDITORIAL_ARCHIVE_ROUTE.search(urlparse(home.url).path):
        raise ValueError("website points to an editorial archive route")
    if not identity_matches(target, home):
        raise ValueError("website identity did not match the listed business")
    if PARKED_SITE.search(home.text) or not any(GROOMING_CONTEXT.search(comparable_text(page.text)) for page in pages):
        raise ValueError("page did not pass grooming-site validation")

    location_scoped_host = target.shared_host_profiles >= 3 and not is_shared_profile_platform(target.website)
    service_pages = pages
    if location_scoped_host:
        service_pages = [page for page in pages if page_confirms_location_service(page, target)]
    source_text = normalize_text(" ".join(page.text for page in service_pages))
    text = normalize_text(f"{source_text} {comparable_text(source_text)}")
    service_business_context = bool(
        SERVICE_BUSINESS_CLUE.search(text)
        or re.search(r"\b(?:groom\w*|salon|spa)\b", target.name, re.I)
    )
    services = extract_patterns(text, SERVICE_PATTERNS)
    convenience = extract_patterns(text, CONVENIENCE_PATTERNS)
    bookings = booking_links(pages)
    if bookings and "Online booking" not in convenience:
        convenience.append("Online booking")
    credentials = extract_patterns(text, CREDENTIAL_PATTERNS)
    breeds = extract_patterns(text, BREED_PATTERNS)
    pricing = has_grooming_price(text)
    address = structured_address(pages)
    address_page = next((page for page in pages if address and structured_address([page]) == address), None)
    comparable_city = comparable_text(target.city)
    address_confirms_city = not comparable_city or comparable_city in comparable_text(address)
    if address and not address_confirms_city:
        address = ""
        address_page = None
    if location_scoped_host and not service_pages:
        service_business_context = False
    if location_scoped_host and not address and not service_pages:
        raise ValueError("shared business website did not confirm this listing location")
    if not service_business_context:
        services = []
        convenience = []
        bookings = []
        credentials = []
        breeds = []
        pricing = False
    grooming_listing_identity = bool(GROOMING_CONTEXT.search(comparable_text(f"{target.name} {target.category}")))
    if address and not grooming_listing_identity and not any((services, convenience, credentials, breeds, pricing, bookings)):
        raise ValueError("address-only source did not confirm a grooming business")
    strong_context = bool(
        re.search(
            r"\b(?:dog|pet|cat|canine|feline)\s+groom(?:er|ers|ing|ed|s)?\b|"
            r"\b(?:toilettage\s+(?:canin|felin)|salon\s+(?:de\s+)?toilettage)\b",
            text,
            re.I,
        )
    )
    explicit_grooming_access = any(item in convenience for item in ("Mobile grooming", "In-home grooming"))
    grooming_specific_booking = any(re.search(r"groom", f"{link['name']} {link['url']}", re.I) for link in bookings)
    if not services and not explicit_grooming_access and not address and not (strong_context and grooming_specific_booking):
        raise ValueError("no business-specific grooming facts were recovered")
    if not any((services, convenience, credentials, breeds, pricing, bookings, address)):
        raise ValueError("no publishable facts were recovered")

    source_pages = pages
    if location_scoped_host:
        source_pages = [*service_pages, *([address_page] if address_page else [])]

    return {
        "businessName": target.name,
        "website": target.website,
        "sourcePages": list(dict.fromkeys(page.url for page in source_pages))[:3],
        "services": services,
        "convenience": convenience,
        "credentials": credentials,
        "breedExperience": breeds,
        "pricingAvailable": pricing,
        "bookingLinks": bookings,
        "websiteLocation": address,
        "crawlStatus": "official_website_enriched",
        "researchMethod": research_method,
        "crawledAt": date.today().isoformat(),
    }


def enrich_target(target: Target, timeout: float) -> tuple[str, dict[str, Any] | None, str]:
    try:
        home = fetch_page(target.website, timeout)
        pages = [home]
        if not blocked_host(home.url) and not PARKED_SITE.search(home.text):
            for url in relevant_links(home):
                try:
                    page = fetch_page(url, timeout)
                except Exception:
                    continue
                if normalized_host(page.url) == normalized_host(home.url):
                    pages.append(page)
        return target.route, build_enrichment_entry(target, pages, "direct_html"), ""
    except Exception as error:
        return target.route, None, str(error)


async def crawl4ai_recover(
    targets: list[Target],
    timeout: float,
    workers: int,
) -> list[tuple[str, dict[str, Any] | None, str]]:
    if not targets:
        return []
    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
    except ImportError as error:
        return [(target.route, None, f"Crawl4AI unavailable: {error}") for target in targets]

    browser_config = BrowserConfig(headless=True, verbose=False, user_agent=USER_AGENT)
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=max(5_000, int(timeout * 1_000)),
        wait_until="domcontentloaded",
        verbose=False,
    )
    semaphore = asyncio.Semaphore(max(1, min(workers, 12)))
    host_locks: dict[str, asyncio.Lock] = {}
    progress_lock = asyncio.Lock()
    completed = 0

    async with AsyncWebCrawler(config=browser_config) as crawler:
        async def fetch_rendered(url: str) -> Page:
            result = await crawler.arun(url=url, config=run_config)
            if not result.success:
                raise ValueError(result.error_message or "browser crawl failed")
            html = result.html or result.cleaned_html or ""
            if not html:
                raise ValueError("browser crawl returned no HTML")
            return parse_page(safe_url(result.url) or safe_url(url), html)

        async def recover_one(target: Target) -> tuple[str, dict[str, Any] | None, str]:
            nonlocal completed
            lock = host_locks.setdefault(normalized_host(target.website), asyncio.Lock())
            try:
                async with semaphore:
                    async with lock:
                        home = await fetch_rendered(target.website)
                        pages = [home]
                        if not blocked_host(home.url) and not PARKED_SITE.search(home.text):
                            for url in relevant_links(home):
                                try:
                                    page = await fetch_rendered(url)
                                except Exception:
                                    continue
                                if normalized_host(page.url) == normalized_host(home.url):
                                    pages.append(page)
                outcome = (target.route, build_enrichment_entry(target, pages, "crawl4ai_browser"), "")
            except Exception as error:
                outcome = (target.route, None, str(error))
            async with progress_lock:
                completed += 1
                if completed % 25 == 0 or completed == len(targets):
                    print(f"Crawl4AI fallback progress: {completed}/{len(targets)}", flush=True)
            return outcome

        return await asyncio.gather(*(recover_one(target) for target in targets))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--scope", choices=("sparse", "all"), default="sparse")
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--timeout", type=float, default=12.0)
    parser.add_argument("--limit", type=int, default=0, help="Process only the first N eligible routes; 0 means no limit.")
    parser.add_argument("--refresh-existing", action="store_true")
    parser.add_argument("--routes-file", type=Path, help="Optional newline-delimited profile routes to process.")
    parser.add_argument("--remove-routes-file", type=Path, help="Optional newline-delimited enrichment routes to remove.")
    parser.add_argument("--prune-only", action="store_true", help="Apply source and route pruning without crawling.")
    parser.add_argument(
        "--drop-failed-refresh",
        action="store_true",
        help="Remove a refreshed route when it no longer passes validation; requires --refresh-existing.",
    )
    parser.add_argument("--crawl4ai-fallback", action="store_true")
    parser.add_argument("--crawl4ai-workers", type=int, default=4)
    parser.add_argument("--checkpoint-every", type=int, default=25)
    parser.add_argument(
        "--failure-report",
        type=Path,
        default=Path("/tmp/dgc-listing-enrichment-failures.json"),
    )
    return parser.parse_args()


def write_output(output: Path, enriched: dict[str, Any]) -> None:
    payload = {
        "generatedAt": date.today().isoformat(),
        "method": "Normalized factual signals from official business websites using direct HTML and Crawl4AI browser fallback; no marketing prose or price amounts are stored.",
        "listings": dict(sorted(enriched.items())),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output)


def main() -> int:
    args = parse_args()
    if args.drop_failed_refresh and not args.refresh_existing:
        raise SystemExit("--drop-failed-refresh requires --refresh-existing")
    loaded_existing = load_existing(args.output)
    existing = {
        route: entry
        for route, entry in loaded_existing.items()
        if enrichment_has_usable_sources(entry) and not enrichment_uses_blocked_source(entry)
    }
    removed_routes: set[str] = set()
    if args.remove_routes_file:
        removed_routes = {
            line.strip()
            for line in args.remove_routes_file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }
        for route in removed_routes:
            existing.pop(route, None)
    if args.prune_only:
        write_output(args.output, existing)
        print(f"Retained enrichment records: {len(existing)}")
        print(f"Requested route removals: {len(removed_routes)}")
        return 0
    targets = interleave_targets_by_host(
        discover_targets(existing, scope=args.scope, refresh_existing=args.refresh_existing),
    )
    if args.routes_file:
        requested_routes = {
            line.strip()
            for line in args.routes_file.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }
        targets = [target for target in targets if target.route in requested_routes]
        if args.drop_failed_refresh:
            matched_routes = {target.route for target in targets}
            for route in requested_routes - matched_routes:
                existing.pop(route, None)
    if args.limit > 0:
        targets = targets[: args.limit]
    if not targets:
        if len(existing) != len(loaded_existing):
            write_output(args.output, existing)
            print(f"Pruned {len(loaded_existing) - len(existing)} blocked third-party source records.")
        print(f"No eligible {args.scope} profiles with uncrawled independent websites were found.")
        return 0

    enriched = dict(existing)
    direct_failures: dict[str, tuple[Target, str]] = {}
    completed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 24))) as executor:
        futures = {executor.submit(enrich_target, target, args.timeout): target for target in targets}
        for future in concurrent.futures.as_completed(futures):
            route, entry, error = future.result()
            if entry:
                enriched[route] = entry
            else:
                direct_failures[route] = (futures[future], error)
            completed += 1
            if args.checkpoint_every > 0 and completed % args.checkpoint_every == 0:
                write_output(args.output, enriched)
                print(
                    f"Direct crawl progress: {completed}/{len(targets)}; retained enrichment records: {len(enriched)}",
                    flush=True,
                )

    failures: list[tuple[Target, str]] = list(direct_failures.values())
    if args.crawl4ai_fallback and failures:
        browser_results = asyncio.run(
            crawl4ai_recover([target for target, _ in failures], args.timeout, args.crawl4ai_workers),
        )
        browser_by_route = {route: (entry, error) for route, entry, error in browser_results}
        remaining: list[tuple[Target, str]] = []
        for target, direct_error in failures:
            entry, browser_error = browser_by_route.get(target.route, (None, "browser fallback returned no result"))
            if entry:
                enriched[target.route] = entry
            else:
                remaining.append((target, f"direct: {direct_error}; browser: {browser_error}"))
        failures = remaining

    if args.drop_failed_refresh:
        for target, _ in failures:
            enriched.pop(target.route, None)

    write_output(args.output, enriched)
    failure_payload = {
        "generatedAt": date.today().isoformat(),
        "scope": args.scope,
        "failures": [
            {"route": target.route, "website": target.website, "error": error}
            for target, error in sorted(failures, key=lambda item: item[0].route)
        ],
    }
    args.failure_report.parent.mkdir(parents=True, exist_ok=True)
    args.failure_report.write_text(json.dumps(failure_payload, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")

    recovered = sum(1 for route in (target.route for target in targets) if route in enriched)
    print(f"Eligible profiles: {len(targets)}")
    print(f"Profiles with recovered website facts: {recovered}")
    print(f"Total retained enrichment records: {len(enriched)}")
    print(f"Current crawl failures: {len(failures)}")
    print(f"Failure report: {args.failure_report}")
    for target, error in sorted(failures, key=lambda item: item[0].route)[:12]:
        print(f"- {target.route}: {error}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
