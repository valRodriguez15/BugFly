"""Modelos de datos (validación de entrada y forma de las respuestas)."""
from datetime import datetime
from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel, Field


class Gravedad(str, Enum):
    BAJA = "Baja"
    MEDIA = "Media"
    ALTA = "Alta"
    CRITICA = "Crítica"


class Estado(str, Enum):
    ABIERTO = "Abierto"
    EN_PROGRESO = "En progreso"
    RESUELTO = "Resuelto"
    CERRADO = "Cerrado"


class IncidenteCrear(BaseModel):
    """Datos para reportar un incidente. El responsable se puede asignar después."""
    titulo: str = Field(min_length=3, max_length=100)
    descripcion: Optional[str] = None
    gravedad: Gravedad
    responsable: Optional[str] = Field(default=None, max_length=50)


class IncidenteActualizar(BaseModel):
    """Actualización parcial: solo se modifican los campos enviados."""
    titulo: Optional[str] = Field(default=None, min_length=3, max_length=100)
    descripcion: Optional[str] = None
    gravedad: Optional[Gravedad] = None
    responsable: Optional[str] = Field(default=None, max_length=50)
    estado: Optional[Estado] = None


class Incidente(BaseModel):
    id: int
    titulo: str
    descripcion: Optional[str] = None
    gravedad: Gravedad
    responsable: Optional[str] = None
    estado: Estado
    fecha_creacion: datetime
    fecha_actualizacion: datetime


class Estadisticas(BaseModel):
    """Resumen para el dashboard."""
    total: int
    por_estado: Dict[str, int]
    por_gravedad: Dict[str, int]
