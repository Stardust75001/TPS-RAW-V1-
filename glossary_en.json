#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TPS Language Guard – scan & fix customer-facing strings to English (default locale).
Targets:
- Shopify Liquid sections (Schema JSON between {% schema %} ... {% endschema %})
- Literal UI strings in .liquid (placeholder=, aria-label=, title=, alt=, value= on buttons/inputs) when hardcoded
- (Optionally) .js/.ts/.vue/.html simple literals likely customer-facing (guarded)

Usage (dry-run + report):
  python tps_lang_guard.py --root . --report out/lang_audit.csv

Apply changes:
  python tps_lang_guard.py --root . --write --backup-dir out/backups --report out/lang_audit.csv

Tips:
- Extend glossary in glossary_en.json for precise brand wording.
- Safe: never changes IDs/handles/keys; only visible labels/placeholders/defaults/help texts.
"""
import argparse, json, re, sys, csv, shutil, hashlib
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

# -------- Configuration --------
DEFAULT_EXTS = {".liquid", ".json", ".js", ".ts", ".vue", ".html"}
# Files/folders to skip (vendor, build, images, node_modules, etc.)
SKIP_DIRS = {"node_modules", "dist", "build", ".git", ".github", ".cache", "vendor", "assets", "snippets_cache"}

# Heuristics: keys considered "customer-facing" in schema or UI JSON
UI_KEYS = {
    "label","placeholder","name","title","heading","header","content","info","help","description",
    "default","button_text","btn_text","subtitle","caption","category"
}

# Regex for attributes in Liquid/HTML we want to check (only plain string values, not Liquid tags)
ATTRS = ["placeholder","aria-label","title","alt","value","data-label","data-placeholder"]
ATTR_RE = re.compile(r'(?P<attr>' + "|".join(map(re.escape, ATTRS)) + r')\s*=\s*"(?P<val>[^"{]+?)"', re.IGNORECASE)

# Quick French detectors (accents, common words) to flag candidates
FRENCH_PATTERNS = [
    r"[àâäéèêëîïôöùûüçœ]",                         # accents
    r"\b(couleur|prix|offre groupée|disponibilit[éè]|panier|compte|retour|livraison|quantit[ée]|ajouter)\b",
    r"\b(succès|danger|avertissement|info|fermer|ouvrir|valider|envoyer|annuler)\b",
    r"\b(jours?|heures?|minutes?|secondes?)\b",
    r"\b(titre|légende|description|bouton|ic[ôo]ne)\b",
    r"\b(ajouter au panier|en savoir plus|suivre|appliquer)\b",
]
FRENCH_RE = re.compile("|".join(FRENCH_PATTERNS), re.IGNORECASE)

# Minimal in-repo glossary (extend via glossary_en.json in repo root)
GLOSSARY_BASE: Dict[str,str] = {
    "Couleur": "Color",
    "couleur": "color",
    "Prix": "Price",
    "prix": "price",
    "Offre groupée": "Bundle offer",
    "offre groupée": "bundle offer",
    "Disponibilité": "Availability",
    "disponibilité": "availability",
    "Ajouter au panier": "Add to cart",
    "Panier": "Cart",
    "Compte": "Account",
    "Livraison": "Shipping",
    "Retour": "Returns",
    "Quantité": "Quantity",
    "Suivre @shopiweb": "Follow @shopiweb",
    "Texte du compteur": "Counter text",
    "Le compte à rebours est terminé !": "The countdown has ended!",
    "Jours": "Days",
    "Heures": "Hours",
    "Minutes": "Minutes",
    "Secondes": "Seconds",
    "Titre": "Title",
    "Légende": "Caption",
    "Description (facultatif)": "Description (optional)",
    "Ajouter une description facultative à cette section": "Add an optional description to this section",
    "Balise titre (SEO)": "Heading tag (SEO)",
    "Image Largeur/Hauteur (px)": "Image width/height (px)",
    "Alignement du texte": "Text alignment",
    "Gauche": "Left",
    "Centre": "Center",
    "Couleur de la légende": "Caption color",
    "Taille du titre": "Title size",
    "Taille de la légende": "Caption size",
    "Par défaut": "Default",
    "Dégradé d'arrière-plan": "Background gradient",
    "Couleur de l'arrière plan": "Background color",
    "Largeur maximale (px)": "Max width (px)",
    "Ajuster la largeur du conteneur (en pixels)": "Adjust the container width (in pixels)",
    "Cacher le compteur une fois terminé": "Hide counter when completed",
    "Texte de fin du compteur": "Counter completed text",
}

# Keys we never touch
PROTECT_KEYS = {"id","type","value","handle","shopify_attributes"}

def load_glossary(repo_root: Path) -> Dict[str,str]:
    path = repo_root / "glossary_en.json"
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                raise ValueError("glossary_en.json must be an object of {fr: en}")
            # Merge user glossary on top
            return {**GLOSSARY_BASE, **data}
        except Exception as e:
            print(f"[WARN] Failed to load glossary_en.json: {e}", file=sys.stderr)
    return dict(GLOSSARY_BASE)

def is_probably_french(s: str) -> bool:
    if not s: return False
    if "{{" in s or "{%" in s:  # likely not a pure literal
        return False
    return bool(FRENCH_RE.search(s))

def translate_literal(s: str, glossary: Dict[str,str]) -> Tuple[str,bool]:
    """Try glossary replacements; simple fallbacks (sentence-case preservation)."""
    if s in glossary:
        return glossary[s], True
    # Try word-by-word conservative replacement
    changed = False
    def repl_word(m):
        nonlocal changed
        w = m.group(0)
        if w in glossary:
            changed = True
            return glossary[w]
        return w
    out = re.sub(r"[A-Za-zÀ-ÖØ-öø-ÿœŒ'-]+", repl_word, s)
    return (out, changed)

def sha1(p: Path) -> str:
    h = hashlib.sha1()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def ensure_backup(src: Path, backup_dir: Path):
    backup_dir.mkdir(parents=True, exist_ok=True)
    rel = src
    dst = backup_dir / rel.name
    if not dst.exists():
        shutil.copy2(src, dst)

def write_report_row(writer, file_path, location, original, updated):
    writer.writerow({
        "file": str(file_path),
        "where": location,
        "original": original,
        "updated": updated
    })

# ---------- Schema JSON in {% schema %} ... {% endschema %} ----------
SCHEMA_START = re.compile(r"{%\s*schema\s*%}", re.IGNORECASE)
SCHEMA_END   = re.compile(r"{%\s*endschema\s*%}", re.IGNORECASE)

def process_schema_text(schema_text: str, file_path: Path, glossary: Dict[str,str], report_writer) -> str:
    try:
        data = json.loads(schema_text)
    except Exception as e:
        # leave untouched if invalid JSON
        return schema_text

    def walk(node: Any, path: List[str]):
        if isinstance(node, dict):
            for k, v in list(node.items()):
                # Only customer-facing keys
                if k in UI_KEYS and isinstance(v, str) and is_probably_french(v):
                    new, changed = translate_literal(v, glossary)
                    if changed and new != v:
                        node[k] = new
                        write_report_row(report_writer, file_path, "schema:" + "/".join(path+[k]), v, new)
                elif isinstance(v, (dict, list)):
                    walk(v, path + [k])
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                walk(item, path + [str(idx)])

    walk(data, [])
    return json.dumps(data, ensure_ascii=False, indent=2)

def patch_liquid_file(p: Path, glossary: Dict[str,str], write: bool, backup_dir: Optional[Path], report_writer) -> Tuple[int,int]:
    """Return (found, changed) counts."""
    text = p.read_text(encoding="utf-8", errors="replace")
    found = changed = 0

    # 1) Patch {% schema %} JSON
    new_text = text
    out_parts = []
    pos = 0
    for m_start in SCHEMA_START.finditer(text):
        m_end = SCHEMA_END.search(text, m_start.end())
        if not m_end:
            continue
        out_parts.append(text[pos:m_start.end()])
        schema_raw = text[m_start.end():m_end.start()]
        patched = process_schema_text(schema_raw, p, glossary, report_writer)
        out_parts.append("\n" + patched + "\n")
        out_parts.append(text[m_end.start():m_end.end()])
        pos = m_end.end()
    out_parts.append(text[pos:])
    new_text = "".join(out_parts)

    # 2) Patch attribute literals in the whole file (outside schema too)
    def attr_replacer(m):
        nonlocal found, changed
        attr = m.group("attr")
        val  = m.group("val")
        if is_probably_french(val):
            found += 1
            new, did = translate_literal(val, glossary)
            if did and new != val:
                changed += 1
                write_report_row(report_writer, p, f'attr:{attr}', val, new)
                return f'{attr}="{new}"'
        return m.group(0)

    patched_text = ATTR_RE.sub(attr_replacer, new_text)

    if patched_text != text and write:
        if backup_dir: ensure_backup(p, backup_dir)
        p.write_text(patched_text, encoding="utf-8")
    # Count schema replacements roughly from report (already captured) — keep found>=changed semantics
    return (found, changed)

def scan_literal_js(p: Path, glossary: Dict[str,str], write: bool, backup_dir: Optional[Path], report_writer) -> Tuple[int,int]:
    """Very conservative: only placeholder/label-like assignments in JS/TS/HTML/Vue."""
    txt = p.read_text(encoding="utf-8", errors="replace")
    found = changed = 0

    # Patterns like: placeholder: "Texte...", ariaLabel: "Texte...", setAttribute('placeholder', 'Texte...')
    js_patterns = [
        re.compile(r'(?P<key>\bplaceholder\b|\bariaLabel\b|\blabel\b|\btitle\b)\s*:\s*"(?P<val>[^"{]+?)"'),
        re.compile(r'setAttribute\(\s*[\'"](placeholder|aria-label|title|value)[\'"]\s*,\s*[\'"](?P<val>[^\'"{]+)[\'"]\s*\)'),
    ]

    def js_replacer(m):
        nonlocal found, changed
        full = m.group(0)
        val = m.group("val")
        if is_probably_french(val):
            found += 1
            new, did = translate_literal(val, glossary)
            if did and new != val:
                changed += 1
                write_report_row(report_writer, p, "js-literal", val, new)
                return full.replace(val, new)
        return full

    patched = txt
    for pat in js_patterns:
        patched = pat.sub(js_replacer, patched)

    if patched != txt and write:
        if backup_dir: ensure_backup(p, backup_dir)
        p.write_text(patched, encoding="utf-8")
    return (found, changed)

def main():
    ap = argparse.ArgumentParser(description="TPS Language Guard – enforce English UI literals.")
    ap.add_argument("--root", default=".", help="Repository root")
    ap.add_argument("--write", action="store_true", help="Apply changes (otherwise dry-run)")
    ap.add_argument("--report", default="lang_audit.csv", help="CSV report path")
    ap.add_argument("--backup-dir", default=None, help="Backup dir when --write is set (recommended)")
    ap.add_argument("--ext", action="append", help="Extra file extensions to include (e.g., --ext .liquid --ext .vue)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    exts = set(DEFAULT_EXTS)
    if args.ext:
        exts |= set(args.ext)

    glossary = load_glossary(root)

    backup_dir = Path(args.backup_dir) if args.backup_dir else None
    total_files = total_found = total_changed = 0

    with open(args.report, "w", newline="", encoding="utf-8") as rf:
        writer = csv.DictWriter(rf, fieldnames=["file","where","original","updated"])
        writer.writeheader()

        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if any(seg in SKIP_DIRS for seg in path.parts):
                continue
            if path.suffix.lower() not in exts:
                continue

            # Skip locale JSON (keep fr/en/de files intact by design)
            if path.suffix == ".json" and path.name.endswith((".default.json",".locale.json",".locales.json")):
                continue

            total_files += 1
            try:
                found = changed = 0
                if path.suffix == ".liquid":
                    f,c = patch_liquid_file(path, glossary, args.write, backup_dir, writer)
                    found += f; changed += c

                    # Also scan attr-like in non-schema HTML already handled; nothing else.

                elif path.suffix in {".js",".ts",".html",".vue"}:
                    f,c = scan_literal_js(path, glossary, args.write, backup_dir, writer)
                    found += f; changed += c

                else:
                    # Other JSON: we usually skip; could add future handlers.
                    pass

                total_found += found
                total_changed += changed

            except Exception as e:
                print(f"[WARN] {path}: {e}", file=sys.stderr)

    mode = "APPLIED" if args.write else "DRY-RUN"
    print(f"[{mode}] scanned_files={total_files} candidates_found={total_found} translated={total_changed}")
    print(f"[REPORT] {args.report}")

if __name__ == "__main__":
    main()
