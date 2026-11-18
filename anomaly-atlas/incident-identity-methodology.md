# The Anomaly Observatory — UAP and Cyber Incident Identity Standard
Version 1 · 2026-11-18

## Goal
Every plotted dot representing an event must represent one identifiable underlying event, not one article, witness report, database record, CVE, filing, or advisory. Separate *event counts* from *report counts* and *publication activity*. If identity is unresolved, display a range or "unresolved" instead of overstating precise incidence.

## Case-level data model (common to UAP and cyber)
- event_id: permanent Observatory-assigned canonical identifier
- domain: uap | cyber | natural
- event_type: e.g., aerial_observation, military_incursion, ransomware_intrusion, breach, availability_failure
- observed_start_utc and observed_end_utc: when the event actually occurred; record timezone and precision
- reported_at, published_at, last_verified_at: separate dates; never substitute the publication timestamp for occurrence
- geography: country, region, approximate coordinates, radius/uncertainty; no private witness location in public view
- involved_entities: canonical organizations, reporter, affected institutions, or witness groups; privacy-protected where appropriate
- source_refs: every upstream source, original native ID, URL, retrieval date, rights status, and what fact it supports
- investigation_status: reported | investigated | resolved | disputed | unknown
- cause_status: known | provisional | unknown (never infer hostile attribution or extraordinary origin from an unexplained case)
- report_count: number of report submissions known to refer to the same observation/incident
- independent_witness_count: number of demonstrably independent witnesses, when established
- exposure/impact units: separate counts of people, institutions, downtime, money, severity—not one universal bubble size
- dedup_status: unique | confirmed_cross_source | possible_duplicate | needs_review | aggregate_only
- collision_group: reference to candidate-group reviewed by a human; record merge/split history

## UAP dedup rules
1. **Exact upstream records**: source name + source-native case ID are the authoritative primary key. Re-ingestion updates the same report.
2. **Confirmed cross-reference**: AARO PR number, GEIPAN case ID, FOIA reference, CUFOS primary record, or explicit identifier in another source can link different publications to a single event. Document every link.
3. **Candidate geographic/temporal match**: same observation window (with clock uncertainty and timezone), plausible distance and bearing, consistent descriptions and instruments; flag for review, but never auto-merge merely by identical date/city.
4. **Multiple witnesses**: independent statements about the same object/event generate witness records, not extra event dots; report_count may increase.
5. **Multiple sky objects**: a clearly documented simultaneous multi-object encounter may be one observational event with several objects; do not invent a one-object-one-incident count.
6. **Follow-up and document releases**: reports, news articles, hearings, FOIA pages, AARO releases, and investigation updates attach as source_refs to the original event. Public communication volume remains an independent series.
7. **No inferred ET confirmation**: unexplained/unresolved means "not yet explained by the evidence available," not verified nonhuman origin.
8. **Privacy**: generalized witness locations and no personal identifying information unless genuinely public, necessary, and permitted.

## Cyber dedup rules
1. Source-native IDs dedup refreshes; one incident per documented underlying compromise/attack against a victim, with separate stage/impact records. An issuer's amended 8-K, OCR breach notice, and later news can describe one incident.
2. **CVE vs attack**: CISA KEV entries and vulnerability advisories are distinct indicator series, never one count of attacks.
3. **Actor allegations**: ransomware leak-site claims are unverified until independently corroborated. A takedown press release can describe earlier compromises; never count a fresh attack on the release date.
4. **Campaigns vs victims**: store one parent campaign ID (e.g. MOVEit exploitation), with distinct victim incident IDs where sufficiently established. Never count campaign announcements and victim reports twice in the same incidence statistic.
5. **Outages**: software defects, power failure, and cyberattacks must be separately classified; do not label downtime a hack absent evidence.
6. **Matching candidates**: affected organization (canonical alias), approximate compromise/discovery window, actor/campaign/intrusion technique, disclosed incident identifier, and impacted service. Similar timing alone does not establish common cause.
7. **Updates**: new victim counts, dollar losses and recovery dates amend existing incidents rather than creating new events.
8. **Complaint vs verified crime**: FBI IC3 complaints are an annual reporting measure, not a list of adjudicated attacks; published datasets cannot be assumed complete.

## Publication rules
- Publish **unique confirmed cases** and **potentially duplicated / pending review** separately.
- When uncertain whether two reports match, show confidence and possible overlap; use minimum–maximum bounds where meaningful instead of precise pooled totals.
- Preserve original source links and revision history when a case is merged/split.
- Never merge incompatible populations or denominators (e.g., MUFON report submissions, AARO cases, UAP hearings, IC3 complaints, KEV entries, breach notices, ransomware claims).
- Before using any source, confirm legal access, redistribution rights, rate limits, dates, stable IDs, and whether it offers a reproducible time series.
- Daily check != daily new cases: each feed displays last successful check, most recent case date, full/partial status and number of records imported.

## Source acquisition and status (as of 2026-11-18)
**Already ingested/checked daily:** CISA KEV monthly catalog additions; CISA advisory RSS articles (NOT verified attack counts); published METR benchmark snapshot (historical); public MUFON newsroom posts (editorial, not case database); USGS earthquakes; NASA EONET when source limits allow. Existing cases are selected editorial examples, not representative samples.

**Priority candidates not yet ingested:** GEIPAN CNES case and witness exports (public; test connection; last attempted export returned HTTP 502 on Nov 18, 2026); AARO publicly released identifiable cases; NARA/UAP metadata; HHS OCR breach notices; SEC EDGAR Item 1.05 filings; VCDB coded cases; more complete government datasets in other countries.

**Needs rights/permission or specific licensing:** MUFON CMS case-level records (write media@mufon.com), NUFORC record database, CUFOS UFOCAT-2023, Enigma case feed, and certain ransomware leak-site trackers. Do not bypass restrictions or use scraped unauthorized copies.

**Corroborating secondary sources only:** The Black Vault and official FOIA documents; Richard Dolan analysis, Jacques Vallée studies, GDELT news search; BleepingComputer, The Record, KrebsOnSecurity, vendor security advisories and DOJ/FBI press coverage. Every secondary reference supplements the underlying incident.

## Implementation gates
1. License/privacy/source access validated
2. Source-native stable identifiers and event timestamp fields verified
3. Unit tests and sample overlap tests across at least two independent sources
4. Manual review for ambiguous clusters with transparent review record
5. Publish separate raw-report counts and deduplicated-event counts
6. Full-source completeness and source check timestamps visible
7. Only then include a source in statistically comparable frequency trends

Current Observatory **does not yet automatically merge cross-source UAP sightings or individual cybercrime cases**. Source registration and the matching protocol are prerequisites, not proof of deduplication.
