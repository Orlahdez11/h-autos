-- 1. Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0,
    imagen TEXT,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN DEFAULT true,
    creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Clientes (para el registro previo al checkout)
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Pedidos
-- Nota: El campo 'cliente' guarda el nombre del cliente como texto, 
-- tal como lo definimos en tu lógica de pedidos.js
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(255) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pagado',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Items del Pedido (Relación muchos a muchos)
CREATE TABLE IF NOT EXISTS pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    producto_nombre VARCHAR(255),
    cantidad INTEGER NOT NULL,
    precio NUMERIC(12, 2) NOT NULL
);

-- Índices para mejorar el rendimiento de las búsquedas
CREATE INDEX idx_productos_nombre ON productos (LOWER(nombre));
CREATE INDEX idx_pedidos_fecha ON pedidos (fecha DESC);

-- Inserción de prueba (Opcional)
-- INSERT INTO productos (nombre, descripcion, precio, imagen, stock) 
-- VALUES ('Producto de Ejemplo', 'Descripción breve', 1500.00, 'https://res.cloudinary.com/...', 10);