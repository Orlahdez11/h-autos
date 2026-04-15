const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "merch",
  password: "orla11",
  port: 5432,
});

module.exports = pool;
