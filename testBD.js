const db = require("./conexiones/db");

db.query("SELECT NOW()")
  .then(res => {
    console.log("✅ Conectado:", res.rows);
  })
  .catch(err => {
    console.error("❌ Error:", err);
  });