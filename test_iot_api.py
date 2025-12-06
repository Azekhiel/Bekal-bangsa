import requests
import json

API_URL = "http://127.0.0.1:8000/api"

def test_iot_flow():
    print("--- Testing IoT API Flow ---")
    
    # 1. Try INSERT
    print("\n1. Inserting Dummy Data...")
    payload = {
        "temperature": 25.5,
        "humidity": 60.0,
        "device_id": "TEST-SCRIPT"
    }
    try:
        res_post = requests.post(f"{API_URL}/iot/log", json=payload)
        print(f"POST Status: {res_post.status_code}")
        print(f"POST Response: {res_post.text}")
    except Exception as e:
        print(f"POST Error: {e}")
        
    # 2. Try SELECT
    print("\n2. Fetching Logs...")
    try:
        res_get = requests.get(f"{API_URL}/iot/logs")
        print(f"GET Status: {res_get.status_code}")
        data = res_get.json()
        print(f"GET Response Data (Type: {type(data)}):")
        # Print first 2 items if list
        if isinstance(data, list):
            print(f"Count: {len(data)}")
            print(json.dumps(data[:2], indent=2))
        else:
            print(data)
            
    except Exception as e:
        print(f"GET Error: {e}")

if __name__ == "__main__":
    test_iot_flow()