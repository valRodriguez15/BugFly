# BugFly – Backend (API)

API en FastAPI que corre en el contenedor `web` y guarda los incidentes en el contenedor `db` (PostgreSQL).

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Verifica la conexión backend → base de datos |
| GET | `/incidentes` | Lista; filtros opcionales `?gravedad=`, `?estado=`, `?responsable=` |
| POST | `/incidentes` | Reporta un incidente (`titulo`, `gravedad`; opcionales `descripcion`, `responsable`) |
| GET | `/incidentes/{id}` | Detalle de un incidente |
| PATCH | `/incidentes/{id}` | Actualiza solo los campos enviados (reclasificar, asignar responsable, cambiar estado) |
| DELETE | `/incidentes/{id}` | Elimina un incidente |
| GET | `/estadisticas` | Total y conteos por estado y gravedad (para el dashboard) |

- `gravedad`: `Baja`, `Media`, `Alta`, `Crítica`
- `estado`: `Abierto`, `En progreso`, `Resuelto`, `Cerrado`

Documentación interactiva: http://localhost:8000/docs

## Ejecutar

Desde la carpeta donde está `docker-compose.yml`:

    docker compose up --build

## Pruebas

Desde la carpeta donde está `docker-compose.yml` (corren con el Python 3.10 del contenedor):

    docker compose build web
    docker compose run --rm web sh -c "pip install -r requirements-dev.txt && pytest"

Las pruebas de `tests/test_api.py` no necesitan base de datos. La de
`tests/test_repository_pg.py` prueba el SQL contra Postgres y se omite sola si
no hay uno disponible (`docker compose up -d db` y luego `DB_HOST=localhost pytest`).

## Archivos

- `main.py`: rutas de la API
- `schemas.py`: modelos y validaciones
- `repository.py`: consultas SQL
