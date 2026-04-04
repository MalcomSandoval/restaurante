// =====================================================
// COCINA.JS - Display de cocina con Supabase Realtime
// =====================================================

import '../css/styles.css'
import {
  checkRoleAuth, verifyPin, logout,
  getAllOrders, getAllOrdersSync, updateOrderStatus,
  showToast, playNotificationSound, subscribeToOrders,
  timeAgo, formatTime
} from './app.js'
import { formatCOP, RESTAURANT_NAME } from './menu-data.js'

let currentFilter = 'activos'
let unsubscribe = null
let knownOrderIds = new Set()

// =====================================================
// LOGIN
// =====================================================
window.loginCocina = function() {
  const pin = document.getElementById('pin-input').value
  if (verifyPin('cocina', pin)) {
    document.getElementById('login-screen').classList.add('hidden')
    document.getElementById('cocina-dashboard').classList.remove('hidden')
    initDashboard()
  } else {
    showToast('PIN incorrecto', 'error')
    document.getElementById('pin-input').value = ''
    document.getElementById('pin-input').style.borderColor = 'var(--salmon)'
    setTimeout(() => document.getElementById('pin-input').style.borderColor = '', 1500)
  }
}

window.logoutCocina = function() {
  if (unsubscribe) unsubscribe()
  logout('cocina')
  window.location.reload()
}

// =====================================================
// INICIALIZAR DASHBOARD
// =====================================================
async function initDashboard() {
  updateClock()
  setInterval(updateClock, 1000)

  // Carga inicial para marcar IDs ya conocidos
  const initial = await getAllOrders()
  initial.forEach(o => knownOrderIds.add(o.id))

  renderOrders(initial)
  updateStats(initial)

  // Suscribir a cambios en tiempo real
  unsubscribe = subscribeToOrders((orders) => {
    checkNewOrders(orders)
    renderOrders(orders)
    updateStats(orders)
  })
}

function updateClock() {
  const el = document.getElementById('cocina-time')
  if (el) {
    el.textContent = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }
}

// =====================================================
// DETECTAR NUEVOS PEDIDOS
// =====================================================
function checkNewOrders(orders) {
  orders.forEach(order => {
    if (!knownOrderIds.has(order.id)) {
      knownOrderIds.add(order.id)
      playNotificationSound()
      showToast(`🆕 Nuevo pedido ${order.order_number} — ${order.type === 'domicilio' ? 'Domicilio' : `Mesa ${order.mesa}`}`, 'info', 5000)
    }
  })
}

// =====================================================
// FILTROS
// =====================================================
window.setFilter = function(filter, btn) {
  currentFilter = filter
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  renderOrders(getAllOrdersSync())
}

function getFilteredOrders(all) {
  const sorted = [...all].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  switch (currentFilter) {
    case 'activos':
      return sorted.filter(o => ['en_espera', 'en_proceso', 'entregando'].includes(o.status))
    case 'completado':
      return sorted.filter(o => o.status === 'completado').slice(-20).reverse()
    default:
      return sorted.filter(o => o.status === currentFilter)
  }
}

// =====================================================
// RENDER PEDIDOS
// =====================================================
function renderOrders(allOrders) {
  const orders = getFilteredOrders(allOrders || getAllOrdersSync())
  const grid = document.getElementById('orders-grid')
  const empty = document.getElementById('empty-orders')

  if (orders.length === 0) {
    grid.innerHTML = ''
    empty.classList.remove('hidden')
    return
  }

  empty.classList.add('hidden')

  const newIds = new Set(orders.map(o => o.id))

  // Eliminar tarjetas que ya no aplican al filtro
  grid.querySelectorAll('[data-order-id]').forEach(el => {
    if (!newIds.has(el.dataset.orderId)) el.remove()
  })

  orders.forEach(order => {
    const existing = grid.querySelector(`[data-order-id="${order.id}"]`)
    const html = buildOrderCard(order)

    if (existing) {
      if (existing.dataset.status !== order.status) {
        existing.outerHTML = html
      }
    } else {
      grid.insertAdjacentHTML('beforeend', html)
    }
  })
}

function buildOrderCard(order) {
  const statusLabels = {
    en_espera:  { badge: 'badge-wait',    label: '⏳ En Espera' },
    en_proceso: { badge: 'badge-process', label: '👨‍🍳 En Proceso' },
    entregando: { badge: 'badge-deliver', label: '🛎️ Entregando' },
    completado: { badge: 'badge-done',    label: '✅ Completado' },
  }
  const s = statusLabels[order.status] || statusLabels.en_espera

  const tipoLabel = order.type === 'domicilio'
    ? `<span class="badge badge-domicilio">🛵 Domicilio</span>`
    : `<span class="badge badge-mesa">🪑 Mesa #${order.mesa}</span>`

  const itemsHtml = (order.items || []).map(item => `
    <div class="order-item-row">
      <span class="order-item-qty">×${item.quantity}</span>
      <span>${item.icon || '🍽️'} ${item.name}</span>
      ${item.notes ? `<span style="color:var(--text-muted);font-size:0.75rem">— ${item.notes}</span>` : ''}
    </div>
  `).join('')

  const notesHtml = order.notes
    ? `<div class="order-notes">📝 ${order.notes}</div>` : ''

  const isEspera   = order.status === 'en_espera'
  const isProceso  = order.status === 'en_proceso'
  const isEntrega  = order.status === 'entregando'
  const isDone     = order.status === 'completado'

  const elapsed = timeAgo(order.created_at)
  const isUrgent = getMinutesAgo(order.created_at) > 15

  const statusBtns = isDone ? `
    <div style="font-size:0.8rem;color:var(--status-done);text-align:center;padding:8px">
      ✅ Pedido completado — ${formatTime(order.updated_at)}
    </div>
  ` : `
    <div class="status-buttons">
      <button class="status-btn ${isEspera ? 'active-espera' : ''}"
        onclick="changeStatus('${order.id}', 'en_espera')">⏳ En Espera</button>
      <button class="status-btn ${isProceso ? 'active-proceso' : ''}"
        onclick="changeStatus('${order.id}', 'en_proceso')">👨‍🍳 En Proceso</button>
      <button class="status-btn ${isEntrega ? 'active-entrega' : ''}"
        onclick="changeStatus('${order.id}', 'entregando')">🛎️ Entregando</button>
      <button class="status-btn ${isDone ? 'active-done' : ''}"
        onclick="changeStatus('${order.id}', 'completado')" style="background:rgba(149,224,138,0.1)">✅ Listo</button>
    </div>
  `

  return `
    <div class="order-card-cocina ${order.status}" data-order-id="${order.id}" data-status="${order.status}">
      <div class="order-top">
        <div>
          <div class="order-num">${order.order_number}</div>
          <div class="order-meta">
            ${tipoLabel}
            <span class="order-timer ${isUrgent ? 'urgent' : ''}">🕐 ${elapsed}</span>
            <span>${formatTime(order.created_at)}</span>
          </div>
        </div>
        <span class="badge ${s.badge}">${s.label}</span>
      </div>

      <div class="divider" style="margin:12px 0"></div>

      <div class="order-items-list">${itemsHtml}</div>
      ${notesHtml}

      <div class="divider" style="margin:12px 0"></div>

      <div class="flex justify-between items-center mb-8" style="font-size:0.82rem">
        <span style="color:var(--text-muted)">Total del pedido</span>
        <span style="font-weight:700;color:var(--salmon)">${formatCOP(order.total)}</span>
      </div>

      ${statusBtns}
    </div>
  `
}

// =====================================================
// CAMBIAR ESTADO (async)
// =====================================================
window.changeStatus = async function(orderId, newStatus) {
  const result = await updateOrderStatus(orderId, newStatus)
  if (result) {
    showToast(`Estado actualizado: ${newStatus.replace('_', ' ')}`, 'success', 2000)
  } else {
    showToast('Error al actualizar estado', 'error')
  }
}

// =====================================================
// STATS
// =====================================================
function updateStats(allOrders) {
  const all = allOrders || getAllOrdersSync()
  const today = new Date().toDateString()

  document.getElementById('stat-espera').textContent =
    all.filter(o => o.status === 'en_espera').length

  document.getElementById('stat-proceso').textContent =
    all.filter(o => o.status === 'en_proceso').length

  document.getElementById('stat-entregando').textContent =
    all.filter(o => o.status === 'entregando').length

  document.getElementById('stat-done').textContent =
    all.filter(o => o.status === 'completado' &&
      new Date(o.updated_at).toDateString() === today).length
}

// =====================================================
// UTIL: Minutos transcurridos
// =====================================================
function getMinutesAgo(dateStr) {
  return Math.floor((new Date() - new Date(dateStr)) / 60000)
}

// =====================================================
// AUTO-LOGIN si ya está autenticado
// =====================================================
if (checkRoleAuth('cocina')) {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('cocina-dashboard').classList.remove('hidden')
  initDashboard()
}
