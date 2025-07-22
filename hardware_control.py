# # hardware_control.py
# import RPi.GPIO as GPIO
# import time

# # Pin configuration
# MOTOR_PIN = 18
# TRIG = 23
# ECHO = 24
# TOUCH_SENSOR = 25
# LED_PIN = 12

# GPIO.setmode(GPIO.BCM)
# GPIO.setup(MOTOR_PIN, GPIO.OUT)
# GPIO.setup(TRIG, GPIO.OUT)
# GPIO.setup(ECHO, GPIO.IN)
# GPIO.setup(TOUCH_SENSOR, GPIO.IN)
# GPIO.setup(LED_PIN, GPIO.OUT)

# def dispense_food(duration=2):
#     print("Dispensing food...")
#     GPIO.output(MOTOR_PIN, True)
#     time.sleep(duration)
#     GPIO.output(MOTOR_PIN, False)

# def get_food_level():
#     GPIO.output(TRIG, False)
#     time.sleep(0.1)
#     GPIO.output(TRIG, True)
#     time.sleep(0.00001)
#     GPIO.output(TRIG, False)

#     while GPIO.input(ECHO) == 0:
#         pulse_start = time.time()

#     while GPIO.input(ECHO) == 1:
#         pulse_end = time.time()

#     duration = pulse_end - pulse_start
#     distance = duration * 17150  # cm
#     distance = round(distance, 2)

#     return distance

# def is_touched():
#     return GPIO.input(TOUCH_SENSOR) == GPIO.HIGH

# def led_on():
#     GPIO.output(LED_PIN, True)

# def led_off():
#     GPIO.output(LED_PIN, False)

# def cleanup():
#     GPIO.cleanup()
