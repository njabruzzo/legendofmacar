#!/usr/bin/env python3
"""Index Associated Press article LINKS using public GDELT DOC 2.0 metadata.

No Associated Press story bodies, excerpts, photos, or licensed media are ingested.
Discovery metadata is NOT a comprehensive newsroom feed, and AP article links are
NOT additional UAP sightings, cyberattacks, or natural disasters.
For licensed AP feeds: https://api.ap.org/media/v/docs/Getting_Started_API.htm
"""
from __future__ import annotations

import datetime as dt
import hashlib
import email.utils
import xml.etree.ElementTree as ET
import json
import pathlib
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
DEST = HERE / "ap_coverage.json"
NOW = dt.datetime.now(dt.timezone.utc)
NOW_ISO = NOW.isoformat(timespec="seconds")
SOURCE = "https://api.gdeltproject.org/api/v2/doc/doc"
FRESH_DAYS = 100
CATEGORY_QUERIES = {
    "uap": '(UFO OR UAP OR "unidentified anomalous phenomena" OR "flying saucer") domainis:apnews.com',
    "cyber": '(cyberattack OR ransomware OR "data breach" OR hacking OR "internet outage") domainis:apnews.com',
    "natural": '(earthquake OR wildfire OR hurricane OR flood OR tornado OR volcano) domainis:apnews.com',
}


def canonical(url: str) -> str | None:
    try:
        parsed = urllib.parse.urlsplit(str(url))
    except ValueError:
        return None
    if parsed.scheme != "https" or parsed.hostname not in ("apnews.com", "www.apnews.com"):
        return None
    if not parsed.path.startswith("/article/"):
        return None
    return urllib.parse.urlunsplit(("https", "apnews.com", parsed.path.rstrip("/"), "", ""))


def parse_seen(stamp: str) -> str | None:
    # GDELT seendate format is YYYYMMDDTHHMMSSZ, not guaranteed article publication date.
    try:
        when = dt.datetime.strptime(str(stamp), "%Y%m%dT%H%M%SZ").replace(tzinfo=dt.timezone.utc)
        if when > NOW + dt.timedelta(days=1):
            return None
        return when.date().isoformat()
    except (ValueError, TypeError):
        return None


def fetch_category(category: str, expression: str):
    params = urllib.parse.urlencode({
        "query": expression, "mode": "ArtList", "format": "json",
        "timespan": "14d", "maxrecords": 100, "sort": "DateDesc"
    })
    request = urllib.request.Request(
        SOURCE + "?" + params,
        headers={"User-Agent": "TheAnomalyObservatory/1.0 (+https://www.legendofmacar.com/anomaly-atlas/)",
                 "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=38) as response:
        body = response.read(1600001)
    if len(body) > 1600000:
        raise ValueError("GDELT response over safe size limit")
    payload = json.loads(body.decode("utf-8-sig"))
    raw = payload.get("articles")
    if not isinstance(raw, list):
        raise ValueError("GDELT returned no article list (response incomplete or blocked)")
    results = []
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        url = canonical(item.get("url", ""))
        if not url or url in seen:
            continue
        title = str(item.get("title") or "").strip()
        indexed = parse_seen(item.get("seendate", ""))
        if not title or not indexed:
            continue
        if len(title) > 250:
            title = title[:249] + "…"
        seen.add(url)
        results.append({
            "id": "ap-" + hashlib.sha256(url.encode("utf-8")).hexdigest()[:20],
            "category": category,
            "title": title,
            "url": url,
            "indexed_date": indexed,
            "discovered_via": "GDELT DOC 2.0 link metadata",
        })
    return sorted(results, key=lambda r: (r["indexed_date"], r["id"]), reverse=True)


def fetch_google_news(category: str):
    """Google News RSS publisher-index fallback; metadata only, never AP text."""
    terms = {
        "uap": 'UFO OR UAP OR "unidentified anomalous phenomena"',
        "cyber": 'ransomware OR cyberattack OR "data breach"',
        "natural": 'earthquake OR wildfire OR hurricane OR tornado OR flood',
    }
    query = "site:apnews.com when:14d " + terms[category]
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({
        "q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"
    })
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; AnomalyObservatory/1.0; public link index)",
        "Accept": "application/rss+xml,application/xml,text/xml"
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read(1500001)
    if len(data) > 1500000:
        raise ValueError("Google News RSS response over safe size limit")
    root = ET.fromstring(data)
    items = root.findall(".//item")
    if not items:
        raise ValueError("Google News RSS returned no indexed items")
    found = []
    seen = set()
    for item in items:
        title = str(item.findtext("title") or "").strip()
        link = str(item.findtext("link") or "").strip()
        source = item.find("source")
        publisher = (source.text or "").lower().strip() if source is not None else ""
        source_url = (source.attrib.get("url") or "") if source is not None else ""
        if not ("associated press" in publisher or "ap news" in publisher or
                "apnews.com" in source_url):
            continue
        if not link.startswith("https://news.google.com/"):
            continue
        if not title:
            continue
        try:
            published = email.utils.parsedate_to_datetime(item.findtext("pubDate") or "")
            indexed = published.astimezone(dt.timezone.utc).date().isoformat()
        except (ValueError, TypeError, OverflowError):
            continue
        if title.endswith(" - AP News"):
            title = title[:-10]
        if title.endswith(" - Associated Press"):
            title = title[:-19]
        key = hashlib.sha256((title.casefold() + "|" + indexed).encode("utf-8")).hexdigest()[:20]
        if key in seen:
            continue
        seen.add(key)
        found.append({
            "id": "ap-google-" + key,
            "category": category,
            "title": title[:250],
            "url": link,
            "indexed_date": indexed,
            "discovered_via": "Google News RSS publisher index (AP story link)",
        })
    return sorted(found, key=lambda r: (r["indexed_date"], r["id"]), reverse=True)


def main():
    try:
        previous = json.loads(DEST.read_text("utf-8")) if DEST.exists() else {}
    except (json.JSONDecodeError, OSError):
        previous = {}
    old_feeds = previous.get("feeds") or {}
    feeds = {}
    cutoff = (NOW - dt.timedelta(days=FRESH_DAYS)).date().isoformat()

    for idx, (key, query) in enumerate(CATEGORY_QUERIES.items()):
        if idx:
            time.sleep(6)  # GDELT request pacing
        old = old_feeds.get(key) or {}
        old_items = old.get("items") or []
        try:
            try:
                fresh = fetch_category(key, query)
                discovery = "GDELT DOC 2.0 index"
            except Exception as primary_error:
                print(key + ": GDELT unavailable, trying Google News RSS: " + str(primary_error), flush=True)
                fresh = fetch_google_news(key)
                discovery = "Google News RSS AP publisher index"
            merged = {
                x["id"]: x for x in old_items if isinstance(x, dict) and x.get("id")
                and str(x.get("indexed_date", "")) >= cutoff
            }
            merged.update({x["id"]: x for x in fresh})
            items = sorted(merged.values(), key=lambda r: (r["indexed_date"], r["id"]), reverse=True)[:300]
            feeds[key] = {
                "status": "ok", "checked_at": NOW_ISO,
                "last_success_at": NOW_ISO,
                "search_window": "14 days", "items": items, "discovery_source": discovery,
                "returned_this_check": len(fresh),
                "caveat": "GDELT indexing can omit AP stories or misclassify keywords. No article bodies or incident counts.",
            }
            print(key + ": " + str(len(fresh)) + " fresh AP links, " + str(len(items)) + " retained", flush=True)
        except Exception as exc:
            feeds[key] = {
                **old, "status": "error", "checked_at": NOW_ISO,
                "error": type(exc).__name__ + ": " + str(exc)[:180],
                "items": [x for x in old_items if isinstance(x, dict)
                          and str(x.get("indexed_date", "")) >= cutoff],
            }
            print(key + ": source unavailable: " + str(exc), flush=True)

    result = {
        "schema": 1, "checked_at": NOW_ISO,
        "kind": "news_discovery_only",
        "source": SOURCE,
        "fallback_source": "https://news.google.com/rss/search",
        "publisher": "The Associated Press (linked, not republished)",
        "rights": "Only public headline/link and indexing date; no AP article bodies/media.",
        "integrity_note": "AP coverage is NOT a count of independent incidents. Link source publications to an underlying event ID only after review. GDELT is not an official AP API.",
        "feeds": feeds,
    }
    temp = DEST.with_suffix(".tmp")
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(DEST)
    print("WROTE", DEST, "status", ",".join(k + ":" + v["status"] for k, v in feeds.items()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
