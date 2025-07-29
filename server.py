from bottle import Bottle, run, static_file, request, response
import client as feeder  # Assumes this module defines read_food_level() and dispense_food()
import socket
import threading
import time
import requests
import os

app = Bottle()
latest_food_level = {'value': 100.0}
dispense_flag = {'trigger': False}

# Load your Telegram credentials from environment
BOT_TOKEN = "8449048260:AAGDfRFES4-xIXFr1PqzXQ2yfypEOPTIGYE"
CHAT_ID   = "114453361"

def send_telegram(text: str):
    """Send a message to your Telegram chat via Bot API."""
    if not BOT_TOKEN or not CHAT_ID:
        print("Telegram credentials missing:", BOT_TOKEN, CHAT_ID)
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": text}
    try:
        r = requests.post(url, json=payload, timeout=5)
        print("Telegram API response:", r.status_code, r.text)
    except Exception as e:
        print("Telegram send failed:", e)

def poll_updates():
    """Continuously poll getUpdates and auto-reply to /start."""
    offset = None
    while True:
        params = {"timeout": 30}
        if offset:
            params["offset"] = offset
        try:
            resp = requests.get(
                f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates",
                params=params,
                timeout=35
            ).json()
            for upd in resp.get("result", []):
                offset = upd["update_id"] + 1
                msg  = upd.get("message", {})
                text = msg.get("text", "")
                chat = msg.get("chat", {}).get("id")
                if text == "/start" and chat:
                    # Auto-reply to /start
                    requests.post(
                        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat,
                            "text": "Hi there! I'll notify you when food is dispensed."
                        },
                        timeout=5
                    )
        except Exception as e:
            print("Polling error:", e)
        time.sleep(1)

# Launch polling thread if credentials are present
if BOT_TOKEN and CHAT_ID:
    threading.Thread(target=poll_updates, daemon=True).start()

# ---------- Static File Routes ----------
@app.route('/')
def serve_index():
    return static_file('index.html', root='./public')

@app.route('/<filename>')
def serve_static(filename):
    return static_file(filename, root='./public')

# ---------- API: Get Food Status ----------
@app.get('/api/status')
def get_food_status():
    return {'food_level': latest_food_level['value']}

# ---------- API: Set Food Level Manually ----------
@app.post('/api/set-level')
def set_food_level():
    try:
        data = request.json
        if not data or 'level' not in data:
            response.status = 400
            return {'error': 'Missing field "level"'}

        level = float(data['level'])
        latest_food_level['value'] = level
        print(f"[INFO] Set food level to {level}")
        return {'status': 'ok', 'received_level': level}
    except (ValueError, TypeError):
        response.status = 400
        return {'error': 'Invalid level format (must be a number)'}

# ---------- API: Manual Dispense ----------
@app.post('/api/dispense')
def dispense():
    # feeder.dispense_food()
    dispense_flag['trigger'] = True
    print("Dispense endpoint hit; notifying Telegram")
    send_telegram("Food have been dispensed!")
    response.status = 204

@app.get('/api/dispense-command')
def check_dispense_command():
    if dispense_flag['trigger']:
        dispense_flag['trigger'] = False
        return {'dispense': True}
    return {'dispense': False}

# ---------- Network Utility: Broadcast IP ----------
def broadcast_ip(server_ip):
    message = f"SERVER_IP:{server_ip}".encode()
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        while True:
            try:
                sock.sendto(message, ('<broadcast>', 37020))
                time.sleep(2)
            except Exception as e:
                print(f"[ERROR] Broadcasting failed: {e}")

# ---------- Network Utility: Get Local IP ----------
def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"

# ---------- Main Server Launch ----------
if __name__ == '__main__':
    server_ip = get_local_ip()
    print(f"[INFO] Server IP: {server_ip}")
    threading.Thread(target=broadcast_ip, args=(server_ip,), daemon=True).start()
    run(app, host=server_ip, port=8080, debug=True)
