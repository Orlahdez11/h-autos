const express = require("express");
const productos = require("./routes/productos");
const pedidosRoutes = require("./routes/pedidos");
const clientes = require("./routes/clientes");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const app = express();

// ===============================
// 🔑 CLAVE SECRETA DE ADMIN
// ===============================
const API_KEY = "hcars-admin-2024"; // ← cámbiala por una que solo tú sepas

function soloAdmin(req, res, next) {
  const clave = req.headers["x-api-key"];
  if (clave !== API_KEY) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "publico")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api", (req, res) => {
  res.json({ mensaje: "API H-CARS funcionando" });
});

// ✅ TOTALMENTE PÚBLICA — cualquiera puede ver, agregar, editar y eliminar
app.use("/api/productos", productos);

// 🔒 PRIVADAS — solo tú con la API key
app.use("/api/pedidos", soloAdmin, pedidosRoutes);
app.use("/api/clientes", soloAdmin, clientes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});