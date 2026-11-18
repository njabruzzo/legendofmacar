/* AP article discovery is a separate news-reference layer, not another incident census. */
(function () {
  "use strict";
  const anchor = document.querySelector(".source-directory");
  if (!anchor) return;
  const section = document.createElement("section");
  section.className = "ap-coverage";
  section.setAttribute("aria-label", "Associated Press coverage and source references");
  section.innerHTML = [
    '<div class="ap-coverage-heading"><div><div class="section-num">INDEPENDENT REPORTING / ASSOCIATED PRESS</div>',
    '<h2>Related AP reporting</h2><p>Recent article references are discovered through GDELT public news-index metadata and link to AP News. They are <strong>not</strong> counted as additional sightings, attacks or disasters.</p></div>',
    '<div class="ap-check" id="apCoverageCheck">Checking article index…</div></div>',
    '<div id="apCoverageList" class="ap-coverage-list" aria-live="polite"><p>Checking recent AP links…</p></div>',
    '<p class="ap-coverage-foot">Source: <a href="https://apnews.com/" target="_blank" rel="noopener noreferrer">Associated Press</a>. Discovery metadata: <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer">GDELT</a>. This is a non-exhaustive article index, not AP official licensed Media API. Coverage is supporting evidence, not additional incidents.</p>'
  ].join("");
  anchor.before(section);
  const label = document.getElementById("apCoverageCheck");
  const list = document.getElementById("apCoverageList");

  function safe(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" &&
        ["apnews.com", "www.apnews.com"].includes(parsed.hostname) &&
        parsed.pathname.startsWith("/article/");
    } catch { return false; }
  }
  let payload = null;
  function active() {
    const current = document.querySelector(".tabs [role='tab'][aria-selected='true']");
    const tab = current && current.getAttribute("data-tab");
    return ["uap", "cyber", "natural"].includes(tab) ? tab : "uap";
  }
  function format(when) {
    if (!when) return "Not checked";
    const date = new Date(when);
    if (isNaN(date.getTime())) return String(when).slice(0, 10);
    return date.toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric",timeZone:"America/Chicago"});
  }
  function render() {
    const tab = active();
    list.replaceChildren();
    const feed = payload && payload.feeds && payload.feeds[tab];
    if (!feed) {
      label.textContent = "Article discovery unavailable";
      list.textContent = "No current AP index data available. Visit AP News directly for recent coverage.";
      return;
    }
    const checked = feed.checked_at || payload.checked_at;
    label.textContent = (feed.status === "ok" ? "Index checked " : "Last attempted ") + format(checked);
    const valid = (feed.items || []).filter(x => x && safe(x.url) && x.title);
    if (!valid.length) {
      list.textContent = feed.status === "ok"
        ? "No qualifying AP links were returned in this search period; this is not evidence that no relevant events occurred."
        : "AP article discovery was unavailable at its last check. Existing incident records are unaffected.";
      return;
    }
    for (const item of valid.slice(0, 8)) {
      const row = document.createElement("div"); row.className = "ap-link-row";
      const a = document.createElement("a");
      a.href = item.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = item.title;
      const stamp = document.createElement("span");
      stamp.textContent = "AP News · indexed " + String(item.indexed_date || "date unavailable");
      row.append(a, stamp); list.appendChild(row);
    }
    if (feed.status !== "ok") {
      const stale = document.createElement("p"); stale.className = "ap-caution";
      stale.textContent = "The latest index request failed. Older references are shown, not new confirmed coverage.";
      list.prepend(stale);
    }
  }
  async function refresh() {
    try {
      const response = await fetch("ap_coverage.json?ts=" + Date.now(), {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      payload = await response.json();
    } catch { payload = null; }
    render();
  }
  document.querySelectorAll(".tabs [role='tab']").forEach(tab => tab.addEventListener("click", () => {
    queueMicrotask(render);
  }));
  window.addEventListener("hashchange", render);
  refresh(); window.setInterval(refresh, 3600000);
})();
