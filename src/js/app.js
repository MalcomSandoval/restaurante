// =====================================================
// APP.JS - Helpers y utilidades globales
// Datos guardados en Supabase (multi-dispositivo)
// =====================================================

import { supabase, IS_DEMO_MODE } from './supabase-client.js'

// =====================================================
// GENERADORES DE ID Y NÚMERO DE PEDIDO
// =====================================================

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

let orderCounter = parseInt(localStorage.getItem('order_counter') || '100')
export function generateOrderNumber() {
  orderCounter++
  localStorage.setItem('order_counter', String(orderCounter))
  return `ORD-${String(orderCounter).padStart(4, '0')}`
}

// =====================================================
// CACHÉ LOCAL (para lectura rápida inicial)
// =====================================================

const CACHE_KEY = 'restaurante_orders_cache'

function getCachedOrders() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]') } catch { return [] }
}

function setCachedOrders(orders) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(orders)) } catch {}
}

// =====================================================
// GESTIÓN DE PEDIDOS — SUPABASE
// =====================================================

/**
 * Obtiene todos los pedidos desde Supabase.
 * Si Supabase falla o está en demo, usa localStorage como fallback.
 */
export async function getAllOrders() {
  if (IS_DEMO_MODE || !supabase) {
    return JSON.parse(localStorage.getItem('restaurante_orders') || '[]')
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    setCachedOrders(data || [])
    return data || []
  } catch (err) {
    console.warn('Supabase getAllOrders falló, usando caché:', err.message)
    return getCachedOrders()
  }
}

/**
 * Alias síncrono para compatibilidad con código que no puede hacer await.
 * Devuelve el caché local inmediatamente (ya fue poblado por getAllOrders).
 */
export function getAllOrdersSync() {
  if (IS_DEMO_MODE || !supabase) {
    return JSON.parse(localStorage.getItem('restaurante_orders') || '[]')
  }
  return getCachedOrders()
}

/**
 * Guarda (INSERT) o actualiza (UPSERT) un pedido en Supabase.
 */
export async function saveOrder(order) {
  const now = new Date().toISOString()
  const orderData = {
    ...order,
    created_at: order.created_at || now,
    updated_at: now
  }

  if (IS_DEMO_MODE || !supabase) {
    // Fallback localStorage
    const orders = JSON.parse(localStorage.getItem('restaurante_orders') || '[]')
    const idx = orders.findIndex(o => o.id === order.id)
    if (idx >= 0) orders[idx] = orderData
    else orders.push(orderData)
    localStorage.setItem('restaurante_orders', JSON.stringify(orders))
    window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
    return orderData
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .upsert(orderData, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error

    // Actualizar caché
    const cache = getCachedOrders()
    const idx = cache.findIndex(o => o.id === order.id)
    if (idx >= 0) cache[idx] = data
    else cache.unshift(data)
    setCachedOrders(cache)

    return data
  } catch (err) {
    console.error('saveOrder error:', err.message)
    showToast('Error al guardar pedido: ' + err.message, 'error')
    throw err
  }
}

/**
 * Busca un pedido por ID.
 */
export async function getOrderById(id) {
  if (IS_DEMO_MODE || !supabase) {
    return JSON.parse(localStorage.getItem('restaurante_orders') || '[]').find(o => o.id === id)
  }

  // Primero buscar en caché
  const cached = getCachedOrders().find(o => o.id === id)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch {
    return null
  }
}

/**
 * Actualiza solo el campo `status` de un pedido.
 */
export async function updateOrderStatus(id, status) {
  if (IS_DEMO_MODE || !supabase) {
    const orders = JSON.parse(localStorage.getItem('restaurante_orders') || '[]')
    const idx = orders.findIndex(o => o.id === id)
    if (idx < 0) return null
    orders[idx].status = status
    orders[idx].updated_at = new Date().toISOString()
    localStorage.setItem('restaurante_orders', JSON.stringify(orders))
    window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
    return orders[idx]
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Actualizar caché local
    const cache = getCachedOrders()
    const idx = cache.findIndex(o => o.id === id)
    if (idx >= 0) { cache[idx] = data; setCachedOrders(cache) }

    return data
  } catch (err) {
    console.error('updateOrderStatus error:', err.message)
    return null
  }
}

/**
 * Actualiza los datos de pago de un pedido.
 */
export async function updateOrderPayment(id, paymentData) {
  if (IS_DEMO_MODE || !supabase) {
    const orders = JSON.parse(localStorage.getItem('restaurante_orders') || '[]')
    const idx = orders.findIndex(o => o.id === id)
    if (idx < 0) return null
    orders[idx].pago = { ...orders[idx].pago, ...paymentData }
    orders[idx].updated_at = new Date().toISOString()
    localStorage.setItem('restaurante_orders', JSON.stringify(orders))
    window.dispatchEvent(new CustomEvent('orders-updated', { detail: orders }))
    return orders[idx]
  }

  try {
    // Primero obtenemos el pedido actual para mergear el campo pago
    const current = await getOrderById(id)
    if (!current) return null

    const mergedPago = { ...(current.pago || {}), ...paymentData }

    const { data, error } = await supabase
      .from('orders')
      .update({ pago: mergedPago, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const cache = getCachedOrders()
    const idx = cache.findIndex(o => o.id === id)
    if (idx >= 0) { cache[idx] = data; setCachedOrders(cache) }

    return data
  } catch (err) {
    console.error('updateOrderPayment error:', err.message)
    return null
  }
}

export function getActiveOrders() {
  return getCachedOrders().filter(o => !['completado', 'cancelado'].includes(o.status))
}

// =====================================================
// SUPABASE REALTIME — Suscripción a cambios en tiempo real
// =====================================================

let realtimeChannel = null

/**
 * Suscribe a cambios en la tabla orders.
 * Llama `callback(orders)` cada vez que hay INSERT, UPDATE o DELETE.
 * Devuelve función para cancelar la suscripción.
 */
export function subscribeToOrders(callback) {
  if (IS_DEMO_MODE || !supabase) {
    // En Demo Mode: polling cada 2 segundos sobre localStorage
    const interval = setInterval(async () => {
      const orders = await getAllOrders()
      callback(orders)
    }, 2000)
    return () => clearInterval(interval)
  }

  // Cancelar suscripción anterior si existe
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }

  realtimeChannel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async (payload) => {
        // Actualizar caché según el tipo de evento
        const cache = getCachedOrders()

        if (payload.eventType === 'INSERT') {
          // Agregar nuevo pedido al inicio del caché
          if (!cache.find(o => o.id === payload.new.id)) {
            cache.unshift(payload.new)
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = cache.findIndex(o => o.id === payload.new.id)
          if (idx >= 0) cache[idx] = payload.new
          else cache.unshift(payload.new)
        } else if (payload.eventType === 'DELETE') {
          const idx = cache.findIndex(o => o.id === payload.old.id)
          if (idx >= 0) cache.splice(idx, 1)
        }

        setCachedOrders(cache)
        callback(cache)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Supabase Realtime conectado')
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('⚠️ Supabase Realtime error - usando polling')
        // Fallback a polling si Realtime falla
        supabase.removeChannel(realtimeChannel)
        realtimeChannel = null
        const interval = setInterval(async () => {
          const orders = await getAllOrders()
          callback(orders)
        }, 3000)
        // Guardar interval para poder cancelarlo
        realtimeChannel = { unsubscribe: () => clearInterval(interval) }
      }
    })

  // Cargar datos iniciales
  getAllOrders().then(orders => callback(orders))

  // Devolver función de limpieza
  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
}

/**
 * Suscribe a cambios de UN pedido específico (para tracking en mesa.js)
 */
export function subscribeToOrder(orderId, callback) {
  if (IS_DEMO_MODE || !supabase) {
    const interval = setInterval(async () => {
      const order = await getOrderById(orderId)
      if (order) callback(order)
    }, 2000)
    return () => clearInterval(interval)
  }

  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => {
        callback(payload.new)
      }
    )
    .subscribe()

  // Cargar estado inicial
  getOrderById(orderId).then(order => { if (order) callback(order) })

  return () => supabase.removeChannel(channel)
}

// =====================================================
// GESTIÓN DE MESAS (localStorage — no necesita ser global)
// =====================================================

const TABLES_KEY = 'restaurante_tables'

export function getTables() {
  const stored = localStorage.getItem(TABLES_KEY)
  if (stored) return JSON.parse(stored)
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
  return sessionStorage.getItem(`auth_${role}`) === 'true'
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
// SONIDO DE NOTIFICACIÓN
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
// POLLING (mantener por compatibilidad / demo)
// =====================================================

export function startPolling(callback, interval = 3000) {
  callback()
  return setInterval(callback, interval)
}

// =====================================================
// CARRITO (sessionStorage por mesa/sesión — no necesita ser global)
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
