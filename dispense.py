import RPi.GPIO as GPIO
import time, requests, socket, datetime

# GPIO Pins (BCM Mode)
SERVO_GPIO = 17     # Controls TS90A servo
TOUCH_GPIO = 27     # Reads input from touch sensor

# --- Simulation Settings ---
DROP_PERCENT = 10           # drop 10% each cycle
SEND_INTERVAL = 3           # seconds between sends
BROADCAST_PORT = 37020
HTTP_PORT = 8080

# Setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(SERVO_GPIO, GPIO.OUT)
GPIO.setup(TOUCH_GPIO, GPIO.IN)

# PWM setup
pwm = GPIO.PWM(SERVO_GPIO, 50)  # 50 Hz for servo
pwm.start(0)

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

def get_food_level_from_server(server_ip, port=8080):
    url = f"http://{server_ip}:{port}/api/status"
    try:
        res = requests.get(url, timeout=3)
        data = res.json()
        return float(data.get("food_level", 100))
    except Exception as e:
        log(f"[✗] Failed to fetch food level: {e}")
        return 100

def set_angle(angle):
    duty = 2 + (angle / 18)
    GPIO.output(SERVO_GPIO, True)
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    GPIO.output(SERVO_GPIO, False)
    pwm.ChangeDutyCycle(0)

server_ip = None
while server_ip is None:
    server_ip = discover_server_ip()
    if not server_ip:
        log("Retrying in 5 seconds...")
        time.sleep(5)

food_percent = get_food_level_from_server(server_ip)
log(f"Current food level: {food_percent}%")

try:
    print("Waiting for touch...")
    while True:
        if GPIO.input(TOUCH_GPIO) == GPIO.HIGH:
            print("Touch detected! Rotating to 180°")
            set_angle(180)
            time.sleep(3)
            print("Returning to 90°")
            set_angle(90)
            food_percent = max(0, food_percent - 10)
            send_food_level_to_server(food_percent, server_ip)
            log(f"Updated food level: {food_percent}%")
            print("Done. Waiting for next touch.")
            time.sleep(0.5)  # debounce delay
        time.sleep(0.1)

except KeyboardInterrupt:
    print("Program stopped by user.")

finally:
    pwm.stop()
    GPIO.cleanup()