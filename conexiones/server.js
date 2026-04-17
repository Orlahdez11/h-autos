require("dotenv").config();
const express = require("express");
const productos = require("./routes/productos");
const pedidosRoutes = require("./routes/pedidos");
const clientes = require("./routes/clientes");
const path = require("path");
const cors = require("cors");

const app = express();

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
app.use("/api/clientes", clientes);
app.use("/api/pedidos", pedidosRoutes);

// Manejo de rutas no encontradas (404)
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "publico", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});