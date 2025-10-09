#!/usr/bin/env python3
import argparse, json, os, time
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

def load_json(p):
    return json.load(open(p, encoding="utf-8"))

def save_json(p, obj):
    json.dump(obj, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

def get_in(d, path):
    cur = d
    for k in path:
        cur = cur[k]
    return cur

def set_in(d, path, val):
    cur = d
    for k in path[:-1]:
        cur = cur[k]
    cur[path[-1]] = val

def walk_paths(node, base=()):
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk_paths(v, base + (k,))
    else:
        yield base

def http_translate_batch(engine, src, tgt, texts):
    if not engine:
        return texts
    try:
        req = Request(
            engine.rstrip("/") + "/translate",
            data=json.dumps({"q": texts, "source": src, "target": tgt, "format": "text"}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        if isinstance(data, list):
            return [x.get("translatedText", "") for x in data]
        if isinstance(data, dict) and "translatedText" in data:
            return [data["translatedText"]]
        if isinstance(data, str):
            return [data]
    except (URLError, HTTPError, TimeoutError, Exception):
        pass
    return texts

def clone_structure_with_empty(node):
    if isinstance(node, dict):
        return {k: clone_structure_with_empty(v) for k, v in node.items()}
    return ""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)           # ex: locales/en.default.json
    ap.add_argument("--to", nargs="+", required=True) # ex: pt sv
    ap.add_argument("--outdir", default="locales")
    ap.add_argument("--engine", default="")           # ex: http://localhost:5000
    ap.add_argument("--batch", type=int, default=50)
    ap.add_argument("--sleep", type=float, default=0.2)
    args = ap.parse_args()

    en = load_json(args.src)
    en_paths = list(walk_paths(en))

    for lang in args.to:
        out_path = os.path.join(args.outdir, f"{lang}.json")
        tgt = load_json(out_path) if os.path.exists(out_path) else clone_structure_with_empty(en)

        to_do, idx = [], []
        for p in en_paths:
            en_val = get_in(en, p)
            tgt_val = get_in(tgt, p)
            if isinstance(en_val, str) and isinstance(tgt_val, str) and not tgt_val.strip():
                to_do.append(en_val)
                idx.append(p)

        print(f"[{lang}] À traduire: {len(to_do)} chaînes")
        i = 0
        while i < len(to_do):
            chunk = to_do[i:i+args.batch]
            tr = http_translate_batch(args.engine, "en", lang, chunk)
            if len(tr) != len(chunk):
                tr = chunk
            for off, txt in enumerate(tr):
                set_in(tgt, idx[i+off], txt or chunk[off])
            i += len(chunk)
            time.sleep(args.sleep)

        save_json(out_path, tgt)
        print(f"[{lang}] ✅ écrit: {out_path}")

if __name__ == "__main__":
    main()
