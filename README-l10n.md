# Locales workflow

## Setup (Python 3.12 required)
python3.12 -m venv venv312
source venv312/bin/activate
python3.12 -m pip install -r requirements.txt

## Fill only missing locale keys
python scripts/auto_translate_locales.py
