# 🏗️ ARQUITECTURA DEL PROYECTO — Negocio Cosméticos

---

## 📊 DIAGRAMA GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO (ADMIN)                         │
│         Usa navegador web en http://localhost:3000           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│   FRONTEND       │      │  ADMIN ACTIONS   │
│   (React/Next)   │      │  (Click, Submit) │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   API ROUTES (Backend) │
         │  /api/clientes         │
         │  /api/productos        │
         │  /api/ventas           │
         │  /api/notificaciones   │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   SUPABASE (BD)        │
         │  - Tablas SQL          │
         │  - Triggers automáticos│
         │  - CRON Jobs           │
         └────────────────────────┘
```

---

## 1️⃣ ESTRUCTURA DE CARPETAS

```
mi-negocio-cosmetics/
│
├── app/
│   ├── layout.tsx                    # Layout global (Navbar + Sidebar)
│   ├── page.tsx                      # Dashboard principal
│   ├── api/
│   │   ├── clientes/
│   │   │   ├── route.ts              # GET, POST clientes
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET, PATCH, DELETE un cliente
│   │   │       └── stickers/
│   │   │           └── route.ts      # GET historial stickers/premios
│   │   │
│   │   ├── productos/
│   │   │   ├── route.ts              # GET, POST productos
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH producto
│   │   │
│   │   ├── ventas/
│   │   │   ├── route.ts              # GET, POST ventas (✨ crea stickers)
│   │   │   └── [id]/
│   │   │       └── route.ts          # GET venta
│   │   │
│   │   ├── notificaciones/
│   │   │   ├── route.ts              # GET, PATCH notificaciones
│   │   │   └── [id]/
│   │   │       └── route.ts          # PATCH marcar leído
│   │   │
│   │   └── pedidos/
│   │       ├── route.ts              # GET, POST pedidos
│   │       └── [id]/
│   │           ├── route.ts          # GET, PATCH pedido
│   │           └── items/
│   │               └── route.ts      # GET, POST items del pedido
│   │
│   └── (dashboard)/
│       ├── layout.tsx                # Layout de dashboard (sidebar)
│       │
│       ├── clientes/
│       │   ├── page.tsx              # Listar clientes
│       │   ├── nuevo/
│       │   │   └── page.tsx          # Crear cliente
│       │   └── [id]/
│       │       └── page.tsx          # Ver detalle cliente + stickers
│       │
│       ├── productos/
│       │   ├── page.tsx              # Listar productos
│       │   └── nuevo/
│       │       └── page.tsx          # Crear producto
│       │
│       ├── ventas/
│       │   ├── page.tsx              # Listar ventas
│       │   └── nueva/
│       │       └── page.tsx          # Crear venta (IMPORTANTE)
│       │
│       ├── notificaciones/
│       │   └── page.tsx              # Bandeja de notificaciones
│       │
│       ├── pedidos/
│       │   ├── page.tsx              # Listar pedidos
│       │   ├── nuevo/
│       │   │   └── page.tsx          # Crear pedido
│       │   └── [id]/
│       │       └── page.tsx          # Ver detalle pedido
│       │
│       └── dashboard/
│           └── page.tsx              # Dashboard con KPIs
│
├── components/
│   ├── Layout.tsx                    # Wrapper layout
│   ├── Navbar.tsx                    # Barra superior
│   ├── Sidebar.tsx                   # Menú lateral
│   │
│   ├── forms/
│   │   ├── ClienteForm.tsx           # Form crear/editar cliente
│   │   ├── ProductoForm.tsx          # Form crear/editar producto
│   │   ├── VentaForm.tsx             # Form crear venta
│   │   └── PedidoForm.tsx            # Form crear pedido
│   │
│   ├── tables/
│   │   ├── ClientesTable.tsx         # Tabla de clientes
│   │   ├── ProductosTable.tsx        # Tabla de productos
│   │   ├── VentasTable.tsx           # Tabla de ventas
│   │   └── PedidosTable.tsx          # Tabla de pedidos
│   │
│   ├── cards/
│   │   ├── NotificacionCard.tsx      # Card notificación + copiar
│   │   ├── StickerCard.tsx           # Card estado stickers
│   │   ├── ClienteCard.tsx           # Card resumen cliente
│   │   └── KPICard.tsx               # Card KPI (números)
│   │
│   └── ui/
│       ├── Button.tsx                # Botón reutilizable
│       ├── Input.tsx                 # Input reutilizable
│       ├── Modal.tsx                 # Modal
│       └── Loading.tsx               # Spinner
│
├── lib/
│   ├── supabase.ts                   # Configuración cliente Supabase
│   │
│   ├── hooks/
│   │   ├── useClientes.ts            # Hook para clientes
│   │   ├── useProductos.ts           # Hook para productos
│   │   ├── useVentas.ts              # Hook para ventas
│   │   ├── useNotificacionesAdmin.ts # Hook para notificaciones (real-time)
│   │   └── usePedidos.ts             # Hook para pedidos
│   │
│   ├── utils/
│   │   ├── formatters.ts             # formatCurrency, calcularStickers, etc
│   │   ├── validators.ts             # validarTeléfono, validarEmail, etc
│   │   └── helpers.ts                # funciones auxiliares
│   │
│   └── types/
│       └── index.ts                  # Tipos TypeScript (Cliente, Venta, etc)
│
├── public/
│   └── (imágenes, logos, etc)
│
├── .env.local                        # Variables de entorno (NO SUBIR)
├── .env.example                      # Template de .env
├── .gitignore                        # Archivos a ignorar en Git
├── package.json                      # Dependencias
├── tsconfig.json                     # Config TypeScript
├── tailwind.config.ts                # Config Tailwind
└── next.config.ts                    # Config Next.js
```

---

## 2️⃣ BASE DE DATOS (SUPABASE)

### Diagrama de Tablas y Relaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                       │
│  │  clientes    │◄────────│   ventas     │                       │
│  ├──────────────┤         ├──────────────┤                       │
│  │ id (UUID)    │         │ id (UUID)    │                       │
│  │ nombre       │         │ cliente_id   │                       │
│  │ telefono     │         │ producto_id  │                       │
│  │ email        │         │ cantidad     │                       │
│  │ fecha_nac    │         │ total        │                       │
│  │ monto_acum.. │         │ fecha        │                       │
│  │ stickers_ac..│         └──────────────┘                       │
│  │ total_gastado│                ▲                               │
│  │ tarjetas_com.│                │                               │
│  │ premios_gan..│                │                               │
│  └──────────────┘         ┌──────┴──────────┐                    │
│         ▲                 │                 │                    │
│         │         ┌───────┴────────┐   ┌────┴────────┐           │
│         │         │                │   │             │           │
│  ┌──────┴───────┐ ▼                ▼   ▼             ▼           │
│  │notificaciones│┌────────────┐  ┌──────────────┐               │
│  │    _admin    ││ productos  │  │ movimientos  │               │
│  ├──────────────┤├────────────┤  │ _inventario  │               │
│  │ id           ││ id (UUID)  │  ├──────────────┤               │
│  │ cliente_id   ││ sku        │  │ id           │               │
│  │ tipo         ││ nombre     │  │ producto_id  │               │
│  │ asunto       ││ precio_v..1││ tipo (ent/sal)│               │
│  │ cuerpo_mens..││ stock_act..││ cantidad     │               │
│  │ visto        ││ activo     │  │ venta_id     │               │
│  │ fecha_cre... ││ fecha_cre..││ fecha        │               │
│  └──────────────┘└────────────┘  └──────────────┘               │
│         ▲                                                         │
│         │                                                         │
│  ┌──────┴────────────┐                                           │
│  │ premios_stickers  │                                           │
│  ├───────────────────┤                                           │
│  │ id                │                                           │
│  │ cliente_id        │                                           │
│  │ stickers_alcan... │ (5 o 10)                                 │
│  │ premio_monto      │ (12 o 25)                                │
│  │ monto_acum_cuand..│                                           │
│  │ estado_canje      │                                           │
│  │ fecha_ganado      │                                           │
│  │ fecha_canjeado    │                                           │
│  └───────────────────┘                                           │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────┐             │
│  │      pedidos             │◄─│  pedido_items    │             │
│  ├──────────────────────────┤  ├──────────────────┤             │
│  │ id, numero, cliente_id   │  │ id, pedido_id    │             │
│  │ estado, total_pedido     │  │ plataforma       │             │
│  │ total_abonado            │  │ producto, precio │             │
│  │ saldo_pendiente          │  │ estado_item      │             │
│  └──────────────────────────┘  └──────────────────┘             │
│                                                                   │
│  ┌──────────────────────────┐  ┌──────────────────┐             │
│  │   abonos_pedido          │  │   transacciones  │             │
│  ├──────────────────────────┤  ├──────────────────┤             │
│  │ id, pedido_id, monto     │  │ id, tipo, monto  │             │
│  │ fecha_abono, metodo_pago │  │ categoria, fecha │             │
│  └──────────────────────────┘  └──────────────────┘             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tablas Principales

| Tabla | Propósito | Relaciones |
|---|---|---|
| **clientes** | Datos de clientes + stickers actuales | ← ventas, premios_stickers, notificaciones |
| **productos** | Inventario | ← ventas, movimientos_inventario |
| **ventas** | Registro de ventas (genera stickers automático) | cliente_id → clientes, producto_id → productos |
| **premios_stickers** | Historial de premios ganados ($12, $25) | cliente_id → clientes |
| **notificaciones_admin** | Bandeja para copiar/pegar en WhatsApp | cliente_id → clientes |
| **pedidos** | Órdenes de clientes (Shein, Temu, Amazon) | cliente_id → clientes |
| **pedido_items** | Líneas de detalle de pedidos | pedido_id → pedidos |
| **abonos_pedido** | Pagos parciales de pedidos | pedido_id → pedidos |
| **movimientos_inventario** | Auditoría de stock | producto_id → productos |
| **transacciones** | Ingresos/egresos financieros | — |

---

## 3️⃣ FLUJO DE DATOS (Cómo interactúan los componentes)

### Flujo 1: Crear Venta (el más importante)

```
┌─────────────────┐
│  ADMIN          │
│ Abre navegador  │
│ localhost:3000  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ PÁGINA: /ventas/nueva                   │
│ ┌──────────────────────────────────────┐│
│ │ <VentaForm>                          ││
│ │ - Autocomplete cliente               ││
│ │ - Autocomplete producto              ││
│ │ - Input cantidad, precio, descuento  ││
│ │ - Button "Crear Venta"               ││
│ └──────────────────────────────────────┘│
└────────┬────────────────────────────────┘
         │ Admin rellena form y clic "Crear"
         │
         ▼
┌─────────────────────────────────────────┐
│ Hook: useVentas()                       │
│ fetch('POST /api/ventas', {             │
│   cliente_id,                           │
│   producto_id,                          │
│   cantidad,                             │
│   total                                 │
│ })                                      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ BACKEND: POST /api/ventas/route.ts      │
│ 1. Valida datos                         │
│ 2. Calcula total = (precio × cant) - desc
│ 3. INSERT en tabla ventas               │
│ 4. Retorna venta creada + datos cliente │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ SUPABASE TRIGGER (automático)           │
│ registrar_venta_con_stickers()          │
│                                         │
│ 1. INSERT movimientos_inventario        │
│ 2. UPDATE productos (stock - cantidad)  │
│ 3. Sumar monto a cliente:               │
│    - nuevo_monto = anterior + total     │
│    - stickers = FLOOR(nuevo_monto / 50)│
│                                         │
│ 4. Si ganó premio (5 o 10):             │
│    - INSERT en premios_stickers         │
│    - INSERT en notificaciones_admin     │
│                                         │
│ 5. UPDATE cliente:                      │
│    - monto_acumulado_tarjeta = X        │
│    - stickers_actuales = X              │
│    - total_moneda_gastada += total      │
│    - si completó tarjeta: resetea todo  │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ SUPABASE (BD actualizada)               │
│ - Venta creada                          │
│ - Stock descontado                      │
│ - Stickers actualizados                 │
│ - Notificación generada (si ganó premio)│
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ FRONTEND recibe respuesta                │
│ "¡Venta creada!"                        │
│ Limpia formulario                       │
│ Redirecciona a /ventas                  │
└─────────────────────────────────────────┘
```

### Flujo 2: Ver Notificaciones

```
┌─────────────────┐
│  ADMIN          │
│ /notificaciones │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────┐
│ PÁGINA: notificaciones/page.tsx  │
│ useNotificacionesAdmin()         │
└────────┬─────────────────────────┘
         │ Hook hace fetch en useEffect
         │
         ▼
┌──────────────────────────────────┐
│ Hook: useNotificacionesAdmin()   │
│ fetch('GET /api/notificaciones')│
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ BACKEND: GET /api/notificaciones/route.ts
│ SELECT * FROM notificaciones_admin       │
│ WHERE visto = false                      │
│ ORDER BY fecha_creacion DESC             │
│                                          │
│ Retorna JSON con notificaciones          │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ FRONTEND: Renderiza lista de notificaciones
│                                          │
│ Para cada notificación:                  │
│ ┌─ <NotificacionCard>                   │
│ │  - Icono (🎂 🎁 📦)                   │
│ │  - Asunto                              │
│ │  - Cliente + teléfono                  │
│ │  - Mensaje formateado                  │
│ │  - Button [📋 Copiar]                  │
│ │  - Button [✓ Marcar leído]             │
│ └─                                       │
└────────┬─────────────────────────────────┘
         │
         ├─ Admin clic [📋 Copiar]
         │  → navigator.clipboard.writeText()
         │  → Mensaje en clipboard
         │
         └─ Admin clic [✓ Marcar leído]
            → PATCH /api/notificaciones/[id]
            → UPDATE notificaciones_admin SET visto=true
            → Notificación desaparece de lista
```

### Flujo 3: Stickers al llegar a $250 y $500

```
VENTA 1: $50
├─ monto_acum = $50
├─ stickers = 1
└─ sin evento

VENTA 2: $80 más
├─ monto_acum = $130
├─ stickers = 2
└─ sin evento

...más ventas...

VENTA N-1: $32 más
├─ monto_acum = $248
├─ stickers = 4
└─ sin evento

VENTA N: $8 más
├─ monto_acum = $256 ✅
├─ stickers = 5 ✅ PREMIO $12
├─ TRIGGER detecta: 4 → 5
├─ INSERT premios_stickers (5 stickers, $12)
├─ INSERT notificaciones_admin ("🎁 Cliente ganó $12")
├─ No resetea (continúa en sticker 5)
└─ Admin ve notificación en bandeja

...más ventas...

VENTA M-1: $254 más
├─ monto_acum = $510
├─ stickers = 10 ✅ PREMIO $25 + RESETEA
├─ TRIGGER detecta: X → 10
├─ INSERT premios_stickers (10 stickers, $25)
├─ INSERT notificaciones_admin ("🎁 TARJETA COMPLETADA!")
├─ RESETEA:
│  ├─ monto_acumulado_tarjeta = 0
│  ├─ stickers_actuales = 0
│  └─ total_tarjetas_completadas += 1
└─ Admin ve notificación especial

VENTA NUEVA:
├─ monto_acum = (nuevo_monto)
├─ stickers = (nuevo monto / 50)
└─ Nueva tarjeta en progreso...
```

---

## 4️⃣ COMPONENTES PRINCIPALES

### Frontend Components

```
Layout
├── Navbar
│   └── Logo + Menú usuario
└── Sidebar
    ├── 📊 Dashboard
    ├── 👥 Clientes
    ├── 📦 Productos
    ├── 💰 Ventas
    ├── 📬 Notificaciones
    └── 📋 Pedidos

Páginas
├── /clientes
│   ├── ClientesTable (muestra lista)
│   └── Botones: Nuevo, Ver, Editar, Eliminar
├── /clientes/nuevo
│   └── ClienteForm
├── /clientes/[id]
│   ├── Datos cliente
│   ├── StickerCard (estado actual)
│   ├── HistóricoCard (totales)
│   └── PremiosGanadosCard
├── /productos
│   └── ProductosTable
├── /ventas
│   ├── VentasTable
│   └── Botón: Nueva venta
├── /ventas/nueva
│   └── VentaForm (autocompletes, cálculos)
├── /notificaciones
│   └── NotificacionCard[]
│       ├── Icono + asunto
│       ├── Mensaje
│       ├── [Copiar]
│       └── [Marcar leído]
└── /pedidos
    ├── PedidosTable
    └── Acciones
```

### Hooks (React Custom Hooks)

```
useClientes()
├─ fetch('/api/clientes')
├─ Estados: clientes[], loading, error
├─ Métodos: fetchClientes, crearCliente, eliminarCliente

useProductos()
├─ fetch('/api/productos')
├─ Estados: productos[], loading, error
├─ Métodos: fetchProductos, crearProducto

useVentas(clienteId?)
├─ fetch('/api/ventas')
├─ Estados: ventas[], loading, error
├─ Métodos: fetchVentas, crearVenta

useNotificacionesAdmin()
├─ fetch('/api/notificaciones')
├─ Real-time: Supabase subscription
├─ Estados: notificaciones[], loading
├─ Métodos: refetch, marcarComoLeida

usePedidos(clienteId?)
├─ fetch('/api/pedidos')
├─ Estados: pedidos[], loading
├─ Métodos: fetchPedidos, crearPedido, cambiarEstado
```

---

## 5️⃣ ENDPOINTS API

### CLIENTES

```
GET    /api/clientes
       ← lista de clientes
       
POST   /api/clientes
       → nombre, telefono, email, fecha_nacimiento
       ← cliente creado
       
GET    /api/clientes/[id]
       ← cliente + premios + últimas ventas
       
PATCH  /api/clientes/[id]
       → campos a actualizar
       ← cliente actualizado
       
DELETE /api/clientes/[id]
       ← cliente marcado como inactivo
       
GET    /api/clientes/[id]/stickers
       ← estado_actual + historico + premios_ganados
```

### PRODUCTOS

```
GET    /api/productos
       ← lista de productos
       
POST   /api/productos
       → sku, nombre, precio_costo, precio_venta, stock
       ← producto creado
       
PATCH  /api/productos/[id]
       → campos a actualizar
       ← producto actualizado
```

### VENTAS ⭐

```
GET    /api/ventas?cliente_id=X
       ← lista de ventas (filtrable por cliente)
       
POST   /api/ventas ← ⭐ EL MÁS IMPORTANTE
       → cliente_id, producto_id, cantidad, precio_unitario, descuento
       
       TRIGGER AUTOMÁTICO en BD:
       ├─ INSERT movimientos_inventario
       ├─ UPDATE productos (stock)
       ├─ Suma monto a cliente
       ├─ Calcula stickers
       ├─ Si ganó premio: INSERT notificaciones
       └─ UPDATE cliente
       
       ← venta creada + cliente actualizado
```

### NOTIFICACIONES

```
GET    /api/notificaciones?visto=false
       ← lista de notificaciones pendientes
       
PATCH  /api/notificaciones/[id]
       → (no necesita body)
       ← marca como leída (visto=true, fecha_leido=now)
```

### PEDIDOS

```
GET    /api/pedidos
       ← lista de pedidos
       
POST   /api/pedidos
       → cliente_id, estado, total_articulos, costo_envio
       ← pedido creado
       
PATCH  /api/pedidos/[id]
       → estado
       ← TRIGGER automático genera notificación
```

---

## 6️⃣ AUTOMATIZACIONES (BD)

### TRIGGER 1: Venta → Stickers + Notificaciones

**Se ejecuta:** Cuando se inserta una fila en `ventas`

**Qué hace:**
1. Registra movimiento de inventario
2. Descuenta stock del producto
3. Suma monto al cliente
4. Calcula stickers: FLOOR(monto_nuevo / 50)
5. Si pasó de <5 a ≥5 stickers:
   - Crea premio ($12)
   - Genera notificación admin
6. Si pasó de <10 a ≥10 stickers:
   - Crea premio ($25)
   - Genera notificación admin especial
   - Resetea monto y stickers a 0

### TRIGGER 2: Cambio estado pedido → Notificación

**Se ejecuta:** Cuando cambia `estado` en tabla `pedidos`

**Qué hace:**
1. Obtiene datos del cliente y pedido
2. Construye mensaje con artículos + precios + saldo
3. Crea notificación admin lista para copiar/pegar

### CRON: Cumpleaños Diario

**Se ejecuta:** Todos los días 7:00 AM SV (13:00 UTC)

**Qué hace:**
1. Busca clientes que cumplen años HOY
2. Crea notificación admin para cada uno
3. Mensaje preformateado para copiar/pegar en WhatsApp

---

## 7️⃣ TIPOS (TypeScript)

```typescript
interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  fecha_nacimiento?: Date;
  monto_acumulado_tarjeta: number;
  stickers_actuales: number;
  total_moneda_gastada: number;
  total_tarjetas_completadas: number;
  total_premios_ganados: number;
  acepta_notificaciones: boolean;
  fecha_registro: Date;
  activo: boolean;
}

interface Producto {
  id: string;
  sku: string;
  nombre: string;
  categoria?: string;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

interface Venta {
  id: string;
  cliente_id?: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  total: number;
  metodo_pago?: string;
  fecha: Date;
}

interface PremioSticker {
  id: string;
  cliente_id: string;
  stickers_alcanzados: 5 | 10;
  premio_monto: 12 | 25;
  monto_acumulado_cuando_gano: number;
  estado_canje: 'disponible' | 'canjeado' | 'expirado';
  fecha_ganado: Date;
  fecha_canjeado?: Date;
}

interface NotificacionAdmin {
  id: string;
  cliente_id: string;
  tipo: 'cumpleanos' | 'sticker_ganado' | 'estado_pedido' | 'item_no_disponible';
  asunto: string;
  cuerpo_mensaje: string;
  visto: boolean;
  fecha_creacion: Date;
  fecha_leido?: Date;
}

interface Pedido {
  id: string;
  numero: number;
  cliente_id: string;
  estado: 'cotizacion' | 'confirmado' | 'en_transito' | 'entregado' | 'completado';
  total_articulos: number;
  costo_envio: number;
  total_pedido: number;
  total_abonado: number;
  saldo_pendiente: number;
}
```

---

## 8️⃣ FLUJO COMPLETO: Desde que entra el admin hasta que ve resultado

```
1️⃣ ADMIN ENTRA AL SISTEMA
   ↓
   http://localhost:3000
   ↓
   Ve Dashboard con Navbar + Sidebar

2️⃣ ADMIN VA A CREAR VENTA
   ↓
   Clic "/ventas/nueva"
   ↓
   Abre página VentaForm

3️⃣ ADMIN LLENA FORMULARIO
   ├─ Autocomplete: Selecciona cliente "María"
   ├─ Autocomplete: Selecciona producto "Blusa" ($12)
   ├─ Input: Cantidad = 1
   ├─ Input: Se auto-calcula precio
   ├─ Input: Descuento = 0
   ├─ Select: Método pago = "Efectivo"
   ├─ Muestra: Total = $12, Stickers a ganar = 0 (falta $38 para 1)
   └─ Clic "Crear Venta"

4️⃣ FRONTEND ENVÍA DATOS
   ├─ POST /api/ventas
   ├─ Body: {cliente_id, producto_id, cantidad, precio_unitario, total}
   └─ Muestra loading spinner

5️⃣ BACKEND PROCESA
   ├─ Valida datos
   ├─ Calcula total
   ├─ INSERT en ventas table
   └─ Retorna venta + datos cliente actualizados

6️⃣ BD TRIGGER AUTOMÁTICO
   ├─ Suma $12 a cliente (monto_anterior + $12)
   ├─ Calcula stickers: FLOOR(nuevo_monto / 50)
   ├─ Si no ganó premio: sin evento
   ├─ Si ganó premio ($250 o $500):
   │  ├─ INSERT en premios_stickers
   │  ├─ INSERT en notificaciones_admin
   │  └─ Si $500: resetea todo
   └─ UPDATE cliente con nuevos valores

7️⃣ FRONTEND RECIBE RESPUESTA
   ├─ "¡Venta creada!"
   ├─ Limpia formulario
   ├─ Redirige a /ventas
   └─ Página actualiza lista de ventas

8️⃣ ADMIN VE RESULTADO
   ├─ Nueva venta en la lista
   ├─ Stickers del cliente actualizados (si ve detalle)
   └─ Si ganó premio:
      ├─ Clic /notificaciones
      ├─ Ve: "🎁 María ganó $12"
      ├─ Clic [📋 Copiar]
      ├─ Abre WhatsApp
      ├─ Pega mensaje
      ├─ Envía
      └─ Vuelve y clic [✓ Marcar leído]
```

---

## 9️⃣ SEGURIDAD Y VALIDACIONES

### En BACKEND

```
POST /api/ventas

VALIDACIONES:
✅ cliente_id obligatorio
✅ producto_id obligatorio
✅ cantidad > 0
✅ precio_unitario > 0
✅ cliente existe en BD
✅ producto existe en BD
✅ stock suficiente
✅ total calculado correctamente

ERROR HANDLING:
❌ 400: Datos incompletos
❌ 404: Cliente o producto no encontrado
❌ 409: Stock insuficiente
❌ 500: Error interno servidor
```

### En FRONTEND

```
VentaForm

VALIDACIONES:
✅ Cliente seleccionado
✅ Producto seleccionado
✅ Cantidad >= 1
✅ Precio > 0

FEEDBACK:
✅ Spinner mientras envía
✅ Mensaje error si falla
✅ Confirmación si éxito
```

### En BD (SQL)

```
CONSTRAINTS:
✅ cliente_id NOT NULL
✅ producto_id NOT NULL REFERENCES productos(id)
✅ cantidad > 0 CHECK
✅ total > 0 CHECK
✅ Teléfono UNIQUE en clientes
✅ SKU UNIQUE en productos

TRIGGERS:
✅ Validar stickers solo en clientes activos
✅ Impedir crear venta si producto inactivo
✅ Cascade delete de ventas si se elimina producto
```

---

## 🔟 ESTADO Y CHECKPOINTS

### Estado Actual en Base de Datos

**Después de Fase 2 (SQL setup):**
- ✅ 10 tablas creadas
- ✅ Índices creados
- ✅ Relaciones (FKs) activas
- ✅ pg_cron habilitado

**Después de Fases 5-8 (Backend):**
- ✅ 6+ endpoints funcionando
- ✅ Triggers ejecutándose automáticamente
- ✅ Notificaciones generándose

**Después de Fases 9-11 (Frontend):**
- ✅ Todas las páginas renderizando
- ✅ Formularios enviando datos
- ✅ Datos actualizándose en tiempo real
- ✅ Sistema 100% funcional

---

## 📊 RESUMEN VISUAL

```
                    USUARIO FINAL (ADMIN)
                           │
                           ▼
        ┌──────────────────────────────────┐
        │    INTERFAZ (React Components)   │
        │  Páginas, Forms, Tables, Cards   │
        └────────────┬─────────────────────┘
                     │
                     ▼ (FETCH)
        ┌──────────────────────────────────┐
        │    API BACKEND (Next.js Routes)  │
        │  /api/clientes, /api/ventas, etc │
        └────────────┬─────────────────────┘
                     │
                     ▼ (SQL)
        ┌──────────────────────────────────┐
        │  DATABASE (Supabase PostgreSQL)  │
        │  - Tablas                        │
        │  - Triggers (automáticos)        │
        │  - CRON (diarios)                │
        └──────────────────────────────────┘

AUTOMATIZACIONES:
├─ Venta → Stickers + Notificación
├─ Cambio estado → Notificación
└─ 7:00 AM → Cumpleaños notificación
```

---

## 🎯 CONCEPTOS CLAVE

| Concepto | Qué es | Dónde | Por qué |
|---|---|---|---|
| **Trigger** | Código SQL que se ejecuta automáticamente | BD | Calcula stickers sin que el frontend lo pida |
| **Hook** | Función React reutilizable | Frontend | Hace fetch a API y maneja estado |
| **Endpoint** | URL que retorna datos | Backend | Intermediario entre frontend y BD |
| **Real-time** | Datos actualizados al instante | Supabase | Bandeja de notificaciones siempre fresca |
| **Notificación** | Mensaje para que admin copie/pegue | BD → Frontend | Admin no envía automáticamente (control) |

---