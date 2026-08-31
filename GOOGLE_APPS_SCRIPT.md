# Google Apps Script - Gestion de Tienda LM

Este proyecto usa un Web App de Google Apps Script para guardar registros de Las Mercedes en Google Sheets y exponer catalogos.

## Requisitos

- Spreadsheet ID: reemplazar `REEMPLAZAR_CON_SPREADSHEET_ID_LM` en `Code.gs` por el ID del Sheet nuevo de Las Mercedes.
- Hojas:
  - `INVENTARIO INICIAL`
  - `RECIBIDO`
  - `SALIDAS`
  - `INVENTARIO CIERRE`
  - `PRODUCTOS`
  - `MOTIVOS SALIDA`
  - `SEDES`
  - `AGOTADO`

## Flujo

- `GET ?action=getCatalogs` retorna productos y motivos.
- `POST` con `{ action: 'guardarRegistro', payload: {...} }` guarda un registro.
- En `INVENTARIO INICIAL` e `INVENTARIO CIERRE`, Apps Script mantiene la columna `FECHA DE ELABORACION` despues de `CANTIDAD` y la guarda con formato `DD/MM/AA`.
