"""Pruebas de la API. Usan un repositorio en memoria: no necesitan Postgres."""

NUEVO = {"titulo": "Servidor caído", "descripcion": "No responde", "gravedad": "Alta"}


def crear(client, **extra):
    r = client.post("/incidentes", json={**NUEVO, **extra})
    assert r.status_code == 201
    return r.json()


def test_raiz(client):
    assert client.get("/").status_code == 200


def test_health_ok_y_caida(client, repo):
    assert client.get("/health").json()["status"] == "ok"
    repo.caida = True
    assert client.get("/health").status_code == 503


def test_crear_incidente(client):
    inc = crear(client)
    assert inc["id"] == 1
    assert inc["estado"] == "Abierto"
    assert inc["responsable"] is None
    assert inc["fecha_creacion"]


def test_crear_valida_gravedad_y_titulo(client):
    assert client.post("/incidentes", json={**NUEVO, "gravedad": "Urgentísima"}).status_code == 422
    assert client.post("/incidentes", json={**NUEVO, "titulo": "ab"}).status_code == 422
    assert client.post("/incidentes", json={"descripcion": "sin título"}).status_code == 422


def test_obtener_incidente(client):
    inc = crear(client)
    assert client.get(f"/incidentes/{inc['id']}").json()["titulo"] == NUEVO["titulo"]
    assert client.get("/incidentes/999").status_code == 404


def test_listar_y_filtrar(client):
    crear(client, gravedad="Alta", responsable="ana")
    crear(client, gravedad="Baja", responsable="ana")
    crear(client, gravedad="Crítica", responsable="luis")

    assert [i["id"] for i in client.get("/incidentes").json()] == [3, 2, 1]
    assert len(client.get("/incidentes", params={"responsable": "ana"}).json()) == 2
    criticos = client.get("/incidentes", params={"gravedad": "Crítica"}).json()
    assert [i["responsable"] for i in criticos] == ["luis"]
    assert client.get("/incidentes", params={"estado": "Cerrado"}).json() == []
    assert client.get("/incidentes", params={"estado": "Inventado"}).status_code == 422


def test_seguimiento_asignar_y_resolver(client):
    inc = crear(client)
    r = client.patch(f"/incidentes/{inc['id']}", json={"responsable": "ana", "estado": "En progreso"})
    assert r.status_code == 200
    assert r.json()["responsable"] == "ana"
    assert r.json()["estado"] == "En progreso"
    assert r.json()["titulo"] == NUEVO["titulo"]  # lo no enviado no cambia

    r = client.patch(f"/incidentes/{inc['id']}", json={"estado": "Resuelto"})
    assert r.json()["estado"] == "Resuelto"
    assert r.json()["responsable"] == "ana"


def test_actualizar_errores(client):
    inc = crear(client)
    assert client.patch("/incidentes/999", json={"estado": "Cerrado"}).status_code == 404
    assert client.patch(f"/incidentes/{inc['id']}", json={"estado": "Inventado"}).status_code == 422
    assert client.patch(f"/incidentes/{inc['id']}", json={"titulo": None}).status_code == 422


def test_quitar_responsable(client):
    inc = crear(client, responsable="ana")
    r = client.patch(f"/incidentes/{inc['id']}", json={"responsable": None})
    assert r.json()["responsable"] is None


def test_eliminar(client):
    inc = crear(client)
    assert client.delete(f"/incidentes/{inc['id']}").status_code == 204
    assert client.get(f"/incidentes/{inc['id']}").status_code == 404
    assert client.delete(f"/incidentes/{inc['id']}").status_code == 404


def test_estadisticas(client):
    vacio = client.get("/estadisticas").json()
    assert vacio["total"] == 0
    assert vacio["por_gravedad"] == {"Baja": 0, "Media": 0, "Alta": 0, "Crítica": 0}

    crear(client, gravedad="Alta")
    crear(client, gravedad="Alta")
    inc = crear(client, gravedad="Baja")
    client.patch(f"/incidentes/{inc['id']}", json={"estado": "Cerrado"})

    stats = client.get("/estadisticas").json()
    assert stats["total"] == 3
    assert stats["por_gravedad"]["Alta"] == 2
    assert stats["por_estado"] == {"Abierto": 2, "En progreso": 0, "Resuelto": 0, "Cerrado": 1}
