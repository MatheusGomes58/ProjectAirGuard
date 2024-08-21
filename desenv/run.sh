#!/bin/bash

# Função para parar e remover os contêineres do Docker
docker compose down

# Definir a variável 'posicao' como o diretório atual
posicao=$(pwd)

# Parar e remover os contêineres do Docker
docker compose down

# Mudar para o diretório do frontend e executar o script de build
cd "$posicao/../frontend-aplication" || { echo "Erro: Diretório frontend-aplication não encontrado."; exit 1; }
./build.sh || { echo "Erro ao executar build.sh no frontend-aplication."; exit 1; }

# Mudar para o diretório da REST API e executar o script de build
cd "$posicao/../restapi-aplication" || { echo "Erro: Diretório restapi-aplication/app não encontrado."; exit 1; }
sudo ./build.sh || { echo "Erro ao executar build.sh no restapi-aplication/app."; exit 1; }

# Voltar ao diretório original
cd "$posicao" || { echo "Erro: Diretório $posicao não encontrado."; exit 1; }

# Reiniciar os contêineres do Docker
docker compose up -d

