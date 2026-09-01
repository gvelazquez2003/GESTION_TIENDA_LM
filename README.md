# Gestion de Tienda LM

Formulario web para la sede Las Mercedes. Registra INVENTARIO INICIAL, RECIBIDO, SALIDAS, INVENTARIO CIERRE y AGOTADO conectado a Google Sheets mediante Google Apps Script.

## Estructura

- `index.html`: interfaz principal
- `styles.css`: estilos visuales
- `script.js`: logica frontend y envio de datos
- `Code.gs`: backend de Google Apps Script
- `api/apps-script.js`: proxy serverless de Vercel para evitar problemas de CORS con Apps Script
- `vercel.json`: configuracion de despliegue en Vercel

## Spreadsheet objetivo

- URL: `https://docs.google.com/spreadsheets/d/1fRRKHVA1cNp0zY26qu1RPqfTQ37DYlQlGgynPUgDtkY/edit`
- ID: `1fRRKHVA1cNp0zY26qu1RPqfTQ37DYlQlGgynPUgDtkY`

## Hojas esperadas

- `INVENTARIO INICIAL`
- `RECIBIDO`
- `SALIDAS`
- `INVENTARIO CIERRE`
- `PRODUCTOS`
- `MOTIVOS SALIDA`
- `SEDES`

## Columnas esperadas

### Hojas de registro
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
- `SEDE`
- `RESPONSABLE`
- `OBSERVACIONES`

### Hojas `INVENTARIO INICIAL` e `INVENTARIO CIERRE`
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
- `FECHA DE ELABORACION`
- `SEDE`
- `RESPONSABLE`
- `OBSERVACIONES`

### Hoja `SALIDAS`
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
- `SEDE`
- `RESPONSABLE`
- `OBSERVACIONES`
- `MOTIVO SALIDA`

### Hoja `PRODUCTOS`
- `CODIGO`
- `PRODUCTO`
- `UND PRIMARIA`
- `FAMILIA`

### Hoja `MOTIVOS SALIDA`
- `MOTIVOS SALIDA`

### Hoja `SEDES`
- `SEDES`

### Hoja `AGOTADO`
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `SEDE`

## Como desplegar

1. Abrir el Apps Script copiado para Las Mercedes.
2. Copiar el contenido actualizado de `Code.gs` en el archivo `Code.gs` del proyecto.
3. Desplegar como Web App:
   - Execute as: `Me`
   - Who has access: `Anyone` o `Anyone with the link`
4. Confirmar que la URL `/exec` sea:
   `https://script.google.com/macros/s/AKfycbzr-1n7pHKw2ipc0EX6x4cnBPRpORsaL7pADIFQBX0BTY2g1zCfebKdgQFwymiAm7yF/exec`
5. Importar este repositorio en Vercel y publicar.
6. El frontend ya llama al proxy `/api/apps-script`, no al Web App directamente.

## Notas

- El formulario toma productos desde `PRODUCTOS`, motivos desde `MOTIVOS SALIDA` y sedes desde `SEDES`.
- El modulo `Salidas` exige motivo de salida.
- El frontend usa catalogos remotos; no hay listas embebidas en HTML.
