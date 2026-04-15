const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const path = require("path");

// --- CONFIGURAR MULTER (ruta absoluta) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "..", "uploads")),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

// ===============================
// 🔧 FUNCIÓN PARA LIMPIAR PRECIOS
// ===============================
function limpiarPrecio(valor) {
    if (!valor) return 0;
    return Number(String(valor).replace(/,/g, ""));
}

// ===============================
// 📌 OBTENER TODOS LOS PRODUCTOS
//    Soporta filtros por query params:
//    ?nombre=toyota
//    ?precio_min=100000
//    ?precio_max=500000
//    ?stock_min=1        (solo con stock disponible)
//    Ejemplo combinado:
//    /api/productos?precio_max=400000&stock_min=1
// ===============================
router.get("/", async (req, res) => {
    try {
        const { nombre, precio_min, precio_max, stock_min } = req.query;

        // Construcción dinámica del WHERE
        let condiciones = ["activo = true"];
        let valores = [];
        let i = 1;

        if (nombre) {
            condiciones.push(`LOWER(nombre) LIKE $${i++}`);
            valores.push(`%${nombre.toLowerCase()}%`);
        }

        if (precio_min) {
            condiciones.push(`precio >= $${i++}`);
            valores.push(Number(precio_min));
        }

        if (precio_max) {
            condiciones.push(`precio <= $${i++}`);
            valores.push(Number(precio_max));
        }

        if (stock_min) {
            condiciones.push(`stock >= $${i++}`);
            valores.push(Number(stock_min));
        }

        const where = condiciones.join(" AND ");

        const result = await db.query(
            `SELECT id, nombre, descripcion, precio::numeric, imagen, stock, activo
             FROM productos
             WHERE ${where}
             ORDER BY id DESC`,
            valores
        );

        const productos = result.rows.map(p => ({
            ...p,
            precio: Number(p.precio)
        }));

        res.json(productos);
    } catch (err) {
        console.error("Error al obtener productos:", err);
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

// ===============================
// 📌 AGREGAR PRODUCTO
// ===============================
router.post("/", upload.single("imagen"), async (req, res) => {
    let { nombre, descripcion, precio, stock } = req.body;

    precio = limpiarPrecio(precio);
    stock = Number(stock);

    const imagen = req.file ? "/uploads/" + req.file.filename : null;

    await db.query(
        "INSERT INTO productos (nombre, descripcion, precio, imagen, stock, activo) VALUES ($1,$2,$3,$4,$5, true)",
        [nombre, descripcion, precio, imagen, stock]
    );

    res.json({ mensaje: "Producto agregado correctamente" });
});

// ===============================
// 📌 EDITAR PRODUCTO
// ===============================
router.put("/:id", upload.single("imagen"), async (req, res) => {
    const { id } = req.params;
    let { nombre, descripcion, precio, stock } = req.body;

    precio = limpiarPrecio(precio);
    stock = Number(stock);

    try {
        const result = await db.query(
            "SELECT imagen FROM productos WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        let imagenFinal = result.rows[0].imagen;
        if (req.file) imagenFinal = "/uploads/" + req.file.filename;

        await db.query(
            `UPDATE productos 
             SET nombre=$1, descripcion=$2, precio=$3, stock=$4, imagen=$5
             WHERE id=$6`,
            [nombre, descripcion, precio, stock, imagenFinal, id]
        );

        res.json({ mensaje: "Producto actualizado correctamente" });

    } catch (error) {
        console.error("ERROR AL ACTUALIZAR:", error);
        res.status(500).json({ error: "Error al actualizar producto" });
    }
});

// ===============================
// 📌 DESACTIVAR PRODUCTO
// ===============================
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query(
            "UPDATE productos SET activo = false WHERE id = $1",
            [id]
        );
        res.json({ mensaje: "Producto desactivado correctamente" });
    } catch (error) {
        console.error("Error desactivando producto:", error);
        res.status(500).json({ error: "Error al desactivar producto" });
    }
});

// ===============================
// 📌 RESTAR STOCK
// ===============================
router.put("/restar-stock/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            `UPDATE productos 
             SET stock = stock - 1 
             WHERE id = $1 AND stock > 0
             RETURNING stock`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.json({ error: "Sin stock disponible" });
        }

        res.json({ mensaje: "Stock actualizado", stock: Number(result.rows[0].stock) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar stock" });
    }
});

// ===============================
// 📌 SUMAR STOCK
// ===============================
router.put("/sumar-stock/:id/:cantidad", async (req, res) => {
    const { id, cantidad } = req.params;

    try {
        await db.query(
            `UPDATE productos 
             SET stock = stock + $2
             WHERE id = $1`,
            [id, Number(cantidad)]
        );
        res.json({ mensaje: "Stock devuelto correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al devolver stock" });
    }
});

// ===============================
// 📌 OBTENER UN PRODUCTO POR ID
// ===============================
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const result = await db.query(
        "SELECT id, nombre, descripcion, precio::numeric, imagen, stock, activo FROM productos WHERE id=$1",
        [id]
    );

    if (result.rowCount === 0) {
        return res.status(404).json({ error: "Producto no encontrado" });
    }

    const p = result.rows[0];
    p.precio = Number(p.precio);
    res.json(p);
});

module.exports = router;