#include <WiFi.h>
#include <FirebaseESP32.h>

//NÃO UTILIZAR - a lib FirebaseESP32 é muito pesada para flash, não compensa debugar

// Define your Wi-Fi credentials
const char* ssid = "S21Vitor";
const char* password = "vitor010";

// Firebase configuration
const char* FIREBASE_PROJECT_ID = "projectairguard";
const char* FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY";
const char* FIREBASE_CLIENT_EMAIL = "firebase-adminsdk-1hw3l@projectairguard.iam.gserviceaccount.com";
const char* FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCbBt/OlHtWRPqA\ns1dbraU3+i/psHoivqTvBXDK4Oars/WKQVCKJ2TvjT8Cld2BdvxxAirzjD7g20tL\n+0IFue2vJWEdHg4m0TP+eU0FnV0agUmmcxxKBtgUYKl3pNv9MvUQFFn1ytzcYkpX\n95yYWAj3rR4mMdosq9gy3FAIo95Yfp7h20M+NAuCIIPasnSGMLIyBFh30N3uAIv3\nX6HqPuO3yml0ThKnaq7X9jY5Pxh4RDF+3uhcSya3fodzxn9QPd+7DYOGXH7IZGTJ\nnRNE9p0UWTUaTi2bXEsJCf8xDrQeHcVLkEnIEfrwjlSfP2fJjhtbA/zTkkoycJDG\nztA1j0ZDAgMBAAECggEAP/qzTQdca3smQw1AxVZBtHttYK1zinlRik+dgC0XJc+s\nSzWvboTZlD+fvIprEy4u+tihL0g2/weh6Ka2VbSpEjqD/MdVodF++svG7MVIElM/\nORGSoD542NgXuIfyPmnUV6F+iwEA63cpJWrMVtcmRElPAwZZ+0uke0EPSrGOZsie\nhxU8JLWq02FgUvRXjirW8EmUrh9SKWvB47hfM9HJhy/uPqUPIPiVcZbnmlIYJe4J\niFRzSOw1gTNcJ/rpFp+/ajP9cjwM+89FrQ1AB3R9o4AFpJfVAupO/CrMU/7u0u6F\nz0c+Lej4qGc0QBQrWDBxSwRSYpjMoeENPaPS5sXAgQKBgQDKbRzGhQbexhZaDkR7\nPgNa0BT5OR1WKmtzZhL+koPzvXlR8lAb8IK3s9n+ykK9JUdUBVo1bkFDNV4nDItC\nkHx3W1dgNw53E0yNCk18L9rp45aBXJNr0fgSpkSjcCJ0iQ0ulPZJO2yDH25RDqqG\nZnagU3lQWt1U69CGeoJBMHw1AwKBgQDEDlXBONx2KeERq0u3D1hxp/13O2hPKmui\n5OROWFriHJ+BW+R8b4/GqN9fqF2RPv7z2LLYMKYOp8eQJDpdqcxZUMWY/G8ZSQTv\nwcgu20qA5yn0Wler7McyXvyqzqnfOtTlN8n3agp2tyUZk+Ptml6O5tC62YD0h/vo\nDA84ZmDFwQKBgQCsRJFRjNIc8h0BhNTYwRyfwyemNOn3c2BAM+UESvIKkvvVNk7g\niBzmcyOZBs4nI7uBEJEFmY/mv1siBjXZbxbNiKliU1h3E7B48wSgJCW8GBf0fTFk\nd6sTS/Zr1LktzZivRMwX5H9jU3NRfha3DCn2JTO/o6RqacjrOQTyr210uwKBgQDA\noXUQjFXQpAVH3w5dpu43fd9Er1IltoBbZJoNgDKLx6PQ7gDpYpPZlUMkMcD9XPAT\nlu7iC6qc66zgqzfNn2/wsbP0RNLD/UKkb7nIkB372SUXuUw62EI/86Q+DyBI/P0A\n2nfOaJovWnNRVkW0xt/xeEfNzrctjA6uSGsL90tOAQKBgQCtTa1pisHvE5iHZaV2\nodbWSFOWYeDDV/Nnumm7k3jyxkNVYqG83NpNvcI47wLAr6GiS3yroykjkNldzAlA\nphtBGauomieBlK1E3baCl97M64HVYyg6tR/veIioEUYCrzODen+QuR0A5JmjFr9c\nz0AxwdjIWc3NYjPy93JK0nfjIg==\n-----END PRIVATE KEY-----\n";

const int buttonPin = 12; // Define the button pin
int buttonState = 0;      // Variable to store the button state

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  
  // Connect to Wi-Fi
  Serial.println();
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);

  // Wait until the ESP32 is connected to the Wi-Fi
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize the button pin as input with internal pull-up
  pinMode(buttonPin, INPUT_PULLUP);

  // Firebase configuration
  config.api_key = FIREBASE_API_KEY;
  config.signer.email = FIREBASE_CLIENT_EMAIL;
  config.signer.private_key = FIREBASE_PRIVATE_KEY;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
   // Read the button state
  buttonState = digitalRead(buttonPin);

  // Check if the button is pressed
  if (buttonState == LOW) {
    Serial.println("Button pressed");
    updateFirebaseState(1);
  } else {
    Serial.println("Button not pressed");
    updateFirebaseState(0);
  }

  // Small delay to avoid reading 'bounce'
  delay(1000);
}

void updateFirebaseState(int state) {
  String documentPath = "device/lolin";
  FirebaseJson content;
  content.set("fields/state/integerValue", state);

  if (Firebase.Firestore.patchDocument(&firebaseData, FIREBASE_PROJECT_ID, "", documentPath.c_str(), content.raw(), "state")) {
    Serial.println("Successfully updated 'state' value in Firestore.");
    
    // Call webhook after Firebase update
    callWebhook();
  } else {
    Serial.print("Failed to update 'state' value: ");
    Serial.println(firebaseData.errorReason());
  }
}

void callWebhook() {
  HTTPClient http;
  String webhookURL = "url_webhook_actionLight"; 

  http.begin(webhookURL);
  int httpResponseCode = http.GET();

  if (httpResponseCode > 0) {
    Serial.print("Webhook GET request successful, response code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Webhook GET request failed, error: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}
