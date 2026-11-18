# The Anomaly Observatory — v5.0

Source-linked three-tab dashboard: **UAP / Paranormal**, **Cyber + AI**, **Natural Disasters**.

## Data and refresh

The existing GitHub Actions workflow (`.github/workflows/observatory-refresh.yml`) runs daily and invokes:

- `anomaly-atlas/update_signals.py`: CISA KEV monthly catalog additions, USGS global M5+ monthly counts, and FRED VIX, each compared against the same six months a year earlier.
- `anomaly-atlas/update_ai_horizons.py`: checks the public METR benchmark **historical snapshot**, not a continuously measured new benchmark.
- `anomaly-atlas/update_uap_sources.py`: checks public MUFON **newsroom posts** only, *not* MUFON's member-only case database.
- `anomaly-atlas/update_live_events.py`: new ingestion for NASA EONET v3 natural-event metadata, USGS M5.5+ earthquakes, and CISA advisory RSS publication metadata. Maintains source identifiers, timestamps, archive continuity, and per-source errors in `events_live.json`.

All source datasets are separately dated. A successful daily poll does not imply that the source publishes new observations daily.

## Data integrity

- The combined headline is an **evidence summary**, not a statistically calibrated worldwide anomaly index. It uses only three comparable monthly series; monitored populations differ.
- UAP observation claims, government responses, archival releases and editorial posts are distinct symbol types. **No trend in extraordinary physical UAP events can be inferred from these records.**
- MUFON and NUFORC case databases are linked, **not scraped or republished**; permissions are required for third-party distribution.
- CISA KEV entries and advisories are **not attack counts**. System outages may be nonmalicious.
- NASA EONET is a curated feed, **not a census of natural disasters**. Earthquake magnitudes are physical measurements. NOAA NCEI Storm Events data are delayed.
- Curated incident milestones are editorial examples and not suitable for incidence-rate inference.
- No incident is linked causally across domains without evidence.

## Source attribution

Source registry on the website links to AARO, NASA UAP, National Archives, MUFON, NUFORC, CISA KEV and advisories, METR, FBI IC3, Cloudflare Radar, USGS, NASA EONET, NOAA NCEI, GDACS, and NOAA NHC. The registry labels which feeds are connected, which are reference-only, and which are restricted or delayed.

## Web experience

Three independent tab panels use time-proportional lane charts. Shapes convey UAP record type; source-specific bubble sizes are used only for CISA monthly KEV counts, USGS earthquake magnitudes, and high-density weekly aggregations. Every dot is clickable, source-linked, and exportable. The selected tab's source registry and data freshness are visible. Mobile chart horizontally scrolls.

Files in this directory are served as a static site. No custom backend or API token is required for the three added feeds.