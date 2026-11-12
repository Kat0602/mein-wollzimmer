
"use strict";

const KEY = "mein-wollzimmer-v3";

let db = {
  yarns: [],
  colors: [],
  needles: [],
  accessories: [],
  projects: []
};

try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && typeof saved === "object") {
    for (const key of Object.keys(db)) {
      if (Array.isArray(saved[key])) db[key] = saved[key];
    }
  }
} catch (error) {
  console.warn("Gespeicherte Daten konnten nicht gelesen werden.", error);
}

let tab = "yarns";
let openYarn = null;
let openColor = null;
let editing = null;

const $ = id => document.getElementById(id);

const esc = value => String(value ?? "").replace(
  /[&<>"']/g,
  char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]
);

const num = value =>
  Number(String(value ?? 0).replace(",", ".")) || 0;

const uid = () =>
  String(Date.now()) + Math.random().toString(36).slice(2, 8);

const fmt = value =>
  Number(value).toLocaleString("de-DE", {
    maximumFractionDigits: 2
  });

const sum = values =>
  values.reduce((total, value) => total + value, 0);

const grams = color =>
  color.unknown
    ? null
    : Math.max(0, num(color.quantity) - num(color.used));

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  render();
}

const yarnFields = [
  ["brand", "Hersteller"],
  ["name", "Garnname"],
  ["composition", "Zusammensetzung"],
  ["weight", "Knäuelgewicht (g)", "number"],
  ["length", "Lauflänge je Knäuel (m)", "number"],
  ["needle", "Empfohlene Nadelstärke (mm)"],
  ["thickness", "Garnstärke (z. B. DK, Worsted)"],
  ["gauge", "Maschenprobe (optional)"],
  ["notes", "Allgemeine Erfahrungen", "textarea"],
  ["rating", "Bewertung (0–5)", "select",
    ["0", "1", "2", "3", "4", "5"]],
  ["rebuy", "Wieder kaufen?", "select",
    ["Noch offen", "Ja", "Vielleicht", "Nein"]]
];

const colorFields = [
  ["name", "Farbname"],
  ["code", "Farbnummer"],
  ["hex", "Farbton (optional, z. B. #d7a0b8)"],
  ["lot", "Farbpartie"],
  ["skeins", "Ganze Knäuel (Anzahl)", "number"],
  ["quantity", "Gesamtmenge vorhanden/gekauft (g)", "number"],
  ["used", "Davon verbraucht (g)", "number"],
  ["unknown", "Bestand noch nicht gezählt", "checkbox"],
  ["location", "Lagerort (optional)"],
  ["price", "Preis pro Knäuel (€)", "number"],
  ["notes", "Notizen zu dieser Farbe", "textarea"]
];

const needleFields = [
  ["category", "Art", "select", [
    "Stricknadel",
    "Häkelnadel",
    "Tunesische Häkelnadel",
    "Nadelspiel",
    "Rundstricknadel",
    "Austauschbare Spitze",
    "Sonstige"
  ]],
  ["brand", "Hersteller"],
  ["model", "Modell"],
  ["size", "Stärke (mm)"],
  ["material", "Material", "select", [
    "Metall", "Holz", "Bambus", "Kunststoff", "Andere"
  ]],
  ["length", "Länge / Seillänge"],
  ["count", "Anzahl", "number"],
  ["rating", "Bewertung (0–5)", "select",
    ["0", "1", "2", "3", "4", "5"]],
  ["notes", "Meine Erfahrungen", "textarea"]
];

const accessoryFields = [
  ["name", "Bezeichnung"],
  ["category", "Art (z. B. Seil, Verbinder)"],
  ["size", "Länge / Größe"],
  ["count", "Anzahl", "number"],
  ["notes", "Bemerkungen", "textarea"]
];

const projectFields = [
  ["name", "Projektname"],
  ["technique", "Technik", "select", [
    "Stricken", "Häkeln", "Tunesisches Häkeln"
  ]],
  ["pattern", "Muster / Stich"],
  ["yarn", "Verwendetes Garn / Farbe"],
  ["used", "Garnverbrauch (g)", "number"],
  ["needle", "Verwendete Nadel"],
  ["status", "Status", "select", [
    "Geplant", "In Arbeit", "Fertig"
  ]],
  ["date", "Fertig am", "date"],
  ["notes", "Erfahrungen / Ergebnis", "textarea"]
];

const fieldSets = {
  yarns: yarnFields,
  colors: colorFields,
  needles: needleFields,
  accessories: accessoryFields,
  projects: projectFields
};

function fields(definitions, data = {}) {
  return definitions.map(([key, label, type = "text", options]) => {
    let control;

    if (type === "select") {
      control = `<select name="${key}">${
        options.map(option =>
          `<option value="${esc(option)}" ${
            data[key] === option ? "selected" : ""
          }>${esc(option)}</option>`
        ).join("")
      }</select>`;
    } else if (type === "textarea") {
      control = `<textarea name="${key}">${
        esc(data[key])
      }</textarea>`;
    } else if (type === "checkbox") {
      control = `<input type="checkbox" name="${key}" ${
        data[key] ? "checked" : ""
      } style="width:auto">`;
    } else {
      control = `<input name="${key}" type="${type}" ${
        type === "number" ? 'min="0" step="any"' : ""
      } value="${esc(data[key])}">`;
    }

    return `<label>${esc(label)}${control}</label>`;
  }).join("");
}

function form(collection, definitions, id = null, extra = {}) {
  const item = id
    ? db[collection].find(entry => entry.id === id)
    : {};

  if (!item) return;

  editing = { collection, id, extra };

  $("editor").innerHTML = `
    <section>
      <h3>${id ? "Eintrag bearbeiten" : "Neuen Eintrag erfassen"}</h3>
      <form id="editForm">
        <div class="grid">${fields(definitions, item)}</div>
        <div class="actions" style="margin-top:14px">
          <button class="primary" type="submit">Speichern</button>
          <button type="button" id="cancel">Abbrechen</button>
        </div>
      </form>
    </section>
  `;

  if (collection === "yarns" || collection === "colors") {
    addScanControl(collection);
  }

  $("editor").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  $("cancel").onclick = () => {
    $("editor").innerHTML = "";
    editing = null;
  };

  $("editForm").onsubmit = event => {
    event.preventDefault();

    const formElement = event.target;
    const data = new FormData(formElement);
    const values = { ...item, ...extra };

    for (const [key, , type] of definitions) {
      values[key] = type === "checkbox"
        ? formElement.elements[key].checked
        : String(data.get(key) ?? "").trim();
    }

    if (!values.name && !values.brand) {
      alert("Bitte einen Namen eingeben.");
      return;
    }

    if (id) {
      Object.assign(item, values);
    } else {
      db[collection].push({ id: uid(), ...values });
    }

    editing = null;
    save();
  };
}

function remove(collection, id) {
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;

  db[collection] = db[collection].filter(item => item.id !== id);

  if (collection === "yarns") {
    db.colors = db.colors.filter(item => item.yarnId !== id);
  }

  save();
}

function actions(collection, id) {
  return `
    <div class="actions">
      <button data-edit="${collection}:${id}">Bearbeiten</button>
      <button class="danger" data-delete="${collection}:${id}">
        Löschen
      </button>
    </div>
  `;
}

function render() {
  const labels = {
    yarns: "🧶 Garne",
    needles: "🪡 Nadeln",
    accessories: "🧰 Zubehör",
    projects: "✂️ Projekte",
    backup: "💾 Sicherung"
  };

  $("tabs").innerHTML = Object.entries(labels).map(([key, label]) =>
    `<button class="${tab === key ? "active" : ""}"
      data-tab="${key}">${label}</button>`
  ).join("");

  $("app").innerHTML = `
    <div id="editor"></div>
    <div id="content"></div>
  `;

  const content = $("content");

  if (tab === "yarns") {
    renderYarns(content);
  } else if (tab === "backup") {
    renderBackup(content);
  } else {
    renderSimple(content);
  }

  wire();
}

function renderYarns(content) {
  const known = db.colors.filter(color => !color.unknown);
  const unknown = db.colors.filter(color => color.unknown).length;

  content.innerHTML = `
    <section>
      <div class="stats">
        <div class="stat">
          <strong>${db.yarns.length}</strong>
          <span class="muted">Garnsorten</span>
        </div>
        <div class="stat">
          <strong>${db.colors.length}</strong>
          <span class="muted">Farben</span>
        </div>
        <div class="stat">
          <strong>${fmt(sum(known.map(grams)))} g</strong>
          <span class="muted">Restbestand*</span>
        </div>
      </div>
      <p class="muted">
        *Nur gezählte Mengen; ${unknown} Farbe(n) noch offen.
      </p>
      <div class="toolbar">
        <input id="search" placeholder="Garn oder Hersteller suchen">
        <button class="primary" id="newYarn">+ Garnsorte</button>
      </div>
    </section>
    <div id="yarnList"></div>
  `;

  const paint = () => {
    const query = ($("search")?.value || "").toLowerCase();

    const yarns = db.yarns.filter(yarn => {
      const colors = db.colors.filter(c => c.yarnId === yarn.id);
      const searchable = [
        yarn.brand,
        yarn.name,
        ...colors.map(c => c.name)
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    }).sort((a, b) =>
      `${a.brand} ${a.name}`.localeCompare(
        `${b.brand} ${b.name}`, "de"
      )
    );

    $("yarnList").innerHTML = yarns.map(yarn => {
      const colors = db.colors.filter(c => c.yarnId === yarn.id);
      const knownColors = colors.filter(c => !c.unknown);
      const remaining = sum(knownColors.map(grams));

      return `
        <section>
          <div class="actions" style="justify-content:space-between">
            <div>
              <h3 style="margin:0">
                ${esc(yarn.brand)} ${esc(yarn.name)}
              </h3>
              <div class="muted">
                ${colors.length} Farben · ${fmt(remaining)} g Rest
                ${colors.some(c => c.unknown)
                  ? " + ungezählte Bestände" : ""}
              </div>
            </div>
            <button data-open-yarn="${yarn.id}">
              ${openYarn === yarn.id ? "Schließen" : "Farben ansehen"}
            </button>
          </div>

          ${openYarn === yarn.id ? `
            <p class="muted">
              ${esc(yarn.composition)} ·
              ${esc(yarn.weight)} g /
              ${esc(yarn.length)} m ·
              Nadel ${esc(yarn.needle)} mm
            </p>

            ${actions("yarns", yarn.id)}

            <details>
              <summary>Weitere Garndetails & Erfahrungen</summary>
              <p>
                ${esc(yarn.thickness || "Keine Garnstärke")} ·
                Maschenprobe: ${esc(yarn.gauge || "—")}
              </p>
              <p>
                Bewertung: ${esc(yarn.rating || "0")}/5 ·
                Wieder kaufen: ${esc(yarn.rebuy || "Noch offen")}
              </p>
              <p>${esc(yarn.notes || "Noch keine Erfahrungen")}</p>
            </details>

            <hr>

            <div class="actions">
              <strong>Farben und Mengen</strong>
              <button data-new-color="${yarn.id}">+ Farbe</button>
            </div>

            ${colors.length ? colors.map(color => `
              <div class="entry">
                <div class="actions"
                  style="justify-content:space-between">
                  <div>
                    <span class="dot" style="background:${
                      /^#[0-9a-f]{6}$/i.test(color.hex || "")
                        ? color.hex : "#ddd"
                    }"></span>
                    <strong>
                      ${esc(color.name || "Ohne Farbnamen")}
                    </strong>
                    <span class="muted">${esc(color.code)}</span>
                    <div class="muted">
                      ${color.unknown
                        ? "Noch nicht gezählt"
                        : `${esc(color.skeins || "0")} ganze Knäuel ·
                           ${fmt(grams(color))} g Rest`}
                    </div>
                  </div>
                  <button data-open-color="${color.id}">
                    ${openColor === color.id ? "Weniger" : "Details"}
                  </button>
                </div>

                ${openColor === color.id ? `
                  <p class="muted">
                    Partie: ${esc(color.lot || "—")} ·
                    Lagerort: ${esc(color.location || "—")} ·
                    Preis: ${esc(color.price || "—")} €
                  </p>
                  <p class="muted">
                    Erfasst: ${esc(color.quantity || "0")} g ·
                    Verbraucht: ${esc(color.used || "0")} g
                  </p>
                  <p>${esc(color.notes || "")}</p>
                  ${actions("colors", color.id)}
                ` : ""}
              </div>
            `).join("") : `
              <p class="muted">Noch keine Farben erfasst.</p>
            `}
          ` : ""}
        </section>
      `;
    }).join("") ||
      "<section>Noch keine passenden Garne erfasst.</section>";

    wire();
  };

  paint();

  $("search").oninput = paint;
  $("newYarn").onclick = () => form("yarns", yarnFields);
}

function renderSimple(content) {
  const config = {
    needles: ["Meine Nadeln", needleFields],
    accessories: ["Mein Zubehör", accessoryFields],
    projects: ["Meine Projekte", projectFields]
  };

  const [title, definitions] = config[tab];

  content.innerHTML = `
    <section>
      <div class="actions" style="justify-content:space-between">
        <h2>${title} (${db[tab].length})</h2>
        <button class="primary" id="add">+ Hinzufügen</button>
      </div>
      <input id="search" placeholder="Einträge durchsuchen">
    </section>
    <div id="list"></div>
  `;

  const paint = () => {
    const query = ($("search").value || "").toLowerCase();

    $("list").innerHTML = db[tab]
      .filter(item =>
        JSON.stringify(item).toLowerCase().includes(query)
      )
      .map(item => `
        <section>
          <h3>${esc(item.name || `${item.brand || ""} ${item.model || ""}`)}</h3>
          <p class="muted">
            ${esc(item.category || item.technique || "")}
            ${esc(item.size || "")}
            ${esc(item.material || "")}
            ${esc(item.status || "")}
          </p>
          <details>
            <summary>Alle Details anzeigen</summary>
            ${definitions.map(([key, label]) => `
              <p>
                <strong>${esc(label)}:</strong>
                ${esc(item[key] ?? "—")}
              </p>
            `).join("")}
          </details>
          ${actions(tab, item.id)}
        </section>
      `).join("") ||
      "<section>Noch keine Einträge vorhanden.</section>";

    wire();
  };

  paint();

  $("search").oninput = paint;
  $("add").onclick = () => form(tab, definitions);
}

function renderBackup(content) {
  content.innerHTML = `
    <section>
      <h2>Datensicherung</h2>
      <p>
        Alle Einträge werden nur in diesem Browser auf diesem
        Gerät gespeichert. Bitte regelmäßig eine Sicherung
        herunterladen und beispielsweise in iCloud Drive ablegen.
      </p>
      <div class="actions">
        <button class="primary" id="export">
          Sicherung herunterladen (JSON)
        </button>
        <label style="display:inline-block">
          Sicherung wiederherstellen
          <input type="file" id="import"
            accept=".json,application/json">
        </label>
      </div>
      <p class="muted">
        Wiederherstellen ersetzt den aktuellen Bestand.
        Die App synchronisiert nicht automatisch zwischen Geräten.
      </p>
    </section>
  `;

  $("export").onclick = () => {
    const backup = {
      version: 3,
      exported: new Date().toISOString(),
      ...db
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      "mein-wollzimmer-sicherung-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  $("import").onchange = async event => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const imported = JSON.parse(await file.text());

      if (!Object.keys(db).every(key =>
        Array.isArray(imported[key])
      )) {
        throw new Error("Ungültige Sicherungsdatei");
      }

      if (!confirm(
        "Alle aktuellen Einträge durch diese Sicherung ersetzen?"
      )) return;

      for (const key of Object.keys(db)) {
        db[key] = imported[key];
      }

      save();
      alert("Sicherung eingelesen.");
    } catch (error) {
      alert("Sicherung konnte nicht eingelesen werden.");
    }
  };
}

function wire() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.onclick = () => {
      tab = button.dataset.tab;
      openYarn = null;
      openColor = null;
      render();
    };
  });

  document.querySelectorAll("[data-open-yarn]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.openYarn;
      openYarn = openYarn === id ? null : id;
      render();
    };
  });

  document.querySelectorAll("[data-open-color]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.openColor;
      openColor = openColor === id ? null : id;
      render();
    };
  });

  document.querySelectorAll("[data-new-color]").forEach(button => {
    button.onclick = () =>
      form("colors", colorFields, null, {
        yarnId: button.dataset.newColor
      });
  });

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const [collection, id] = button.dataset.edit.split(":");
      form(collection, fieldSets[collection], id);
    };
  });

  document.querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = () => {
      const [collection, id] = button.dataset.delete.split(":");
      remove(collection, id);
    };
  });
}

// =====================================================
// BANDEROLEN-ERKENNUNG
// =====================================================

function addScanControl(collection) {
  const formElement = $("editForm");
  if (!formElement) return;

  const panel = document.createElement("div");
  panel.className = "scan-panel";

  panel.innerHTML = `
    <details open>
      <summary>📷 Banderole mit mehreren Fotos erfassen</summary>

      <p class="muted">
        Fotografiere die Banderole von allen Seiten.
        Die Bilder werden gemeinsam ausgewertet.
      </p>

      <label>
        Fotos aufnehmen oder auswählen
        <input type="file" id="labelPhotos"
          accept="image/*" multiple>
      </label>

      <div id="photoList" class="muted" aria-live="polite">
        Noch keine Fotos ausgewählt.
      </div>

      <div class="actions">
        <button type="button" id="scanLabel">
          Alle Fotos auswerten
        </button>
        <button type="button" id="clearPhotos">
          Fotos entfernen
        </button>
      </div>

      <p id="scanStatus" class="muted" role="status"></p>

      <details open>
        <summary>Erkannten Text kontrollieren</summary>
        <textarea id="scanText" rows="10"
          placeholder="Erkannter Text oder kopierter iPhone-Text"></textarea>

        <div class="actions">
          <button type="button" id="applyScan">
            Angaben in Formular übernehmen
          </button>
        </div>
      </details>
    </details>
  `;

  formElement.insertBefore(panel, formElement.firstChild);

  const files = [];
  const input = panel.querySelector("#labelPhotos");
  const status = panel.querySelector("#scanStatus");
  const scanButton = panel.querySelector("#scanLabel");
  const list = panel.querySelector("#photoList");
  const textArea = panel.querySelector("#scanText");

  function updateList() {
    list.replaceChildren();

    if (!files.length) {
      list.textContent = "Noch keine Fotos ausgewählt.";
      return;
    }

    files.forEach((file, index) => {
      const row = document.createElement("div");
      row.style.margin = "6px 0";

      const label = document.createElement("span");
      label.textContent =
        `${index + 1}. ${file.name} ` +
        `(${Math.round(file.size / 1024)} KB) `;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Entfernen";

      removeButton.onclick = () => {
        files.splice(index, 1);
        updateList();
      };

      row.append(label, removeButton);
      list.appendChild(row);
    });
  }

  input.onchange = () => {
    for (const file of input.files || []) {
      if (file.type.startsWith("image/")) files.push(file);
    }

    input.value = "";
    updateList();
    status.textContent = `${files.length} Foto(s) bereit.`;
  };

  panel.querySelector("#clearPhotos").onclick = () => {
    files.length = 0;
    updateList();
    status.textContent = "Fotos entfernt.";
  };

  scanButton.onclick = async () => {
    if (!files.length) {
      status.textContent =
        "Bitte zuerst mindestens ein Foto auswählen.";
      return;
    }

    scanButton.disabled = true;
    let worker = null;

    try {
      await loadTesseract();

      status.textContent = "Texterkennung wird vorbereitet …";

      worker = await Tesseract.createWorker("deu+eng");

      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: "11"
      });

      const allTexts = [];

      for (let index = 0; index < files.length; index++) {
        status.textContent =
          `Foto ${index + 1} von ${files.length} wird ausgewertet …`;

        try {
          const variants = await prepareLabelImage(files[index]);
          const candidates = [];

          for (const variant of variants) {
            const result = await worker.recognize(variant);

            const recognized = String(
              result.data.text || ""
            ).trim();

            if (recognized) {
              candidates.push({
                text: recognized,
                score: scoreLabelText(
                  recognized,
                  result.data.confidence || 0
                )
              });
            }
          }

          candidates.sort((a, b) => b.score - a.score);

          // Unterschiedliche Varianten behalten:
          // Eine Variante kann die Materialangaben lesen,
          // eine andere die Farbnummer.
          const selected = [];

          for (const candidate of candidates) {
            const normalized = candidate.text
              .toLowerCase()
              .replace(/\s+/g, " ");

            if (!selected.some(existing =>
              existing.normalized === normalized
            )) {
              selected.push({
                text: candidate.text,
                normalized
              });
            }
          }

          if (selected.length) {
            allTexts.push(
              `--- Foto ${index + 1} ---\n` +
              selected.map(item => item.text).join("\n")
            );
          }
        } catch (error) {
          console.warn("Foto konnte nicht gelesen werden.", error);
        }
      }

      textArea.value = allTexts.join("\n\n");

      status.textContent = allTexts.length
        ? `${allTexts.length} Foto(s) ausgewertet. ` +
          "Jetzt Angaben in das Formular übernehmen."
        : "Kein lesbarer Text erkannt. " +
          "Du kannst den Text auch mit der iPhone-Fotos-App " +
          "kopieren und hier einfügen.";

    } catch (error) {
      status.textContent =
        "Texterkennung fehlgeschlagen: " + error.message;
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn(error);
        }
      }

      scanButton.disabled = false;
    }
  };

  panel.querySelector("#applyScan").onclick = () => {
    const suggestions = scanSuggestions(
      textArea.value,
      collection
    );

    let count = 0;

    for (const [key, value] of Object.entries(suggestions)) {
      const field = formElement.elements[key];

      if (!field || value === undefined || value === "") {
        continue;
      }

      if (field.value) {
        const replace = confirm(
          `Das bereits ausgefüllte Feld "${key}" ` +
          `durch "${value}" ersetzen?`
        );

        if (!replace) continue;
      }

      field.value = value;
      count++;
    }

    status.textContent =
      `${count} Feld(er) übernommen. ` +
      "Bitte die Angaben prüfen und anschließend speichern.";
  };
}

async function loadTesseract() {
  if (window.Tesseract) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/" +
      "dist/tesseract.min.js";

    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("Texterkennung konnte nicht geladen werden."));

    document.head.appendChild(script);
  });
}

// Bildvorbereitung: Original, Graustufen,
// hoher Kontrast und Schwarzweiß.

async function prepareLabelImage(file) {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(
      3,
      Math.max(1, 2200 / Math.max(bitmap.width, bitmap.height))
    );

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", {
      willReadFrequently: true
    });

    if (!context) throw new Error("Bildverarbeitung nicht verfügbar.");

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const original = canvas.toDataURL("image/png");

    const pixels = context.getImageData(
      0, 0, width, height
    );

    const data = pixels.data;
    const gray = new Uint8Array(width * height);

    let minimum = 255;
    let maximum = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const brightness = Math.round(
        0.299 * data[i] +
        0.587 * data[i + 1] +
        0.114 * data[i + 2]
      );

      gray[p] = brightness;
      minimum = Math.min(minimum, brightness);
      maximum = Math.max(maximum, brightness);
    }

    const range = Math.max(40, maximum - minimum);

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const brightness = Math.max(
        0,
        Math.min(
          255,
          Math.round((gray[p] - minimum) * 255 / range)
        )
      );

      data[i] = brightness;
      data[i + 1] = brightness;
      data[i + 2] = brightness;
    }

    context.putImageData(pixels, 0, 0);
    const contrast = canvas.toDataURL("image/png");

    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] < 155 ? 0 : 255;

      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    context.putImageData(pixels, 0, 0);
    const blackWhite = canvas.toDataURL("image/png");

    return [original, contrast, blackWhite];

  } finally {
    bitmap.close();
  }
}

function scoreLabelText(text, confidence) {
  const words = text.match(/[A-Za-zÄÖÜäöüß]{3,}/g) || [];

  const useful = (
    text.match(
      /\d+\s*%|\d+\s*g\b|\d+\s*m\b|farbe|partie|lot|poly|cotton|wolle|needle|nadel/gi
    ) || []
  ).length;

  return confidence * 0.7 +
    Math.min(words.length, 80) * 0.2 +
    useful * 10;
}

// =====================================================
// AUSWERTUNG DER ERKANNTEN BANDEROLENTEXTE
// Keine feste Herstellerliste.
// Keine fest einprogrammierten Garnnamen.
// =====================================================

function scanSuggestions(raw, collection) {
  const text = String(raw || "")
    .replace(/\r/g, "\n")
    .replace(/--- Foto \d+ ---/g, "\n")
    .replace(/\u00a0/g, " ");

  const lines = text.split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const out = {};

  const clean = value =>
    String(value || "")
      .replace(/^[\s:;.,\-]+|[\s:;.,\-]+$/g, "")
      .trim();

  const firstMatch = patterns => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return clean(match[1]);
    }
    return "";
  };

  const isReasonableName = value =>
    value.length >= 2 &&
    value.length <= 65 &&
    /[A-Za-zÄÖÜäöüß]/.test(value) &&
    !/^(?:www|https?|online store|made in|visit your|pflege|washing)/i.test(value) &&
    !/\d{8,}/.test(value);

  if (collection === "yarns") {

    // Hersteller nur aus einer klaren Beschriftung
    // oder einer plausiblen, alleinstehenden Markenzeile.
    let brand = firstMatch([
      /(?:^|\n)\s*(?:Hersteller|Manufacturer|Brand|Marke)\s*[:\-]\s*([^\n]+)/i
    ]);

    if (!brand) {
      const candidates = lines.filter(line =>
        isReasonableName(line) &&
        line.split(/\s+/).length <= 4 &&
        !/\b(?:online|store|shop|www|com|de|gmbh|artikel|farbe|partie|lot|pflege|waschen|needle|nadel)\b/i.test(line) &&
        !/\d+\s*(?:%|g|m)\b/i.test(line)
      );

      // Ohne sichere Herstellerkennzeichnung
      // lieber keinen falschen Hersteller einsetzen.
      // Ein alleinstehender Name ist nicht automatisch
      // der Hersteller: Er könnte auch der Garnname sein.
      if (candidates.length === 1) {
        // Bewusst keine automatische Zuordnung.
      }
    }

    if (brand && isReasonableName(brand)) {
      out.brand = brand;
    }

    // Garnname aus eindeutig beschrifteten Angaben.
    const name = firstMatch([
      /(?:^|\n)\s*(?:Garnname|Yarn name|Garnqualität|Yarn quality)\s*[:\-]\s*([^\n]+)/i,
      /(?:^|\n)\s*(?:Qualität|Quality)\s*[:\-]\s*([^\n]+)/i
    ]);

    if (name && isReasonableName(name)) {
      out.name = name;
    }

    // Gewicht und Lauflänge.
    let match = text.match(
      /\b(\d{2,4})\s*(?:g|gr|gramm)\s*(?:=|≈|~|ca\.?|\/|:)\s*(?:ca\.?\s*)?(\d{2,4})\s*m\b/i
    );

    if (match) {
      out.weight = match[1];
      out.length = match[2];
    } else {
      const weight = firstMatch([
        /\b(?:Gewicht|Weight|Net weight)\s*[:\-]?\s*(\d{2,4})\s*g\b/i,
        /\b(\d{2,4})\s*g\b/i
      ]);

      const length = firstMatch([
        /\b(?:Lauflänge|Length|Meterage)\s*[:\-]?\s*(\d{2,4})\s*m\b/i,
        /\b(\d{2,4})\s*m\b/i
      ]);

      if (weight) out.weight = weight;
      if (length) out.length = length;
    }

    // Materialangaben in Deutsch und Englisch.
    const fibrePattern =
      "(Polyacryl|Acryl|Acrylic|Polyamid|Polyamide|" +
      "Nylon|Polyester|Baumwolle|Cotton|Schurwolle|" +
      "Merino(?:wolle)?|Wool|Alpaka|Alpaca|" +
      "Viskose|Viscose|Mohair|Seide|Silk|" +
      "Leinen|Linen|Kaschmir|Cashmere|Modal|" +
      "Lyocell|Tencel|Bambus|Bamboo|Wolle)";

    const fibreRegex = new RegExp(
      "(\\d{1,3})\\s*%\\s*" + fibrePattern,
      "gi"
    );

    const materialMatches = [
      ...text.matchAll(fibreRegex)
    ];

    const materials = [];
    const seen = new Set();

    for (const match of materialMatches) {
      const percentage = Number(match[1]);
      const fibre = match[2];

      if (percentage < 1 || percentage > 100) continue;

      const key = `${percentage}-${fibre.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        materials.push({
          percentage,
          label: `${percentage} % ${fibre}`
        });
      }
    }

    const totalPercentage = materials.reduce(
      (total, item) => total + item.percentage,
      0
    );

    if (
      materials.length &&
      totalPercentage <= 100
    ) {
      out.composition = materials
        .map(item => item.label)
        .join(", ");
    }

    // Nadelstärke aus beschriftetem Text.
    let needle = firstMatch([
      /(?:Nadelstärke|Nadelgröße|Needle size|Needles|Knitting needles|Nadel)\s*[:\-]?\s*(\d{1,2}(?:[,.]\d+)?(?:\s*[-–]\s*\d{1,2}(?:[,.]\d+)?)?)/i
    ]);

    // Häufig steht die Stärke als "4 - 4,5 mm".
    if (!needle) {
      const needleMatch = text.match(
        /\b(\d{1,2}(?:[,.]\d+)?\s*[-–]\s*\d{1,2}(?:[,.]\d+)?)\s*mm\b/i
      );

      if (needleMatch) needle = needleMatch[1];
    }

    if (needle) {
      out.needle = needle
        .replace(/,/g, ".")
        .replace(/\s*[-–]\s*/g, "-");
    }

    // Maschenprobe.
    match = text.match(
      /\b(\d{1,2})\s*(?:M|Maschen|sts|stitches)\s*[x×/]\s*(\d{1,2})\s*(?:R|Reihen|rows)\b/i
    );

    if (match) {
      out.gauge = `${match[1]} M × ${match[2]} R`;
    }

    // Garnstärke.
    const thickness = firstMatch([
      /(?:Garnstärke|Yarn weight|Yarn category)\s*[:\-]\s*(Lace|Fingering|Sport|DK|Worsted|Aran|Bulky|Chunky|Super Bulky)/i
    ]);

    if (thickness) out.thickness = thickness;

  } else if (collection === "colors") {

    // Farbname.
    const name = firstMatch([
      /(?:^|\n)\s*(?:Farbname|Color name|Colour name)\s*[:\-]\s*([^\n]+)/i
    ]);

    if (name && isReasonableName(name)) {
      out.name = name;
    }

    // Farbnummer: Artikelnummer und EAN ausschließen.
    const code = firstMatch([
      /\b(?:Farbnummer|Farb-Nr\.?|Farbe\s*Nr\.?|Colour\s*No\.?|Color\s*No\.?|Col\.?\s*No\.?)\s*[:#.\-]?\s*(\d{2,12})\b/i,
      /\b(?:Farbe|Color|Colour|Col\.?)\s*[:#.\-]\s*(\d{2,12})\b/i
    ]);

    if (code) out.code = code;

    // Farbpartie.
    const lot = firstMatch([
      /\b(?:Partienummer|Partie-Nr\.?|Dye\s*Lot|Lot\s*No\.?|Batch\s*No\.?)\s*[:#.\-]?\s*([A-Za-z0-9-]{2,24})\b/i,
      /\b(?:Partie|Lot|Batch)\s*[:#.\-]\s*([A-Za-z0-9-]{2,24})\b/i
    ]);

    if (lot) out.lot = lot;
  }

  return out;
}

// =====================================================
// APP STARTEN
// =====================================================

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(error => {
    console.warn("Service Worker:", error);
  });
}
