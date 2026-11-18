#!/usr/bin/env python3
"""Refresh link-only public MUFON newsroom feed (not the MUFON CMS database).

The public MUFON Case Management System's narratives, photos and attachments
are rights-restricted; this tool NEVER reads, mirrors, or republishes CMS data.
This deliberately tracks editorial publications, not UAP sighting incidence.
"""
from __future__ import annotations
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent
OUTPUT = ROOT / "uap_sources.json"
FEED = "https://mufon.com/feed/"
USER_AGENT = "AnomalyObservatorySourceMonitor/1.0 (+https://www.legendofmacar.com/anomaly-atlas/)"


def fetch_items():
    req = urllib.request.Request(
        FEED,
        headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, text/xml"},
    )
    with urllib.request.urlopen(req, timeout=22) as response:
        raw = response.read(450_000)
    root = ET.fromstring(raw)
    out = []
    seen = set()
    for el in root.findall("./channel/item"):
        title = html.unescape(re.sub(r"\s+", " ", (el.findtext("title") or "")).strip())[:180]
        link = (el.findtext("link") or "").strip()
        published = (el.findtext("pubDate") or "").strip()
        parsed = urllib.parse.urlparse(link)
        if parsed.scheme != "https" or parsed.hostname not in ("mufon.com", "www.mufon.com"):
            continue
        if not title or link in seen:
            continue
        seen.add(link)
        try:
            when = email.utils.parsedate_to_datetime(published)
            day = when.date().isoformat()
        except (ValueError, TypeError):
            day = None
        out.append({"title": title, "url": link, "published": day})
    out.sort(key=lambda x: x["published"] or "", reverse=True)
    return out[:8]


def main():
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    prior = {}
    if OUTPUT.exists():
        try:
            prior = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
    record = {
        "schema": 1,
        "feed": "MUFON public newsroom RSS (editorial posts, not case reports)",
        "url": FEED,
        "checked_at": now,
        "last_success_at": prior.get("last_success_at"),
        "status": "unavailable",
        "items": prior.get("items", []),
        "description": "Public MUFON news links; does not measure sightings, investigation outcomes or validated anomalies.",
        "rights": "No MUFON Case Management System content is reproduced; obtaining CMS data for reuse requires written MUFON permission.",
    }
    try:
        items = fetch_items()
        if not items:
            raise ValueError("MUFON RSS contains no usable newsroom entries")
        record["status"] = "ok"
        record["last_success_at"] = now
        record["items"] = items
        print(f"MUFON newsroom: {len(items)} public links; newest={items[0]['published']}")
    except Exception as exc:
        # Failure is visible in the dashboard; previous entries stay labeled stale.
        record["error"] = str(exc)[:180]
        print(f"MUFON newsroom source temporarily unavailable: {type(exc).__name__}: {exc}")
    OUTPUT.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()