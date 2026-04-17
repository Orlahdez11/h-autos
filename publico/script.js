// script.js

/* =====================
   FORMATEAR PRECIOS
   ===================== */
function formatearPrecio(num) {
  return Number(num).toLocaleString("es-MX");
}

/* =====================
   Utilidades de UI
   ===================== */
function mostrarMensaje(texto) {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = texto;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  const div = document.getElementById("mensaje");
  if (div) {
    div.innerHTML = `<div class="alert alert-success mt-2">${texto}</div>`;
    clearTimeout(div._t);
    div._t = setTimeout(() => div.innerHTML = "", 2500);
  }
}

/* =====================
   SIDE CART UI
   ===================== */
function abrirCarrito() {
  document.getElementById("side-cart").classList.add("open");
  document.getElementById("side-cart-overlay").classList.add("show");
  document.getElementById("side-cart").setAttribute("aria-hidden", "false");
  cargarCarrito();
}

function cerrarCarrito() {
  document.getElementById("side-cart").classList.remove("open");
  document.getElementById("side-cart-overlay").classList.remove("show");
  document.getElementById("side-cart").setAttribute("aria-hidden", "true");
}

/* =====================
   CARGAR PRODUCTOS
   ===================== */
async function cargarProductos() {
  try {
    const res = await fetch("/api/productos");
    const productos = await res.json();

    const contenedor = document.getElementById("contenedor-productos");
    contenedor.innerHTML = "";

    productos.forEach(p => {
      const stockLabel = p.stock > 0
        ? `<span class="stock-badge disponible">✓ Disponible (${p.stock})</span>`
        : `<span class="stock-badge sin-stock">✗ Sin stock</span>`;

      contenedor.innerHTML += `
        <div class="col-sm-6 col-md-4 col-lg-3">
          <div class="card product-card p-0">
            <img src="${p.imagen}" class="card-img-top" alt="${p.nombre}" />
            <div class="card-body">
              <h5 class="card-title">${p.nombre}</h5>
              <p>${p.descripcion}</p>
              ${stockLabel}
              <p class="price">$${formatearPrecio(p.precio)}</p>
              <button class="btn btn-agregar w-100 btn-agregar"
                data-id="${p.id}"
                ${p.stock <= 0 ? "disabled" : ""}>
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Error cargando productos:", err);
    mostrarMensaje("Error al cargar productos");
  }
}

/* =====================
   AGREGAR AL CARRITO
   ===================== */
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-agregar")) {
    const id = e.target.dataset.id;

    try {
      const resProducto = await fetch(`/api/productos/${id}`);
      const p = await resProducto.json();

      if (!p || p.stock <= 0) {
        mostrarMensaje("Sin stock disponible");
        return;
      }

      let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
      let item = carrito.find(prod => prod.id == id);

      if (item) {
        if (item.cantidad + 1 > p.stock) {
          mostrarMensaje("No hay más stock disponible");
          return;
        }
        item.cantidad++;
      } else {
        carrito.push({
          id: p.id,
          nombre: p.nombre,
          precio: Number(p.precio),
          stock: p.stock,
          cantidad: 1
        });
      }

      localStorage.setItem("carrito", JSON.stringify(carrito));
      actualizarCarritoContador();

      await cargarProductos();
      abrirCarrito();
      mostrarMensaje("Vehículo agregado al carrito 🚗");
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al agregar producto");
    }
  }

  if (e.target.matches(".btn-eliminar-item")) {
    const index = parseInt(e.target.dataset.index, 10);
    eliminar(index);
  }
});

/* =====================
   CONTADOR
   ===================== */
function actualizarCarritoContador() {
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let total = carrito.reduce((sum, p) => sum + p.cantidad, 0);
  const el = document.getElementById("carrito-contador");
  if (el) el.textContent = total;
}

/* =====================
   CARGAR CARRITO
   ===================== */
function cargarCarrito() {
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let cliente = JSON.parse(localStorage.getItem("cliente"));

  const tabla = document.getElementById("tabla-carrito");
  const vacio = document.getElementById("carrito-vacio");
  const body = document.getElementById("carrito-body");
  const total = document.getElementById("carrito-total");
  const formRegistro = document.getElementById("form-registro");
  const btnCheckout = document.getElementById("btn-checkout");

  if (carrito.length === 0) {
    vacio.classList.remove("d-none");
    tabla.classList.add("d-none");
    formRegistro.classList.remove("d-none");
    btnCheckout.classList.add("d-none");
    return;
  }

  vacio.classList.add("d-none");
  tabla.classList.remove("d-none");

  body.innerHTML = "";
  let totalPagar = 0;

  carrito.forEach((p, index) => {
    let precioNum = Number(p.precio);
    let subtotal = precioNum * p.cantidad;
    totalPagar += subtotal;

    body.innerHTML += `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.cantidad}</td>
        <td>$${formatearPrecio(precioNum)}</td>
        <td>$${formatearPrecio(subtotal)}</td>
        <td><button class="btn btn-danger btn-sm btn-eliminar-item" data-index="${index}">✕</button></td>
      </tr>
    `;
  });

  total.textContent = "$" + formatearPrecio(totalPagar);

  if (cliente) {
    formRegistro.classList.add("d-none");
    btnCheckout.classList.remove("d-none");
  } else {
    formRegistro.classList.remove("d-none");
    btnCheckout.classList.add("d-none");
  }
}

/* =====================
   ELIMINAR ITEM
   ===================== */
async function eliminar(i) {
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const item = carrito[i];
  if (!item) return;

  carrito.splice(i, 1);
  localStorage.setItem("carrito", JSON.stringify(carrito));
  actualizarCarritoContador();
  cargarCarrito();
  cargarProductos();
  mostrarMensaje("Vehículo eliminado del carrito");
}

/* =====================
   REGISTRO CLIENTE
   ===================== */
document.addEventListener("submit", async (e) => {
  if (e.target.id === "form-registro") {
    e.preventDefault();

    const formData = new FormData(e.target);
    const clienteData = {
      nombre: formData.get("nombre"),
      email: formData.get("email"),
      telefono: formData.get("telefono"),
      direccion: formData.get("direccion")
    };

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clienteData)
      });

      const data = await res.json();

      if (!res.ok) {
        mostrarMensaje(data.error);
        return;
      }

      localStorage.setItem("cliente", JSON.stringify(data.cliente));
      mostrarMensaje("Registro exitoso. Ahora puedes finalizar tu compra ✓");
      cargarCarrito();
    } catch (err) {
      console.error(err);
      mostrarMensaje("Error al registrar cliente");
    }
  }
});

/* =====================
   FINALIZAR COMPRA
   ===================== */
document.addEventListener("click", async (e) => {
  if (e.target.id === "btn-checkout") {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let cliente = JSON.parse(localStorage.getItem("cliente"));

    if (!cliente || !cliente.nombre || cliente.nombre.trim().length < 3) {
      localStorage.removeItem("cliente");
      mostrarMensaje("Nombre inválido. Por favor regístrate de nuevo.");
      cargarCarrito();
      return;
    }

    const res = await fetch("/api/pedidos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrito, cliente: cliente.nombre })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(data.error);
      return;
    }

    localStorage.removeItem("carrito");
    localStorage.removeItem("cliente");
    mostrarMensaje(`¡Compra realizada! Pedido #${data.pedido_id} 🎉`);

    setTimeout(() => {
      cerrarCarrito();
      cargarProductos();
    }, 1400);
  }
});

/* =====================
   Inicialización
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  const btnAbrir = document.getElementById("btn-abrir-carrito");
  const btnCerrar = document.getElementById("cerrar-cart");
  const overlay = document.getElementById("side-cart-overlay");

  if (btnAbrir) btnAbrir.addEventListener("click", abrirCarrito);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrarCarrito);
  if (overlay) overlay.addEventListener("click", cerrarCarrito);

  actualizarCarritoContador();
  cargarProductos();
  cargarCarrito();
});