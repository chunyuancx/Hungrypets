import RPi.GPIO as GPIO
import time

servo_pin = 18       # GPIO18 (Pin 12)
touch_pin = 27       # GPIO27 (Pin 13)

GPIO.setmode(GPIO.BCM)
GPIO.setup(servo_pin, GPIO.OUT)
GPIO.setup(touch_pin, GPIO.IN)

pwm = GPIO.PWM(servo_pin, 50)  # 50Hz for servo
pwm.start(0)

def set_angle(angle):
    duty = 2 + (angle / 18)
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)

try:
    while True:
        if GPIO.input(touch_pin) == GPIO.HIGH:
            print("Touch detected! Rotating servo.")
            set_angle(90)   # or any angle
            time.sleep(1)
            set_angle(0)    # reset after 1s
        time.sleep(0.1)

except KeyboardInterrupt:
    pwm.stop()
    GPIO.cleanup()
