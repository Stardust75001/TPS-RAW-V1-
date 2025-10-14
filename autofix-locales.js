const fs = require("fs");
const path = require("path");

// JSON parser tolérant si présent, sinon JSON strict
let JSON5 = null;
try {
  JSON5 = require("json5");
} catch (_) {}

const LOCALES_DIR = path.join(process.cwd(), "locales");

// Valeurs par langue
const LANG_MAP = {
  en: {
    ref: "Linked variant reference",
    max: "Maximum range reached",
    cart: "Cart summary",
    nameLbl: "Enter your first name"
  },
  fr: {
    ref: "Référence variante liée",
    max: "Plage maximale atteinte",
    cart: "Récapitulatif du panier",
    nameLbl: "Entrez votre prénom"
  },
  de: {
    ref: "Verknüpfte Variantenreferenz",
    max: "Maximaler Bereich erreicht",
    cart: "Warenkorbübersicht",
    nameLbl: "Geben Sie Ihren Vornamen ein"
  },
  nl: {
    ref: "Gekoppelde variantreferentie",
    max: "Maximumbereik bereikt",
    cart: "Winkelwagenoverzicht",
    nameLbl: "Voer uw voornaam in"
  },
  da: {
    ref: "Koblet variantreference",
    max: "Maksimal rækkevidde nået",
    cart: "Kurvoversigt",
    nameLbl: "Indtast dit fornavn"
  },
  es: {
    ref: "Referencia de variante vinculada",
    max: "Alcance máximo alcanzado",
    cart: "Resumen del carrito",
    nameLbl: "Introduce tu nombre"
  },
  it: {
    ref: "Riferimento variante collegata",
    max: "Intervallo massimo raggiunto",
    cart: "Riepilogo carrello",
    nameLbl: "Inserisci il tuo nome"
  },
  pl: {
    ref: "Powiązane odniesienie wariantu",
    max: "Osiągnięto maksymalny zakres",
    cart: "Podsumowanie koszyka",
    nameLbl: "Wpisz swoje imię"
  },
  pt: {
    ref: "Referência de variante vinculada",
    max: "Intervalo máximo atingido",
    cart: "Resumo do carrinho",
    nameLbl: "Introduza o seu primeiro nome"
  },
  sv: {
    ref: "Länkad variantreferens",
    max: "Maximalt intervall uppnått",
    cart: "Varukorgssammanfattning",
    nameLbl: "Ange ditt förnamn"
  }
};

// Helpers
const readJSON = f => {
  const raw = fs.readFileSync(f, "utf8");
  return JSON5 ? JSON5.parse(raw) : JSON.parse(raw);
};
const writeJSON = (f, obj) =>
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + "\n", "utf8");

// get/set via "a.b.c" path
const ensurePath = (obj, pathStr) => {
  const parts = pathStr.split(".");
  let cur = obj;
  for (const p of parts.slice(0, -1)) {
    if (!cur[p] || typeof cur[p] !== "object" || Array.isArray(cur[p]))
      cur[p] = {};
    cur = cur[p];
  }
  return { parent: cur, key: parts[parts.length - 1] };
};

const setIfMissingOrEmpty = (obj, pathStr, value) => {
  const { parent, key } = ensurePath(obj, pathStr);
  if (!(key in parent) || parent[key] === "" || parent[key] == null) {
    parent[key] = value;
    return true;
  }
  return false;
};

const shouldSkip = name =>
  !name.endsWith(".json") ||
  name.endsWith(".schema.json") ||
  name === "untranslated_keys.csv";

let touched = 0;

for (const file of fs.readdirSync(LOCALES_DIR)) {
  if (shouldSkip(file)) continue;

  const filePath = path.join(LOCALES_DIR, file);
  const langCode = file.split(".")[0]; // "en", "fr", "de", "nl", etc.
  const base = LANG_MAP[langCode] || LANG_MAP.en;

  let json;
  try {
    json = readJSON(filePath);
  } catch (e) {
    console.error(`❌ ${file}: cannot parse JSON (${e.message})`);
    continue;
  }

  let changed = false;

  // 1) custom.ref_variant_label
  changed =
    setIfMissingOrEmpty(json, "custom.ref_variant_label", base.ref) || changed;

  // 2) collection.filters.max_range_notice
  changed =
    setIfMissingOrEmpty(
      json,
      "collection.filters.max_range_notice",
      base.max
    ) || changed;

  // 3) cart.summary
  changed = setIfMissingOrEmpty(json, "cart.summary", base.cart) || changed;

  // 4) general.newsletter.input_name_label
  changed =
    setIfMissingOrEmpty(
      json,
      "general.newsletter.input_name_label",
      base.nameLbl
    ) || changed;

  // 5) newsletter.input_name_label (bloc newsletter « racine » si présent dans ton thème)
  changed =
    setIfMissingOrEmpty(json, "newsletter.input_name_label", base.nameLbl) ||
    changed;

  if (changed) {
    fs.copyFileSync(filePath, filePath + ".bak");
    writeJSON(filePath, json);
    console.log(`✅ Fixed ${file}`);
    touched++;
  } else {
    console.log(`✔︎ ${file}: OK`);
  }
}

console.log(
  touched ? `\nDone. ${touched} file(s) updated.` : "\nNo changes needed."
);
