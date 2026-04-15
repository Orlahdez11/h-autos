const express = require("express");
const router = express.Router();
const db = require("../db");

// Registrar un cliente
router.post("/", async (req, res) => {
    const { nombre, email, telefono, direccion } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO clientes (nombre, email, telefono, direccion)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, email, telefono, direccion]
        );

        res.json({
            mensaje: "Cliente registrado correctamente",
            cliente: result.rows[0]
        });

    } catch (err) {
        console.error(err);

        if (err.code === "23505") {
            return res.status(400).json({ error: "El correo ya está registrado" });
        }

        res.status(500).json({ error: "Error al registrar cliente" });
    }
});

module.exports = router;
