import requests

# Replace with the Pi’s IP address
pi_ip = 'localhost'

def get_food_level():
    try:
        url = f'http://{pi_ip}:8080/api/status'
        response = requests.get(url, timeout=5)
        data = response.json()
        print(f"Food level: {data['food_level']} cm")
        return data
    except requests.exceptions.RequestException as e:
        print("Error contacting Raspberry Pi:", e)

def send_food_level(level: float = None):
    """
    Sends the food level to a remote server API.

    Args:
        server_ip (str): IP or URL of the receiver (e.g., your laptop)
        level (float, optional): food level in cm. If None, it reads it.
    """
    if level is None:
        level = get_food_level()

    url = f"http://{pi_ip}:8080/api/set-level"
    payload = {"level": level}

    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"[✓] Sent food level: {level} cm | Server response:", response.json())
    except requests.exceptions.RequestException as e:
        print("[✗] Failed to send food level:", e)