// =====================================================
// APP.JS - Helpers y utilidades globales
// =====================================================

import { supabase, IS_DEMO_MODE } from './supabase-client.js'

// =====================================================
// STORAGE (Demo mode con localStorage / Supabase)
// =====================================================

const STORAGE_KEY = 'restaurante_orders'
const TABLES_KEY  = 'restaurante_tables'

// Generar ID único
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// Generar número de pedido legible
let orderCounter = parseInt(localStorage.getItem('order_counter') || '100')
export function generateOrderNumber() {
  orderCounter++
  localStorage.setItem('order_counter', String(orderCounter))
  return `ORD-${String(orderCounter).padStart(4, '0')}`
}

// =====================================================
// GESTIÓN DE PEDIDOS (localStorage)
// =====================================================

export function getAllOrders() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

export function saveOrder(order) {
  const orders = getAllOrders()
  const idx = orders.findIndex(o => o.id === order.id)
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...order, updated_at: new Date().toISOString() }
  } else {
    orders.push({ ...order, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
  return order
}

export function getOrderById(id) {
  return getAllOrders().find(o => o.id === id)
}

export function getOrdersByStatus(status) {
  return getAllOrders().filter(o => o.status === status)
}

export function getActiveOrders() {
  return getAllOrders().filter(o => !['completado', 'cancelado'].includes(o.status))
}

export function updateOrderStatus(id, status) {
  const orders = getAllOrders()
  const idx = orders.findIndex(o => o.id === id)
  if (idx < 0) return null
  orders[idx].status = status
  orders[idx].updated_at = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
  return orders[idx]
}

export function updateOrderPayment(id, paymentData) {
  const orders = getAllOrders()
  const idx = orders.findIndex(o => o.id === id)
  if (idx < 0) return null
  orders[idx].pago = { ...orders[idx].pago, ...paymentData }
  orders[idx].updated_at = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders))
  window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
  return orders[idx]
}

// =====================================================
// GESTIÓN DE MESAS
// =====================================================

export function getTables() {
  const stored = localStorage.getItem(TABLES_KEY)
  if (stored) return JSON.parse(stored)
  // Crear 10 mesas por defecto
  const defaultTables = Array.from({ length: 10 }, (_, i) => ({
    id: `table-${i + 1}`,
    number: i + 1,
    qr_token: `mesa-${i + 1}-${generateId()}`,
    capacity: 4,
    status: 'available'
  }))
  localStorage.setItem(TABLES_KEY, JSON.stringify(defaultTables))
  return defaultTables
}

export function getTableByToken(token) {
  return getTables().find(t => t.qr_token === token || String(t.number) === String(token))
}

export function updateTableStatus(tableId, status) {
  const tables = getTables()
  const idx = tables.findIndex(t => t.id === tableId)
  if (idx >= 0) {
    tables[idx].status = status
    localStorage.setItem(TABLES_KEY, JSON.stringify(tables))
  }
}

// =====================================================
// NOTIFICACIONES TOAST
// =====================================================

let toastContainer = null

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

export function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
  const container = getToastContainer()

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <span style="font-size:1.2rem">${icons[type]}</span>
    <span style="font-size:0.875rem;font-weight:500">${message}</span>
  `
  container.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'slideInToast 0.3s ease reverse forwards'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// =====================================================
// AUTENTICACIÓN DE ROLES
// =====================================================

const ROLE_PINS = {
  cocina: '1234',
  caja:   '5678',
  admin:  '0000'
}

export function checkRoleAuth(role) {
  const stored = sessionStorage.getItem(`auth_${role}`)
  return stored === 'true'
}

export function verifyPin(role, pin) {
  if (pin === ROLE_PINS[role]) {
    sessionStorage.setItem(`auth_${role}`, 'true')
    return true
  }
  return false
}

export function logout(role) {
  sessionStorage.removeItem(`auth_${role}`)
}

// =====================================================
// SONIDO DE NOTIFICACIÓN (pedido nuevo)
// =====================================================

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {}
}

// =====================================================
// TIEMPO RELATIVO
// =====================================================

export function timeAgo(dateStr) {
  const now = new Date()
  const then = new Date(dateStr)
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h`
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit'
  })
}

// =====================================================
// POLLING (para demo sin Supabase Realtime)
// =====================================================

export function startPolling(callback, interval = 3000) {
  callback()
  return setInterval(callback, interval)
}

// =====================================================
// CARRITO (sessionStorage por mesa/sesión)
// =====================================================

export function getCart(sessionKey = 'cart') {
  return JSON.parse(sessionStorage.getItem(sessionKey) || '[]')
}

export function saveCart(items, sessionKey = 'cart') {
  sessionStorage.setItem(sessionKey, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: items }))
}

export function addToCart(item, sessionKey = 'cart') {
  const cart = getCart(sessionKey)
  const existing = cart.find(i => i.id === item.id)
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1
  } else {
    cart.push({ ...item, quantity: 1 })
  }
  saveCart(cart, sessionKey)
  return cart
}

export function removeFromCart(itemId, sessionKey = 'cart') {
  const cart = getCart(sessionKey).filter(i => i.id !== itemId)
  saveCart(cart, sessionKey)
  return cart
}

export function clearCart(sessionKey = 'cart') {
  sessionStorage.removeItem(sessionKey)
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: [] }))
}

export function getCartTotal(cart) {
  return cart.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0)
}
