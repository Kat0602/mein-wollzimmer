
"use strict";

const KEY = "mein-wollzimmer-v3";
const collections = [
  "yarns", "colors", "needles", "accessories", "projects"
];

let db = Object.fromEntries(collections.map(k => [k, []]));

try {
  const stored = JSON.parse(localStorage.getItem(KEY));
  if (stored && typeof stored === "object") {
    for (const k of collections) {
      if (Array.isArray(stored[k])) db[k] = stored[k];
    }
  }
} catch (e) {
  console.error("Speicherfehler:", e);
}

let tab = "yarns";
let openYarn = null;
let openColor = null;

const $ = id => document.getElementById(id);

const esc = value => String(value ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]
);

const uid = () =>
  Date.now().toString(36) +
  Math.random().toString(36).slice(2, 8);

const number = value =>
  Number(String(value ?? "0").replace(",", ".")) || 0;

const format = value =>
  Number(value).toLocaleString("de-DE", {
    maximumFractionDigits: 2
  });

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  render();
}

// =====================================================
// FELDER DER GARNVERWALTUNG
// =====================================================

const yarnFields = [
  ["brand", "Hersteller"],
  ["name", "Garnname"],
  ["composition", "Zusammensetzung"],
  ["weight", "Knäuelgewicht (g)", "number"],
  ["length", "Lauflänge je Knäuel (m)", "number"],

  ["needle", "Empfohlene Nadelstärke Stricken (mm)"],
  ["hook", "Empfohlene Nadelstärke Häkeln (mm)"],

  ["thickness", "Garnstärke (z. B. DK, Worsted)"],
  ["gauge", "Maschenprobe"],
  ["notes", "Allgemeine Erfahrungen", "textarea"],
  ["rating", "Bewertung (0–5)", "select",
    ["0", "1", "2", "3", "4", "5"]],
  ["rebuy", "Wieder kaufen?", "select",
    ["Noch offen", "Ja", "Vielleicht", "Nein"]]
];

const colorFields = [
  ["name", "Farbname"],
  ["code", "Farbnummer"],
  ["hex", "Farbton (z. B. #d7a0b8)"],
  ["lot", "Farbpartie"],
  ["skeins", "Ganze Knäuel (Anzahl)", "number"],
  ["quantity", "Gesamtmenge (g)", "number"],
  ["used", "Davon verbraucht (g)", "number"],
  ["unknown", "Bestand noch nicht gezählt", "checkbox"],
  ["location", "Lagerort"],
  ["price", "Preis pro Knäuel (€)", "number"],
  ["notes", "Notizen", "textarea"]
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
  ["category", "Art"],
  ["size", "Länge / Größe"],
  ["count", "Anzahl", "number"],
  ["notes", "Bemerkungen", "textarea"]
];

const projectFields = [
  ["name", "Projektname"],
  ["technique", "Technik", "select", [
    "Stricken",
    "Häkeln",
    "Tunesisches Häkeln"
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

// =====================================================
// VORSCHLÄGE AUS DEM EIGENEN WOLLBESTAND
// =====================================================

function uniqueValues(values) {
  const found = new Map();

  for (const value of values) {
    const name = String(value ?? "").trim();
    const key = name.toLocaleLowerCase("de");

    if (name && !found.has(key)) {
      found.set(key, name);
    }
  }

  return [...found.values()].sort((a, b) =>
    a.localeCompare(b, "de")
  );
}

function yarnMatches(brand, name) {
  const b = brand.trim().toLocaleLowerCase("de");
  const n = name.trim().toLocaleLowerCase("de");

  return db.yarns.filter(yarn =>
    (!b || String(yarn.brand || "")
      .toLocaleLowerCase("de") === b) &&
    (!n || String(yarn.name || "")
      .toLocaleLowerCase("de") === n)
  );
}

// =====================================================
// FORMULARE
// =====================================================

function fieldHTML(definitions, item = {}) {
  return definitions.map(
    ([key, label, type = "text", options]) => {
      let control;

      if (type === "select") {
        control = `<select name="${key}">${
          options.map(value => `
            <option value="${esc(value)}"
              ${String(item[key] ?? "") === value
                ? "selected" : ""}>
              ${esc(value)}
            </option>
          `).join("")
        }</select>`;

      } else if (type === "textarea") {
        control = `<textarea name="${key}">${
          esc(item[key])
        }</textarea>`;

      } else if (type === "checkbox") {
        control = `
          <input type="checkbox" name="${key}"
            ${item[key] ? "checked" : ""}
            style="width:auto">
        `;

      } else {
        control = `
          <input type="${type}" name="${key}"
            ${type === "number"
              ? 'min="0" step="any"' : ""}
            value="${esc(item[key])}">
        `;
      }

      return `
        <label>
          ${esc(label)}
          ${control}
        </label>
      `;
    }
  ).join("");
}

function form(collection, definitions, id = null, extra = {}) {
  const original = id
    ? db[collection].find(entry => entry.id === id)
    : {};

  if (!original) return;

  const item = { ...original, ...extra };

  $("editor").innerHTML = `
    <section>
      <h3>
        ${id ? "Eintrag bearbeiten" : "Neuen Eintrag erfassen"}
      </h3>

      <form id="editForm">
        <div class="grid">
          ${fieldHTML(definitions, item)}
        </div>

        ${collection === "yarns" ? `
          <div id="suggestionArea" style="margin-top:12px">
            <p class="muted">
              Bereits gespeicherte Hersteller und
              Garnsorten werden beim Tippen vorgeschlagen.
            </p>

            <div id="yarnSuggestions"></div>

            <button type="button" id="takeYarnData"
              style="display:none">
              Weitere Garnangaben übernehmen
            </button>
          </div>
        ` : ""}

        <div class="actions" style="margin-top:14px">
          <button class="primary" type="submit">
            Speichern
          </button>
          <button type="button" id="cancel">
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  `;

  const editor = $("editor");
  const formElement = $("editForm");

  if (collection === "yarns") {
    setupYarnSuggestions(formElement);
  }

  $("cancel").onclick = () => render();

  formElement.onsubmit = event => {
    event.preventDefault();

    const values = { ...item };
    const data = new FormData(formElement);

    for (const [key, , type] of definitions) {
      values[key] = type === "checkbox"
        ? formElement.elements[key].checked
        : String(data.get(key) ?? "").trim();
    }

    if (collection === "yarns" && !values.name) {
      alert("Bitte einen Garnnamen eingeben.");
      return;
    }

    if (
      collection !== "yarns" &&
      !values.name &&
      !values.brand
    ) {
      alert("Bitte eine Bezeichnung eingeben.");
      return;
    }

    if (id) {
      Object.assign(original, values);
    } else {
      db[collection].push({
        id: uid(),
        ...values
      });
    }

    save();
  };

  editor.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// =====================================================
// HERSTELLER- UND GARNVORSCHLÄGE
// =====================================================

function setupYarnSuggestions(formElement) {
  const brandInput = formElement.elements.brand;
  const nameInput = formElement.elements.name;

  const area = $("yarnSuggestions");
  const takeButton = $("takeYarnData");

  let selectedYarn = null;

  function suggestionButton(label, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.style.margin = "4px";
    button.style.padding = "8px 12px";

    button.onclick = onClick;

    return button;
  }

  function update() {
    area.replaceChildren();
    selectedYarn = null;
    takeButton.style.display = "none";

    const brandText = brandInput.value
      .trim()
      .toLocaleLowerCase("de");

    const nameText = nameInput.value
      .trim()
      .toLocaleLowerCase("de");

    // Hersteller ab dem ersten Buchstaben vorschlagen.

    if (brandText) {
      const brands = uniqueValues(
        db.yarns.map(yarn => yarn.brand)
      ).filter(brand =>
        brand.toLocaleLowerCase("de").startsWith(brandText) &&
        brand.toLocaleLowerCase("de") !== brandText
      );

      if (brands.length) {
        const heading = document.createElement("p");
        heading.textContent = "Hersteller-Vorschläge:";

        area.appendChild(heading);

        brands.slice(0, 10).forEach(brand => {
          area.appendChild(
            suggestionButton(brand, () => {
              brandInput.value = brand;
              update();
              nameInput.focus();
            })
          );
        });
      }
    }

    // Garnsorten ab dem ersten Buchstaben vorschlagen.

    if (nameText) {
      const candidates = db.yarns.filter(yarn => {
        const name = String(yarn.name || "")
          .toLocaleLowerCase("de");

        const brand = String(yarn.brand || "")
          .toLocaleLowerCase("de");

        return name.startsWith(nameText) &&
          (!brandText || brand === brandText);
      });

      const seen = new Set();

      if (candidates.length) {
        const heading = document.createElement("p");
        heading.textContent = "Garn-Vorschläge:";

        area.appendChild(heading);

        candidates.forEach(yarn => {
          const key = [
            yarn.brand,
            yarn.name
          ].join("|").toLocaleLowerCase("de");

          if (seen.has(key) || seen.size >= 10) {
            return;
          }

          seen.add(key);

          area.appendChild(
            suggestionButton(
              `${yarn.brand || ""} – ${yarn.name}`,
              () => {
                brandInput.value = yarn.brand || "";
                nameInput.value = yarn.name || "";

                selectedYarn = yarn;

                area.replaceChildren();

                const message =
                  document.createElement("p");

                message.textContent =
                  `Ausgewählt: ${yarn.brand || ""} ${yarn.name}`;

                area.appendChild(message);

                takeButton.style.display = "inline-block";
              }
            )
          );
        });
      }
    }

    const exact = yarnMatches(
      brandInput.value,
      nameInput.value
    ).find(yarn =>
      String(yarn.name || "")
        .toLocaleLowerCase("de") ===
      nameInput.value.trim().toLocaleLowerCase("de")
    );

    if (exact) {
      selectedYarn = exact;
      takeButton.style.display = "inline-block";
    }
  }

  brandInput.addEventListener("input", update);
  nameInput.addEventListener("input", update);

  // Alle technischen Garnangaben einschließlich
  // beider Nadelstärken übernehmen.

  takeButton.onclick = () => {
    if (!selectedYarn) return;

    const keys = [
      "composition",
      "weight",
      "length",
      "needle",
      "hook",
      "thickness",
      "gauge"
    ];

    const available = keys.filter(key =>
      selectedYarn[key] !== undefined &&
      String(selectedYarn[key]).trim() !== ""
    );

    if (!available.length) {
      alert(
        "Zu dieser Garnsorte sind keine weiteren Angaben gespeichert."
      );
      return;
    }

    const filled = available.filter(key =>
      String(
        formElement.elements[key]?.value || ""
      ).trim()
    );

    let overwrite = true;

    if (filled.length) {
      overwrite = confirm(
        "Bereits ausgefüllte Garnangaben ebenfalls überschreiben?\n\n" +
        "OK = Alle Angaben übernehmen\n" +
        "Abbrechen = Nur leere Felder ausfüllen"
      );
    }

    for (const key of available) {
      const field = formElement.elements[key];

      if (!field) continue;

      if (overwrite || !String(field.value).trim()) {
        field.value = selectedYarn[key];
      }
    }

    alert(
      "Garnangaben übernommen.\n" +
      "Beide Nadelstärken können getrennt bearbeitet werden."
    );
  };

  update();
}

// =====================================================
// EINTRÄGE LÖSCHEN
// =====================================================

function remove(collection, id) {
  if (!confirm("Eintrag wirklich löschen?")) return;

  db[collection] = db[collection].filter(
    item => item.id !== id
  );

  if (collection === "yarns") {
    db.colors = db.colors.filter(
      color => color.yarnId !== id
    );
  }

  save();
}

function actions(collection, id) {
  return `
    <div class="actions">
      <button data-edit="${collection}:${esc(id)}">
        Bearbeiten
      </button>

      <button class="danger"
        data-delete="${collection}:${esc(id)}">
        Löschen
      </button>
    </div>
  `;
}

// =====================================================
// HAUPTANSICHT
// =====================================================

function render() {
  const labels = {
    yarns: "🧶 Garne",
    needles: "🪡 Nadeln",
    accessories: "🧰 Zubehör",
    projects: "✂️ Projekte",
    backup: "💾 Sicherung"
  };

  $("tabs").innerHTML = Object.entries(labels).map(
    ([key, label]) => `
      <button data-tab="${key}"
        class="${tab === key ? "active" : ""}">
        ${label}
      </button>
    `
  ).join("");

  $("app").innerHTML = `
    <div id="editor"></div>
    <div id="content"></div>
  `;

  if (tab === "yarns") {
    renderYarns();
  } else if (tab === "backup") {
    renderBackup();
  } else {
    renderSimple();
  }

  wire();
}

// =====================================================
// GARNÜBERSICHT
// =====================================================

function renderYarns() {
  const counted = db.colors.filter(
    color => !color.unknown
  );

  const remaining = counted.reduce(
    (total, color) =>
      total + Math.max(
        0,
        number(color.quantity) - number(color.used)
      ),
    0
  );

  $("content").innerHTML = `
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
          <strong>${format(remaining)} g</strong>
          <span class="muted">Restbestand*</span>
        </div>
      </div>

      <p class="muted">*Nur gezählte Bestände</p>

      <div class="toolbar">
        <input id="search"
          placeholder="Garn oder Hersteller suchen">

        <button class="primary" id="newYarn">
          + Garnsorte
        </button>
      </div>
    </section>

    <div id="yarnList"></div>
  `;

  function paint() {
    const query = $("search").value
      .toLocaleLowerCase("de");

    const yarns = db.yarns.filter(yarn => {
      const colors = db.colors.filter(
        c => c.yarnId === yarn.id
      );

      return [
        yarn.brand,
        yarn.name,
        ...colors.map(c => c.name)
      ].join(" ")
        .toLocaleLowerCase("de")
        .includes(query);
    }).sort((a, b) =>
      `${a.brand} ${a.name}`.localeCompare(
        `${b.brand} ${b.name}`,
        "de"
      )
    );

    $("yarnList").innerHTML = yarns.map(yarn => {
      const colors = db.colors.filter(
        c => c.yarnId === yarn.id
      );

      const rest = colors
        .filter(c => !c.unknown)
        .reduce(
          (total, c) =>
            total + Math.max(
              0,
              number(c.quantity) - number(c.used)
            ),
          0
        );

      return `
        <section>
          <div class="actions"
            style="justify-content:space-between">

            <div>
              <h3>
                ${esc(yarn.brand)} ${esc(yarn.name)}
              </h3>

              <p class="muted">
                ${colors.length} Farben ·
                ${format(rest)} g Rest
              </p>
            </div>

            <button data-open-yarn="${esc(yarn.id)}">
              ${openYarn === yarn.id
                ? "Schließen" : "Farben ansehen"}
            </button>
          </div>

          ${openYarn === yarn.id ? `
            <p class="muted">
              ${esc(yarn.composition)} ·
              ${esc(yarn.weight)} g /
              ${esc(yarn.length)} m
            </p>

            <p class="muted">
              🪡 Stricken:
              ${esc(yarn.needle || "—")} mm
            </p>

            <p class="muted">
              🧶 Häkeln:
              ${esc(yarn.hook || "—")} mm
            </p>

            ${actions("yarns", yarn.id)}

            <details>
              <summary>Weitere Garndetails</summary>

              <p>
                Garnstärke:
                ${esc(yarn.thickness || "—")}
              </p>

              <p>
                Maschenprobe:
                ${esc(yarn.gauge || "—")}
              </p>

              <p>
                Bewertung:
                ${esc(yarn.rating || "0")}/5
              </p>

              <p>
                Wieder kaufen:
                ${esc(yarn.rebuy || "—")}
              </p>

              <p>${esc(yarn.notes || "")}</p>
            </details>

            <hr>

            <div class="actions">
              <strong>Farben und Mengen</strong>

              <button data-new-color="${esc(yarn.id)}">
                + Farbe
              </button>
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
                      ${esc(color.name || "Ohne Farbname")}
                    </strong>

                    <span class="muted">
                      ${esc(color.code)}
                    </span>

                    <div class="muted">
                      ${color.unknown
                        ? "Noch nicht gezählt"
                        : `${esc(color.skeins || "0")} Knäuel ·
                          ${format(Math.max(
                            0,
                            number(color.quantity) -
                            number(color.used)
                          ))} g Rest`}
                    </div>
                  </div>

                  <button data-open-color="${esc(color.id)}">
                    ${openColor === color.id
                      ? "Weniger" : "Details"}
                  </button>
                </div>

                ${openColor === color.id ? `
                  <p>
                    Partie: ${esc(color.lot || "—")}
                  </p>

                  <p>
                    Lagerort: ${esc(color.location || "—")}
                  </p>

                  <p>
                    Preis: ${esc(color.price || "—")} €
                  </p>

                  <p>
                    Gesamtmenge:
                    ${esc(color.quantity || "0")} g
                  </p>

                  <p>
                    Verbraucht:
                    ${esc(color.used || "0")} g
                  </p>

                  <p>${esc(color.notes || "")}</p>

                  ${actions("colors", color.id)}
                ` : ""}
              </div>
            `).join("") : `
              <p class="muted">
                Noch keine Farben erfasst.
              </p>
            `}
          ` : ""}
        </section>
      `;
    }).join("") || `
      <section>
        Noch keine passenden Garne vorhanden.
      </section>
    `;

    wire();
  }

  paint();

  $("search").oninput = paint;

  $("newYarn").onclick = () =>
    form("yarns", yarnFields);
}

// =====================================================
// NADELN, ZUBEHÖR UND PROJEKTE
// =====================================================

function renderSimple() {
  const config = {
    needles: ["Meine Nadeln", needleFields],
    accessories: ["Mein Zubehör", accessoryFields],
    projects: ["Meine Projekte", projectFields]
  };

  const [title, definitions] = config[tab];

  $("content").innerHTML = `
    <section>
      <div class="actions"
        style="justify-content:space-between">

        <h2>${title} (${db[tab].length})</h2>

        <button class="primary" id="add">
          + Hinzufügen
        </button>
      </div>

      <input id="search"
        placeholder="Einträge durchsuchen">
    </section>

    <div id="list"></div>
  `;

  function paint() {
    const query = $("search").value
      .toLocaleLowerCase("de");

    $("list").innerHTML = db[tab]
      .filter(item =>
        JSON.stringify(item)
          .toLocaleLowerCase("de")
          .includes(query)
      )
      .map(item => `
        <section>
          <h3>
            ${esc(
              item.name ||
              `${item.brand || ""} ${item.model || ""}`
            )}
          </h3>

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
      `).join("") || `
        <section>
          Noch keine Einträge vorhanden.
        </section>
      `;

    wire();
  }

  paint();

  $("search").oninput = paint;

  $("add").onclick = () =>
    form(tab, definitions);
}

// =====================================================
// DATENSICHERUNG
// =====================================================

function renderBackup() {
  $("content").innerHTML = `
    <section>
      <h2>Datensicherung</h2>

      <p>
        Deine Daten werden auf diesem Gerät
        im Browser gespeichert.
        Sichere sie regelmäßig als JSON-Datei.
      </p>

      <div class="actions">
        <button class="primary" id="export">
          Sicherung herunterladen
        </button>

        <label>
          Sicherung wiederherstellen

          <input type="file" id="import"
            accept=".json,application/json">
        </label>
      </div>

      <p class="muted">
        Eine Wiederherstellung ersetzt den
        aktuellen Bestand.
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
      "mein-wollzimmer-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    link.click();

    setTimeout(
      () => URL.revokeObjectURL(url),
      3000
    );
  };

  $("import").onchange = async event => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const imported = JSON.parse(
        await file.text()
      );

      if (!collections.every(key =>
        Array.isArray(imported[key])
      )) {
        throw new Error("Ungültige Sicherung");
      }

      if (!confirm(
        "Aktuellen Bestand durch die Sicherung ersetzen?"
      )) {
        return;
      }

      for (const key of collections) {
        db[key] = imported[key];
      }

      save();

      alert("Sicherung wiederhergestellt.");

    } catch (error) {
      alert(
        "Sicherung konnte nicht eingelesen werden."
      );
    }
  };
}

// =====================================================
// SCHALTFLÄCHEN
// =====================================================

function wire() {
  document.querySelectorAll("[data-tab]")
    .forEach(button => {
      button.onclick = () => {
        tab = button.dataset.tab;
        openYarn = null;
        openColor = null;
        render();
      };
    });

  document.querySelectorAll("[data-open-yarn]")
    .forEach(button => {
      button.onclick = () => {
        const id = button.dataset.openYarn;

        openYarn = openYarn === id ? null : id;

        render();
      };
    });

  document.querySelectorAll("[data-open-color]")
    .forEach(button => {
      button.onclick = () => {
        const id = button.dataset.openColor;

        openColor = openColor === id ? null : id;

        render();
      };
    });

  document.querySelectorAll("[data-new-color]")
    .forEach(button => {
      button.onclick = () =>
        form(
          "colors",
          colorFields,
          null,
          { yarnId: button.dataset.newColor }
        );
    });

  document.querySelectorAll("[data-edit]")
    .forEach(button => {
      button.onclick = () => {
        const [collection, id] =
          button.dataset.edit.split(":");

        form(
          collection,
          fieldSets[collection],
          id
        );
      };
    });

  document.querySelectorAll("[data-delete]")
    .forEach(button => {
      button.onclick = () => {
        const [collection, id] =
          button.dataset.delete.split(":");

        remove(collection, id);
      };
    });
}

// =====================================================
// APP STARTEN
// =====================================================

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .catch(console.warn);
}
