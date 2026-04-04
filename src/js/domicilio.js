// =====================================================
// DOMICILIO.JS - Portal de pedidos domicilio con Supabase
// =====================================================

import '../css/styles.css'
import {
  generateId, generateOrderNumber,
  saveOrder, getCart, addToCart, removeFromCart,
  clearCart, getCartTotal, saveCart,
  showToast
} from './app.js'
import {
  RESTAURANT_NAME, CATEGORIES, MENU_ITEMS,
  formatCOP, calcTax, calcTotal, TRANSFER_INFO
} from './menu-data.js'

const CART_KEY = 'cart_domicilio'
let currentStep = 1

// =====================================================
// INIT
// =====================================================
function init() {
  document.getElementById('rest-name').textContent = RESTAURANT_NAME
  renderCategoryTabs()
  renderMenu('all')
  updateCartView()

  document.getElementById('dom-transfer-details').innerHTML = `
    🏦 <strong>${TRANSFER_INFO.bank}</strong> — ${TRANSFER_INFO.account_type}<br>
    📋 Cuenta: <strong>${TRANSFER_INFO.account_number}</strong><br>
    📱 Nequi: <strong>${TRANSFER_INFO.nequi}</strong><br>
    💚 Daviplata: <strong>${TRANSFER_INFO.daviplata}</strong><br>
    👤 Titular: ${TRANSFER_INFO.owner}<br>
    🔢 NIT: ${TRANSFER_INFO.nit}
  `
}

// =====================================================
// CATEGORÍAS
// =====================================================
function renderCategoryTabs() {
  const tabs = document.getElementById('dom-category-tabs')
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button')
    btn.className = 'tab-btn'
    btn.dataset.cat = cat.id
    btn.innerHTML = `${cat.icon} ${cat.name}`
    btn.onclick = () => filterDomMenu(cat.id, btn)
    tabs.appendChild(btn)
  })
}

window.filterDomMenu = function (catId, btn) {
  document.querySelectorAll('#dom-category-tabs .tab-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  renderMenu(catId)
}

// =====================================================
// MENÚ
// =====================================================
function renderMenu(catId = 'all') {
  const grid = document.getElementById('dom-menu-grid')
  const items = catId === 'all'
    ? MENU_ITEMS.filter(i => i.available)
    : MENU_ITEMS.filter(i => i.category_id === catId && i.available)

  grid.innerHTML = ''
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
          <button class="menu-item-add" onclick="addDomItem('${item.id}')">+</button>
        </div>
      </div>
    `
    grid.appendChild(card)
  })
}

window.addDomItem = function (itemId) {
  const item = MENU_ITEMS.find(i => i.id === itemId)
  if (!item) return
  addToCart(item, CART_KEY)
  showToast(`${item.icon} ${item.name} agregado`, 'success', 2000)
  updateCartView()
  event.target.style.transform = 'scale(1.4)'
  setTimeout(() => event.target.style.transform = '', 200)
}

// =====================================================
// VISTA DEL CARRITO
// =====================================================
function updateCartView() {
  const cart = getCart(CART_KEY)
  const summEl = document.getElementById('dom-cart-summary')
  const noItems = document.getElementById('dom-no-items')

  if (cart.length === 0) {
    summEl.classList.add('hidden')
    noItems.classList.remove('hidden')
    return
  }

  noItems.classList.add('hidden')
  summEl.classList.remove('hidden')

  const itemsList = document.getElementById('dom-cart-items-list')
  itemsList.innerHTML = cart.map(it => `
    <div class="flex items-center gap-8 mb-8" style="font-size:0.85rem">
      <span style="font-size:1.1rem">${it.icon}</span>
      <span style="flex:1">${it.name}</span>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeDomQty('${it.id}', -1)">−</button>
        <span class="qty-value">${it.quantity || 1}</span>
        <button class="qty-btn" onclick="changeDomQty('${it.id}', 1)">+</button>
      </div>
      <span style="color:var(--salmon);font-weight:600;min-width:80px;text-align:right">
        ${formatCOP(it.price * (it.quantity || 1))}
      </span>
      <button onclick="removeDomItem('${it.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem">🗑️</button>
    </div>
  `).join('')

  const total = calcTotal(getCartTotal(cart))
  document.getElementById('dom-cart-total').textContent = formatCOP(total)
}

window.changeDomQty = function (itemId, delta) {
  const cart = getCart(CART_KEY)
  const item = cart.find(i => i.id === itemId)
  if (!item) return
  item.quantity = Math.max(1, (item.quantity || 1) + delta)
  saveCart(cart, CART_KEY)
  updateCartView()
}

window.removeDomItem = function (itemId) {
  removeFromCart(itemId, CART_KEY)
  updateCartView()
}

// =====================================================
// NAVEGACIÓN DE PASOS
// =====================================================
window.goToStep = function (step) {
  if (step === 2) {
    const cart = getCart(CART_KEY)
    if (cart.length === 0) { showToast('Agrega al menos un plato', 'warning'); return }
  }
  if (step === 3) {
    const nombre = document.getElementById('cliente-nombre').value.trim()
    const tel    = document.getElementById('cliente-tel').value.trim()
    const dir    = document.getElementById('cliente-direccion').value.trim()
    if (!nombre || !tel || !dir) {
      showToast('Completa todos los campos obligatorios', 'warning'); return
    }
    updatePagoSummary()
  }

  currentStep = step
  document.getElementById('step-menu').classList.toggle('hidden', step !== 1)
  document.getElementById('step-datos').classList.toggle('hidden', step !== 2)
  document.getElementById('step-pago').classList.toggle('hidden', step !== 3)

  ;[1, 2, 3, 4].forEach(i => {
    const el = document.getElementById(`step-${i}-dot`)
    if (!el) return
    el.classList.toggle('active', i === step)
    el.classList.toggle('done',   i < step)
  })
}

function updatePagoSummary() {
  const cart = getCart(CART_KEY)
  const subtotal = getCartTotal(cart)
  const tax = calcTax(subtotal)
  const total = calcTotal(subtotal)

  document.getElementById('pago-subtotal').textContent = formatCOP(subtotal)
  document.getElementById('pago-iva').textContent = formatCOP(tax)
  document.getElementById('pago-total').textContent = formatCOP(total)

  const summHtml = cart.map(it =>
    `<div>${it.icon} ${it.name} ×${it.quantity || 1} — ${formatCOP(it.price * (it.quantity || 1))}</div>`
  ).join('')
  document.getElementById('pago-items-summary').innerHTML = summHtml
}

// =====================================================
// TOGGLE MÉTODO PAGO
// =====================================================
window.togglePayMethod = function (method) {
  const box = document.getElementById('dom-transfer-box')
  box.classList.toggle('hidden', method !== 'transferencia')
}

// =====================================================
// CONFIRMAR PEDIDO DOMICILIO (async — guarda en Supabase)
// =====================================================
window.confirmarDomicilio = async function () {
  const btn = document.getElementById('dom-confirm-btn')
  btn.disabled = true
  btn.textContent = '⏳ Enviando pedido...'

  const cart = getCart(CART_KEY)
  const payMethod = document.querySelector('input[name="dom_pay"]:checked')?.value || 'efectivo'
  const nombre = document.getElementById('cliente-nombre').value.trim()
  const tel    = document.getElementById('cliente-tel').value.trim()
  const dir    = document.getElementById('cliente-direccion').value.trim()
  const notas  = document.getElementById('cliente-notas').value.trim()

  let receiptBase64 = null
  if (payMethod === 'transferencia') {
    const fileInput = document.getElementById('dom-receipt')
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
    type: 'domicilio',
    mesa: null,
    cliente: { nombre, telefono: tel, direccion: dir, notas },
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
    notes: notas,
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
    clearCart(CART_KEY)

    document.getElementById('step-pago').classList.add('hidden')
    document.getElementById('step-confirmado').classList.remove('hidden')
    ;[1, 2, 3, 4].forEach(i => {
      const el = document.getElementById(`step-${i}-dot`)
      if (el) { el.classList.remove('active'); el.classList.add('done') }
    })

    document.getElementById('conf-order-num').textContent = orderNum
    document.getElementById('conf-details').innerHTML = `
      <strong>📍 Dirección:</strong> ${dir}<br>
      <strong>📞 Teléfono:</strong> ${tel}<br>
      <strong>💳 Pago:</strong> ${payMethod === 'efectivo' ? '💵 Efectivo contra entrega' : '📱 Transferencia bancaria'}<br>
      <strong>💰 Total:</strong> ${formatCOP(total)}
    `
  } catch (err) {
    showToast('Error al enviar pedido. Verifica tu conexión.', 'error')
    btn.disabled = false
    btn.textContent = '🛵 Confirmar Pedido'
  }
}

// =====================================================
// UTIL
// =====================================================
function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

init()
