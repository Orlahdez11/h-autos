// ===================================================================================
// 🔐 SEGURIDAD: Verificar Login
// ===================================================================================
const API_KEY = localStorage.getItem("adminKey");
if (!API_KEY) {
  window.location.href = "login.html";
}


function mostrarToast(mensaje, tipo = "success") {
  const toast = document.getElementById("toastMsg");
  const body = document.getElementById("toastBody");

  // Cambiar color según tipo
  toast.className = `toast align-items-center text-white bg-${tipo} border-0`;

  body.textContent = mensaje;

  const toastBootstrap = new bootstrap.Toast(toast);
  toastBootstrap.show();
}

// ===================================================================================
// 🟦 FORMATEO DE PRECIOS
// ===================================================================================
function formatearPrecio(numero) {
  return Number(numero).toLocaleString("es-MX");
}

function limpiarNumero(valor) {
  return valor.replace(/,/g, "");
}



// ===================================================================================
// 🟦 FORMATEAR INPUT – AGREGAR PRODUCTO
// ===================================================================================
const inputAgregar = document.getElementById("precio");

if (inputAgregar) {
  inputAgregar.addEventListener("input", function () {
    let valor = this.value.replace(/,/g, "");
    if (!isNaN(valor) && valor !== "") {
      this.value = Number(valor).toLocaleString("es-MX");
    }
  });
}



// ===================================================================================
// 🟦 FORMATEAR INPUT – EDITAR PRODUCTO
// ===================================================================================
const inputEditar = document.getElementById("edit-precio");

if (inputEditar) {
  inputEditar.addEventListener("input", function () {
    let valor = this.value.replace(/,/g, "");
    if (!isNaN(valor) && valor !== "") {
      this.value = Number(valor).toLocaleString("es-MX");
    }
  });
}



// ===================================================================================
// 🟦 CARGAR PRODUCTOS EN LA TABLA
// ===================================================================================
async function cargarTabla() {
  const res = await fetch("/api/productos");
  const productos = await res.json();

  const tabla = document.querySelector("#tabla tbody");
  tabla.innerHTML = "";

  productos.forEach(p => {
    tabla.innerHTML += `
      <tr>
        <td>${p.nombre}</td>
        <td>$${formatearPrecio(p.precio)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick="abrirModalEditar(${p.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarProducto(${p.id})">Eliminar</button>
        </td>
      </tr>
    `;
  });
}



// ===================================================================================
// 🟦 AGREGAR PRODUCTO
// ===================================================================================
document.getElementById("formAgregar").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("nombre", e.target.nombre.value);
  formData.append("descripcion", e.target.descripcion.value);
  formData.append("precio", limpiarNumero(e.target.precio.value)); // 👈 CORREGIDO
  formData.append("stock", e.target.stock.value);
  formData.append("imagen", e.target.imagen.files[0]);

  const res = await fetch("/api/productos", {
    method: "POST",
    headers: { "x-api-key": API_KEY },
    body: formData
  });

  const data = await res.json();

mostrarToast(data.mensaje, "success");

  e.target.reset();
  cargarTabla();
});



// ===================================================================================
// 🟦 ELIMINAR PRODUCTO
// ===================================================================================

let idAEliminar = null;

function eliminarProducto(id) {
  idAEliminar = id;

  const modal = new bootstrap.Modal(document.getElementById("modalConfirmarEliminar"));
  modal.show();
}

document.getElementById("btnConfirmarEliminar").onclick = async () => {
  if (!idAEliminar) return;

  await fetch(`/api/productos/${idAEliminar}`, { 
    method: "DELETE",
    headers: { "x-api-key": API_KEY }
  });

  mostrarToast("Producto desactivado correctamente", "danger");

  cargarTabla();

  idAEliminar = null;

  // cerrar modal
  const modal = bootstrap.Modal.getInstance(document.getElementById("modalConfirmarEliminar"));
  modal.hide();
};




// ===================================================================================
// 🟦 ABRIR MODAL PARA EDITAR PRODUCTO
// ===================================================================================
async function abrirModalEditar(id) {
  const res = await fetch(`/api/productos/${id}`);
  const p = await res.json();

  document.getElementById("edit-id").value = p.id;
  document.getElementById("edit-nombre").value = p.nombre;
  document.getElementById("edit-descripcion").value = p.descripcion;
  document.getElementById("edit-precio").value = formatearPrecio(p.precio); // 👈 FORMATEADO
  document.getElementById("edit-stock").value = p.stock;

  document.getElementById("edit-preview").src = p.imagen;

  const modal = new bootstrap.Modal(document.getElementById("modalEditar"));
  modal.show();
}



// ===================================================================================
// 🟦 GUARDAR EDICIÓN DEL PRODUCTO
// ===================================================================================
async function guardarEdicion() {
  const id = document.getElementById("edit-id").value;

  const formData = new FormData();
  formData.append("nombre", document.getElementById("edit-nombre").value);
  formData.append("descripcion", document.getElementById("edit-descripcion").value);
  formData.append("precio", limpiarNumero(document.getElementById("edit-precio").value)); // 👈 CORREGIDO
  formData.append("stock", document.getElementById("edit-stock").value);

  const imagenNueva = document.getElementById("edit-imagen").files[0];
  if (imagenNueva) {
    formData.append("imagen", imagenNueva);
  }

  const res = await fetch(`/api/productos/${id}`, {
    method: "PUT",
    headers: { "x-api-key": API_KEY },
    body: formData
  });
mostrarToast("Producto actualizado correctamente", "warning");

  cargarTabla();

  document.querySelector("#modalEditar .btn-close").click();
}



// ===================================================================================
// 🟦 CARGAR PEDIDOS
// ===================================================================================
async function cargarPedidos() {
  const res = await fetch("/api/pedidos", {
    headers: { "x-api-key": API_KEY }
  });
  const pedidos = await res.json();

  const tabla = document.querySelector("#tabla-pedidos tbody");
  tabla.innerHTML = "";

  pedidos.forEach(pedido => {
    tabla.innerHTML += `
      <tr>
        <td>${pedido.id}</td>
        <td>${pedido.fecha}</td>
        <td>${pedido.cliente}</td>
        <td>$${formatearPrecio(pedido.total)}</td>
        <td>
          <button class="btn btn-info btn-sm btn-ver" data-id="${pedido.id}">Detalles</button>
          <button class="btn btn-warning btn-sm btn-cancelar" data-id="${pedido.id}">Cancelar</button>
          <button class="btn btn-danger btn-sm btn-eliminar" data-id="${pedido.id}">Eliminar</button>
        </td>
      </tr>
    `;
  });
}



// ===================================================================================
// 🟦 VER DETALLES DEL PEDIDO (modal)
// ===================================================================================
document.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("btn-ver")) return;

  const id = e.target.dataset.id;
  const res = await fetch(`/api/pedidos/${id}`, {
    headers: { "x-api-key": API_KEY }
  });
  const pedido = await res.json();

  const lista = document.getElementById("lista-detalles");
  lista.innerHTML = "";

  pedido.items.forEach(i => {
    lista.innerHTML += `
      <li class="list-group-item">
        ${i.nombre} — ${i.cantidad} × $${formatearPrecio(i.precio)}
      </li>
    `;
  });

  const modal = new bootstrap.Modal(document.getElementById("modalDetalles"));
  modal.show();
});



// ===================================================================================
// 🟦 CANCELAR PEDIDO
// ===================================================================================
let idCancelar = null;

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("btn-cancelar")) return;

  idCancelar = e.target.dataset.id;

  const modal = new bootstrap.Modal(document.getElementById("modalCancelarPedido"));
  modal.show();
});

document.getElementById("btnConfirmarCancelarPedido").addEventListener("click", async () => {
  if (!idCancelar) return;

  const res = await fetch(`/api/pedidos/cancelar/${idCancelar}`, {
    method: "PUT",
    headers: { "x-api-key": API_KEY }
  });

  const data = await res.json();

  if (data.error) {
    mostrarToast(data.error, "danger");
    return;
  }

  mostrarToast("Pedido cancelado correctamente", "warning");
  cargarPedidos();

  idCancelar = null;

  bootstrap.Modal.getInstance(document.getElementById("modalCancelarPedido")).hide();
});


// ===================================================================================
// 🟦 ELIMINAR PEDIDO COMPLETO
// ===================================================================================
let idEliminar = null;

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("btn-eliminar")) return;

  idEliminar = e.target.dataset.id;

  const modal = new bootstrap.Modal(document.getElementById("modalEliminarPedido"));
  modal.show();
});

document.getElementById("btnConfirmarEliminarPedido").addEventListener("click", async () => {
  if (!idEliminar) return;

  const res = await fetch(`/api/pedidos/${idEliminar}`, {
    method: "DELETE",
    headers: { "x-api-key": API_KEY }
  });

  const data = await res.json();

  if (data.error) {
    mostrarToast(data.error, "danger");
    return;
  }

  mostrarToast("Pedido eliminado correctamente", "danger");
  cargarPedidos();

  idEliminar = null;

  bootstrap.Modal.getInstance(document.getElementById("modalEliminarPedido")).hide();
});


// ===================================================================================
// 🟦 INICIALIZACIÓN
// ===================================================================================
cargarTabla();
cargarPedidos();
