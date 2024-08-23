Para servir um arquivo HTML armazenado na memória do ESP32 em vez de uma string estática, você pode usar o sistema de arquivos SPIFFS (SPI Flash File System). Isso permite que você armazene e leia arquivos diretamente da memória flash do ESP32. Vou te guiar pelos passos necessários para configurar e usar o SPIFFS para servir o arquivo front.html.

Passos para Configurar e Usar SPIFFS
Preparar o Ambiente:

Certifique-se de que a biblioteca SPIFFS está incluída em seu projeto. No Arduino IDE, você pode adicionar isso através do gerenciador de bibliotecas.
Criar e Carregar o Arquivo HTML:

Crie um diretório chamado data na pasta do seu projeto (a mesma pasta onde está o código .ino).
Coloque o arquivo front.html dentro desse diretório.
Modificar o Código do ESP32:

Altere seu código para usar o SPIFFS para ler e servir o arquivo HTML.

Notas Adicionais
Upload do Arquivo:

Você precisa fazer o upload do arquivo front.html para o sistema de arquivos SPIFFS. No Arduino IDE, você pode fazer isso através do plugin "ESP32 Sketch Data Upload" (disponível no menu Ferramentas após instalar o plugin).
Certifique-se de que o arquivo front.html está no diretório data antes de fazer o upload.

Essas mudanças permitem que o ESP32 leia o arquivo front.html da memória e o envie como resposta ao cliente.