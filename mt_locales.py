import argparse, json, os, time, re, urllib.request

def load_json(path):
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        return {}
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            print(f"⚠️  {path} is invalid JSON ({e}). Using empty object.")
            return {}

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2); f.write("\n")

def get_in(d, path):
    cur = d
    for k in path:
        if isinstance(k, int):
            if not isinstance(cur, list) or k >= len(cur): return None
            cur = cur[k]
        else:
            if not isinstance(cur, dict) or k not in cur: return None
            cur = cur[k]
    return cur

def set_in(d, path, value):
    cur = d
    for k in path[:-1]:
        if isinstance(k, int):
            if not isinstance(cur, list): raise TypeError("int index into non-list")
            while len(cur) <= k: cur.append({})
            if not isinstance(cur[k], (dict, list, str)): cur[k] = {}
            cur = cur[k]
        else:
            if k not in cur or not isinstance(cur[k], (dict, list, str)): cur[k] = {}
            cur = cur[k]
    last = path[-1]
    if isinstance(last, int):
        if not isinstance(cur, list): raise TypeError("int index into non-list")
        while len(cur) <= last: cur.append("")
        cur[last] = value
    else:
        cur[last] = value

def walk_paths(obj, prefix=None):
    if prefix is None: prefix = []
    if isinstance(obj, dict):
        for k, v in obj.items(): yield from walk_paths(v, prefix + [k])
    elif isinstance(obj, list):
        for i, v in enumerate(obj): yield from walk_paths(v, prefix + [i])
    else:
        yield prefix

PLACEHOLDER_RE = re.compile(r'(\{\{\s*[^}]+\s*\}\}|\{[\w.]+\}|%s|%d|%(\(\w+\))?s|:\w+|<[^>]+>)')
def mask_placeholders(s):
    mapping, idx = {}, 0
    def repl(m):
        nonlocal idx
        token = f"__PH{idx}__"; mapping[token] = m.group(0); idx += 1; return token
    return PLACEHOLDER_RE.sub(repl, s), mapping

def unmask_placeholders(s, mapping):
    for k, v in mapping.items(): s = s.replace(k, v)
    return s

def lt_translate_batch(endpoint, source, target, texts, api_key=None):
    if not texts:
        return []
    url = endpoint.rstrip("/") + "/translate"
    payload = {"q": texts, "source": source, "target": target, "format": "text"}
    if api_key:
        payload["api_key"] = api_key
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "mt_locales/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        out = json.loads(resp.read().decode("utf-8"))

    # LibreTranslate returns either a dict or a list depending on server version
    if isinstance(out, dict) and "translatedText" in out:
        return [out["translatedText"]]
    return [item.get("translatedText", "") for item in out]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--to", nargs="+", required=True)
    ap.add_argument("--outdir", default="locales")
    ap.add_argument("--engine", default="http://localhost:5000")
    ap.add_argument("--api-key", default=None)
    ap.add_argument("--batch", type=int, default=50)
    ap.add_argument("--sleep", type=float, default=0.0)
    args = ap.parse_args()

    en = load_json(args.src)

    paths = [p for p in walk_paths(en) if isinstance(get_in(en, p), str)]

    for lang in args.to:
        out_path = os.path.join(args.outdir, f"{lang}.json")
        tgt = load_json(out_path) or {}

        to_tx, idxs, masks = [], [], []
        for p in paths:
            en_text = get_in(en, p)
            cur = get_in(tgt, p)
            if cur is None:
                set_in(tgt, p, ""); cur = ""
            if isinstance(cur, str) and cur.strip() == "":
                masked, mapping = mask_placeholders(en_text or "")
                to_tx.append(masked); idxs.append(p); masks.append(mapping)

        print(f"[{lang}] To translate: {len(to_tx)} strings")
        i = 0
        while i < len(to_tx):
            chunk = to_tx[i:i+args.batch]
            out = lt_translate_batch(args.engine, "en", lang, chunk, api_key=args.api_key)
            for j, tr in enumerate(out):
                set_in(tgt, idxs[i+j], unmask_placeholders(tr, masks[i+j]))
            i += len(chunk)
            if args.sleep: time.sleep(args.sleep)

        save_json(out_path, tgt)
        print(f"[{lang}] ✅ wrote: {out_path}")

if __name__ == "__main__":
    main()
