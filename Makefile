.PHONY: setup translate check
setup:
	python3.12 -m venv venv312 && . venv312/bin/activate && python3.12 -m pip install -r requirements.txt
translate:
	. venv312/bin/activate && python scripts/auto_translate_locales.py
check:
	theme-check --fail-level error .
