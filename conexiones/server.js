const express = require("express");
const productos = require("./routes/productos");
const clientes = require("./routes/clientes");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "publico")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Rutas principales
app.use("/api/productos", productos);
app.use("/api/clientes", clientes);

// Rutas de productos (Siguen públicas para GET, pero podrías proteger los POST/PUT/DELETE)
app.use("/api/productos", productos);
// Rutas de pedidos y clientes (La protección se maneja dentro de cada router ahora)
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/clientes", clientes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});