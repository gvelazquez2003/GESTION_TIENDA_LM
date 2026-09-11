# Google Apps Script - Gestion de Tienda LM

Este proyecto usa un Web App de Google Apps Script para guardar registros de Las Mercedes en Google Sheets y exponer catalogos.

## Requisitos

- Spreadsheet ID: `1fRRKHVA1cNp0zY26qu1RPqfTQ37DYlQlGgynPUgDtkY`
- Hojas:
  - `INVENTARIO INICIAL`
  - `RECIBIDO`
  - `SALIDAS`
  - `INVENTARIO CIERRE`
  - `PRODUCTOS`
  - `MOTIVOS SALIDA`
  - `AGOTADO`

## Flujo

- `GET ?action=getCatalogs` retorna productos y motivos.
- `POST` con `{ action: 'guardarRegistro', payload: {...} }` guarda un registro.
- El campo `RESPONSABLE` se valida contra la lista `CONFIG.responsables`.
- `PTPV0164` se acepta como producto global en todos los modulos.
- `UTEN001`, `UTEN002`, `UTEN003` y `PTEM0195` se aceptan como productos especiales solo en `INVENTARIO INICIAL` e `INVENTARIO CIERRE`.
- `LIMPIAR_COPIA_LM` limpia registros viejos, elimina la columna `SEDE` de las hojas de registro y borra la hoja `SEDES`.
- En `INVENTARIO INICIAL` e `INVENTARIO CIERRE`, Apps Script mantiene la columna `FECHA DE ELABORACION` despues de `CANTIDAD` y la guarda con formato `DD/MM/AA`.
