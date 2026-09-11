# Gestion de Tienda LM

Formulario web dedicado a Las Mercedes. Registra INVENTARIO INICIAL, RECIBIDO, SALIDAS, INVENTARIO CIERRE y AGOTADO conectado a Google Sheets mediante Google Apps Script.

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

## Columnas esperadas

### Hojas de registro
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
- `RESPONSABLE`
- `OBSERVACIONES`

### Hojas `INVENTARIO INICIAL` e `INVENTARIO CIERRE`
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
- `FECHA DE ELABORACION`
- `RESPONSABLE`
- `OBSERVACIONES`

### Hoja `SALIDAS`
- `FECHA`
- `CODIGO`
- `PRODUCTO`
- `CANTIDAD`
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

### Hoja `AGOTADO`
- `FECHA`
- `CODIGO`
- `PRODUCTO`

## Responsables permitidos

- `Keider Mora`
- `Leandro Seprum`
- `Angel Velasquez`
- `Karol Mijares`
- `Rosmery Fernandez`
- `Rosangeles Sanchez`
- `María Rodríguez`
- `Carmalis Brito`
- `Angeli marrero`
- `Geisy Hernández`

## Productos globales

Estos productos aparecen en todos los modulos:

- `PTPV0164` - `PIZZA JAMON Y CHAMPINONES CONGELADA`

## Productos especiales de inventario

Estos productos aparecen solo en `Inventario Inicial` e `Inventario Cierre`:

- `UTEN001` - `Cucharilla`
- `UTEN002` - `Tenedor`
- `UTEN003` - `Cuchillo`
- `PTEM0195` - `CAFE DE TATA MOLIDO 250 GR`

## Como desplegar

1. Abrir el Apps Script copiado para Las Mercedes.
2. Copiar el contenido actualizado de `Code.gs` en el archivo `Code.gs` del proyecto.
3. Ejecutar una vez la funcion `LIMPIAR_COPIA_LM` desde Apps Script para limpiar registros viejos y quitar `SEDE`.
4. Desplegar como Web App:
   - Execute as: `Me`
   - Who has access: `Anyone` o `Anyone with the link`
5. Confirmar que la URL `/exec` sea:
   `https://script.google.com/macros/s/AKfycbzr-1n7pHKw2ipc0EX6x4cnBPRpORsaL7pADIFQBX0BTY2g1zCfebKdgQFwymiAm7yF/exec`
6. Importar este repositorio en Vercel y publicar.
7. El frontend ya llama al proxy `/api/apps-script`, no al Web App directamente.

## Limpieza del Sheet copiado

- Ejecutar `LIMPIAR_COPIA_LM` desde Apps Script para borrar los datos viejos de `INVENTARIO INICIAL`, `RECIBIDO`, `SALIDAS`, `INVENTARIO CIERRE` y `AGOTADO`, dejando solo la fila de encabezados.
- Esa funcion tambien elimina la columna `SEDE` de las hojas de registro y borra la hoja `SEDES`.

## Notas

- El formulario toma productos desde `PRODUCTOS` y motivos desde `MOTIVOS SALIDA`.
- El responsable se selecciona desde una lista cerrada en el formulario y se valida en Apps Script.
- El modulo `Salidas` exige motivo de salida.
- El frontend usa catalogos remotos; no hay listas embebidas en HTML.
