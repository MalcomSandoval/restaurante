// =====================================================
// ADMIN-QR.JS - Panel admin y generador de QR
// =====================================================

import '../css/styles.css'
import QRCode from 'qrcode'
import {
  checkRoleAuth, verifyPin, logout,
  getTables, showToast
} from './app.js'
import { RESTAURANT_NAME } from './menu-data.js'

let baseUrl = window.location.origin
let tables = []
let currentQrMesa = null

// =====================================================
// LOGIN
// =====================================================
window.loginAdmin = function () {
  const pin = document.getElementById('pin-input').value
  if (verifyPin('admin', pin)) {
    document.getElementById('login-screen').classList.add('hidden')
    document.getElementById('admin-dashboard').classList.remove('hidden')
    initAdmin()
  } else {
    showToast('PIN incorrecto', 'error')
    document.getElementById('pin-input').value = ''
  }
}

window.logoutAdmin = function () {
  logout('admin')
  window.location.reload()
}

// =====================================================
// INIT
// =====================================================
function initAdmin() {
  loadConfig()
  tables = getTables()
  generateQRGrid()
}

function loadConfig() {
  const config = JSON.parse(localStorage.getItem('restaurante_config') || '{}')
  document.getElementById('conf-nombre').value   = config.nombre   || RESTAURANT_NAME
  document.getElementById('conf-url').value      = config.url      || window.location.origin
  document.getElementById('conf-mesas').value    = config.mesas    || 10
  document.getElementById('conf-ciudad').value   = config.ciudad   || ''
  document.getElementById('tf-banco').value      = config.tf_banco    || 'Bancolombia'
  document.getElementById('tf-tipo').value       = config.tf_tipo     || 'Cuenta de Ahorros'
  document.getElementById('tf-cuenta').value     = config.tf_cuenta   || ''
  document.getElementById('tf-nequi').value      = config.tf_nequi    || ''
  document.getElementById('tf-daviplata').value  = config.tf_daviplata || ''
  document.getElementById('tf-nit').value        = config.tf_nit      || ''
  baseUrl = config.url || window.location.origin
}

window.saveConfig = function () {
  const config = {
    nombre:      document.getElementById('conf-nombre').value,
    url:         document.getElementById('conf-url').value,
    mesas:       parseInt(document.getElementById('conf-mesas').value) || 10,
    ciudad:      document.getElementById('conf-ciudad').value,
  }
  const existing = JSON.parse(localStorage.getItem('restaurante_config') || '{}')
  localStorage.setItem('restaurante_config', JSON.stringify({ ...existing, ...config }))
  baseUrl = config.url || window.location.origin
  showToast('✅ Configuración guardada', 'success')
  generateQRGrid()
}

window.saveTransferConfig = function () {
  const config = {
    tf_banco:     document.getElementById('tf-banco').value,
    tf_tipo:      document.getElementById('tf-tipo').value,
    tf_cuenta:    document.getElementById('tf-cuenta').value,
    tf_nequi:     document.getElementById('tf-nequi').value,
    tf_daviplata: document.getElementById('tf-daviplata').value,
    tf_nit:       document.getElementById('tf-nit').value,
  }
  const existing = JSON.parse(localStorage.getItem('restaurante_config') || '{}')
  localStorage.setItem('restaurante_config', JSON.stringify({ ...existing, ...config }))
  showToast('✅ Datos de pago guardados', 'success')
}

// =====================================================
// GENERAR GRID DE QR
// =====================================================
async function generateQRGrid() {
  const grid = document.getElementById('qr-grid')
  grid.innerHTML = ''
  tables = getTables()

  for (const table of tables) {
    const mesaUrl = `${baseUrl}/mesa.html?mesa=${table.number}`

    const card = document.createElement('div')
    card.className = 'qr-card'
    card.onclick = () => openQRModal(table)

    const qrContainer = document.createElement('div')
    qrContainer.className = 'qr-container'
    qrContainer.id = `qr-${table.number}`

    card.innerHTML = `
      <div class="qr-mesa-num">Mesa #${table.number}</div>
      <div class="qr-mesa-cap">👥 ${table.capacity} personas</div>
    `
    card.insertBefore(qrContainer, card.firstChild)

    grid.appendChild(card)

    // Generar QR
    try {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, mesaUrl, {
        width: 104, margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
      qrContainer.appendChild(canvas)
    } catch (e) {
      qrContainer.innerHTML = `<div style="font-size:2rem">📷</div><div style="font-size:0.6rem;color:#999">${mesaUrl}</div>`
    }
  }
}

// =====================================================
// MODAL QR AMPLIADO
// =====================================================
async function openQRModal(table) {
  currentQrMesa = table
  const mesaUrl = `${baseUrl}/mesa.html?mesa=${table.number}`

  document.getElementById('qr-modal-title').textContent = `QR Mesa #${table.number}`
  document.getElementById('qr-modal-url').textContent = mesaUrl

  const container = document.getElementById('qr-modal-code')
  container.innerHTML = ''

  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, mesaUrl, {
    width: 176, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  })
  container.appendChild(canvas)

  document.getElementById('qr-download-btn').onclick = () => downloadQR(canvas, table.number)
  document.getElementById('qr-modal').classList.add('active')
}

// =====================================================
// DESCARGAR QR INDIVIDUAL
// =====================================================
function downloadQR(canvas, tableNum) {
  const link = document.createElement('a')
  link.download = `QR-Mesa-${tableNum}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  showToast(`⬇️ QR Mesa #${tableNum} descargado`, 'success', 2000)
}

// =====================================================
// DESCARGAR TODOS LOS QR
// =====================================================
window.downloadAllQR = async function () {
  showToast('⏳ Generando todos los QR...', 'info', 3000)
  for (const table of tables) {
    const mesaUrl = `${baseUrl}/mesa.html?mesa=${table.number}`
    try {
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, mesaUrl, {
        width: 400, margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      })
      await sleep(100)
      const link = document.createElement('a')
      link.download = `QR-Mesa-${table.number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      await sleep(300)
    } catch (e) {
      console.error(`Error QR mesa ${table.number}:`, e)
    }
  }
  showToast('✅ Todos los QR descargados', 'success')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// =====================================================
// AUTO-LOGIN
// =====================================================
if (checkRoleAuth('admin')) {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('admin-dashboard').classList.remove('hidden')
  initAdmin()
}
