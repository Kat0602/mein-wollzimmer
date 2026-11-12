function scanSuggestions(raw, collection) {
  const text = String(raw || "").replace(/\r/g, "\n");
  const out = {};

  if (collection === "yarns") {
    const brands = [
      "Woll Butt", "Gründl", "DROPS", "Lana Grossa",
      "Schachenmayr", "Lang Yarns", "Rico Design",
      "Hobbii", "ONline", "Katia", "Pro Lana",
      "Scheepjes", "Alize", "YarnArt"
    ];

    for (const brand of brands) {
      const pattern = new RegExp(
        "(^|\\n)\\s*" + brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i"
      );

      if (pattern.test(text)) {
        out.brand = brand;
        break;
      }
    }

    const lines = text.split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    if (out.brand) {
      const index = lines.findIndex(line =>
        line.toLowerCase().includes(out.brand.toLowerCase())
      );

      if (index >= 0 && lines[index + 1]) {
        out.name = lines[index + 1];
      }
    }

    const weightLength = text.match(
      /(\d{2,4})\s*g\s*=\s*(?:ca\.?\s*)?(\d{2,4})\s*m/i
    );

    if (weightLength) {
      out.weight = weightLength[1];
      out.length = weightLength[2];
    } else {
      const weight = text.match(/\b(25|50|100|150|200|250|500)\s*g\b/i);
      const length = text.match(/\b(\d{2,4})\s*m\b/i);

      if (weight) out.weight = weight[1];
      if (length) out.length = length[1];
    }

    const fibres = [
      "Polyacryl", "Polyamid", "Polyester",
      "Baumwolle", "Schurwolle", "Merino",
      "Alpaka", "Viskose", "Mohair",
      "Seide", "Leinen", "Acryl", "Wolle"
    ];

    const matches = [
      ...text.matchAll(/(\d{1,3})\s*%\s*([A-Za-zÄÖÜäöüß]+)/g)
    ];

    const composition = matches
      .filter(match =>
        fibres.some(fibre =>
          match[2].toLowerCase() === fibre.toLowerCase()
        )
      )
      .map(match => `${match[1]} % ${match[2]}`);

    if (composition.length) {
      out.composition = [...new Set(composition)].join(", ");
    }

    const needle = text.match(
      /(?:Nadel(?:stärke)?|needle|hook)\s*[:\-]?\s*(\d+(?:[,.]\d+)?)/i
    );

    if (needle) out.needle = needle[1].replace(",", ".");

    const gauge = text.match(
      /(\d{1,2})\s*M(?:aschen)?\s*[x×/]\s*(\d{1,2})\s*R(?:eihen)?/i
    );

    if (gauge) {
      out.gauge = `${gauge[1]} M × ${gauge[2]} R`;
    }

  } else if (collection === "colors") {
    const color = text.match(
      /(?:FARBE|FARB-NR\.?|FARBNUMMER|COLOR|COLOUR)\s*[:#.\-]?\s*(\d{2,12})/i
    );

    if (color) out.code = color[1];

    const lot = text.match(
      /(?:PARTIE|PARTIENR\.?|LOT|BATCH|DYE\s*LOT)\s*[:#.\-]?\s*(\d{2,12})/i
    );

    if (lot) out.lot = lot[1];
  }

  return out;
}
