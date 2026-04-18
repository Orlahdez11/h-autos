const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const productos = require("./routes/productos");
const { authAdmin } = require("./auth");
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

// Definir rutas absolutas para evitar errores en Render
const publicPath = path.resolve(__dirname, "..", "publico");
app.use(express.static(publicPath));
app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")));

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

// Endpoint para verificar si la API_KEY es válida
app.get("/api/auth/verify", authAdmin, (req, res) => {
  res.json({ valid: true });
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
  res.sendFile(path.join(publicPath, "admin.html"));
});

// Ruta catch-all: Cualquier ruta que no sea API o archivos estáticos sirve el index.html
// Usamos la sintaxis de Express 5 para capturar todo
app.get(/(.*)/, (req, res) => {
  const indexPath = path.join(publicPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`❌ ERROR DE RUTA: No se pudo enviar index.html desde la ruta: ${indexPath}`);
      // Esto nos dirá en los logs de Render qué hay realmente en esa carpeta
      if (fs.existsSync(publicPath)) {
        console.log("📂 Contenido real de la carpeta publico en el servidor:", fs.readdirSync(publicPath));
      } else {
        console.error("⚠️ ADVERTENCIA CRÍTICA: La carpeta 'publico' NO existe en el directorio raíz.");
      }
      res.status(404).json({ error: "El frontend no está disponible. Revisa los logs de Render." });
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