from pydantic import BaseModel
from typing import Optional

class ProductoEtiquetaBase(BaseModel):
    descripcion_larga: Optional[str] = None
    senasa_nro: Optional[str] = None
    rnpa_nro: Optional[str] = None
    industria_argentina: bool = True
    peso_neto: Optional[str] = None
    porcion_descripcion: Optional[str] = None
    valor_energetico_kcal: Optional[float] = None
    valor_energetico_kj: Optional[float] = None
    valor_energetico_vd: Optional[int] = None
    carbohidratos_g: Optional[float] = None
    carbohidratos_vd: Optional[int] = None
    proteinas_g: Optional[float] = None
    proteinas_vd: Optional[int] = None
    grasas_totales_g: Optional[float] = None
    grasas_totales_vd: Optional[int] = None
    grasas_saturadas_g: Optional[float] = None
    grasas_saturadas_vd: Optional[int] = None
    grasas_trans_g: Optional[float] = None
    fibra_alimentaria_g: Optional[float] = None
    fibra_alimentaria_vd: Optional[int] = None
    sodio_mg: Optional[float] = None
    sodio_vd: Optional[int] = None
    ingredientes: Optional[str] = None
    conservacion: Optional[str] = None
    elaborado_por: Optional[str] = None
    para_establecimiento: Optional[str] = None
    codigo_ep: Optional[str] = None
    codigo_hm: Optional[str] = None

class ProductoEtiquetaCreate(ProductoEtiquetaBase):
    pass

class ProductoEtiquetaRead(ProductoEtiquetaBase):
    id: int
    producto_id: int
    class Config:
        from_attributes = True
