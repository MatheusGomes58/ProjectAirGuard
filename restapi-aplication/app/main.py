from fastapi import FastAPI
from app.database import engine
from app.models import Base
from app.routers import items, logs, users  # Importando o roteador de logs

# Cria as tabelas no banco de dados
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Inclui as rotas do módulo de items
app.include_router(items.router, prefix="/items", tags=["Items"])

# Inclui as rotas do módulo de logs
app.include_router(logs.router, prefix="/logs", tags=["Logs"])

app.include_router(users.router, prefix="/users", tags=["Users"])
