'use strict';

const CURRENT_APPS_SCRIPT_URL = '';
const APPS_SCRIPT_URL = String(window.APPS_SCRIPT_URL || CURRENT_APPS_SCRIPT_URL || '').trim();
const APPS_SCRIPT_PROXY_URL = '/api/apps-script';
const INITIAL_AND_CLOSING_EXTRA_PRODUCTS = [
  { codigo: 'UTEN001', producto: 'Cucharilla' },
  { codigo: 'UTEN002', producto: 'Tenedor' },
  { codigo: 'UTEN003', producto: 'Cuchillo' },
];

const state = {
  products: [],
  motivosSalida: [],
  activeModule: 'Inventario Inicial',
  items: [],
};

const elements = {
  envWarning: document.getElementById('env-warning'),
  form: document.getElementById('inventory-form'),
  submitButton: null,
  fechaDisplay: document.getElementById('fecha-display'),
  productosList: document.getElementById('listaProductos'),
  lineProducto: document.getElementById('line-producto'),
  lineCantidad: document.getElementById('line-cantidad'),
  lineFechaElaboracion: document.getElementById('line-fecha-elaboracion'),
  lineFechaElaboracionField: document.getElementById('line-fecha-elaboracion-field'),
  addItemBtn: document.getElementById('add-item'),
  itemsBody: document.getElementById('items-body'),
  itemsWrap: document.getElementById('items-wrap'),
  itemsEmpty: document.getElementById('items-empty'),
  itemsFechaElaboracionHeader: document.getElementById('items-fecha-elaboracion-header'),
  motivoBox: document.getElementById('contenedor-motivo'),
  motivoSelect: document.getElementById('motivo'),
  motivoOtroInput: document.getElementById('motivo-otro'),
  toast: document.getElementById('toast'),
  standbyOverlay: document.getElementById('standby-overlay'),
  standbyMessage: document.getElementById('standby-message'),
  moduleTitle: document.getElementById('module-title'),
  moduleButtons: {
    'btn-inicial': document.getElementById('btn-inicial'),
    'btn-recibido': document.getElementById('btn-recibido'),
    'btn-salidas': document.getElementById('btn-salidas'),
    'btn-cierre': document.getElementById('btn-cierre'),
    'btn-agotado': document.getElementById('btn-agotado'),
  },
  formInventario: document.getElementById('form-inventario'),
  formAgotado: document.getElementById('form-agotado'),
  agotadoFecha: document.getElementById('agotado-fecha'),
  agotadoProducto: document.getElementById('agotado-producto'),
};

elements.submitButton = elements.form ? elements.form.querySelector('button[type="submit"]') : null;

init();

function init() {
  setupModuleButtons();
  setupMotivoField();
  setupItems();
  setupForm();
  startDateClock();
  toggleEnvWarning(!APPS_SCRIPT_URL);
  fetchCatalogs();
  updateModuleTitle();
  updateFechaElaboracionVisibility();
}

function setupModuleButtons() {
  Object.entries(elements.moduleButtons).forEach(([buttonId, button]) => {
    if (!button) return;
    button.addEventListener('click', () => {
      const moduleName = {
        'btn-inicial': 'Inventario Inicial',
        'btn-recibido': 'Recibido',
        'btn-salidas': 'Salidas',
        'btn-cierre': 'Inventario Cierre',
        'btn-agotado': 'Agotado',
      }[buttonId];

      state.activeModule = moduleName;
      setActiveButton(buttonId);
      updateModuleTitle();
      clearItems();
      updateFechaElaboracionVisibility();
      renderProductOptions();

      // Mostrar/ocultar formularios según módulo
      if (elements.formInventario) elements.formInventario.classList.toggle('hidden', moduleName === 'Agotado');
      if (elements.formAgotado) elements.formAgotado.classList.toggle('hidden', moduleName !== 'Agotado');

      // Mostrar/ocultar items y motivo solo si no es Agotado
      const itemsCard = document.querySelector('.items-card');
      if (itemsCard) itemsCard.classList.toggle('hidden', moduleName === 'Agotado');
      if (moduleName === 'Salidas') {
        showMotivoBox();
      } else {
        hideMotivoBox();
      }
    });
  });
}

function setActiveButton(activeId) {
  Object.entries(elements.moduleButtons).forEach(([buttonId, button]) => {
    if (!button) return;
    button.classList.toggle('active', buttonId === activeId);
  });
}

function setupMotivoField() {
  if (!elements.motivoSelect) return;
  elements.motivoSelect.addEventListener('change', () => {
    const isOther = elements.motivoSelect.value === 'Otro';
    if (!elements.motivoOtroInput) return;
    elements.motivoOtroInput.classList.toggle('hidden', !isOther);
    elements.motivoOtroInput.required = isOther;
    if (!isOther) {
      elements.motivoOtroInput.value = '';
    }
  });
}

function setupItems() {
  elements.addItemBtn?.addEventListener('click', addItem);

  elements.itemsBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-item]');
    if (!button) return;
    const itemId = String(button.dataset.removeItem || '');
    state.items = state.items.filter((item) => item.id !== itemId);
    renderItems();
  });
}

function addItem() {
  const parsedProduct = resolveProduct(elements.lineProducto?.value);
  if (!parsedProduct) {
    showToast('Selecciona un producto valido del catalogo.', 'error');
    return;
  }

  const quantity = Number(elements.lineCantidad?.value || '');
  if (!Number.isInteger(quantity) || quantity <= 0) {
    showToast('La cantidad debe ser un numero entero mayor a cero.', 'error');
    return;
  }

  const requiresFechaElaboracion = isFechaElaboracionRequiredModule(state.activeModule);
  const fechaElaboracion = String(elements.lineFechaElaboracion?.value || '').trim();
  if (requiresFechaElaboracion && !fechaElaboracion) {
    showToast('La fecha de elaboracion es obligatoria.', 'error');
    return;
  }

  state.items.push({
    id: createLineItemId(),
    codigo: parsedProduct.codigo,
    producto: parsedProduct.producto,
    cantidad: quantity,
    fechaElaboracion: requiresFechaElaboracion ? fechaElaboracion : '',
  });

  renderItems();
  if (elements.lineProducto) elements.lineProducto.value = '';
  if (elements.lineCantidad) elements.lineCantidad.value = '';
  if (elements.lineFechaElaboracion) elements.lineFechaElaboracion.value = '';
}

function renderItems() {
  if (!elements.itemsBody || !elements.itemsWrap || !elements.itemsEmpty) return;
  const showFechaElaboracion = isFechaElaboracionRequiredModule(state.activeModule);
  elements.itemsFechaElaboracionHeader?.classList.toggle('hidden', !showFechaElaboracion);

  if (!state.items.length) {
    elements.itemsBody.innerHTML = '';
    elements.itemsWrap.classList.add('hidden');
    elements.itemsEmpty.classList.remove('hidden');
    return;
  }

  elements.itemsBody.innerHTML = state.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.codigo)}</td>
      <td>${escapeHtml(item.producto)}</td>
      <td>${escapeHtml(item.cantidad)}</td>
      ${showFechaElaboracion ? `<td>${escapeHtml(formatDateForDisplay(item.fechaElaboracion))}</td>` : ''}
      <td><button type="button" class="btn btn--small" data-remove-item="${escapeHtml(item.id)}">Quitar</button></td>
    </tr>
  `).join('');

  elements.itemsWrap.classList.remove('hidden');
  elements.itemsEmpty.classList.add('hidden');
}

function clearItems() {
  state.items = [];
  renderItems();
}

function setupForm() {
  if (!elements.form) return;

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.activeModule) {
      showToast('Selecciona un modulo.', 'error');
      return;
    }

    // Lógica para AGOTADO
    if (state.activeModule === 'Agotado') {
      const productoRaw = elements.agotadoProducto?.value || '';
      const parsedProduct = resolveProduct(productoRaw);
      if (!parsedProduct) {
        showToast('Selecciona un producto válido del catálogo.', 'error');
        return;
      }
      const payload = {
        hoja_destino: mapSheetName(state.activeModule),
        tipo_movimiento: state.activeModule,
        codigo: parsedProduct.codigo,
        producto: parsedProduct.producto,
        fecha: elements.agotadoFecha?.value || '',
      };

      toggleLoading(true, 'Guardando...');
      showStandby('Cargando...');
      try {
        const result = await postData(payload);
        if (!result || result.success === false) {
          throw new Error(result?.message || 'No se pudo guardar el registro.');
        }
        showToast('Registro guardado correctamente.', 'success');
        elements.form.reset();
        if (elements.agotadoProducto) elements.agotadoProducto.value = '';
        startDateClock();
      } catch (error) {
        showToast(error.message || 'No se pudo guardar el registro.', 'error');
      } finally {
        hideStandby();
        toggleLoading(false, 'Guardar Registro');
      }
      return;
    }

    // Lógica para los otros módulos
    if (!state.items.length) {
      showToast('Agrega al menos un producto al registro.', 'error');
      return;
    }

    const formData = new FormData(elements.form);
    const motivoSalida = resolveMotivoSalida(formData);
    if (state.activeModule === 'Salidas' && !motivoSalida) {
      showToast('Selecciona un motivo de salida.', 'error');
      return;
    }

    const payload = {
      hoja_destino: mapSheetName(state.activeModule),
      tipo_movimiento: state.activeModule,
      responsable: String(formData.get('responsable') || '').trim(),
      observaciones: String(formData.get('observaciones') || '').trim(),
      motivo_salida: motivoSalida,
      items: state.items.map((item) => ({
        codigo: item.codigo,
        cantidad: item.cantidad,
        fecha_elaboracion: item.fechaElaboracion,
      })),
    };

    if (!payload.responsable) {
      showToast('Completa los campos obligatorios.', 'error');
      return;
    }

    toggleLoading(true, 'Guardando...');
    showStandby('Cargando...');
    try {
      const result = await postData(payload);
      if (!result || result.success === false) {
        throw new Error(result?.message || 'No se pudo guardar el registro.');
      }

      showToast('Registro guardado correctamente.', 'success');
      elements.form.reset();
      clearItems();
      hideMotivoBox();
      state.activeModule = 'Inventario Inicial';
      setActiveButton('btn-inicial');
      updateModuleTitle();
      renderProductOptions();
      if (elements.motivoSelect) elements.motivoSelect.value = '';
      if (elements.motivoOtroInput) {
        elements.motivoOtroInput.value = '';
        elements.motivoOtroInput.classList.add('hidden');
        elements.motivoOtroInput.required = false;
      }
      startDateClock();
    } catch (error) {
      showToast(error.message || 'No se pudo guardar el registro.', 'error');
    } finally {
      hideStandby();
      toggleLoading(false, 'Guardar Registro');
    }
  });
}

function updateModuleTitle() {
  const el = elements.moduleTitle;
  if (!el) return;
  el.textContent = `Las Mercedes - Modulo: ${state.activeModule || 'Inventario Inicial'}`;
  // Actualizar fecha en formulario de Agotado
  if (elements.agotadoFecha) {
    elements.agotadoFecha.value = getCurrentDateTimeString();
  }
}

function updateFechaElaboracionVisibility() {
  const required = isFechaElaboracionRequiredModule(state.activeModule);
  elements.lineFechaElaboracionField?.classList.toggle('hidden', !required);
  elements.itemsFechaElaboracionHeader?.classList.toggle('hidden', !required);
  if (elements.lineFechaElaboracion) {
    elements.lineFechaElaboracion.required = required;
    if (!required) elements.lineFechaElaboracion.value = '';
  }
}

function isFechaElaboracionRequiredModule(moduleName) {
  return moduleName === 'Inventario Inicial' || moduleName === 'Inventario Cierre';
}

function formatDateForDisplay(rawValue) {
  const value = String(rawValue || '').trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1].slice(-2)}`;
}

function getCurrentDateTimeString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function mapSheetName(moduleName) {
  return {
    'Inventario Inicial': 'INVENTARIO INICIAL',
    'Recibido': 'RECIBIDO',
    'Salidas': 'SALIDAS',
    'Inventario Cierre': 'INVENTARIO CIERRE',
    'Agotado': 'AGOTADO',
  }[moduleName] || 'INVENTARIO INICIAL';
}

function resolveProduct(rawValue) {
  const value = normalizeText(rawValue);
  if (!value) return null;

  const fromCatalog = getAvailableProducts().find((item) => {
    const byCode = normalizeText(item.codigo);
    const byLabel = normalizeText(`${item.codigo} ${item.producto}`);
    const byName = normalizeText(item.producto);
    return value === byCode || value === byLabel || value === byName;
  });

  return fromCatalog || null;
}

function resolveMotivoSalida(formData) {
  if (state.activeModule !== 'Salidas') return '';
  const motive = String(formData.get('motivo') || '').trim();
  if (motive === 'Otro') {
    return String(formData.get('motivo-otro') || '').trim();
  }
  return motive;
}

function hideMotivoBox() {
  if (elements.motivoBox) elements.motivoBox.classList.add('hidden');
}

function showMotivoBox() {
  if (elements.motivoBox) elements.motivoBox.classList.remove('hidden');
}

function toggleEnvWarning(show) {
  if (!elements.envWarning) return;
  elements.envWarning.classList.toggle('hidden', !show);
}

function startDateClock() {
  updateDateDisplay();
  window.clearInterval(startDateClock.timer);
  startDateClock.timer = window.setInterval(updateDateDisplay, 30000);
}

function updateDateDisplay() {
  if (!elements.fechaDisplay) return;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  elements.fechaDisplay.value = `${day}/${month}/${year} ${hours}:${minutes}`;
}

async function fetchCatalogs() {
  if (!APPS_SCRIPT_URL) return;

  try {
    const response = await fetch(`${APPS_SCRIPT_PROXY_URL}?target=${encodeURIComponent(APPS_SCRIPT_URL)}&action=getCatalogs`, {
      cache: 'no-store',
    });
    const data = await readJsonResponse(response);
    if (!data.success) {
      throw new Error(data.message || 'No se pudieron cargar los catalogos.');
    }

    state.products = Array.isArray(data.data?.products) ? data.data.products : [];
    state.motivosSalida = Array.isArray(data.data?.motivosSalida) ? data.data.motivosSalida : [];

    renderProductOptions();
    renderMotivosOptions();
  } catch (error) {
    if (isDeprecatedSedesCatalogError(error)) return;
    showToast(error.message || 'No se pudieron sincronizar los catalogos.', 'error');
  }
}

function isDeprecatedSedesCatalogError(error) {
  return normalizeText(error?.message).includes('no se encontro la hoja sedes');
}

function renderProductOptions() {
  if (!elements.productosList) return;
  elements.productosList.innerHTML = getAvailableProducts().map((item) => {
    const label = `${item.codigo} ${item.producto}`.trim();
    return `<option value="${escapeHtml(label)}"></option>`;
  }).join('');
}

function getAvailableProducts() {
  if (!isInitialOrClosingModule(state.activeModule)) return state.products;
  return [...state.products, ...INITIAL_AND_CLOSING_EXTRA_PRODUCTS];
}

function isInitialOrClosingModule(moduleName) {
  return moduleName === 'Inventario Inicial' || moduleName === 'Inventario Cierre';
}

function renderMotivosOptions() {
  if (!elements.motivoSelect) return;

  const options = ['<option value="" disabled selected>Seleccione un motivo...</option>'];
  state.motivosSalida.forEach((motivo) => {
    options.push(`<option value="${escapeHtml(motivo)}">${escapeHtml(motivo)}</option>`);
  });
  options.push('<option value="Otro">Otro...</option>');
  elements.motivoSelect.innerHTML = options.join('');
}

async function postData(payload) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('Configura la URL del Apps Script en config.js.');
  }

  const response = await fetch(`${APPS_SCRIPT_PROXY_URL}?target=${encodeURIComponent(APPS_SCRIPT_URL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'guardarRegistro', payload }),
  });

  return readJsonResponse(response);
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text.trim()) {
    return { success: response.ok };
  }

  try {
    return JSON.parse(text);
  } catch {
    const normalized = text.toLowerCase();
    const looksLikeHtml = normalized.includes('<!doctype html') || normalized.includes('<html');
    const typedColumnFormatError = normalized.includes('number format of cells in a typed column');

    // Google Apps Script a veces responde HTML aun cuando el registro ya se guardo.
    if (response.ok && (typedColumnFormatError || looksLikeHtml)) {
      return {
        success: true,
        message: 'Registro guardado correctamente.',
      };
    }

    throw new Error(text);
  }
}

function showStandby(message) {
  if (elements.standbyMessage) elements.standbyMessage.textContent = message;
  elements.standbyOverlay?.classList.remove('hidden');
  document.body.classList.add('is-busy');
}

function hideStandby() {
  elements.standbyOverlay?.classList.add('hidden');
  document.body.classList.remove('is-busy');
}

function toggleLoading(isLoading, label) {
  if (!elements.submitButton) return;
  elements.submitButton.disabled = Boolean(isLoading);
  elements.submitButton.textContent = label;
}

function showToast(message, type) {
  if (!elements.toast) {
    alert(message);
    return;
  }
  elements.toast.textContent = message;
  elements.toast.className = `toast toast--show toast--${type || 'info'}`;
  window.clearTimeout(showToast.timerId);
  showToast.timerId = window.setTimeout(() => {
    elements.toast.className = 'toast';
  }, 3200);
}

function createLineItemId() {
  return `itm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
