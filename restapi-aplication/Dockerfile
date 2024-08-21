# Use uma imagem base oficial do Python
FROM python:3.9-slim

# Defina o diretório de trabalho dentro do container
WORKDIR /app

# Copie o arquivo requirements.txt para o container
COPY requirements.txt .

# Instale as dependências Python listadas no requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install psycopg2-binary


# Copie o código da aplicação para o diretório de trabalho
COPY . .

# Comando para iniciar a aplicação usando o Gunicorn
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000"]
