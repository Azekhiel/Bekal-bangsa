#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

// ================= COFIGURATION =================
const char* WIFI_SSID = "your-wifi-ssid";
const char* WIFI_PASSWORD = "your-wifi-password";

// IMPORTANT: Added '/api/iot/log' to the confirmed endpoint
const char* API_URL = "https://bekal-bangsa-al8lc.ondigitalocean.app/api/iot/log"; 

#define DHTPIN 4       // Pin DATA DHT11 ke GPIO4 ESP32
#define DHTTYPE DHT11  // Tipe sensor
// ================================================

DHT dht(DHTPIN, DHTTYPE);
const String DEVICE_ID = "ESP32-SENSOR-01";

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // 1. Connect to WiFi
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // 2. Read Sensor
  float h = dht.readHumidity();
  float t = dht.readTemperature(); // Celsius

  // Check if any reads failed and exit early (to try again).
  if (isnan(h) || isnan(t)) {
    Serial.println("❌ Gagal membaca dari DHT11!");
    delay(2000);
    return;
  }
  
  Serial.print("🌡️ Suhu: ");
  Serial.print(t);
  Serial.print("°C | 💧 Kelembaban: ");
  Serial.print(h);
  Serial.println("%");

  // 3. Send to Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    Serial.print("Sending data to: ");
    Serial.println(API_URL);
    
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json"); // Important!
    
    // Build JSON Payload manually
    String payload = "{";
    payload += "\"temperature\": " + String(t) + ",";
    payload += "\"humidity\": " + String(h) + ",";
    payload += "\"device_id\": \"" + DEVICE_ID + "\"";
    payload += "}";
    
    Serial.print("Payload: ");
    Serial.println(payload);
    
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("✅ Server Response: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("❌ Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("⚠️ WiFi Disconnected");
  }
  
  delay(5000); // Kirim setiap 5 detik
}
