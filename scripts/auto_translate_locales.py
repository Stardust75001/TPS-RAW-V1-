import os
import json
from googletrans import Translator

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'locales')
REFERENCE_LOCALE = 'en.default.json'
TARGET_LOCALES = ['es.json', 'de.json', 'it.json', 'nl.json', 'pl.json', 'pt.json', 'sv.json']

translator = Translator()

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def translate_text(text, dest):
    if not text:
        return ''
    try:
        result = translator.translate(text, dest=dest)
        return result.text
    except Exception:
        return text

def fill_missing_keys(reference, target, lang_code):
    for key, value in reference.items():
        if isinstance(value, dict):
            target[key] = fill_missing_keys(value, target.get(key, {}), lang_code)
        else:
            if not target.get(key):
                target[key] = translate_text(value, lang_code)
    return target

def main():
    ref_path = os.path.join(LOCALES_DIR, REFERENCE_LOCALE)
    reference = load_json(ref_path)
    lang_map = {
        'es.json': 'es',
        'de.json': 'de',
        'it.json': 'it',
        'nl.json': 'nl',
        'pl.json': 'pl',
        'pt.json': 'pt',
        'sv.json': 'sv',
    }
    for locale_file in TARGET_LOCALES:
        locale_path = os.path.join(LOCALES_DIR, locale_file)
        target = load_json(locale_path)
        filled = fill_missing_keys(reference, target, lang_map[locale_file])
        save_json(locale_path, filled)
        print(f"Filled missing keys in {locale_file}")

if __name__ == '__main__':
    main()
