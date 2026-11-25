"""Prueba funcional de FastAPI con PostgreSQL para el pipeline de BugFly."""
import json
import time
import urllib.request

BASE = "http://127.0.0.1:8000"
TITLE = "Prueba Jenkins " + str(int(time.time()))
EXPECTED_TITLE = TITLE


def request(path, method="GET", data=None):
    payload = None if data is None else json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=payload,
        method=method,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.status, json.load(response)


def main():
    status, health = request("/health")
    assert status == 200 and health.get("status") == "ok", f"Health incorrecto: {health}"

    status, created = request(
        "/incidentes",
        method="POST",
        data={
            "titulo": TITLE,
            "descripcion": "Comprobacion del proceso de integracion continua",
            "gravedad": "Media",
        },
    )
    assert status == 201, f"Se esperaba 201 y se recibio {status}"
    incident_id = created.get("id")
    assert isinstance(incident_id, int), f"ID invalido: {created}"

    status, detail = request(f"/incidentes/{incident_id}")
    assert status == 200, f"No se pudo consultar el incidente {incident_id}"
    assert detail.get("titulo") == EXPECTED_TITLE, (
        f"Titulo inesperado: {detail.get('titulo')!r}; esperado: {EXPECTED_TITLE!r}"
    )
    assert detail.get("estado") == "Abierto", f"Estado inesperado: {detail.get('estado')!r}"

    status, listing = request("/incidentes")
    assert status == 200 and isinstance(listing, list), "Listado invalido"
    assert any(item.get("id") == incident_id for item in listing), (
        "El incidente creado no aparece en el listado"
    )
    print(f"OK: incidente {incident_id} creado y consultado correctamente.")


if __name__ == "__main__":
    main()
