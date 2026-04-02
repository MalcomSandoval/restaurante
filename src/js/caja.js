// =====================================================
// CAJA.JS - Lógica del portal de Caja & Facturación
// =====================================================

import '../css/styles.css'
import {
  checkRoleAuth, verifyPin, logout,
  getAllOrders, updateOrderStatus, updateOrderPayment,
  showToast, startPolling, formatTime, timeAgo
} from './app.js'
import {
  formatCOP, calcTax, calcTotal, RESTAURANT_NAME, TRANSFER_INFO
} from './menu-data.js'

let currentTab = 'pendientes'
let pollingInterval = null
let currentOrderId = null
let currentPayMethod = null

// =====================================================
// LOGIN
// =====================================================
window.loginCaja = function () {
  const pin = document.getElementById('pin-input').value
  if (verifyPin('caja', pin)) {
    document.getElementById('login-screen').classList.add('hidden')
    document.getElementById('caja-dashboard').classList.remove('hidden')
    initCaja()
  } else {
    showToast('PIN incorrecto', 'error')
    document.getElementById('pin-input').value = ''
  }
}

window.logoutCaja = function () {
  logout('caja')
  window.location.reload()
}

// =====================================================
// INIT
// =====================================================
function initCaja() {
  const now = new Date()
  document.getElementById('caja-date').textContent =
    now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  renderOrders()
  updateDayStats()
  pollingInterval = startPolling(() => {
    renderOrders()
    updateDayStats()
  }, 2500)
}

// =====================================================
// TABS
// =====================================================
window.setTab = function (tab, btn) {
  currentTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  renderOrders()
}

// =====================================================
// FILTRAR PEDIDOS POR TAB
// =====================================================
function getOrdersForTab() {
  const all = getAllOrders()
  const today = new Date().toDateString()

  const isToday = o => new Date(o.created_at).toDateString() === today

  switch (currentTab) {
    case 'pendientes':
      // Pedidos listos para cobrar (entregando o completado sin pagar)
      return all.filter(o =>
        ['entregando', 'en_espera', 'en_proceso'].includes(o.status) ||
        (o.status === 'completado' && !o.pago?.pagado)
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    case 'pagados':
      return all.filter(o =>
        o.pago?.pagado && isToday(o)
      ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

    case 'transferencias':
      return all.filter(o =>
        o.pago?.metodo === 'transferencia' && isToday(o)
      ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    default: return []
  }
}

// =====================================================
// RENDER LISTA DE PEDIDOS
// =====================================================
function renderOrders() {
  const orders = getOrdersForTab()
  const list = document.getElementById('caja-orders-list')
  const empty = document.getElementById('caja-empty')

  if (orders.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')

  list.innerHTML = orders.map(order => buildOrderRow(order)).join('')
}

function buildOrderRow(order) {
  const isPagado = order.pago?.pagado
  const isTransfer = order.pago?.metodo === 'transferencia'
  const isTransferPending = isTransfer && !isPagado

  let rowClass = isPagado ? 'pagado' : isTransferPending ? 'transferencia-pendiente' : 'pendiente'

  const statusLabel = {
    en_espera: '⏳ En Espera', en_proceso: '👨‍🍳 En Proceso',
    entregando: '🛎️ Entregando', completado: '✅ Completado', cancelado: '❌ Cancelado'
  }[order.status] || '—'

  const tipoIcon = order.type === 'domicilio' ? '🛵 Domicilio' : `🪑 Mesa #${order.mesa}`

  const actions = isPagado
    ? `<button class="btn btn-outline btn-sm" onclick="openFactura('${order.id}', true)">🖨️ Reimprimir</button>`
    : `
      <button class="btn btn-outline-salmon btn-sm" onclick="openFactura('${order.id}', false)">
        🧾 Facturar
      </button>
      ${isTransfer ? `<button class="btn btn-ghost btn-sm" onclick="openComprobante('${order.id}')">📎 Comprobante</button>` : ''}
    `

  return `
    <div class="pedido-row ${rowClass}">
      <div class="pedido-info">
        <div class="pedido-num">${order.order_number}</div>
        <div class="pedido-meta">
          <span>${tipoIcon}</span>
          <span>${statusLabel}</span>
          <span>🕐 ${formatTime(order.created_at)}</span>
          <span class="badge ${isTransfer ? 'badge-domicilio' : 'badge-mesa'}" style="font-size:0.68rem">
            ${isTransfer ? '📱 Transferencia' : '💵 Efectivo'}
          </span>
          ${isPagado ? '<span class="badge badge-done" style="font-size:0.68rem">✅ Pagado</span>' : ''}
          ${isTransfer && !order.pago?.comprobante && !isPagado
            ? '<span class="badge badge-wait" style="font-size:0.68rem">⚠️ Sin comprobante</span>' : ''}
        </div>
      </div>
      <div class="pedido-total" style="color:${isPagado ? 'var(--status-done)' : 'var(--salmon)'}">
        ${formatCOP(order.total)}
      </div>
      <div class="pedido-actions">${actions}</div>
    </div>
  `
}

// =====================================================
// MODAL FACTURA Y COBRO
// =====================================================
window.openFactura = function (orderId, readOnly = false) {
  currentOrderId = orderId
  currentPayMethod = null
  const order = getAllOrders().find(o => o.id === orderId)
  if (!order) return

  const content = document.getElementById('factura-content')
  content.innerHTML = buildFacturaHTML(order, readOnly)
  document.getElementById('factura-modal').classList.add('active')
}

window.closeFactura = function () {
  document.getElementById('factura-modal').classList.remove('active')
  currentOrderId = null
  currentPayMethod = null
}

function buildFacturaHTML(order, readOnly) {
  const now = new Date()
  const tipoLabel = order.type === 'domicilio' ? 'Domicilio' : `Mesa #${order.mesa}`

  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td>${item.icon || '🍽️'} ${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatCOP(item.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${formatCOP(item.unit_price * item.quantity)}</td>
    </tr>
  `).join('')

  const cobrarSection = readOnly ? `
    <div class="card" style="border-color:var(--status-done);background:rgba(149,224,138,0.08);text-align:center;padding:16px;margin-top:20px">
      <div style="font-size:1.5rem;margin-bottom:4px">✅</div>
      <div style="font-weight:700;color:var(--status-done)">Factura pagada</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">
        ${order.pago?.metodo === 'transferencia' ? '📱 Transferencia bancaria' : '💵 Efectivo'} — ${formatTime(order.updated_at)}
      </div>
    </div>
    <div class="flex gap-12 mt-20 no-print">
      <button class="btn btn-outline btn-full" onclick="closeFactura()">Cerrar</button>
      <button class="btn btn-secondary btn-full" onclick="window.print()">🖨️ Imprimir</button>
    </div>
  ` : `
    <div class="divider"></div>
    <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;margin-bottom:12px" class="no-print">
      💳 Forma de Pago
    </div>
    <div class="cobro-methods no-print">
      <button class="cobro-method-btn" id="btn-efectivo" onclick="selectPayMethod('efectivo')">
        <span class="method-icon">💵</span>
        <span>Efectivo</span>
      </button>
      <button class="cobro-method-btn" id="btn-transferencia" onclick="selectPayMethod('transferencia')">
        <span class="method-icon">📱</span>
        <span>Transferencia</span>
      </button>
    </div>

    <!-- CALCULADORA EFECTIVO -->
    <div id="efectivo-section" class="hidden no-print">
      <div class="efectivo-calc">
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Monto recibido del cliente</label>
          <input type="number" class="form-input" id="monto-recibido"
            placeholder="0" min="0" oninput="calcVuelto(${order.total})" />
        </div>
        <div class="flex justify-between items-center" style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px">
          <span>Total a cobrar:</span>
          <span style="color:var(--text-primary);font-weight:700">${formatCOP(order.total)}</span>
        </div>
        <div class="flex justify-between items-center">
          <span style="font-size:0.85rem;color:var(--text-muted)">Vuelto:</span>
          <span class="vuelto-display" id="vuelto-display">$0</span>
        </div>
      </div>
      <button class="btn btn-primary btn-full btn-lg mt-16" onclick="procesarPago('efectivo', ${order.total})">
        ✅ Confirmar Pago en Efectivo
      </button>
    </div>

    <!-- SECCIÓN TRANSFERENCIA -->
    <div id="transfer-section" class="hidden no-print">
      ${order.pago?.comprobante
        ? `<div class="card-yellow" style="margin-bottom:16px">
            <p style="font-size:0.85rem;font-weight:600;margin-bottom:8px">📎 El cliente adjuntó un comprobante</p>
            <img src="${order.pago.comprobante}" style="max-width:100%;border-radius:var(--radius-md);max-height:220px;object-fit:contain" />
          </div>`
        : `<div class="card" style="border-color:var(--yellow-border);margin-bottom:16px;text-align:center;padding:24px">
            <div style="font-size:2rem">⚠️</div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-top:8px">El cliente aún no ha subido un comprobante de transferencia</p>
          </div>`
      }
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;line-height:1.8">
        <strong style="color:var(--text-secondary)">Datos de la cuenta:</strong><br>
        🏦 ${TRANSFER_INFO.bank} — ${TRANSFER_INFO.account_type}<br>
        📋 Cuenta: <strong>${TRANSFER_INFO.account_number}</strong><br>
        📱 Nequi: <strong>${TRANSFER_INFO.nequi}</strong><br>
        👤 ${TRANSFER_INFO.owner}
      </div>
      <button class="btn btn-secondary btn-full btn-lg" onclick="procesarPago('transferencia', ${order.total})">
        ✅ Verificar y Aprobar Transferencia
      </button>
    </div>

    <div id="no-method-msg" style="text-align:center;color:var(--text-muted);font-size:0.85rem;margin-top:8px" class="no-print">
      Selecciona el método de pago ↑
    </div>

    <div class="flex gap-12 mt-16 no-print">
      <button class="btn btn-ghost btn-full" onclick="closeFactura()">Cancelar</button>
      <button class="btn btn-outline btn-full" onclick="window.print()">🖨️ Imprimir</button>
    </div>
  `

  return `
    <div class="modal-header no-print">
      <h3 style="font-family:var(--font-display)">🧾 Factura de Venta</h3>
      <button class="modal-close" onclick="closeFactura()">✕</button>
    </div>

    <!-- ENCABEZADO FACTURA (IMPRIMIBLE) -->
    <div class="factura-header">
      <div class="factura-logo-print">🍽️</div>
      <div class="factura-title">${RESTAURANT_NAME}</div>
      <div class="factura-subtitle">NIT: ${TRANSFER_INFO.nit}</div>
      <div class="factura-subtitle" style="margin-top:8px;font-size:0.9rem">
        <strong>FACTURA DE VENTA</strong><br>
        No. ${order.order_number}<br>
        ${now.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' })} — ${formatTime(now.toISOString())}<br>
        Tipo: ${tipoLabel}
      </div>
    </div>

    <div class="divider"></div>

    <!-- DATOS CLIENTE (DOMICILIO) -->
    ${order.type === 'domicilio' && order.cliente ? `
      <div style="font-size:0.8rem;margin-bottom:16px;line-height:1.8;color:var(--text-secondary)">
        <strong>Cliente:</strong> ${order.cliente.nombre}<br>
        <strong>Tel:</strong> ${order.cliente.telefono}<br>
        <strong>Dirección:</strong> ${order.cliente.direccion}
      </div>
    ` : ''}

    <!-- TABLA DE ÍTEMS -->
    <table class="factura-table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th style="text-align:center">Cant.</th>
          <th style="text-align:right">V. Unit.</th>
          <th style="text-align:right">V. Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <!-- TOTALES -->
    <div class="factura-totals">
      <div class="factura-total-row">
        <span>Subtotal (sin IVA)</span>
        <span>${formatCOP(order.subtotal)}</span>
      </div>
      <div class="factura-total-row">
        <span>IVA (19%)</span>
        <span>${formatCOP(order.tax)}</span>
      </div>
      <div class="factura-total-row factura-total-final">
        <span>TOTAL</span>
        <span style="color:var(--salmon)">${formatCOP(order.total)}</span>
      </div>
    </div>

    ${order.notes ? `<div class="order-notes mt-16" style="font-size:0.8rem">📝 Nota: ${order.notes}</div>` : ''}

    <p style="font-size:0.7rem;text-align:center;color:var(--text-muted);margin-top:16px">
      Régimen Común · Responsable de IVA · Colombia<br>
      Generado por Sistema Restaurante — Malcom Sandoval
    </p>

    ${cobrarSection}
  `
}

// =====================================================
// SELECCIÓN DE MÉTODO DE PAGO
// =====================================================
window.selectPayMethod = function (method) {
  currentPayMethod = method
  document.getElementById('efectivo-section').classList.toggle('hidden', method !== 'efectivo')
  document.getElementById('transfer-section').classList.toggle('hidden', method !== 'transferencia')
  document.getElementById('no-method-msg').classList.add('hidden')
  document.getElementById('btn-efectivo').classList.toggle('selected', method === 'efectivo')
  document.getElementById('btn-transferencia').classList.toggle('selected', method === 'transferencia')

  // Pre-seleccionar si el cliente ya eligió método
  const order = getAllOrders().find(o => o.id === currentOrderId)
  if (order?.pago?.metodo === 'transferencia' && method === 'transferencia') {
    document.getElementById('btn-transferencia').classList.add('selected')
  }
}

// =====================================================
// CALCULADORA DE VUELTO
// =====================================================
window.calcVuelto = function (total) {
  const monto = parseFloat(document.getElementById('monto-recibido').value) || 0
  const vuelto = Math.max(0, monto - total)
  document.getElementById('vuelto-display').textContent = formatCOP(vuelto)
  document.getElementById('vuelto-display').style.color = vuelto < 0 ? 'var(--salmon)' : 'var(--yellow)'
}

// =====================================================
// PROCESAR PAGO
// =====================================================
window.procesarPago = function (method, total) {
  if (!currentOrderId) return

  let montoRecibido = total
  let vuelto = 0

  if (method === 'efectivo') {
    montoRecibido = parseFloat(document.getElementById('monto-recibido')?.value) || 0
    if (montoRecibido < total) {
      showToast('El monto recibido es menor al total', 'error')
      return
    }
    vuelto = montoRecibido - total
  }

  updateOrderPayment(currentOrderId, {
    metodo: method,
    pagado: true,
    monto_recibido: montoRecibido,
    vuelto: vuelto,
    verificado_en: new Date().toISOString()
  })
  updateOrderStatus(currentOrderId, 'completado')

  closeFactura()
  showToast(`✅ Pago registrado — ${method === 'efectivo' ? `Vuelto: ${formatCOP(vuelto)}` : 'Transferencia verificada'}`, 'success', 5000)
  renderOrders()
  updateDayStats()
}

// =====================================================
// COMPROBANTE
// =====================================================
window.openComprobante = function (orderId) {
  currentOrderId = orderId
  const order = getAllOrders().find(o => o.id === orderId)
  const modal = document.getElementById('comprobante-modal')
  const img = document.getElementById('comprobante-img')
  const noComp = document.getElementById('no-comprobante')

  if (order?.pago?.comprobante) {
    img.src = order.pago.comprobante
    img.classList.remove('hidden')
    noComp.classList.add('hidden')
  } else {
    img.classList.add('hidden')
    noComp.classList.remove('hidden')
  }

  document.getElementById('verify-transfer-btn').onclick = () => {
    procesarPago('transferencia', order.total)
    closeComprobante()
  }

  modal.classList.add('active')
}

window.closeComprobante = function () {
  document.getElementById('comprobante-modal').classList.remove('active')
}

// =====================================================
// ESTADÍSTICAS DEL DÍA
// =====================================================
function updateDayStats() {
  const all = getAllOrders()
  const today = new Date().toDateString()
  const todayOrders = all.filter(o => new Date(o.created_at).toDateString() === today)
  const paid = todayOrders.filter(o => o.pago?.pagado)
  const pending = all.filter(o => !o.pago?.pagado && o.status !== 'cancelado')

  const totalVentas = paid.reduce((s, o) => s + (o.total || 0), 0)
  const totalIVA    = paid.reduce((s, o) => s + (o.tax || 0), 0)

  document.getElementById('stat-ventas').textContent     = formatCOP(totalVentas)
  document.getElementById('stat-cobrados').textContent   = paid.length
  document.getElementById('stat-pendientes').textContent = pending.length
  document.getElementById('stat-iva').textContent        = formatCOP(totalIVA)
}

// =====================================================
// AUTO-LOGIN
// =====================================================
if (checkRoleAuth('caja')) {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('caja-dashboard').classList.remove('hidden')
  initCaja()
}
