
(()=> {
  "use strict";
  const API_BASE = "https://keimwerk-wasserwerte.chrisvoigt17.workers.dev/api/v1";
  const form = document.getElementById("kwWaterSearchForm");
  if (!form) return;
  const plzInput = document.getElementById("kwWaterPlz");
  const placeInput = document.getElementById("kwWaterPlace");
  const button = document.getElementById("kwWaterSearchButton");
  const status = document.getElementById("kwWaterSearchStatus");
  const result = document.getElementById("kwWaterSearchResult");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const fmt = value => String(value ?? "").replace(".", ",");
  function categoryFor(m) {
    const bucket = String(m.bucket || m.substance?.category || "").toLowerCase();
    const key = String(m.substanceKey || m.substance?.key || "").toLowerCase();
    if (bucket.includes("pfas") || key.includes("pfas")) return "PFAS";
    if (bucket.includes("heavy") || bucket.includes("metal") || ["blei","uran","kupfer","arsen","nickel","cadmium","chrom","quecksilber"].some(x=>key.includes(x))) return "Metalle und Spurenelemente";
    if (bucket.includes("nutrient") || ["calcium","magnesium","nitrat","nitrit","phosphat","kalium"].some(x=>key.includes(x))) return "Nährstoffe und Ionen";
    if (bucket.includes("micro") || bucket.includes("bacter")) return "Mikrobiologische Parameter";
    return "Allgemeine Wasserparameter";
  }
  function displayValue(m) {
    const original = String(m.originalValue ?? "").trim();
    const unit = String(m.unit || m.substance?.defaultUnit || "");
    if (m.belowDetection) {
      if (/nicht nachweisbar/i.test(original)) {
        const lim = m.detectionLimit != null ? ` (Bestimmungsgrenze: ${fmt(m.detectionLimit)} ${unit})` : "";
        return {value:"Nicht nachweisbar"+lim, unit};
      }
      if (original) return {value:original, unit:unitFromOriginal(original,unit)};
      return {value:m.detectionLimit != null ? `< ${fmt(m.detectionLimit)}` : "Unter Bestimmungsgrenze", unit};
    }
    if (original) return {value:original, unit:unitFromOriginal(original,unit)};
    if (m.value == null) return {value:"Nicht verfügbar",unit};
    return {value:fmt(m.value),unit};
  }
  function unitFromOriginal(original, fallback) {
    const match = original.match(/(µg\s*\/\s*l|μg\s*\/\s*l|ug\s*\/\s*l|mg\s*\/\s*l|ng\s*\/\s*l|g\s*\/\s*l|°dH|µS\s*\/\s*cm)/i);
    return match ? match[1].replace(/\s+/g,"").replace(/μg/i,"µg").replace(/ug/i,"µg").replace(/\/l/i,"/L").replace(/\/cm/i,"/cm") : fallback;
  }
  function render(data, query) {
    result.hidden = false;
    if (!data || data.status !== "ok" || !Array.isArray(data.measurements) || data.measurements.length === 0) {
      result.innerHTML = `<div class="water-empty"><strong>Keine direkt bestätigten Messwerte gefunden.</strong><p class="note">Für „${esc(query)}“ liegen in dieser Datenquelle keine verifizierten Werte vor. Es werden deshalb keine Werte eines Nachbarorts als deine Wasserwerte angezeigt.</p><p class="note">Prüfe die Postleitzahl oder suche beim örtlichen Wasserversorger nach einer aktuellen Trinkwasseranalyse.</p></div>`;
      return;
    }
    const city = data.location?.city?.name || data.location?.name || query;
    const district = data.location?.district?.name;
    const measurementDate = data.availability?.latestMeasurementDate || data.latestMeasurementDate || data.measurements.map(m=>m.measurementDate).filter(Boolean).sort().slice(-1)[0] || "Nicht angegeben";
    const verified = data.measurements.filter(m => m.verificationStatus === "verified").length;
    let sourceList = Array.isArray(data.sources) ? data.sources : [];
    if (!sourceList.length) {
      const seen = new Set();
      for (const m of data.measurements) if (m.source && !seen.has(m.source.url || m.source.title)) { seen.add(m.source.url || m.source.title); sourceList.push(m.source); }
    }
    let out = `<div class="water-meta"><strong>${esc(city)}${district ? " · "+esc(district) : ""} · Suche: ${esc(query)}</strong><br><span class="note">${verified} verifizierte bzw. als verifiziert markierte Werte · Messdatum: ${esc(measurementDate)}</span><p class="note">Treffer der Datenquelle; das konkrete Versorgungsgebiet kann je nach Straße abweichen. Bei einer PLZ mit mehreren Versorgungszonen bitte die Angaben des Versorgers prüfen.</p></div>`;
    const groups = new Map();
    for (const m of data.measurements) {
      if (m.verificationStatus !== "verified") continue;
      const cat = categoryFor(m);
      if (!groups.has(cat)) groups.set(cat,[]);
      groups.get(cat).push(m);
    }
    if (!groups.size) out += `<div class="water-empty">Es liegen keine bestätigten Einzelmesswerte zum Anzeigen vor.</div>`;
    for (const [cat, rows] of groups) {
      out += `<h4>${esc(cat)}</h4><div class="water-table-wrap"><table><thead><tr><th>Parameter</th><th>Messwert</th><th>Einheit</th></tr></thead><tbody>`;
      for (const m of rows) {
        const name = m.substance?.name || m.name || m.substanceKey || "Parameter";
        const val = displayValue(m);
        out += `<tr><td>${esc(name)}</td><td>${esc(val.value)}</td><td>${esc(val.unit)}</td></tr>`;
      }
      out += `</tbody></table></div>`;
    }
    if (sourceList.length) {
      out += `<h4>Quelle</h4><ul>`;
      for (const src of sourceList) {
        const title = src.title || src.organization || "Datenquelle";
        out += `<li>${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>` : esc(title)}${src.publicationDate ? ` · ${esc(src.publicationDate)}` : ""}</li>`;
      }
      out += `</ul>`;
    }
    if (data.notice) out += `<p class="note">${esc(data.notice)}</p>`;
    out += `<div class="water-warning">Diese Online-Werte dienen zur Orientierung. Sie gelten nur für das von der Quelle erfasste Versorgungsgebiet und den angegebenen Analysezeitraum. Für eine genaue Zuordnung bitte den Versorger und gegebenenfalls die Straße prüfen.</div>`;
    result.innerHTML = out;
  }
  const fieldMap = [
    {keys:["calcium","calcium_total","ca"], id:"Ca", molar:40.078},
    {keys:["magnesium","mg"], id:"Mg", molar:24.305},
    {keys:["sodium","natrium","na"], id:"Na", molar:22.989769},
    {keys:["potassium","kalium","k"], id:"K", molar:39.0983},
    {keys:["chloride","chlorid","cl"], id:"Cl", molar:35.453},
    {keys:["nitrate","nitrat","no3","nitrate_n"], id:"NO3", molar:62.0049},
    {keys:["sulfate","sulfat","so4"], id:"SO4", molar:96.0626},
    {keys:["phosphate","phosphat","po4"], id:"PO4", molar:94.9714}
  ];
  function normalizedKey(m) {
    return String(m.substanceKey || m.substance?.key || m.substance?.name || m.name || "")
      .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }
  function mgPerLiter(m, spec) {
    if (m.verificationStatus !== "verified" || m.belowDetection === true) return null;
    const original = String(m.originalValue || "");
    if (/nicht nachweisbar|unter bestimmungsgrenze|^\s*</i.test(original)) return null;
    let value = Number(m.value);
    if (!Number.isFinite(value)) {
      const match = original.replace(/,/g, ".").match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
      if (!match) return null;
      value = Number(match[1]);
      const unitMatch = original.match(/(µg|μg|ug|mg|ng)\s*\/\s*l/i);
      const unit = unitMatch ? unitMatch[1].toLowerCase() : String(m.unit || m.substance?.defaultUnit || "mg/L").toLowerCase();
      if (["µg","μg","ug"].includes(unit)) value /= 1000;
      else if (unit === "ng") value /= 1000000;
      else if (unit !== "mg" && !unit.includes("mg/l")) return null;
      return Number.isFinite(value) && value >= 0 ? value : null;
    }
    const unit = String(m.unit || m.substance?.defaultUnit || "mg/L").toLowerCase().replace(/\s/g, "");
    if (unit.includes("µg/l") || unit.includes("μg/l") || unit.includes("ug/l")) value /= 1000;
    else if (unit.includes("ng/l")) value /= 1000000;
    else if (unit.includes("mmol/l")) value *= spec.molar;
    else if (!unit.includes("mg/l")) return null;
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  function autoFillFields(data, query) {
    const measurements = Array.isArray(data.measurements) ? data.measurements : [];
    const filled = [];
    for (const spec of fieldMap) {
      const found = measurements.find(m => {
        if (m.verificationStatus !== "verified") return false;
        const key = normalizedKey(m);
        return spec.keys.some(k => key === k || key.includes(k));
      });
      if (!found) continue;
      const value = mgPerLiter(found, spec);
      if (value === null) continue;
      const input = document.getElementById("ion-" + spec.id);
      const unit = document.getElementById("unit-" + spec.id);
      if (!input || !unit) continue;
      // The calculator's stored input is mg/L; do not alter the selected display unit.
      const mgValue = unit.value === "mmol" ? value / spec.molar : value;
      input.value = String(Number(mgValue.toPrecision(7)));
      input.dispatchEvent(new Event("input", {bubbles:true}));
      filled.push(found.substance?.name || found.name || spec.keys[0]);
    }
    // KS 4,3 wird nur übernommen, wenn die Quelle einen passenden
    // verifizierten Wert ausdrücklich meldet. Nicht aus Gesamthärte ableiten.
    const ksKeys = ["acidcapacity43", "acidcapacity4_3", "acidcapacity", "acidcapacity43mmoll", "alkalinity", "carbonatealkalinity", "acidneutralizingcapacity"];
    const ksMeasurement = measurements.find(m => {
      if (m.verificationStatus !== "verified" || m.belowDetection === true) return false;
      const key = normalizedKey(m);
      return ksKeys.some(k => key === k || key.includes(k));
    });
    if (ksMeasurement) {
      const ksUnit = String(ksMeasurement.unit || ksMeasurement.substance?.defaultUnit || "").toLowerCase().replace(/\s/g, "");
      let ksValue = Number(ksMeasurement.value);
      if (!Number.isFinite(ksValue)) {
        const raw = String(ksMeasurement.originalValue || "").replace(/,/g, ".");
        const match = raw.match(/^\s*([0-9]+(?:\.[0-9]+)?)/);
        if (match) ksValue = Number(match[1]);
      }
      // Only mmol/L (or equivalent mmol/l) is accepted; avoid unit guessing.
      if (Number.isFinite(ksValue) && ksValue >= 0 && (ksUnit.includes("mmol/l") || ksUnit.includes("mval/l"))) {
        const ksInput = document.getElementById("ks43");
        if (ksInput) {
          ksInput.value = String(Number(ksValue.toPrecision(7)));
          ksInput.dispatchEvent(new Event("input", {bubbles:true}));
          filled.push("Säurekapazität KS 4,3");
        }
      }
    }
    result.hidden = true;
    result.innerHTML = "";
    const city = data.location?.city?.name || data.location?.name || query;
    const date = data.availability?.latestMeasurementDate || data.latestMeasurementDate || "Datum nicht angegeben";
    if (filled.length) {
      status.textContent = `${filled.length} Wasserwerte für ${city} wurden direkt in die Eingabefelder übernommen (${filled.join(", ")}). Messdatum der Quelle: ${date}. Nicht gefundene Werte wurden nicht verändert.`;
    } else {
      status.textContent = `Für ${city} wurden keine passenden, verifizierten Werte für die vorhandenen Eingabefelder gefunden. Die Eingaben bleiben unverändert.`;
    }
  }

  // Keep the enclosing Wasserwerte modal open while the live search runs.
  // Prevent both native form navigation and propagation to any modal handlers.
  const searchButton = document.getElementById("kwWaterSearchButton");
  async function runWaterSearch(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const plz = plzInput.value.trim();
    const place = placeInput.value.trim();
    if (!plz && !place) { status.textContent = "Bitte eine Postleitzahl oder einen Ort eingeben."; return; }
    if (plz && !/^\d{5}$/.test(plz)) { status.textContent = "Bitte eine fünfstellige deutsche Postleitzahl eingeben."; plzInput.focus(); return; }
    const query = plz || place;
    status.textContent = "Suche läuft …";
    result.hidden = true; result.innerHTML = "";
    button.disabled = true; button.textContent = "Suche läuft …";
    try {
      const url = new URL(API_BASE + "/water");
      url.searchParams.set("q", query);
      if (place && plz) url.searchParams.set("ort", place);
      const response = await fetch(url.toString(), {headers:{Accept:"application/json"}});
      if (!response.ok) throw new Error("HTTP "+response.status);
      const data = await response.json();
      if (data.status !== "ok" || data.dataAvailable === false) {
        status.textContent = "";
        result.hidden = false;
        result.innerHTML = `<div class="water-empty"><strong>Keine direkten Messdaten gefunden.</strong><p class="note">Für ${esc(query)} liegen keine bestätigten Werte vor. Die Suche zeigt absichtlich keine Vergleichswerte eines anderen Orts automatisch an.</p><p class="note">Du kannst den Ortsteil ergänzen oder die Trinkwasseranalyse des zuständigen Versorgers aufrufen.</p></div>`;
      } else {
        autoFillFields(data, query);
      }
    } catch (err) {
      status.textContent = "Die Live-Suche ist momentan nicht erreichbar. Bitte später erneut versuchen.";
      result.hidden = false;
      result.innerHTML = `<div class="water-empty">Es konnten keine Daten geladen werden. Es wurden keine Ersatzwerte eingesetzt.</div>`;
      console.error("Keimwerk-Wasserwertsuche:", err);
    } finally {
      button.disabled = false; button.textContent = "Wasserwerte suchen";
    }
  }
  // Use an explicit button action instead of native form submission. This prevents
  // the iframe from navigating/reloading and keeps the water modal open.
  if (searchButton) searchButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    runWaterSearch();
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    event.stopPropagation();
    runWaterSearch(event);
  });
})();
