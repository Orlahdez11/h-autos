const express = require("express"); 
const router = express.Router();
const db = require("../db");

// Middleware interno para proteger rutas administrativas
const authAdmin = (req, res, next) => {
    const API_KEY = process.env.ADMIN_API_KEY;
    if (req.headers["x-api-key"] === API_KEY) {
        return next();
    }
    res.status(401).json({ error: "No autorizado" });
};

// -----------------------------------
// OBTENER TODOS LOS PEDIDOS
// Solo Admin
// -----------------------------------
router.get("/", authAdmin, async (req, res) => {
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
// OBTENER UN PEDIDO CON SUS ITEMS (Para el Admin)
// -----------------------------------
router.get("/:id", authAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const pedido = await db.query("SELECT * FROM pedidos WHERE id = $1", [id]);
        if (pedido.rowCount === 0) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const items = await db.query(`
            SELECT producto_nombre as nombre, cantidad, precio 
            FROM pedido_items 
            WHERE pedido_id = $1
        `, [id]);

        res.json({ ...pedido.rows[0], items: items.rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener el pedido" });
    }
});

// -----------------------------------
// OBTENER ITEMS DE UN PEDIDO
// -----------------------------------
router.get("/:id/items", authAdmin, async (req, res) => {
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
router.put("/cancelar/:id", authAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Verificar si el pedido existe y no ha sido cancelado ya
        const pedido = await client.query("SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE", [id]);
        if (pedido.rowCount === 0) return res.status(404).json({ error: "Pedido no encontrado" });
        if (pedido.rows[0].estado === 'cancelado') return res.status(400).json({ error: "El pedido ya está cancelado" });

        const items = await client.query(`
            SELECT * FROM pedido_items WHERE pedido_id = $1
        `, [id]);

        for (let item of items.rows) {
            await client.query(`
                UPDATE productos 
                SET stock = stock + $1
                WHERE id = $2
            `, [item.cantidad, item.producto_id]);
        }

        await client.query(`
            UPDATE pedidos SET estado = 'cancelado'
            WHERE id = $1
        `, [id]);

        await client.query('COMMIT');
        res.json({ mensaje: "Pedido cancelado y stock devuelto" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Error al cancelar pedido" });
    } finally {
        client.release();
    }
});

// -----------------------------------
// ELIMINAR PEDIDO
// -----------------------------------
router.delete("/:id", authAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM pedido_items WHERE pedido_id = $1", [id]);
        await client.query("DELETE FROM pedidos WHERE id = $1", [id]);
        await client.query('COMMIT');

        res.json({ success: true, message: "Pedido eliminado correctamente" });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error eliminando pedido:", error);
        res.status(500).json({ success: false, message: "Error del servidor" });
    } finally {
        client.release();
    }
});

// -----------------------------------
// CHECKOUT — FINALIZAR COMPRA
// Guarda SOLO el nombre del cliente
// PÚBLICO
// -----------------------------------
router.post("/checkout", async (req, res) => {
    const { carrito, cliente } = req.body;

    if (!carrito || carrito.length === 0) {
        return res.status(400).json({ error: "Carrito vacío" });
    }

    if (!cliente || typeof cliente !== "string") {
        return res.status(400).json({ error: "Nombre del cliente inválido" });
    }

    const client = await db.connect(); // Usar un cliente específico para la transacción

    try {
        await client.query('BEGIN'); // Iniciar transacción
        
        let totalCalculado = 0;
        const itemsAProcesar = [];

        for (let item of carrito) {
            const productoRes = await client.query(
                `SELECT nombre, stock, precio FROM productos WHERE id = $1 FOR UPDATE`,
                [item.id]
            );
            
            const productoActual = productoRes.rows[0];
            if (!productoActual || productoActual.stock < item.cantidad) {
                throw new Error(`Stock insuficiente para el producto: ${productoActual?.nombre || item.id}`);
            }
            
            totalCalculado += Number(productoActual.precio) * item.cantidad;
            itemsAProcesar.push({ ...item, nombre: productoActual.nombre, precioReal: productoActual.precio });
        }

        const nuevoPedido = await client.query(
            `INSERT INTO pedidos (cliente, total, estado) 
             VALUES ($1, $2, 'pagado') 
             RETURNING id`,
            [cliente, totalCalculado]
        );

        const pedidoId = nuevoPedido.rows[0].id;

        for (let item of itemsAProcesar) {
            await client.query(
                `INSERT INTO pedido_items 
                (pedido_id, producto_id, producto_nombre, cantidad, precio)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    pedidoId,
                    item.id,
                    item.nombre,
                    item.cantidad,
                    item.precioReal
                ]
            );

            // restar stock
            await client.query(
                `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
                [item.cantidad, item.id]
            );
        }

        await client.query('COMMIT'); // Confirmar cambios
        res.json({ pedido_id: pedidoId });

    } catch (err) {
        await client.query('ROLLBACK'); // Deshacer todo si algo falló
        console.error("ERROR CHECKOUT:", err);
        res.status(500).json({ error: err.message || "Error al procesar el pedido" });
    } finally {
        client.release(); // Liberar el cliente de vuelta al pool
    }
});

module.exports = router;
