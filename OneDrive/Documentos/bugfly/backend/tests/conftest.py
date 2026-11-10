import os
import sys
from collections import Counter
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app, get_repo  # noqa: E402


class RepoEnMemoria:
    """Mismo contrato que IncidenteRepository, pero sin base de datos."""

    def __init__(self):
        self.datos = {}
        self.siguiente_id = 1
        self.caida = False

    def ping(self):
        if self.caida:
            raise RuntimeError("sin conexión")

    def listar(self, **filtros):
        filtros = {k: v for k, v in filtros.items() if v is not None}
        filas = [i for i in self.datos.values() if all(i[k] == v for k, v in filtros.items())]
        return sorted(filas, key=lambda i: i["id"], reverse=True)

    def obtener(self, incidente_id):
        return self.datos.get(incidente_id)

    def crear(self, datos):
        ahora = datetime.now(timezone.utc)
        incidente = {
            **datos,
            "id": self.siguiente_id,
            "estado": "Abierto",
            "fecha_creacion": ahora,
            "fecha_actualizacion": ahora,
        }
        self.datos[incidente["id"]] = incidente
        self.siguiente_id += 1
        return incidente

    def actualizar(self, incidente_id, cambios):
        incidente = self.datos.get(incidente_id)
        if incidente is None:
            return None
        if cambios:
            incidente.update(cambios, fecha_actualizacion=datetime.now(timezone.utc))
        return incidente

    def eliminar(self, incidente_id):
        return self.datos.pop(incidente_id, None) is not None

    def contar_por(self, columna):
        return dict(Counter(i[columna] for i in self.datos.values()))


@pytest.fixture
def repo():
    return RepoEnMemoria()


@pytest.fixture
def client(repo):
    app.dependency_overrides[get_repo] = lambda: repo
    # Sin "with": no se ejecuta el arranque, así que no se necesita Postgres.
    yield TestClient(app)
    app.dependency_overrides.clear()
