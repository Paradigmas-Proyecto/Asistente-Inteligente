/**
 * Lógica principal de la aplicación (index.html)
 * 
 * NOTA: Este archivo NO contiene métodos mock.
 * Todas las operaciones delegan a tareaService que se conecta al backend real.
 */

// Estado de la aplicación
let tareas = [];
let tareasCache = []; // Cache de todas las tareas para validaciones
let tareaEnEdicion = null;
let filtrosActivos = {};

// Elementos del DOM
let listaTareasElement;
let modalTarea;
let modalAlerta;
let formTarea;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    inicializarElementos();
    configurarEventos();
    await cargarTareas();
    actualizarEstadisticas();
    establecerFechaHoy();
});

/**
 * Inicializa referencias a elementos del DOM
 */
function inicializarElementos() {
    listaTareasElement = document.getElementById('listaTareas');
    formTarea = document.getElementById('formTarea');
    modalTarea = new bootstrap.Modal(document.getElementById('modalTarea'));
    modalAlerta = new bootstrap.Modal(document.getElementById('modalAlerta'));
}

/**
 * Configura todos los event listeners
 */
function configurarEventos() {
    // Botón guardar tarea
    document.getElementById('btnGuardarTarea').addEventListener('click', guardarTarea);

    // Filtros
    document.getElementById('filtroFecha').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroEstado').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroPrioridad').addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    // Modal events - Solo limpiar cuando se cierra
    document.getElementById('modalTarea').addEventListener('hidden.bs.modal', function() {
        limpiarFormulario();
        tareaEnEdicion = null;
    });
}

/**
 * Establece la fecha de hoy en el filtro
 */
function establecerFechaHoy() {
    document.getElementById('filtroFecha').value = config.getFechaHoy();
    document.getElementById('tareaFecha').value = config.getFechaHoy();
}

/**
 * Carga las tareas desde el servicio
 */
async function cargarTareas() {
    try {
        mostrarCargando();
        tareas = await tareaService.listarTodas();
        tareasCache = [...tareas]; // Actualizar cache para validaciones
        await aplicarFiltros();
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        mostrarError('No se pudieron cargar las tareas');
    }
}

/**
 * Renderiza la lista de tareas
 */
function renderizarTareas(tareasAMostrar) {
    if (!tareasAMostrar || tareasAMostrar.length === 0) {
        listaTareasElement.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h4>No hay tareas</h4>
                <p>Agrega una nueva tarea para comenzar</p>
            </div>
        `;
        return;
    }

    const html = tareasAMostrar.map(tarea => crearTarjetaTarea(tarea)).join('');
    listaTareasElement.innerHTML = html;
}

/**
 * Crea el HTML de una tarjeta de tarea
 */
function crearTarjetaTarea(tarea) {
    const prioridadClass = `prioridad-${tarea.prioridad.toLowerCase()}`;
    const prioridadBadge = obtenerBadgePrioridad(tarea.prioridad);
    const estadoBadge = obtenerBadgeEstado(tarea.estado);
    const climaIconos = obtenerIconosClima(tarea.climaPermitido);
    const tareaDependiente = tarea.dependeDeId ? obtenerNombreTarea(tarea.dependeDeId) : null;

    return `
        <div class="tarea-item ${prioridadClass} p-3 fade-in">
        
        <!--Botones de acción de la tabla-->
        
            <div class="tarea-header">
                <h5 class="tarea-nombre">${tarea.nombre}</h5>
                <div class="tarea-actions">
                    ${tarea.estado !== 'COMPLETADA' ? `
                        <button class="btn btn-sm btn-success" onclick="marcarCompletada(${tarea.id})" 
                                title="Marcar como completada">
                            <i class="bi bi-check-circle"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="editarTarea(${tarea.id})"
                            title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarTarea(${tarea.id})"
                            title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="tarea-meta mb-2">
                <span>${prioridadBadge}</span>
                <span>${estadoBadge}</span>
                <span><i class="bi bi-calendar"></i> ${formatearFecha(tarea.fecha)}</span>
                <span><i class="bi bi-clock"></i> ${tarea.duracionMinutos} min</span>
                ${tarea.horaDeseada ? `<span><i class="bi bi-alarm"></i> ${tarea.horaDeseada}</span>` : ''}
                ${climaIconos ? `<span>${climaIconos}</span>` : ''}
            </div>

            ${tareaDependiente ? `
                <div class="alert alert-warning py-1 px-2 mb-2">
                    <small><i class="bi bi-link-45deg"></i> Depende de: <strong>${tareaDependiente}</strong></small>
                </div>
            ` : ''}

            ${tarea.nota ? `
                <div class="text-muted small">
                    <i class="bi bi-sticky"></i> ${tarea.nota}
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Obtiene el badge de prioridad
 */
function obtenerBadgePrioridad(prioridad) {
    const badges = {
        'ALTA': '<span class="badge badge-prioridad badge-alta">Alta</span>',
        'MEDIA': '<span class="badge badge-prioridad badge-media">Media</span>',
        'BAJA': '<span class="badge badge-prioridad badge-baja">Baja</span>'
    };
    return badges[prioridad] || '';
}

/**
 * Obtiene el badge de estado
 */
function obtenerBadgeEstado(estado) {
    const badges = {
        'PENDIENTE': '<span class="badge badge-estado badge-pendiente"><i class="bi bi-hourglass-bottom"></i> Pendiente</span>',
        'PLANIFICADA': '<span class="badge badge-estado badge-planificada"><i class="bi bi-calendar-event"></i> Planificada</span>',
        'COMPLETADA': '<span class="badge badge-estado badge-completada"><i class="bi bi-check-circle"></i> Completada</span>'
    };
    return badges[estado] || '';
}

/**
 * Obtiene iconos de clima
 */
function obtenerIconosClima(clima) {
    if (!clima) return null;
    
    const iconos = {
        'SOLEADO': '<i class="bi bi-brightness-high" style="color: #ffc107;"></i>',
        'NUBLADO': '<i class="bi bi-clouds" style="color: #6c757d;"></i>',
        'LLUVIOSO': '<i class="bi bi-cloud-rain-heavy" style="color: #0d6efd;"></i>',
        'VENTOSO': '<i class="bi bi-wind" style="color: #17a2b8;"></i>'
    };
    
    return iconos[clima] || clima;
}

/**
 * Obtiene el nombre de una tarea por ID
 */
function obtenerNombreTarea(id) {
    const tarea = tareas.find(t => t.id === id);
    return tarea ? tarea.nombre : `Tarea #${id}`;
}

/**
 * Formatea una fecha
 */
function formatearFecha(fecha) {
    const [año, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${año}`;
}

/**
 * Prepara el formulario para nueva tarea
 */
function prepararNuevaTarea() {
    document.getElementById('modalTareaTitle').innerHTML = 
        '<i class="bi bi-plus-circle"></i> Nueva Tarea';
    limpiarFormulario();
    
    // Asegurar que el estado sea PENDIENTE para nuevas tareas
    document.getElementById('tareaEstado').value = 'PENDIENTE';
    
    cargarTareasEnSelector();
}

/**
 * Edita una tarea existente
 */
async function editarTarea(id) {
    try {
        console.log('Editando tarea con ID:', id);
        tareaEnEdicion = await tareaService.obtener(id);
        console.log('Tarea obtenida:', tareaEnEdicion);
        
        document.getElementById('modalTareaTitle').innerHTML = 
            '<i class="bi bi-pencil"></i> Editar Tarea';
        
        // Llenar formulario
        document.getElementById('tareaId').value = tareaEnEdicion.id;
        console.log('tareaId establecido a:', document.getElementById('tareaId').value);
        document.getElementById('tareaNombre').value = tareaEnEdicion.nombre;
        document.getElementById('tareaFecha').value = tareaEnEdicion.fecha;
        document.getElementById('tareaDuracion').value = tareaEnEdicion.duracionMinutos;
        document.getElementById('tareaHora').value = tareaEnEdicion.horaDeseada || '';
        document.getElementById('tareaPrioridad').value = tareaEnEdicion.prioridad;
        document.getElementById('tareaEstado').value = tareaEnEdicion.estado;
        document.getElementById('tareaNota').value = tareaEnEdicion.nota || '';
        document.getElementById('tareaDependeDe').value = tareaEnEdicion.dependeDeId || '';

        // Marcar clima seleccionado (radio button)
        if (tareaEnEdicion.climaPermitido) {
            const radioClima = document.getElementById(`clima${tareaEnEdicion.climaPermitido.charAt(0) + tareaEnEdicion.climaPermitido.slice(1).toLowerCase()}`);
            if (radioClima) {
                radioClima.checked = true;
            }
        } else {
            document.getElementById('climaNinguno').checked = true;
        }

        cargarTareasEnSelector(id);
        modalTarea.show();
    } catch (error) {
        console.error('Error al editar tarea:', error);
        alert('Error al cargar la tarea');
    }
}

/**
 * Guarda una tarea (nueva o editada)
 */
async function guardarTarea() {
    if (!formTarea.checkValidity()) {
        formTarea.reportValidity();
        return;
    }

    // Obtener botón guardar y mostrar spinner
    const btnGuardar = document.getElementById('btnGuardarTarea');
    const textoOriginal = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    try {
        // Obtener clima seleccionado (radio button)
        const climaSeleccionado = document.querySelector('input[name="clima"]:checked').value;

        const tarea = {
            nombre: document.getElementById('tareaNombre').value,
            fecha: document.getElementById('tareaFecha').value,
            duracionMinutos: parseInt(document.getElementById('tareaDuracion').value),
            horaDeseada: document.getElementById('tareaHora').value || null,
            prioridad: document.getElementById('tareaPrioridad').value,
            estado: document.getElementById('tareaEstado').value,
            dependeDeId: document.getElementById('tareaDependeDe').value || null,
            climaPermitido: climaSeleccionado && climaSeleccionado !== '' ? climaSeleccionado : null,
            nota: document.getElementById('tareaNota').value || null
        };

        // Convertir dependeDeId a número si existe
        if (tarea.dependeDeId) {
            tarea.dependeDeId = parseInt(tarea.dependeDeId);
            
            // Validar dependencia circular
            const tareaId = document.getElementById('tareaId').value ? parseInt(document.getElementById('tareaId').value) : null;
            if (tareaId && validarDependenciaCircular(tareaId, tarea.dependeDeId)) {
                mostrarAlerta(
                    'error',
                    'Dependencia Circular Detectada',
                    'No se puede crear una dependencia circular. La tarea eventualmente dependería de sí misma.\n\nVerifique la cadena de dependencias.'
                );
                return;
            }
            
            // Validar que la tarea dependiente tenga hora posterior a la tarea padre
            if (tarea.horaDeseada) {
                const tareaPadre = tareasCache.find(t => t.id === tarea.dependeDeId);
                if (tareaPadre && tareaPadre.horaDeseada) {
                    const horaPadre = tareaPadre.horaDeseada;
                    const horaHija = tarea.horaDeseada;
                    
                    // Calcular hora final del padre (hora inicio + duración)
                    const [hP, mP] = horaPadre.split(':').map(Number);
                    const minutosFinPadre = hP * 60 + mP + tareaPadre.duracionMinutos;
                    const horaFinPadre = `${String(Math.floor(minutosFinPadre / 60)).padStart(2, '0')}:${String(minutosFinPadre % 60).padStart(2, '0')}`;
                    
                    if (horaHija <= horaFinPadre) {
                        mostrarAlerta(
                            'warning',
                            'Horario Inválido',
                            `La tarea dependiente debe iniciar después de que termine la tarea padre.\n\nTarea padre "${tareaPadre.nombre}":\n• Inicia: ${horaPadre}\n• Termina: ${horaFinPadre}\n\nLa tarea actual debe iniciar después de las ${horaFinPadre}`
                        );
                        return;
                    }
                }
            }
        }

        const id = document.getElementById('tareaId').value;
        console.log('ID de tarea a guardar:', id, 'Tipo:', typeof id);
        
        if (id && id !== '') {
            // Actualizar
            console.log('Actualizando tarea con ID:', parseInt(id));
            await tareaService.actualizar(parseInt(id), tarea);
        } else {
            // Crear
            console.log('Creando nueva tarea');
            await tareaService.crear(tarea);
        }

        modalTarea.hide();
        await cargarTareas();
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error al guardar tarea:', error);
        alert('Error: ' + error.message);
    } finally {
        // Restaurar botón
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = textoOriginal;
    }
}

/**
 * Elimina una tarea y sus dependientes en cascada
 */
async function eliminarTarea(id) {
    // Buscar la tarea a eliminar
    const tarea = tareasCache.find(t => t.id === id);
    if (!tarea) {
        mostrarAlerta('error', 'Error', 'Tarea no encontrada');
        return;
    }
    
    // Buscar todas las tareas que dependen de esta (hijas)
    const tareasHijas = tareasCache.filter(t => t.dependeDeId === id);
    
    // Construir mensaje de confirmación
    let mensaje = `¿Está seguro de que desea eliminar la tarea "${tarea.nombre}"?`;
    
    if (tareasHijas.length > 0) {
        mensaje += `\n\n⚠️ ADVERTENCIA: Esta tarea tiene ${tareasHijas.length} tarea(s) dependiente(s) que también se eliminarán:\n\n`;
        tareasHijas.forEach((hija, index) => {
            mensaje += `${index + 1}. ${hija.nombre}\n`;
        });
        mensaje += `\nTotal de tareas a eliminar: ${tareasHijas.length + 1} (incluyendo la tarea padre)`;
    }
    
    // Mostrar confirmación con callback
    mostrarAlerta('warning', 'Confirmar Eliminación', mensaje, async () => {
        try {
            // Eliminar primero las tareas hijas
            for (const hija of tareasHijas) {
                await tareaService.eliminar(hija.id);
            }
            
            // Luego eliminar la tarea padre
            await tareaService.eliminar(id);
            
            await cargarTareas();
            actualizarEstadisticas();
            
            // Mensaje de confirmación
            if (tareasHijas.length > 0) {
                mostrarAlerta('success', 'Eliminación Exitosa', `Se eliminaron ${tareasHijas.length + 1} tarea(s) exitosamente`);
            }
        } catch (error) {
            console.error('Error al eliminar tarea:', error);
            mostrarAlerta('error', 'Error', 'Error al eliminar la tarea');
        }
    });
}

/**
 * Marca una tarea como completada
 */
async function marcarCompletada(id) {
    try {
        // Buscar la tarea en el cache
        const tarea = tareasCache.find(t => t.id === id);
        
        // Si la tarea depende de otra, verificar que el padre esté completado
        if (tarea && tarea.dependeDeId) {
            const tareaPadre = tareasCache.find(t => t.id === tarea.dependeDeId);
            if (tareaPadre && tareaPadre.estado !== 'COMPLETADA') {
                mostrarAlerta(
                    'warning',
                    'No se puede completar',
                    `No puedes completar esta tarea porque depende de "${tareaPadre.nombre}" que aún no está completada.\n\nPrimero completa la tarea padre.`
                );
                return;
            }
        }
        
        await tareaService.cambiarEstado(id, 'COMPLETADA');
        await cargarTareas();
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('Error al actualizar el estado');
    }
}

/**
 * Aplica filtros a las tareas
 */
async function aplicarFiltros() {
    filtrosActivos = {
        fecha: document.getElementById('filtroFecha').value || null,
        estado: document.getElementById('filtroEstado').value || null,
        prioridad: document.getElementById('filtroPrioridad').value || null
    };

    const tareasFiltradas = await tareaService.filtrar(filtrosActivos);
    renderizarTareas(tareasFiltradas);
}

/**
 * Limpia todos los filtros
 */
function limpiarFiltros() {
    document.getElementById('filtroFecha').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroPrioridad').value = '';
    filtrosActivos = {};
    renderizarTareas(tareas);
}

/**
 * Actualiza las estadísticas
 */
async function actualizarEstadisticas() {
    const stats = await tareaService.obtenerEstadisticas();
    
    document.getElementById('statPendientes').textContent = stats.pendientes;
    document.getElementById('statPlanificadas').textContent = stats.planificadas;
    document.getElementById('statCompletadas').textContent = stats.completadas;
    document.getElementById('statTotal').textContent = stats.total;
}

/**
 * Carga las tareas en el selector de dependencias
 */
function cargarTareasEnSelector(tareaActualId = null) {
    const selector = document.getElementById('tareaDependeDe');
    selector.innerHTML = '<option value="">Sin dependencia</option>';
    
    tareas
        .filter(t => t.id !== tareaActualId) // Excluir la tarea actual
        .forEach(t => {
            const option = document.createElement('option');
            option.value = t.id;
            option.textContent = `${t.nombre} (${t.fecha})`;
            selector.appendChild(option);
        });
}

/**
 * Limpia el formulario
 */
function limpiarFormulario() {
    formTarea.reset();
    document.getElementById('tareaId').value = '';
    document.getElementById('tareaFecha').value = config.getFechaHoy();
    // Seleccionar "Sin restricción" por defecto
    document.getElementById('climaNinguno').checked = true;
}

/**
 * Muestra indicador de carga
 */
function mostrarCargando() {
    listaTareasElement.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="text-muted mt-3">Cargando tareas...</p>
        </div>
    `;
}

/**
 * Muestra un mensaje de error
 */
function mostrarError(mensaje) {
    listaTareasElement.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> ${mensaje}
        </div>
    `;
}

/**
 * Muestra una alerta en modal
 * @param {string} tipo - 'warning', 'error', 'info', 'success'
 * @param {string} titulo - Título del modal
 * @param {string} mensaje - Mensaje a mostrar
 * @param {function} onConfirmar - Función callback opcional para confirmación
 */
function mostrarAlerta(tipo, titulo, mensaje, onConfirmar = null) {
    const header = document.getElementById('modalAlertaHeader');
    const icon = document.getElementById('modalAlertaIcon');
    const tituloElement = document.getElementById('modalAlertaTitulo');
    const mensajeElement = document.getElementById('modalAlertaMensaje');
    const btnCancelar = document.getElementById('btnAlertaCancelar');
    const btnConfirmar = document.getElementById('btnAlertaConfirmar');
    
    // Limpiar clases anteriores
    header.className = 'modal-header';
    icon.className = 'bi';
    
    // Configurar según el tipo
    switch(tipo) {
        case 'warning':
            header.classList.add('bg-warning', 'text-dark');
            icon.classList.add('bi-exclamation-triangle-fill');
            break;
        case 'error':
            header.classList.add('bg-danger', 'text-white');
            icon.classList.add('bi-x-circle-fill');
            break;
        case 'info':
            header.classList.add('bg-info', 'text-dark');
            icon.classList.add('bi-info-circle-fill');
            break;
        case 'success':
            header.classList.add('bg-success', 'text-white');
            icon.classList.add('bi-check-circle-fill');
            break;
    }
    
    tituloElement.textContent = titulo;
    mensajeElement.textContent = mensaje;
    
    // Configurar botones según si hay confirmación
    if (onConfirmar) {
        btnCancelar.textContent = 'Cancelar';
        btnConfirmar.style.display = 'inline-block';
        btnConfirmar.className = 'btn btn-danger';
        
        // Limpiar eventos anteriores
        const nuevoBoton = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(nuevoBoton, btnConfirmar);
        
        // Agregar nuevo evento
        document.getElementById('btnAlertaConfirmar').addEventListener('click', function() {
            modalAlerta.hide();
            onConfirmar();
        });
    } else {
        btnCancelar.textContent = 'Cerrar';
        btnConfirmar.style.display = 'none';
    }
    
    modalAlerta.show();
}

/**
 * Valida que no existan dependencias circulares
 * @param {number} tareaId - ID de la tarea actual
 * @param {number} dependeDeId - ID de la tarea de la que depende
 * @returns {boolean} true si hay ciclo, false si no hay ciclo
 */
function validarDependenciaCircular(tareaId, dependeDeId) {
    const visitados = new Set();
    let actual = dependeDeId;
    
    while (actual !== null && !visitados.has(actual)) {
        // Si encontramos la tarea actual en la cadena, hay ciclo
        if (actual === tareaId) {
            return true;
        }
        
        visitados.add(actual);
        
        // Buscar la siguiente tarea en la cadena
        const tareaPadre = tareasCache.find(t => t.id === actual);
        actual = tareaPadre ? tareaPadre.dependeDeId : null;
    }
    
    return false;
}

// Hacer funciones disponibles globalmente
window.editarTarea = editarTarea;
window.eliminarTarea = eliminarTarea;
window.marcarCompletada = marcarCompletada;
