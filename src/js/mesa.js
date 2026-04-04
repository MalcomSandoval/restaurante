// =====================================================
// MESA.JS - Portal de cliente en mesa con Supabase
// =====================================================

import '../css/styles.css'
import {
  generateId, generateOrderNumber,
  saveOrder, getOrderById,
  getCart, addToCart, removeFromCart, clearCart, getCartTotal, saveCart,
  showToast, subscribeToOrder, timeAgo, formatTime
} from './app.js'
import {
  RESTAURANT_NAME, CATEGORIES, MENU_ITEMS,
  formatCOP, calcTax, calcTotal, TRANSFER_INFO
} from './menu-data.js'

// =====================================================
// ESTADO GLOBAL
// =====================================================
let mesa = null
let mesaNum = null
let cartKey = 'cart'
let activeOrderId = null
let unsubscribeOrder = null
let currentCat = 'all'

// =====================================================
// INICIALIZACIÓN
// =====================================================
async function init() {
  const params = new URLSearchParams(window.location.search)
  const mesaParam = params.get('mesa') || params.get('token') || '1'
  mesaNum = mesaParam
  cartKey = `cart_mesa_${mesaNum}`

  document.getElementById('restaurant-name').textContent = RESTAURANT_NAME
  document.getElementById('table-label').textContent = `Mesa #${mesaNum}`
  document.getElementById('mesa-badge').textContent = `📍 Mesa #${mesaNum}`
  document.getElementById('welcome-text').innerHTML = `Estás en la <strong>Mesa #${mesaNum}</strong>`

  setTimeout(() => {
    const ws = document.getElementById('welcome-screen')
    ws.style.opacity = '0'
    setTimeout(async () => {
      ws.style.display = 'none'
      document.getElementById('main-content').classList.remove('hidden')
      renderCategoryTabs()
      renderMenu()
      updateCartBadge()
      await checkActiveOrder()
    }, 500)
  }, 1800)
}

// =====================================================
// RENDER CATEGORÍAS
// =====================================================
function renderCategoryTabs() {
  const tabs = document.getElementById('category-tabs')
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button')
    btn.className = 'tab-btn'
    btn.dataset.cat = cat.id
    btn.innerHTML = `${cat.icon} ${cat.name}`
    btn.onclick = () => filterByCategory(cat.id, btn)
    tabs.appendChild(btn)
  })
}

function filterByCategory(catId, btn) {
  currentCat = catId
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  renderMenu(catId)
}

// =====================================================
// RENDER MENÚ
// =====================================================
function renderMenu(catId = 'all') {
  const grid = document.getElementById('menu-grid')
  grid.innerHTML = ''

  const items = catId === 'all'
    ? MENU_ITEMS.filter(i => i.available)
    : MENU_ITEMS.filter(i => i.category_id === catId && i.available)

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🍽️</div>
        <h3>Sin platos disponibles</h3>
        <p>Esta categoría no tiene platos disponibles en este momento</p>
      </div>`
    return
  }

  items.forEach(item => {
    const card = document.createElement('div')
    card.className = 'menu-item-card'
    card.innerHTML = `
      <div class="menu-item-img-placeholder">${item.icon}</div>
      <div class="menu-item-body">
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-desc">${item.description}</div>
        <div class="menu-item-footer">
          <div class="menu-item-price">${formatCOP(item.price)}</div>
          <button class="menu-item-add" onclick="addItem('${item.id}')" title="Agregar al pedido">
            +
          </button>
        </div>
      </div>
    `
    grid.appendChild(card)
  })
}

// =====================================================
// CARRITO
// =====================================================
window.addItem = function(itemId) {
  const item = MENU_ITEMS.find(i => i.id === itemId)
  if (!item) return
  addToCart(item, cartKey)
  showToast(`${item.icon} ${item.name} agregado`, 'success', 2000)
  updateCartBadge()

  const btn = event.target
  btn.style.transform = 'scale(1.4)'
  setTimeout(() => btn.style.transform = '', 200)
}

function updateCartBadge() {
  const cart = getCart(cartKey)
  const total = cart.reduce((s, i) => s + (i.quantity || 1), 0)
  const fab = document.getElementById('cart-fab')
  const count = document.getElementById('cart-count')

  if (total > 0) {
    fab.classList.remove('hidden')
    count.textContent = total
  } else {
    fab.classList.add('hidden')
  }
}

window.openCart = function() {
  renderCartModal()
  document.getElementById('cart-modal').classList.add('active')
}

window.closeCart = function() {
  document.getElementById('cart-modal').classList.remove('active')
}

function renderCartModal() {
  const cart = getCart(cartKey)
  const itemsEl = document.getElementById('cart-items')
  const emptyEl = document.getElementById('cart-empty')
  const summaryEl = document.getElementById('cart-summary')

  itemsEl.innerHTML = ''

  if (cart.length === 0) {
    emptyEl.classList.remove('hidden')
    summaryEl.classList.add('hidden')
    return
  }

  emptyEl.classList.add('hidden')
  summaryEl.classList.remove('hidden')

  cart.forEach(item => {
    const row = document.createElement('div')
    row.className = 'cart-item'
    row.innerHTML = `
      <div class="cart-item-icon">${item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatCOP(item.price)} × ${item.quantity || 1}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-value">${item.quantity || 1}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
      <button class="cart-item-remove" onclick="removeItem('${item.id}')">🗑️</button>
    `
    itemsEl.appendChild(row)
  })

  const subtotal = getCartTotal(cart)
  const tax = calcTax(subtotal)
  const total = calcTotal(subtotal)

  document.getElementById('cart-subtotal').textContent = formatCOP(subtotal)
  document.getElementById('cart-tax').textContent = formatCOP(tax)
  document.getElementById('cart-total').textContent = formatCOP(total)

  const transferDetails = document.getElementById('transfer-details')
  transferDetails.innerHTML = `
    <div>🏦 <strong>${TRANSFER_INFO.bank}</strong> — ${TRANSFER_INFO.account_type}</div>
    <div>📋 Cuenta: <strong>${TRANSFER_INFO.account_number}</strong></div>
    <div>📱 Nequi: <strong>${TRANSFER_INFO.nequi}</strong></div>
    <div>💚 Daviplata: <strong>${TRANSFER_INFO.daviplata}</strong></div>
    <div>👤 Titular: ${TRANSFER_INFO.owner}</div>
    <div>🔢 NIT: ${TRANSFER_INFO.nit}</div>
  `
}

window.changeQty = function(itemId, delta) {
  const cart = getCart(cartKey)
  const item = cart.find(i => i.id === itemId)
  if (!item) return
  item.quantity = Math.max(1, (item.quantity || 1) + delta)
  saveCart(cart, cartKey)
  renderCartModal()
  updateCartBadge()
}

window.removeItem = function(itemId) {
  removeFromCart(itemId, cartKey)
  renderCartModal()
  updateCartBadge()
  if (getCart(cartKey).length === 0) closeCart()
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="pay_method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isTransfer = radio.value === 'transferencia'
      document.getElementById('transfer-info-box').classList.toggle('hidden', !isTransfer)
    })
  })
})

// =====================================================
// CONFIRMAR PEDIDO (async — guarda en Supabase)
// =====================================================
window.confirmOrder = async function() {
  const cart = getCart(cartKey)
  if (cart.length === 0) {
    showToast('El carrito está vacío', 'warning')
    return
  }

  const btn = document.getElementById('confirm-order-btn')
  btn.disabled = true
  btn.textContent = '⏳ Enviando pedido...'

  const payMethod = document.querySelector('input[name="pay_method"]:checked')?.value || 'efectivo'
  const note = document.getElementById('cart-note')?.value || ''

  let receiptBase64 = null
  if (payMethod === 'transferencia') {
    const fileInput = document.getElementById('receipt-upload')
    if (fileInput?.files?.[0]) {
      receiptBase64 = await fileToBase64(fileInput.files[0])
    }
  }

  const subtotal = getCartTotal(cart)
  const tax = calcTax(subtotal)
  const total = calcTotal(subtotal)
  const orderId = generateId()
  const orderNum = generateOrderNumber()

  const order = {
    id: orderId,
    order_number: orderNum,
    type: 'mesa',
    mesa: mesaNum,
    items: cart.map(i => ({
      id: i.id,
      name: i.name,
      icon: i.icon,
      quantity: i.quantity || 1,
      unit_price: i.price,
      notes: ''
    })),
    subtotal,
    tax,
    total,
    notes: note,
    status: 'en_espera',
    pago: {
      metodo: payMethod,
      comprobante: receiptBase64,
      pagado: false,
      monto_recibido: null,
      vuelto: null
    }
  }

  try {
    await saveOrder(order)
    activeOrderId = orderId
    sessionStorage.setItem(`active_order_mesa_${mesaNum}`, orderId)

    clearCart(cartKey)
    updateCartBadge()
    closeCart()

    document.getElementById('success-order-num').textContent = orderNum
    document.getElementById('success-modal').classList.add('active')

    startOrderTracking(orderId)
  } catch (err) {
    showToast('Error al enviar pedido. Verifica tu conexión.', 'error')
    btn.disabled = false
    btn.textContent = '🛎️ Confirmar Pedido'
  }
}

window.closeSuccess = function() {
  document.getElementById('success-modal').classList.remove('active')
}

// =====================================================
// TRACKING DEL PEDIDO (Supabase Realtime)
// =====================================================
async function checkActiveOrder() {
  const storedId = sessionStorage.getItem(`active_order_mesa_${mesaNum}`)
  if (!storedId) return

  const order = await getOrderById(storedId)
  if (order && !['completado', 'cancelado'].includes(order.status)) {
    activeOrderId = storedId
    showOrderStatusBar(order)
    startOrderTracking(storedId)
  }
}

function startOrderTracking(orderId) {
  // Cancelar suscripción anterior
  if (unsubscribeOrder) unsubscribeOrder()

  unsubscribeOrder = subscribeToOrder(orderId, (order) => {
    showOrderStatusBar(order)
  })
}

function showOrderStatusBar(order) {
  const bar = document.getElementById('order-status-bar')
  bar.classList.remove('hidden')
  document.getElementById('status-order-num').textContent = order.order_number

  const statusMap = {
    en_espera:  { label: '⏳ En Espera',  class: 'badge-wait' },
    en_proceso: { label: '👨‍🍳 En Proceso', class: 'badge-process' },
    entregando: { label: '🛎️ En Camino',  class: 'badge-deliver' },
    completado: { label: '✅ Completado',  class: 'badge-done' },
  }
  const s = statusMap[order.status] || statusMap.en_espera
  document.getElementById('status-badge-wrap').innerHTML =
    `<span class="badge ${s.class}">${s.label}</span>`

  const steps = ['en_espera', 'en_proceso', 'entregando', 'completado']
  const idx = steps.indexOf(order.status)
  const stepIds = ['step-espera', 'step-proceso', 'step-entregando', 'step-listo']
  stepIds.forEach((id, i) => {
    const el = document.getElementById(id)
    el.classList.remove('done', 'active')
    if (i < idx) el.classList.add('done')
    if (i === idx) el.classList.add('active')
  })
}

// =====================================================
// UTIL
// =====================================================
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

init()
