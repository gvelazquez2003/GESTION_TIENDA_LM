const CONFIG = {
  spreadsheetId: '1fRRKHVA1cNp0zY26qu1RPqfTQ37DYlQlGgynPUgDtkY',
  timeZone: 'America/Caracas',
  sheetNames: {
    inventarioInicial: 'INVENTARIO INICIAL',
    recibido: 'RECIBIDO',
    salidas: 'SALIDAS',
    inventarioCierre: 'INVENTARIO CIERRE',
    agotado: 'AGOTADO',
    productos: 'PRODUCTOS',
    motivosSalida: 'MOTIVOS SALIDA',
  },
  headers: {
    base: ['FECHA', 'CODIGO', 'PRODUCTO', 'CANTIDAD', 'RESPONSABLE', 'OBSERVACIONES'],
    conFechaElaboracion: ['FECHA', 'CODIGO', 'PRODUCTO', 'CANTIDAD', 'FECHA DE ELABORACION', 'RESPONSABLE', 'OBSERVACIONES'],
    salidas: ['FECHA', 'CODIGO', 'PRODUCTO', 'CANTIDAD', 'RESPONSABLE', 'OBSERVACIONES', 'MOTIVO SALIDA'],
    agotado: ['FECHA', 'CODIGO', 'PRODUCTO'],
  },
  responsables: [
    'Keider Mora',
    'Leandro Seprum',
    'Angel Velasquez',
    'Karol Mijares',
    'Rosmery Fernandez',
    'Rosangeles Sanchez',
    'María Rodríguez',
    'Carmalis Brito',
    'Angeli marrero',
    'Geisy Hernández',
  ],
  extraProductsByInitialAndClosing: [
    { codigo: 'UTEN001', producto: 'Cucharilla' },
    { codigo: 'UTEN002', producto: 'Tenedor' },
    { codigo: 'UTEN003', producto: 'Cuchillo' },
    { codigo: 'PTEM0195', producto: 'CAFE DE TATA MOLIDO 250 GR' },
  ],
  deprecatedHeaders: ['SEDE'],
};

function doGet(e) {
  const action = String(e?.parameter?.action || '').toLowerCase();

  try {
    if (action === 'getcatalogs') {
      return jsonResponse_(true, getCatalogs_(), 'Catalogos sincronizados.');
    }

    if (!action || action === 'ping') {
      return jsonResponse_(true, { ok: true }, 'Servicio disponible.');
    }

    return jsonResponse_(false, null, 'Accion GET no soportada.');
  } catch (error) {
    return jsonResponse_(false, null, normalizeError_(error));
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || '').toLowerCase();

    if (!action || action === 'guardarregistro' || action === 'saveregistro') {
      return jsonResponse_(true, guardarRegistro_(body.payload || body), 'Registro guardado correctamente.');
    }

    if (body.payload || body.hoja_destino || body.codigo || body.producto) {
      return jsonResponse_(true, guardarRegistro_(body.payload || body), 'Registro guardado correctamente.');
    }

    return jsonResponse_(false, null, 'Accion POST no soportada.');
  } catch (error) {
    return jsonResponse_(false, null, normalizeError_(error));
  }
}

function guardarRegistro_(payload) {
  const data = payload || {};

  // --- INICIO DEL PARCHE DE COMPATIBILIDAD ---
  // 1. Traducir el nombre del módulo
  if (!data.hoja_destino && data.tipo_movimiento) {
    data.hoja_destino = data.tipo_movimiento;
  }
  // 2. Traducir el motivo de salida
  if (!data.motivo_salida && data.motivo) {
    data.motivo_salida = data.motivo;
  }
  // 3. Separar el código y el nombre del producto automáticamente
  if (data.producto && !data.codigo && data.producto.indexOf(" ") > -1) {
    const espacioIndex = data.producto.indexOf(" ");
    data.codigo = data.producto.substring(0, espacioIndex).trim();
    data.producto = data.producto.substring(espacioIndex + 1).trim();
  }
  // --- FIN DEL PARCHE ---

  const sheetName = resolveSheetName_(data.hoja_destino);
  const sheet = getOrCreateSheet_(sheetName);
  ensureHeaders_(sheet, getHeadersForSheet_(sheetName));

  // Lógica especial para AGOTADO
  if (sheetName === CONFIG.sheetNames.agotado) {
    // Validar campos requeridos
    if (!data.codigo || !data.producto) {
      throw new Error('Debes indicar el codigo y nombre del producto.');
    }
    // Usar fecha proporcionada o actual
    const fecha = data.fecha ? String(data.fecha).trim() : buildTimestamp_();
    const row = [fecha, String(data.codigo).trim(), String(data.producto).trim()];
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, 1, row.length).setValues([row]);
    return {
      sheet: sheetName,
      rowInserted: startRow,
      rowsInserted: 1,
      values: [row],
    };
  }

  // Lógica original para los demás módulos
  validateRequired_(data, ['hoja_destino', 'responsable']);
  const items = normalizeItems_(data);
  if (!items.length) {
    throw new Error('Debes incluir al menos un producto con cantidad.');
  }
  const fecha = buildTimestamp_();
  const responsable = resolveResponsable_(data.responsable);
  const observaciones = String(data.observaciones || '').trim();
  const motivo = sheetName === CONFIG.sheetNames.salidas ? resolveMotivoSalida_(data.motivo_salida) : '';
  const rows = items.map((item, index) => {
    const catalogProduct = findProductByCode_(item.codigo, sheetName);
    if (!catalogProduct) {
      throw new Error('El codigo del item ' + (index + 1) + ' no existe en la hoja PRODUCTOS.');
    }
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad del item ' + (index + 1) + ' debe ser un numero entero mayor a cero.');
    }
    if (requiresFechaElaboracion_(sheetName)) {
      const fechaElaboracion = parseFechaElaboracion_(item.fechaElaboracion, index);
      return [fecha, catalogProduct.codigo, catalogProduct.producto, cantidad, fechaElaboracion, responsable, observaciones];
    }
    if (sheetName === CONFIG.sheetNames.salidas) {
      return [fecha, catalogProduct.codigo, catalogProduct.producto, cantidad, responsable, observaciones, motivo];
    }
    return [fecha, catalogProduct.codigo, catalogProduct.producto, cantidad, responsable, observaciones];
  });
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  applyFechaFormat_(sheet, startRow, rows.length);
  if (requiresFechaElaboracion_(sheetName)) {
    applyFechaElaboracionFormat_(sheet, startRow, rows.length);
  }
  return {
    sheet: sheetName,
    rowInserted: startRow + rows.length - 1,
    rowsInserted: rows.length,
    values: rows,
  };
}

function getCatalogs_() {
  return {
    products: readProducts_(),
    motivosSalida: readMotivosSalida_(),
  };
}

function LIMPIAR_COPIA_LM() {
  const ss = getSpreadsheet_();
  const registerSheets = [
    CONFIG.sheetNames.inventarioInicial,
    CONFIG.sheetNames.recibido,
    CONFIG.sheetNames.salidas,
    CONFIG.sheetNames.inventarioCierre,
    CONFIG.sheetNames.agotado,
  ];

  registerSheets.forEach((sheetName) => {
    const sheet = getOrCreateSheet_(sheetName);
    ensureHeaders_(sheet, getHeadersForSheet_(sheetName));

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow > 1 && lastColumn > 0) {
      sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
    }
  });

  const sedesSheet = ss.getSheetByName('SEDES');
  if (sedesSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(sedesSheet);
  }

  return 'Copia LM limpia: registros borrados y estructura sin SEDE.';
}

function readProducts_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetNames.productos);
  if (!sheet) {
    throw new Error('No se encontro la hoja PRODUCTOS.');
  }

  const values = sheet.getDataRange().getValues();
  return values
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      codigo: String(row[0]).trim(),
      producto: String(row[1]).trim(),
      unidadPrimaria: String(row[2] || '').trim(),
      familia: String(row[3] || '').trim(),
    }));
}

function readMotivosSalida_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.sheetNames.motivosSalida);
  if (!sheet) {
    throw new Error('No se encontro la hoja MOTIVOS SALIDA.');
  }

  return sheet.getDataRange().getValues()
    .slice(1)
    .map((row) => String(row[0] || '').trim())
    .filter(Boolean);
}

function findProductByCode_(rawCode, sheetName) {
  const normalizedCode = normalizeText_(rawCode);
  const catalogProduct = readProducts_().find((item) => normalizeText_(item.codigo) === normalizedCode);
  if (catalogProduct) return catalogProduct;

  if (requiresFechaElaboracion_(sheetName)) {
    return CONFIG.extraProductsByInitialAndClosing.find((item) => normalizeText_(item.codigo) === normalizedCode) || null;
  }

  return null;
}

function normalizeItems_(data) {
  if (Array.isArray(data.items)) {
    return data.items.map((item) => ({
      codigo: String(item?.codigo || '').trim(),
      cantidad: item?.cantidad,
      fechaElaboracion: item?.fecha_elaboracion || item?.fechaElaboracion || '',
    })).filter((item) => item.codigo !== '');
  }

  if (data.codigo || data.cantidad) {
    return [{
      codigo: String(data.codigo || '').trim(),
      cantidad: data.cantidad,
      fechaElaboracion: data.fecha_elaboracion || data.fechaElaboracion || '',
    }];
  }

  return [];
}

function resolveSheetName_(rawName) {
  const normalized = normalizeText_(rawName);
  const map = {
    [normalizeText_(CONFIG.sheetNames.inventarioInicial)]: CONFIG.sheetNames.inventarioInicial,
    [normalizeText_(CONFIG.sheetNames.recibido)]: CONFIG.sheetNames.recibido,
    [normalizeText_(CONFIG.sheetNames.salidas)]: CONFIG.sheetNames.salidas,
    [normalizeText_(CONFIG.sheetNames.inventarioCierre)]: CONFIG.sheetNames.inventarioCierre,
    [normalizeText_(CONFIG.sheetNames.agotado)]: CONFIG.sheetNames.agotado,
  };
  if (!map[normalized]) {
    throw new Error('Hoja destino no valida: ' + rawName);
  }
  return map[normalized];
}

function resolveMotivoSalida_(rawValue) {
  const motivo = String(rawValue || '').trim();
  if (!motivo) {
    throw new Error('Para SALIDAS debes indicar el motivo de salida.');
  }

  const validMotivos = readMotivosSalida_().map(normalizeText_);
  if (!validMotivos.includes(normalizeText_(motivo))) {
    throw new Error('El motivo de salida no existe en la hoja MOTIVOS SALIDA.');
  }

  return motivo;
}

function resolveResponsable_(rawValue) {
  const responsable = String(rawValue || '').trim();
  if (!responsable) {
    throw new Error('Debes seleccionar un responsable.');
  }

  const validResponsables = CONFIG.responsables.map(normalizeText_);
  if (!validResponsables.includes(normalizeText_(responsable))) {
    throw new Error('El responsable no esta autorizado para Gestion de Tienda LM.');
  }

  return responsable;
}

function requiresFechaElaboracion_(sheetName) {
  return sheetName === CONFIG.sheetNames.inventarioInicial || sheetName === CONFIG.sheetNames.inventarioCierre;
}

function parseFechaElaboracion_(rawValue, index) {
  const value = String(rawValue || '').trim();
  if (!value) {
    throw new Error('La fecha de elaboracion del item ' + (index + 1) + ' es obligatoria.');
  }

  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  match = value.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (match) {
    return new Date(2000 + Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  throw new Error('La fecha de elaboracion del item ' + (index + 1) + ' debe tener formato DD/MM/AA.');
}

function getOrCreateSheet_(sheetName) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function getHeadersForSheet_(sheetName) {
  if (requiresFechaElaboracion_(sheetName)) return CONFIG.headers.conFechaElaboracion;
  if (sheetName === CONFIG.sheetNames.salidas) return CONFIG.headers.salidas;
  if (sheetName === CONFIG.sheetNames.agotado) return CONFIG.headers.agotado;
  return CONFIG.headers.base;
}

function ensureHeaders_(sheet, headers) {
  removeDeprecatedHeaders_(sheet, CONFIG.deprecatedHeaders || []);

  const expected = headers.map((value) => String(value || '').trim().toUpperCase());
  const currentLastColumn = Math.max(sheet.getLastColumn(), headers.length);
  let current = sheet.getRange(1, 1, 1, currentLastColumn).getValues()[0].map((value) => String(value || '').trim().toUpperCase());

  headers.forEach((header, expectedIndex) => {
    const expectedHeader = expected[expectedIndex];
    const currentIndex = current.indexOf(expectedHeader);
    if (currentIndex === expectedIndex) return;

    if (currentIndex === -1) {
      sheet.insertColumnBefore(expectedIndex + 1);
    } else {
      sheet.moveColumns(sheet.getRange(1, currentIndex + 1, Math.max(sheet.getMaxRows(), 1), 1), expectedIndex + 1);
    }

    current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0].map((value) => String(value || '').trim().toUpperCase());
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function removeDeprecatedHeaders_(sheet, deprecatedHeaders) {
  if (!sheet || !deprecatedHeaders.length || sheet.getLastColumn() < 1) return;

  const deprecated = deprecatedHeaders.map(normalizeText_);
  const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (let index = current.length - 1; index >= 0; index--) {
    if (deprecated.includes(normalizeText_(current[index]))) {
      sheet.deleteColumn(index + 1);
    }
  }
}

function validateRequired_(payload, fields) {
  fields.forEach((field) => {
    const value = payload[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error('El campo ' + field + ' es obligatorio.');
    }
  });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Cuerpo POST vacio.');
  }

  const raw = String(e.postData.contents).trim();
  if (!raw) {
    throw new Error('Cuerpo POST vacio.');
  }

  if (raw.charAt(0) !== '{' && raw.indexOf('=') !== -1) {
    const params = parseFormUrlEncoded_(raw);
    if (params.payload) {
      return {
        action: params.action || '',
        payload: JSON.parse(String(params.payload)),
      };
    }
    return params;
  }

  return JSON.parse(raw);
}

function parseFormUrlEncoded_(raw) {
  const result = {};
  raw.split('&').forEach((part) => {
    if (!part) return;
    const pair = part.split('=');
    const key = decodeURIComponent((pair[0] || '').replace(/\+/g, ' ')).trim();
    const value = decodeURIComponent((pair.slice(1).join('=') || '').replace(/\+/g, ' '));
    if (key) {
      result[key] = value;
    }
  });
  return result;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.spreadsheetId);
}

function jsonResponse_(success, data, message) {
  return ContentService.createTextOutput(JSON.stringify({ success, data, message })).setMimeType(ContentService.MimeType.JSON);
}

function normalizeText_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeError_(error) {
  return String(error && error.message ? error.message : error || 'Error interno de Apps Script.');
}

function buildTimestamp_() {
  return new Date();
}

function applyFechaFormat_(sheet, startRow, rowCount) {
  if (!sheet || !startRow || !rowCount) return;
  try {
    sheet.getRange(startRow, 1, rowCount, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  } catch (error) {
    // Some Sheets have typed columns that reject setNumberFormat.
    // Ignore to avoid blocking record writes.
    Logger.log('No se pudo aplicar formato FECHA: ' + error);
  }
}

function applyFechaElaboracionFormat_(sheet, startRow, rowCount) {
  if (!sheet || !startRow || !rowCount) return;
  try {
    sheet.getRange(startRow, 5, rowCount, 1).setNumberFormat('dd/MM/yy');
  } catch (error) {
    Logger.log('No se pudo aplicar formato FECHA DE ELABORACION: ' + error);
  }
}
