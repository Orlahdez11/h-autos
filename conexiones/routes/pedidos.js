const express = require("express"); 
const router = express.Router();
const db = require("../db");

// -----------------------------------
// OBTENER TODOS LOS PEDIDOS
// -----------------------------------
router.get("/", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT * FROM pedidos ORDER BY fecha DESC
        `);
        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

// -----------------------------------
// OBTENER ITEMS DE UN PEDIDO
// -----------------------------------
router.get("/:id/items", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      SELECT 
          pi.producto_id,
          pi.producto_nombre,
          pi.cantidad,
          pi.precio
      FROM pedido_items pi
      WHERE pi.pedido_id = $1
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener items del pedido" });
  }
});

// -----------------------------------
// CANCELAR PEDIDO
// -----------------------------------
router.put("/cancelar/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const items = await db.query(`
            SELECT * FROM pedido_items WHERE pedido_id = $1
        `, [id]);

        if (items.rowCount === 0) {
            return res.json({ error: "No existen items para este pedido" });
        }

        // devolver stock
        for (let item of items.rows) {
            await db.query(`
                UPDATE productos 
                SET stock = stock + $1
                WHERE id = $2
            `, [item.cantidad, item.producto_id]);
        }

        // actualizar estado
        await db.query(`
            UPDATE pedidos SET estado = 'cancelado'
            WHERE id = $1
        `, [id]);

        res.json({ mensaje: "Pedido cancelado y stock devuelto" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al cancelar pedido" });
    }
});

// -----------------------------------
// ELIMINAR PEDIDO
// -----------------------------------
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        await db.query("DELETE FROM pedido_items WHERE pedido_id = $1", [id]);
        await db.query("DELETE FROM pedidos WHERE id = $1", [id]);

        res.json({ success: true, message: "Pedido eliminado correctamente" });

    } catch (error) {
        console.error("Error eliminando pedido:", error);
        res.status(500).json({ success: false, message: "Error del servidor" });
    }
});

// -----------------------------------
// CHECKOUT — FINALIZAR COMPRA
// Guarda SOLO el nombre del cliente
// -----------------------------------
router.post("/checkout", async (req, res) => {
    const { carrito, cliente } = req.body;

    // cliente aquí es un STRING → "Juan Pérez"

    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: "Carrito vacío" });
    }

    if (!cliente || typeof cliente !== "string") {
        return res.status(400).json({ error: "Nombre del cliente inválido" });
    }

    try {
        const total = carrito.reduce((acc, item) =>
            acc + (item.precio * item.cantidad), 0
        );

        // crear pedido (cliente ahora es solo un nombre)
        const nuevoPedido = await db.query(
            `INSERT INTO pedidos (cliente, total, estado) 
             VALUES ($1, $2, 'pagado') 
             RETURNING id`,
            [cliente, total]   // 👈 solo guardamos el nombre
        );

        const pedidoId = nuevoPedido.rows[0].id;

        // insertar items con nombre real desde la DB
        for (let item of carrito) {
            // Obtener nombre real del producto desde la tabla productos
            const productoRes = await db.query(
                `SELECT nombre FROM productos WHERE id = $1`,
                [item.id]
            );
            const nombreReal = productoRes.rows[0]?.nombre || "Producto";

            await db.query(
                `INSERT INTO pedido_items 
                (pedido_id, producto_id, producto_nombre, cantidad, precio)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    pedidoId,
                    item.id,
                    nombreReal,
                    item.cantidad,
                    item.precio
                ]
            );

            // restar stock
            await db.query(
                `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                [item.cantidad, item.id]
            );
        }

        res.json({ pedido_id: pedidoId });

    } catch (err) {
        console.error("ERROR CHECKOUT:", err);
        res.status(500).json({ error: "Error al procesar el pedido" });
    }
});

module.exports = router;
