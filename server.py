import os
import requests
import threading
import time
from bottle import Bottle, run, static_file, request, response
import client as feeder   # your hardware module

app = Bottle()

# —— Configuration ——  
BOT_TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN", "8449048260:AAGDfRFES4-xIXFr1PqzXQ2yfypEOPTIGYE")
CHAT_ID        = os.getenv("TELEGRAM_CHAT_ID",   "114453361")
LOW_THRESHOLD  = float(os.getenv("LOW_THRESHOLD", 30.0))  # trigger below this
HIGH_THRESHOLD = float(os.getenv("HIGH_THRESHOLD",50.0))  # reset when above this

# State for de-bounce
_low_notified = False

def send_telegram(text: str):
    if not BOT_TOKEN or not CHAT_ID:
        print("⚠️ Missing Telegram credentials")
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": text}
    try:
        r = requests.post(url, json=payload, timeout=5)
        print("Telegram API response:", r.status_code, r.text)
    except Exception as e:
        print("❌ Telegram send failed:", e)

@app.route('/')
def serve_index():
    return static_file('index.html', root='./public')

@app.route('/<filename>')
def serve_static(filename):
    return static_file(filename, root='./public')

@app.get('/api/status')
def get_food_status():
    lvl = feeder.read_food_level()
    return {'food_level': lvl}

@app.post('/api/set-level')
def set_food_level():
    global _low_notified

    data = request.json or {}
    if 'level' not in data:
        response.status = 400
        return {'error': 'Missing "level"'}
    try:
        level = float(data['level'])
    except:
        response.status = 400
        return {'error': 'Invalid level format'}

    print(f"[INFO] Received level: {level}")

    # Reset notification flag once we refill above HIGH_THRESHOLD
    if level >= HIGH_THRESHOLD and _low_notified:
        _low_notified = False
        print("[INFO] Level above high threshold; ready to alert again")

    # If below LOW_THRESHOLD and not yet notified, send alert
    if level <= LOW_THRESHOLD and not _low_notified:
        send_telegram(f"⚠️ Low food level detected: {level}")
        _low_notified = True

    return {'status': 'ok', 'level': level}

@app.post('/api/dispense')
def dispense():
    feeder.dispense_food()
    print("➡️ Dispensed; notifying Telegram")
    send_telegram("🍽️ Food have been dispensed! 👅")
    response.status = 204

@app.get('/api/dispense-command')
def check_dispense_command():
    # your existing logic...
    return {'dispense': False}

if __name__ == '__main__':
    print(f"[STARTING] LOW_THRESHOLD={LOW_THRESHOLD}, HIGH_THRESHOLD={HIGH_THRESHOLD}")
    run(app, host='0.0.0.0', port=8080, debug=True)
