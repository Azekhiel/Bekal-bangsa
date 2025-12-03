import serial
import requests
import json
import time

# --- KONFIGURASI ---
# Ganti dengan Port Arduino kamu (Cek di Arduino IDE > Tools > Port)
# Di Windows biasanya COM3, COM4, dst. Di Mac/Linux /dev/tty...
SERIAL_PORT = 'COM3' 
BAUD_RATE = 9600
API_URL = 'https://contoh-api-kamu.com/endpoint' # Ganti dengan link API tujuan

# --- SETUP SERIAL ---
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    print(f"Terhubung ke {SERIAL_PORT}")
except:
    print(f"Gagal membuka {SERIAL_PORT}. Cek apakah port benar atau sedang dipakai aplikasi lain.")
    exit()

# --- LOOP UTAMA ---
while True:
    try:
        # 1. Baca data dari Arduino (baris per baris)
        if ser.in_waiting > 0:
            line = ser.readline().decode('utf-8').strip()
            
            if line:
                print(f"Data dari Arduino: {line}")
                
                # 2. Kirim ke API
                try:
                    # Kita anggap Arduino mengirim JSON valid
                    payload = json.loads(line) 
                    
                    # Kirim POST Request
                    response = requests.post(API_URL, json=payload)
                    
                    print(f"Status API: {response.status_code}")
                    print("-" * 20)
                    
                except json.JSONDecodeError:
                    print("Format data dari Arduino bukan JSON valid.")
                except requests.exceptions.RequestException as e:
                    print(f"Gagal kirim ke API: {e}")

    except KeyboardInterrupt:
        print("Program dihentikan.")
        ser.close()
        break