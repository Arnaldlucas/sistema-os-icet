# Usa uma imagem oficial leve do Python
FROM python:3.11-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY requirements.txt .

# Instala as dependências de forma limpa
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código do backend para dentro do container
COPY . .

# Expõe a porta que o FastAPI escuta
EXPOSE 8000

# Comando para rodar o Uvicorn apontando para a porta 8000 dentro do container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]