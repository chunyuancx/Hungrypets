# Simulation
import time
import requests
import socket
from datetime import datetime

# --- Simulation Settings ---
DROP_PERCENT = 10           # drop 10% each cycle
SEND_INTERVAL = 3           # seconds between sends
BROADCAST_PORT = 37020
HTTP_PORT = 8080

# --- State ---
food_percent = 100

# --- Logging Utility ---
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# --- Discover server IP from UDP broadcast ---
def discover_server_ip(timeout=10, port=BROADCAST_PORT):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('', port))
    sock.settimeout(timeout)

    log(f"Listening for UDP broadcast on port {port}...")

    try:
        while True:
            data, addr = sock.recvfrom(1024)
            msg = data.decode()
            if msg.startswith("SERVER_IP:"):
                server_ip = msg.split(":", 1)[1]
                log(f"Discovered Server IP: {server_ip}")
                return server_ip
    except socket.timeout:
        log("Timed out waiting for server broadcast.")
        return None

# --- Send food level to server ---
def send_food_level_to_server(percent, server_ip, port=HTTP_PORT):
    url = f"http://{server_ip}:{port}/api/set-level"
    payload = {"level": percent}

    try:
        res = requests.post(url, json=payload, timeout=3)
        log(f"[✓] Sent {percent}% → Server replied: {res.json()}")
    except requests.exceptions.RequestException as e:
        log(f"[✗] Failed to send food level: {e}")

# --- Main Simulation Loop ---
def main():
    global food_percent
    server_ip = None

    # Try to discover server via UDP
    while server_ip is None:
        server_ip = discover_server_ip()
        if not server_ip:
            log("Retrying discovery in 5 seconds...")
            time.sleep(5)

    # Simulation loop
    try:
        while True:
            food_percent -= DROP_PERCENT
            food_percent = max(0, food_percent)
            log(f"[Sim] Food dropped to {food_percent}%")

            send_food_level_to_server(food_percent, server_ip)

            if food_percent == 0:
                log("[Sim] Food is empty. Refilling to 100%...")
                food_percent = 100
                send_food_level_to_server(food_percent, server_ip)

            time.sleep(SEND_INTERVAL)

    except KeyboardInterrupt:
        log("Simulation interrupted by user.")

# --- Entry Point ---
if __name__ == '__main__':
    main()
