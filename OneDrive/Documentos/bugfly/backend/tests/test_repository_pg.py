"""Pruebas de integración del SQL contra un Postgres real.

Se omiten solas si no hay base de datos disponible. Para correrlas:
    docker compose up -d db
    DB_HOST=localhost pytest
"""
import psycopg2
import pytest

from repository import IncidenteRepository


@pytest.fixture
def repo_pg():
    repo = IncidenteRepository()
    try:
        repo.init_db(intentos=1)
    except psycopg2.OperationalError:
        pytest.skip("Postgres no disponible")
    creados = []
    yield repo, creados
    for incidente_id in creados:
        repo.eliminar(incidente_id)


def test_ciclo_completo_en_postgres(repo_pg):
    repo, creados = repo_pg
    inc = repo.crear(
        {"titulo": "Prueba integración", "descripcion": None, "gravedad": "Media", "responsable": "zz-test"}
    )
    creados.append(inc["id"])
    assert inc["estado"] == "Abierto"
    assert inc["fecha_creacion"] is not None

    assert repo.obtener(inc["id"])["titulo"] == "Prueba integración"
    assert [i["id"] for i in repo.listar(responsable="zz-test", gravedad="Media")] == [inc["id"]]
    assert repo.listar(responsable="zz-test", estado="Cerrado") == []

    actualizado = repo.actualizar(inc["id"], {"estado": "Resuelto", "columna_rara": "x"})
    assert actualizado["estado"] == "Resuelto"
    assert actualizado["fecha_actualizacion"] >= inc["fecha_actualizacion"]
    assert repo.contar_por("estado")["Resuelto"] >= 1

    assert repo.eliminar(inc["id"]) is True
    assert repo.obtener(inc["id"]) is None
    assert repo.actualizar(inc["id"], {"estado": "Cerrado"}) is None
