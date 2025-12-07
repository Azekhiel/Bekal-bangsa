from database import supabase
import random
from datetime import datetime

print("Testing Supabase Connection and Insert...")

try:
    # 1. Generate Dummy Data
    dummy_temp = round(random.uniform(20.0, 25.0), 1)
    dummy_hum = round(random.uniform(50.0, 70.0), 1)
    
    payload = {
        "temperature": dummy_temp,
        "humidity": dummy_hum,
        "device_id": "SENSOR-SIMULATOR-AUTO"
    }
    
    print(f"Attempting to insert: {payload}")
    
    # 2. Insert
    response = supabase.table("storage_logs").insert(payload).execute()
    
    print("✅ Insert Success:")
    print(response.data)
    
except Exception as e:
    print(f"❌ Insert Failed: {e}")
