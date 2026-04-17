require("dotenv").config();

const { Pool } = require("pg");

// Configuración SSL condicional para PostgreSQL
// Se activa solo si la DATABASE_URL no apunta a un entorno local (localhost o 127.0.0.1)
// Esto es necesario para Render y otros servicios de hosting, pero puede causar problemas en local sin SSL.
const sslConfig = process.env.DATABASE_URL &&
                  !process.env.DATABASE_URL.includes("localhost") &&
                  !process.env.DATABASE_URL.includes("127.0.0.1")
                  ? { rejectUnauthorized: false } // Para Render, Neon, Supabase, etc.
                  : false; // Para desarrollo local sin SSL

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

module.exports = pool;