//  PASO 1: estado global y persistencia
// Estructura de cada tarea: { id, titulo, curso, fechaEntrega, completada }

const STORAGE_KEY = 'tareasUniversitarias';

// Lee las tareas guardadas. Si no hay nada o el JSON está dañado, devuelve []
function cargarTareas() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(guardadas) ? guardadas : [];
  } catch (error) {
    console.error('No se pudo leer localStorage:', error);
    return [];
  }
}

// Estado inicial: lo que haya guardado
let tareas = cargarTareas();

// Guarda el arreglo completo como texto JSON
const guardarTareas = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
};

// ---------- Funciones sobre el estado ----------

// Agregar (destructuring + spread)
const agregarTarea = ({ titulo, curso, fechaEntrega }) => {
  const nueva = { id: Date.now(), titulo, curso, fechaEntrega, completada: false };
  tareas = [...tareas, nueva];
  guardarTareas();
};

// find: buscar por id
const buscarTarea = (id) => tareas.find((t) => t.id === id);

// map: alternar completada/pendiente
const alternarTarea = (id) => {
  tareas = tareas.map((t) => (t.id === id ? { ...t, completada: !t.completada } : t));
  guardarTareas();
};

// filter: eliminar
const eliminarTarea = (id) => {
  tareas = tareas.filter((t) => t.id !== id);
  guardarTareas();
};

// filter: filtrar por estado
const filtrarTareas = (filtro) => {
  if (filtro === 'pendientes') return tareas.filter((t) => !t.completada);
  if (filtro === 'completadas') return tareas.filter((t) => t.completada);
  return tareas;
};

// reduce: contar
const contarTareas = () =>
  tareas.reduce(
    (acc, t) => ({
      total: acc.total + 1,
      completadas: acc.completadas + (t.completada ? 1 : 0),
      pendientes: acc.pendientes + (t.completada ? 0 : 1),
    }),
    { total: 0, completadas: 0, pendientes: 0 }
  );


//PASO 2: CAPTURA Y VALIDACIÓN 

// Referencias al DOM 
const form = document.querySelector('#task-form');
const inputTitulo = document.querySelector('#titulo');
const inputCurso = document.querySelector('#curso');
const inputFecha = document.querySelector('#fechaEntrega');
const contenedorAlertas = document.querySelector('#alertas');

// Fecha de hoy en formato AAAA-MM-DD (hora local, no UTC)
const fechaHoy = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

//  Validación

// Devuelve un arreglo de errores (vacío = todo válido)
const validarTarea = ({ titulo, curso, fechaEntrega }) => {
  const errores = [];

  if (!titulo) errores.push('El título es obligatorio.');
  if (!curso) errores.push('El curso es obligatorio.');

  if (!fechaEntrega) {
    errores.push('La fecha de entrega es obligatoria.');
  } else if (fechaEntrega <= fechaHoy()) {
    errores.push('La fecha de entrega debe ser posterior a la fecha actual.');
  }

  return errores;
};

// Muestra mensajes en el div de alertas.
// textContent (no innerHTML) evita inyección de HTML.
const mostrarAlertas = (mensajes, tipo = 'danger') => {
  contenedorAlertas.innerHTML = '';
  mensajes.forEach((mensaje) => {
    const div = document.createElement('div');
    div.className = `alert alert-${tipo} py-2 mb-2`;
    div.setAttribute('role', 'alert');
    div.textContent = mensaje;
    contenedorAlertas.appendChild(div);
  });
};

// Evento submit
form.addEventListener('submit', (e) => {
  e.preventDefault(); // evita que la página se recargue

  const datos = {
    titulo: inputTitulo.value.trim(),
    curso: inputCurso.value.trim(),
    fechaEntrega: inputFecha.value,
  };

  const errores = validarTarea(datos);

  if (errores.length > 0) {
    mostrarAlertas(errores);
    return; // se detiene: no se agrega nada
  }

  agregarTarea(datos);
  form.reset();
  inputTitulo.focus();
  mostrarAlertas(['Tarea agregada correctamente.'], 'success');
  renderizar();
});


//  PASO 3: RENDERIZADO DINÁMICO 

//  Referencias al DOM
const lista = document.querySelector('#task-list');
const resumen = document.querySelector('#resumen');

// Filtro activo
let filtroActual = 'todas';

// Construye el <li> de UNA tarea
const crearElementoTarea = ({ id, titulo, curso, fechaEntrega, completada }) => {
  const li = document.createElement('li');
  li.dataset.id = id; // guarda el id en el elemento
  li.className = 'list-group-item d-flex justify-content-between align-items-center gap-3';

  // Clases CSS según el estado
  const vencida = !completada && fechaEntrega <= fechaHoy();
  if (completada) li.classList.add('tarea-completada');
  if (vencida) li.classList.add('tarea-vencida');

  // Checkbox (alterna el estado)
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'form-check-input mt-0';
  check.checked = completada;
  check.dataset.action = 'toggle';

  // Bloque de texto: título + detalle
  const info = document.createElement('div');
  info.className = 'flex-grow-1';

  const tituloEl = document.createElement('div');
  tituloEl.className = 'tarea-titulo fw-semibold';
  tituloEl.textContent = titulo;

  const detalleEl = document.createElement('small');
  detalleEl.className = 'text-muted tarea-fecha';
  detalleEl.textContent = `${curso} · Entrega: ${fechaEntrega}${vencida ? ' (vencida)' : ''}`;

  info.append(tituloEl, detalleEl);

  // Botón eliminar
  const btnEliminar = document.createElement('button');
  btnEliminar.type = 'button';
  btnEliminar.className = 'btn btn-danger btn-sm';
  btnEliminar.dataset.action = 'delete';
  btnEliminar.textContent = 'Eliminar';

  li.append(check, info, btnEliminar);
  return li;
};

// Dibuja toda la lista según el filtro actual
const renderizar = () => {
  lista.innerHTML = ''; // limpia SIEMPRE antes de dibujar (evita duplicados)

  const visibles = filtrarTareas(filtroActual);

  if (visibles.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'list-group-item text-muted text-center';
    vacio.textContent = 'No hay tareas para mostrar.';
    lista.appendChild(vacio);
  } else {
    visibles.map(crearElementoTarea).forEach((li) => lista.appendChild(li));
  }

  // Resumen con reduce
  const { total, completadas, pendientes } = contarTareas();
  resumen.textContent = `${total} en total · ${pendientes} pendientes · ${completadas} completadas`;
};

// Carga inicial: dibuja las tareas guardadas
document.addEventListener('DOMContentLoaded', renderizar);


// PASO 4: INTERACTIVIDAD (DELEGACIÓN DE EVENTOS)

const filtros = document.querySelector('#filtros');

// Un solo listener para TODOS los checkbox y botones Eliminar de la lista
lista.addEventListener('click', (e) => {
  // closest busca el elemento con data-action más cercano al clic
  const elemento = e.target.closest('[data-action]');
  if (!elemento) return; // el clic fue en otra parte del <li>: se ignora

  // Leemos el id guardado en el <li> padre (data-id)
  const id = Number(elemento.closest('li').dataset.id);

  if (!buscarTarea(id)) return; // por seguridad

  if (elemento.dataset.action === 'toggle') alternarTarea(id);
  if (elemento.dataset.action === 'delete') eliminarTarea(id);

  renderizar();
});

// Delegación también para los botones de filtro
filtros.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-filter]');
  if (!boton) return;

  filtroActual = boton.dataset.filter;

  // Marca como activo solo el botón presionado
  filtros.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b === boton);
  });

  renderizar();
});