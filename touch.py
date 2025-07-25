import RPi.GPIO as GPIO
import time

touch_pin = 27
GPIO.setmode(GPIO.BCM)
GPIO.setup(touch_pin, GPIO.IN)

try:
    while True:
        if GPIO.input(touch_pin) == GPIO.HIGH:
            print("Touch detected!")
        else:
            print("No touch.")
        time.sleep(0.2)
except KeyboardInterrupt:
    GPIO.cleanup()