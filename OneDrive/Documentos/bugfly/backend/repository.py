"""Acceso a datos: todas las consultas SQL de incidentes viven aquí."""
import os
import time
from contextlib import contextmanager
from typing import List, Optional

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor

DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "incidentes_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Únicas columnas que la API puede modificar o usar como filtro.
COLUMNAS_EDITABLES = ("titulo", "descripcion", "gravedad", "responsable", "estado")
COLUMNAS_FILTRO = ("gravedad", "estado", "responsable")


def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        cursor_factory=RealDictCursor,
    )


class IncidenteRepository:
    def __init__(self, connection_factory=get_db_connection):
        self._connect = connection_factory

    @contextmanager
    def _cursor(self):
        """Abre una conexión, hace commit si todo sale bien y siempre la cierra."""
        conn = self._connect()
        try:
            with conn, conn.cursor() as cur:
                yield cur
        finally:
            conn.close()

    def init_db(self, intentos: int = 10, espera: float = 2.0) -> None:
        """Crea la tabla. Reintenta porque el contenedor de Postgres puede
        tardar unos segundos en aceptar conexiones después de arrancar."""
        for intento in range(1, intentos + 1):
            try:
                with self._cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS incidentes (
                            id SERIAL PRIMARY KEY,
                            titulo VARCHAR(100) NOT NULL,
                            descripcion TEXT,
                            gravedad VARCHAR(20) NOT NULL,
                            responsable VARCHAR(50),
                            estado VARCHAR(20) NOT NULL DEFAULT 'Abierto'
                        );
                    """)
                    # Columnas nuevas: también se agregan si la tabla ya existía.
                    cur.execute("""
                        ALTER TABLE incidentes
                            ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
                            ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now();
                    """)
                return
            except psycopg2.OperationalError as e:
                print(f"BD no disponible (intento {intento}/{intentos}): {e}")
                if intento == intentos:
                    raise
                time.sleep(espera)

    def ping(self) -> None:
        with self._cursor() as cur:
            cur.execute("SELECT 1;")

    def listar(self, **filtros) -> List[dict]:
        condiciones, valores = [], []
        for columna in COLUMNAS_FILTRO:
            if filtros.get(columna) is not None:
                condiciones.append(sql.SQL("{} = %s").format(sql.Identifier(columna)))
                valores.append(filtros[columna])
        consulta = sql.SQL("SELECT * FROM incidentes")
        if condiciones:
            consulta += sql.SQL(" WHERE ") + sql.SQL(" AND ").join(condiciones)
        consulta += sql.SQL(" ORDER BY id DESC;")
        with self._cursor() as cur:
            cur.execute(consulta, valores)
            return cur.fetchall()

    def obtener(self, incidente_id: int) -> Optional[dict]:
        with self._cursor() as cur:
            cur.execute("SELECT * FROM incidentes WHERE id = %s;", (incidente_id,))
            return cur.fetchone()

    def crear(self, datos: dict) -> dict:
        with self._cursor() as cur:
            cur.execute(
                """INSERT INTO incidentes (titulo, descripcion, gravedad, responsable)
                   VALUES (%(titulo)s, %(descripcion)s, %(gravedad)s, %(responsable)s)
                   RETURNING *;""",
                datos,
            )
            return cur.fetchone()

    def actualizar(self, incidente_id: int, cambios: dict) -> Optional[dict]:
        cambios = {k: v for k, v in cambios.items() if k in COLUMNAS_EDITABLES}
        if not cambios:
            return self.obtener(incidente_id)
        asignaciones = sql.SQL(", ").join(
            sql.SQL("{} = %s").format(sql.Identifier(columna)) for columna in cambios
        )
        consulta = sql.SQL(
            "UPDATE incidentes SET {}, fecha_actualizacion = now() WHERE id = %s RETURNING *;"
        ).format(asignaciones)
        with self._cursor() as cur:
            cur.execute(consulta, [*cambios.values(), incidente_id])
            return cur.fetchone()

    def eliminar(self, incidente_id: int) -> bool:
        with self._cursor() as cur:
            cur.execute("DELETE FROM incidentes WHERE id = %s;", (incidente_id,))
            return cur.rowcount > 0

    def contar_por(self, columna: str) -> dict:
        if columna not in COLUMNAS_FILTRO:
            raise ValueError(f"No se puede agrupar por '{columna}'")
        consulta = sql.SQL(
            "SELECT {col} AS clave, COUNT(*) AS cantidad FROM incidentes GROUP BY {col};"
        ).format(col=sql.Identifier(columna))
        with self._cursor() as cur:
            cur.execute(consulta)
            return {fila["clave"]: fila["cantidad"] for fila in cur.fetchall()}
