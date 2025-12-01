import requests
import time
import random
import json
from datetime import datetime

# Konfigurasi
API_URL = "http://localhost:8000/api/iot/log"
DEVICE_ID = "SENSOR-GUDANG-01"

def generate_data():
    """
    Generate dummy data suhu & kelembaban yang realistis.
    Suhu gudang makanan biasanya dijaga dingin (20-25 derajat).
    """
    # Random float antara 20.0 s/d 25.0
    temp = round(random.uniform(20.0, 25.0), 1)
    
    # Random humidity 50% s/d 70%
    humidity = round(random.uniform(50.0, 70.0), 1)
    
    return {
        "temperature": temp,
        "humidity": humidity,
        "device_id": DEVICE_ID
    }

def run_simulator():
    print(f"🚀 IoT Simulator Started for {DEVICE_ID}")
    print(f"📡 Sending data to {API_URL} every 5 seconds...")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            data = generate_data()
            
            try:
                # Kirim POST Request ke Backend
                response = requests.post(API_URL, json=data)
                
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                if response.status_code == 200:
                    print(f"[{timestamp}] ✅ Sent: Temp={data['temperature']}°C, Hum={data['humidity']}%")
                else:
                    print(f"[{timestamp}] ❌ Failed: {response.status_code} - {response.text}")
                    
            except requests.exceptions.ConnectionError:
                print(f"⚠️  Connection Error: Is the Backend running at {API_URL}?")
            except Exception as e:
                print(f"❌ Error: {e}")

            # Tunggu 5 detik sebelum kirim lagi
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n🛑 Simulator Stopped.")

if __name__ == "__main__":
    run_simulator()
