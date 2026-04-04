-- =====================================================
-- RESTAURANTE - Crear tabla orders en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================

-- Eliminar tabla si existe (solo para desarrollo)
DROP TABLE IF EXISTS public.orders;

-- Crear tabla de pedidos
CREATE TABLE public.orders (
  id            TEXT PRIMARY KEY,
  order_number  TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'mesa',  -- 'mesa' | 'domicilio'
  mesa          TEXT,
  items         JSONB NOT NULL DEFAULT '[]',
  subtotal      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes         TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'en_espera',
  cliente       JSONB,
  pago          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para acelerar consultas frecuentes
CREATE INDEX idx_orders_status     ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_orders_type       ON public.orders(type);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir todo al anon key (para MVP sin auth de usuarios)
CREATE POLICY "Allow anon read"   ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete" ON public.orders FOR DELETE USING (true);

-- Habilitar Realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Verificar
SELECT 'Tabla orders creada correctamente ✅' AS resultado;
