-- Esquema D1 para "La Polla"

-- Tabla de Configuración (solo un registro)
CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    admin_whatsapp TEXT NOT NULL,
    admin_alias TEXT NOT NULL,
    admin_titular TEXT NOT NULL,
    admin_user TEXT NOT NULL,
    admin_password TEXT NOT NULL
);

-- Insertar configuración inicial por defecto (la contraseña es un hash de "admin", pero por simplicidad inicial, texto plano si se maneja desde backend, aunque lo mejor es hash, aquí se inserta "admin" plano por ahora y en el endpoint lo validamos)
INSERT OR IGNORE INTO configuracion (id, admin_whatsapp, admin_alias, admin_titular, admin_user, admin_password) 
VALUES (1, '5491100000000', 'mi.alias.mp', 'Juan Pérez', 'admin', 'admin');

-- Tabla de Jugadores
CREATE TABLE IF NOT EXISTS jugadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL,
    telefono TEXT UNIQUE NOT NULL,
    dni_cuil TEXT,
    alias_para_cobrar TEXT NOT NULL,
    titular_cuenta TEXT NOT NULL,
    lineas_gratis_disponibles INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Sorteos
CREATE TABLE IF NOT EXISTS sorteos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_referencia TEXT NOT NULL,
    estado TEXT CHECK(estado IN ('Abierto', 'Cerrado')) DEFAULT 'Abierto',
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME
);

-- Tabla de Sorteos Diarios (Resultados)
CREATE TABLE IF NOT EXISTS sorteos_diarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sorteo_id INTEGER NOT NULL,
    dia_semana TEXT NOT NULL, -- ej: 'Lunes'
    fecha_dia TEXT NOT NULL, -- ej: '2023-10-25'
    numeros_ganadores_dia TEXT NOT NULL, -- ej: '12,34,55,89'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sorteo_id) REFERENCES sorteos(id)
);

-- Tabla de Jugadas (Líneas compradas)
CREATE TABLE IF NOT EXISTS jugadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jugador_id INTEGER NOT NULL,
    sorteo_id INTEGER NOT NULL,
    numeros_elegidos TEXT NOT NULL, -- ej: '01,15,22,33,45,55,66,77,88,99'
    pagada BOOLEAN DEFAULT 0,
    es_linea_gratis BOOLEAN DEFAULT 0,
    aciertos_actuales INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jugador_id) REFERENCES jugadores(id),
    FOREIGN KEY (sorteo_id) REFERENCES sorteos(id)
);

-- Tabla de Auditoria
CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla TEXT NOT NULL,
    accion TEXT NOT NULL CHECK(accion IN ('INSERT', 'UPDATE', 'DELETE')),
    registro_id INTEGER,
    detalles TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_usuario TEXT DEFAULT 'Sistema'
);
