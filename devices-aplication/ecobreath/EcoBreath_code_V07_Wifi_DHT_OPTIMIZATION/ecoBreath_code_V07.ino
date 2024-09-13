#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <SPIFFS.h>
#include <vector>

const char *ssid_ap = "ESP-AP";
const char *password_ap = "12345678";

WebServer server(80);
DNSServer dnsServer;
String scannedNetworks;

void scanAndStoreNetworks()
{
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);

    int n = WiFi.scanNetworks();
    scannedNetworks = "{\"networks\":[";

    std::vector<String> uniqueSSIDs;

    if (n > 0)
    {
        for (int i = 0; i < n; ++i)
        {
            String ssid = WiFi.SSID(i);

            if (std::find(uniqueSSIDs.begin(), uniqueSSIDs.end(), ssid) == uniqueSSIDs.end())
            {
                uniqueSSIDs.push_back(ssid);

                scannedNetworks += "{";
                scannedNetworks += "\"ssid\":\"" + ssid + "\",";
                scannedNetworks += "\"rssi\":" + String(WiFi.RSSI(i));
                scannedNetworks += "}";

                if (i < n - 1)
                {
                    scannedNetworks += ",";
                }
            }
        }
    }

    if (scannedNetworks.endsWith(","))
    {
        scannedNetworks = scannedNetworks.substring(0, scannedNetworks.length() - 1);
    }

    scannedNetworks += "]}";
}

void handleFileRequest(String pathFormat)
{
    String path = server.uri();

    if (path == "/")
    {
        path = pathFormat + "/front.html";
    }
    else
    {
        path = pathFormat + path;
    }

    String contentType;
    if (path.endsWith(".htm") || path.endsWith(".html"))
    {
        contentType = "text/html";
    }
    else if (path.endsWith(".css"))
    {
        contentType = "text/css";
    }
    else if (path.endsWith(".js"))
    {
        contentType = "application/javascript";
    }
    else if (path.endsWith(".png"))
    {
        contentType = "image/png";
    }
    else if (path.endsWith(".jpg"))
    {
        contentType = "image/jpeg";
    }
    else if (path.endsWith(".gif"))
    {
        contentType = "image/gif";
    }
    else if (path.endsWith(".ico"))
    {
        contentType = "image/x-icon";
    }
    else
    {
        contentType = "text/plain";
    }

    if (!SPIFFS.exists(path))
    {
        server.send(404, "text/plain", "Arquivo não encontrado.");
        return;
    }

    File file = SPIFFS.open(path, "r");
    server.streamFile(file, contentType);
    file.close();
}

void handleSave()
{
    String ssid = server.arg("ssid");
    String password = server.arg("password");

    WiFi.begin(ssid.c_str(), password.c_str());

    int attempts = 0;
    const int maxAttempts = 20;

    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts)
    {
        delay(500);
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        server.onNotFound([]()
                          { handleFileRequest("/connected"); });
    }
    else if (WiFi.status() != WL_CONNECTED && attempts == maxAttempts)
    {
        WiFi.softAP(ssid_ap, password_ap);
        dnsServer.start(53, "*", WiFi.softAPIP());
        server.onNotFound([]()
                          { handleFileRequest("/connection"); });
    }
}

void handleNetworks()
{
    server.send(200, "application/json", scannedNetworks);
}

void setup()
{
    Serial.begin(115200);

    if (!SPIFFS.begin(true))
    {
        Serial.println("Erro ao montar o sistema de arquivos SPIFFS.");
        return;
    }

    scanAndStoreNetworks();
    WiFi.softAP(ssid_ap, password_ap);
    dnsServer.start(53, "*", WiFi.softAPIP());

    server.onNotFound([]()
                      { handleFileRequest("/connection"); });
    server.on("/save", HTTP_POST, handleSave);
    server.on("/networks", HTTP_GET, handleNetworks);
    server.begin();

    Serial.println("Servidor iniciado");
    Serial.print("Acesse o IP: ");
    Serial.println(WiFi.softAPIP());
    delay(2000);
}

void loop()
{
    dnsServer.processNextRequest();
    server.handleClient();
}
