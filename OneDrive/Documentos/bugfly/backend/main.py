"""API de BugFly: gestión de incidentes tecnológicos."""
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from repository import IncidenteRepository
from schemas import (
    Estadisticas,
    Estado,
    Gravedad,
    Incidente,
    IncidenteActualizar,
    IncidenteCrear,
)

repositorio = IncidenteRepository()


def get_repo() -> IncidenteRepository:
    """Dependencia de FastAPI; las pruebas la reemplazan por un repositorio en memoria."""
    return repositorio


@asynccontextmanager
async def lifespan(app: FastAPI):
    repositorio.init_db()
    yield


app = FastAPI(title="BugFly - Gestor de Incidentes Tech", version="1.1", lifespan=lifespan)

# El frontend (Next.js) corre en otro origen, así que hay que habilitar CORS.
# CORS_ORIGINS acepta una lista separada por comas, p. ej. "http://localhost:3000".
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _buscar_o_404(repo: IncidenteRepository, incidente_id: int) -> dict:
    incidente = repo.obtener(incidente_id)
    if incidente is None:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    return incidente


@app.get("/")
def read_root():
    return {"mensaje": "Bienvenido al Sistema de Gestión de Incidentes Tecnológicos"}


@app.get("/health")
def health(repo: IncidenteRepository = Depends(get_repo)):
    """Comprueba que el backend puede hablar con el contenedor de la base de datos."""
    try:
        repo.ping()
    except Exception:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    return {"status": "ok", "base_de_datos": "conectada"}


@app.get("/incidentes", response_model=List[Incidente])
def listar_incidentes(
    gravedad: Optional[Gravedad] = None,
    estado: Optional[Estado] = None,
    responsable: Optional[str] = None,
    repo: IncidenteRepository = Depends(get_repo),
):
    return repo.listar(
        gravedad=gravedad.value if gravedad else None,
        estado=estado.value if estado else None,
        responsable=responsable,
    )


@app.post("/incidentes", response_model=Incidente, status_code=201)
def crear_incidente(inc: IncidenteCrear, repo: IncidenteRepository = Depends(get_repo)):
    return repo.crear(inc.model_dump(mode="json"))


@app.get("/incidentes/{incidente_id}", response_model=Incidente)
def obtener_incidente(incidente_id: int, repo: IncidenteRepository = Depends(get_repo)):
    return _buscar_o_404(repo, incidente_id)


@app.patch("/incidentes/{incidente_id}", response_model=Incidente)
def actualizar_incidente(
    incidente_id: int,
    cambios: IncidenteActualizar,
    repo: IncidenteRepository = Depends(get_repo),
):
    """Sirve para reclasificar, asignar responsable y avanzar el estado."""
    datos = cambios.model_dump(mode="json", exclude_unset=True)
    for campo in ("titulo", "gravedad", "estado"):
        if campo in datos and datos[campo] is None:
            raise HTTPException(status_code=422, detail=f"'{campo}' no puede ser nulo")
    _buscar_o_404(repo, incidente_id)
    return repo.actualizar(incidente_id, datos)


@app.delete("/incidentes/{incidente_id}", status_code=204)
def eliminar_incidente(incidente_id: int, repo: IncidenteRepository = Depends(get_repo)):
    if not repo.eliminar(incidente_id):
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    return Response(status_code=204)


@app.get("/estadisticas", response_model=Estadisticas)
def estadisticas(repo: IncidenteRepository = Depends(get_repo)):
    """Conteos por estado y gravedad (incluye ceros) para el dashboard."""
    por_estado = repo.contar_por("estado")
    por_gravedad = repo.contar_por("gravedad")
    return {
        "total": sum(por_estado.values()),
        "por_estado": {e.value: por_estado.get(e.value, 0) for e in Estado},
        "por_gravedad": {g.value: por_gravedad.get(g.value, 0) for g in Gravedad},
    }
