const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const productos = require("./routes/productos");
const pedidosRoutes = require("./routes/pedidos");

// Cargamos la ruta de clientes de forma segura
let clientes;
try {
  clientes = require("./routes/clientes");
} catch (e) {
  console.warn("⚠️ Advertencia: No se encontró el archivo ./routes/clientes.js. Ignorando ruta.");
}

const cors = require("cors");
const db = require("./db");

const app = express();

// Verificar configuración crítica
if (!process.env.ADMIN_PASSWORD) {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ ADVERTENCIA: ADMIN_PASSWORD no está definido en el .env (No podrás loguearte)");
}
if (!process.env.ADMIN_API_KEY) {
  console.warn("\x1b[33m%s\x1b[0m", "⚠️ ADVERTENCIA: ADMIN_API_KEY no está definido en el .env (No podrás guardar productos)");
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "publico")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Endpoint de Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const API_KEY = process.env.ADMIN_API_KEY;

  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, apiKey: API_KEY });
  }

  res.status(401).json({ error: "Contraseña incorrecta" });
});

// Rutas principales
app.use("/api/productos", productos);
if (clientes) app.use("/api/clientes", clientes);
app.use("/api/pedidos", pedidosRoutes);

// Manejo de rutas API no encontradas
app.all(/\/api\/.*/, (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Ruta para el panel de administración
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "publico", "admin.html"));
});

// La raíz y cualquier otra ruta cargan el index.html (Página del Cliente)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "publico", "index.html"), (err) => {
    if (err) {
      res.status(404).send("Error: El archivo index.html no existe en la carpeta publico.");
    }
  });
});

// Puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  
  // Verificación automática de la base de datos al arrancar
  db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    .then(res => {
      const tablas = res.rows.map(r => r.table_name);
      if (tablas.length > 0) {
        console.log("✅ Conexión a DB exitosa. Tablas detectadas:", tablas.join(", "));
      } else {
        console.warn("⚠️ Conexión a DB exitosa pero NO se encontraron tablas. ¿Ejecutaste el archivo .sql?");
      }
    })
    .catch(err => console.error(" Error crítico conectando a la base de datos:", err.message));
});