// =====================================================
// MENU DATA - Menú del restaurante de ejemplo
// Adaptado para Colombia con precios en COP
// =====================================================

export const RESTAURANT_NAME = 'Restaurante Demo'
export const RESTAURANT_TAGLINE = 'Sabor que enamora'
export const IVA_RATE = 0.19 // IVA Colombia 19%
export const CURRENCY = 'COP'
export const CURRENCY_LOCALE = 'es-CO'

// Información de pago por transferencia
export const TRANSFER_INFO = {
  bank: 'Bancolombia',
  account_type: 'Cuenta de Ahorros',
  account_number: '123-456789-00',
  nequi: '+57 300 000 0000',
  daviplata: '+57 300 000 0001',
  owner: 'Restaurante Demo S.A.S',
  nit: '900.123.456-7'
}

export const CATEGORIES = [
  { id: 'entradas',     name: 'Entradas',        icon: '🥗',  sort_order: 1 },
  { id: 'platos',       name: 'Platos Fuertes',   icon: '🍽️', sort_order: 2 },
  { id: 'sopas',        name: 'Sopas & Caldos',   icon: '🍲',  sort_order: 3 },
  { id: 'parrilla',     name: 'Parrilla',          icon: '🥩',  sort_order: 4 },
  { id: 'bebidas',      name: 'Bebidas',           icon: '🥤',  sort_order: 5 },
  { id: 'postres',      name: 'Postres',           icon: '🍮',  sort_order: 6 },
]

export const MENU_ITEMS = [
  // ENTRADAS
  {
    id: 'e1', category_id: 'entradas',
    name: 'Empanadas de pipián (3 und)',
    description: 'Empanadas crujientes rellenas de pipián, papa y hogao. Servidas con ají',
    price: 12000, icon: '🫔', available: true
  },
  {
    id: 'e2', category_id: 'entradas',
    name: 'Patacones con hogao',
    description: 'Patacones crujientes con hogao artesanal y guacamole de la casa',
    price: 10000, icon: '🟡', available: true
  },
  {
    id: 'e3', category_id: 'entradas',
    name: 'Chorizo santarrosano',
    description: 'Chorizo artesanal del Eje Cafetero asado, con arepa y chimichurri',
    price: 16000, icon: '🌭', available: true
  },
  {
    id: 'e4', category_id: 'entradas',
    name: 'Arepa de chócolo con quesillo',
    description: 'Arepa de chócolo dulce con quesillo derretido, mantequilla y hogao',
    price: 9000, icon: '🌽', available: true
  },

  // PLATOS FUERTES
  {
    id: 'p1', category_id: 'platos',
    name: 'Bandeja Paisa completa',
    description: 'Frijoles, chicharrón, carne molida, chorizo, morcilla, arroz, arepa, huevo frito y aguacate',
    price: 38000, icon: '🍱', available: true
  },
  {
    id: 'p2', category_id: 'platos',
    name: 'Fritura de truchas',
    description: 'Trucha frita entera con patacones, ensalada y arroz blanco',
    price: 32000, icon: '🐟', available: true
  },
  {
    id: 'p3', category_id: 'platos',
    name: 'Pollo al ajillo con papas',
    description: 'Pechuga de pollo al ajillo con papas al vapor y ensalada mixta',
    price: 26000, icon: '🍗', available: true
  },
  {
    id: 'p4', category_id: 'platos',
    name: 'Arroz con pollo colombiano',
    description: 'Arroz preparado con pollo, zanahoria, arveja y aliños. Con ensalada y tajadas',
    price: 22000, icon: '🍚', available: true
  },
  {
    id: 'p5', category_id: 'platos',
    name: 'Cazuela de mariscos',
    description: 'Mezcla de camarones, calamares y moluscos en salsa de coco con arroz',
    price: 42000, icon: '🦐', available: true
  },

  // SOPAS
  {
    id: 's1', category_id: 'sopas',
    name: 'Ajiaco bogotano',
    description: 'Ajiaco con pollo, papas criollas, mazorca y guasca. Con crema y alcaparras',
    price: 24000, icon: '🍲', available: true
  },
  {
    id: 's2', category_id: 'sopas',
    name: 'Sancocho trifásico',
    description: 'Sancocho de gallina, res y cerdo con yuca, mazorca y papa',
    price: 26000, icon: '🥘', available: true
  },
  {
    id: 's3', category_id: 'sopas',
    name: 'Sopa de lentejas',
    description: 'Lentejas con plátano maduro, zanahoria y tocino. Con arroz',
    price: 18000, icon: '🥣', available: true
  },

  // PARRILLA
  {
    id: 'gr1', category_id: 'parrilla',
    name: 'Churrasco 300gr',
    description: 'Churrasco de res a la parrilla, con chimichurri, papas criollas y ensalada',
    price: 48000, icon: '🥩', available: true
  },
  {
    id: 'gr2', category_id: 'parrilla',
    name: 'Costillas BBQ',
    description: 'Costillas de cerdo bañadas en salsa BBQ artesanal. Con papas y coleslaw',
    price: 44000, icon: '🍖', available: true
  },
  {
    id: 'gr3', category_id: 'parrilla',
    name: 'Pollo a la parrilla',
    description: 'Medio pollo a la brasa marinado en especias, con yuca frita y ensalada',
    price: 35000, icon: '🍗', available: true
  },

  // BEBIDAS
  {
    id: 'b1', category_id: 'bebidas',
    name: 'Jugo natural en agua (500ml)',
    description: 'Lulo, maracuyá, mora, guanábana o mango. Preparado al momento',
    price: 7000, icon: '🥤', available: true
  },
  {
    id: 'b2', category_id: 'bebidas',
    name: 'Jugo natural en leche (500ml)',
    description: 'Mora, banano, fresa o guanábana. En leche entera',
    price: 8000, icon: '🥛', available: true
  },
  {
    id: 'b3', category_id: 'bebidas',
    name: 'Gaseosa personal',
    description: 'Coca-Cola, Sprite, Fanta o Postobón (300ml)',
    price: 4500, icon: '🧃', available: true
  },
  {
    id: 'b4', category_id: 'bebidas',
    name: 'Agua Cristal',
    description: 'Agua mineral sin gas 600ml',
    price: 3500, icon: '💧', available: true
  },
  {
    id: 'b5', category_id: 'bebidas',
    name: 'Cerveza Club Colombia',
    description: 'Cerveza artesanal colombiana 330ml bien fría',
    price: 8500, icon: '🍺', available: true
  },
  {
    id: 'b6', category_id: 'bebidas',
    name: 'Tinto o aromática',
    description: 'Café tinto de altura o aromática de hierbas naturales',
    price: 3000, icon: '☕', available: true
  },

  // POSTRES
  {
    id: 'po1', category_id: 'postres',
    name: 'Tres leches',
    description: 'Bizcocho bañado en tres leches con crema chantilly y canela',
    price: 12000, icon: '🎂', available: true
  },
  {
    id: 'po2', category_id: 'postres',
    name: 'Arroz con leche',
    description: 'Arroz con leche a la colombiana con canela y arequipe',
    price: 9000, icon: '🍮', available: true
  },
  {
    id: 'po3', category_id: 'postres',
    name: 'Cholados / Frutos del bosque',
    description: 'Raspado con leche condensada, frutas frescas y sirope de mora',
    price: 11000, icon: '🍧', available: true
  },
]

// =====================================================
// HELPERS DE FORMATO
// =====================================================

export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function calcTax(subtotal) {
  return Math.round(subtotal * IVA_RATE)
}

export function calcTotal(subtotal) {
  return subtotal + calcTax(subtotal)
}

export function getCategory(id) {
  return CATEGORIES.find(c => c.id === id)
}

export function getItemsByCategory(catId) {
  return MENU_ITEMS.filter(i => i.category_id === catId && i.available)
}
