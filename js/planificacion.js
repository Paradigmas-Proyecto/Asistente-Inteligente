/**
 * Lógica de la página de planificación (planificacion.html)
 * 
 * Propósito:
 * - Permite al usuario configurar parámetros del día (fecha, clima, horas disponibles)
 * - Comunica con el backend (o Prolog vía backend) para generar un plan optimizado
 * - Muestra el plan resultante con tareas ordenadas por prioridad y dependencias
 * - Visualiza tareas que no pudieron ser programadas
 * 
 * Flujo:
 * 1. Usuario configura: fecha, clima, hora inicio, minutos disponibles
 * 2. Se envía request a /api/agenda/planificar
 * 3. Backend usa Prolog para calcular plan óptimo
 * 4. Se muestra resultado con timeline de tareas
 */

console.log('planificacion.js cargado');

// Estado de la aplicación de planificación
let planActual = null;              // Plan generado actualmente mostrado
let tareasDisponibles = [];         // Tareas disponibles para planificar

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded ejecutado');
    inicializarPlanificacion();
    configurarEventosPlanificacion();
    cargarTareasDisponibles();
});

/**
 * Inicializa la página de planificación con valores por defecto
 */
function inicializarPlanificacion() {
    // Establecer fecha de hoy como valor inicial
    document.getElementById('planFecha').value = config.getFechaHoy();
    
    // Actualizar texto de horas equivalentes cuando cambie el input de minutos
    document.getElementById('planMinutos').addEventListener('input', function() {
        const minutos = parseInt(this.value);
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        document.getElementById('horasEquivalentes').textContent = 
            `${horas} horas ${mins > 0 ? 'y ' + mins + ' minutos' : ''}`;
    });
    
    // Mostrar icono dinámico del clima cuando se seleccione
    const selectClima = document.getElementById('planClima');
    if (selectClima) {
        selectClima.addEventListener('change', function() {
            console.log('Clima seleccionado:', this.value);
            mostrarIconoClima(this.value);
        });
    } else {
        console.error('No se encontró el elemento planClima');
    }
}

/**
 * Muestra el icono correspondiente al clima seleccionado
 * @param {string} clima - Valor del clima: 'soleado', 'nublado', 'lluvioso', 'ventoso'
 */
function mostrarIconoClima(clima) {
    console.log('mostrarIconoClima llamada con:', clima);
    const iconContainer = document.getElementById('climaIcon');
    console.log('iconContainer encontrado:', iconContainer);
    
    const iconos = {
        'desconocido': '<i class="bi bi-question-circle" style="font-size: 32px; color: #6c757d;"></i>',
        'soleado': '<i class="bi bi-brightness-high" style="font-size: 32px; color: #ffc107;"></i>',
        'nublado': '<i class="bi bi-clouds" style="font-size: 32px; color: #6c757d;"></i>',
        'lluvioso': '<i class="bi bi-cloud-rain-heavy" style="font-size: 32px; color: #0d6efd;"></i>',
        'ventoso': '<i class="bi bi-wind" style="font-size: 32px; color: #17a2b8;"></i>'
    };
    
    if (clima && iconos[clima]) {
        console.log('Mostrando icono para:', clima);
        iconContainer.innerHTML = iconos[clima];
        iconContainer.style.opacity = '1';
    } else {
        console.log('Ocultando icono');
        iconContainer.innerHTML = '';
        iconContainer.style.opacity = '0';
    }
}

/**
 * Configura los event listeners
 */
function configurarEventosPlanificacion() {
    const form = document.getElementById('formPlanificacion');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generarPlan();
    });

    // Botón de replanificar
    const btnReplanificar = document.getElementById('btnReplanificar');
    btnReplanificar.addEventListener('click', function() {
        replanificar();
    });
}

/**
 * Carga las tareas disponibles desde el servicio
 * Se usa para mostrar el resumen de tareas en el panel lateral
 */
async function cargarTareasDisponibles() {
    try {
        tareasDisponibles = await tareaService.listarTodas();
        actualizarResumenTareas();
    } catch (error) {
        console.error('Error al cargar tareas:', error);
    }
}

/**
 * Actualiza el resumen de tareas disponibles en el panel informativo
 * Muestra cantidad total y cantidad de tareas pendientes
 */
function actualizarResumenTareas() {
    const totalTareas = tareasDisponibles.length;
    const totalPendientes = tareasDisponibles.filter(t => 
        t.estado === 'PENDIENTE' || t.estado === 'PLANIFICADA'
    ).length;

    document.getElementById('totalTareas').textContent = totalTareas;
    document.getElementById('totalPendientes').textContent = totalPendientes;
}

/**
 * Genera el plan optimizado según la configuración del usuario
 * Proceso:
 * 1. Recolecta parámetros del formulario (fecha, clima, minutos, hora inicio)
 * 2. Envía request al backend (POST /api/agenda/planificar)
 * 3. Backend consulta Prolog para generar plan óptimo
 * 4. Muestra resultados o error
 */
async function generarPlan() {
    try {
        // Ocultar todas las áreas de contenido
        document.getElementById('areaInicial').classList.add('d-none');
        document.getElementById('areaResultados').classList.add('d-none');
        document.getElementById('areaError').classList.add('d-none');
        
        // Mostrar indicador de carga
        document.getElementById('areaCargando').classList.remove('d-none');

        // Recolectar configuración del formulario
        const planConfig = {
            usuarioId: config.USUARIO_ID,                              // Usuario hardcoded
            fecha: document.getElementById('planFecha').value,            // Fecha a planificar
            climaDia: document.getElementById('planClima').value,         // Clima del día (para filtrar tareas)
            minutosDisponibles: parseInt(document.getElementById('planMinutos').value),  // Tiempo total
            horaInicio: document.getElementById('planHoraInicio').value   // Hora de inicio del día
        };

        // Validar que se haya seleccionado el clima
        if (!planConfig.climaDia) {
            throw new Error('Debe seleccionar el clima del día');
        }

        // Llamar al servicio de planificación (conecta con backend/Prolog)
        planActual = await planificacionService.generarPlan(planConfig);

        // Ocultar loading
        document.getElementById('areaCargando').classList.add('d-none');

        // Mostrar resultados del plan
        mostrarResultados(planActual);

    } catch (error) {
        console.error('Error al generar plan:', error);
        document.getElementById('areaCargando').classList.add('d-none');
        document.getElementById('mensajeError').textContent = error.message;
        document.getElementById('areaError').classList.remove('d-none');
    }
}

/**
 * Replanifica el día considerando solo tareas pendientes
 * Útil cuando el usuario ha completado algunas tareas durante el día
 */
async function replanificar() {
    try {
        // Ocultar todas las áreas de contenido
        document.getElementById('areaResultados').classList.add('d-none');
        document.getElementById('areaError').classList.add('d-none');
        document.getElementById('areaSugerencias').classList.add('d-none');
        
        // Mostrar indicador de carga
        document.getElementById('areaCargando').classList.remove('d-none');

        // Recolectar configuración del formulario (puede ser ajustada)
        const planConfig = {
            usuarioId: config.USUARIO_ID,
            fecha: document.getElementById('planFecha').value,
            climaDia: document.getElementById('planClima').value,
            minutosDisponibles: parseInt(document.getElementById('planMinutos').value),
            horaInicio: document.getElementById('planHoraInicio').value
        };

        // Llamar al servicio de replanificación
        planActual = await planificacionService.replanificar(planConfig);

        // Ocultar loading
        document.getElementById('areaCargando').classList.add('d-none');

        // Mostrar resultados del plan
        mostrarResultados(planActual);

    } catch (error) {
        console.error('Error al replanificar:', error);
        document.getElementById('areaCargando').classList.add('d-none');
        document.getElementById('mensajeError').textContent = error.message;
        document.getElementById('areaError').classList.remove('d-none');
    }
}

/**
 * Muestra los resultados del plan generado en la interfaz
 * @param {Object} plan - Objeto PlanResponse del backend con:
 *   - posible: boolean
 *   - minutosDisponibles: number
 *   - minutosUsados: number
 *   - minutosSobrantes: number
 *   - tareasPlan: array de tareas con horarios
 *   - noProgramadas: array de tareas no programadas
 */
function mostrarResultados(plan) {
    // Actualizar estado visual del plan (banner superior)
    const estadoElement = document.getElementById('estadoPlan');
    if (plan.posible && plan.tareasPlan.length > 0) {
        estadoElement.innerHTML = '<i class="bi bi-check-circle"></i> Plan Generado Exitosamente';
        estadoElement.parentElement.classList.remove('bg-danger', 'bg-warning');
        estadoElement.parentElement.classList.add('bg-success');
    } else if (plan.tareasPlan.length === 0) {
        estadoElement.innerHTML = '<i class="bi bi-info-circle"></i> No hay tareas para planificar';
        estadoElement.parentElement.classList.remove('bg-danger', 'bg-success');
        estadoElement.parentElement.classList.add('bg-warning');
    } else {
        estadoElement.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Plan Parcial';
        estadoElement.parentElement.classList.remove('bg-success', 'bg-danger');
        estadoElement.parentElement.classList.add('bg-warning');
    }

    // Actualizar métricas
    document.getElementById('minDisponibles').textContent = plan.minutosDisponibles;
    document.getElementById('minUsados').textContent = plan.minutosUsados;
    document.getElementById('minSobrantes').textContent = plan.minutosSobrantes;

    // Renderizar timeline
    renderizarTimeline(plan.tareasPlan);

    // Mostrar tareas no programadas si existen
    if (plan.noProgramadas && plan.noProgramadas.length > 0) {
        document.getElementById('areaNoProgramadas').classList.remove('d-none');
        renderizarNoProgramadas(plan.noProgramadas);
    } else {
        document.getElementById('areaNoProgramadas').classList.add('d-none');
    }

    // Mostrar sugerencias si el plan no es posible y hay sugerencias
    if (!plan.posible && plan.sugerencias) {
        document.getElementById('areaSugerencias').classList.remove('d-none');
        document.getElementById('contenidoSugerencias').textContent = plan.sugerencias;
    } else {
        document.getElementById('areaSugerencias').classList.add('d-none');
    }

    // Mostrar botón de replanificar si hay tareas planificadas
    const btnReplanificar = document.getElementById('btnReplanificar');
    const textoReplanificar = document.getElementById('textoReplanificar');
    if (plan.tareasPlan && plan.tareasPlan.length > 0) {
        btnReplanificar.classList.remove('d-none');
        textoReplanificar.classList.remove('d-none');
    } else {
        btnReplanificar.classList.add('d-none');
        textoReplanificar.classList.add('d-none');
    }

    // Mostrar área de resultados
    document.getElementById('areaResultados').classList.remove('d-none');

    // Actualizar el estado de las tareas en el backend (opcional)
    actualizarEstadoTareas(plan.tareasPlan);
}

/**
 * Renderiza el timeline de tareas planificadas
 */
function renderizarTimeline(tareasPlan) {
    const timeline = document.getElementById('timelineTareas');

    if (!tareasPlan || tareasPlan.length === 0) {
        timeline.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-calendar-x" style="font-size: 2rem;"></i>
                <p class="mt-2">No hay tareas planificadas</p>
            </div>
        `;
        return;
    }

    const html = tareasPlan.map((slot, index) => {
        const isLast = index === tareasPlan.length - 1;
        const duracion = calcularDuracion(slot.inicio, slot.fin);
        
        return `
            <div class="timeline-item ${isLast ? '' : 'mb-3'}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-time">
                        <i class="bi bi-clock"></i> ${slot.inicio} - ${slot.fin}
                    </div>
                    <div class="timeline-title">${slot.nombre}</div>
                    <div class="timeline-duration">
                        <i class="bi bi-hourglass-split"></i> Duración: ${duracion} minutos
                    </div>
                </div>
            </div>
        `;
    }).join('');

    timeline.innerHTML = html;
}

/**
 * Renderiza las tareas no programadas
 */
function renderizarNoProgramadas(noProgramadas) {
    const lista = document.getElementById('listaNoProgramadas');

    const html = noProgramadas.map(tarea => {
        const prioridad = obtenerTextoPrioridad(tarea.prioridad || tarea.dur);
        const climaInfo = tarea.climas && tarea.climas.length > 0 
            ? `<small class="text-muted">Requiere clima: ${tarea.climas.join(', ')}</small>`
            : '';

        return `
            <div class="alert alert-warning mb-2" role="alert">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>${tarea.nombre}</strong>
                        <div class="small text-muted">
                            Duración: ${tarea.dur} minutos | Prioridad: ${prioridad}
                        </div>
                        ${climaInfo}
                    </div>
                    <span class="badge bg-warning text-dark">No programada</span>
                </div>
            </div>
        `;
    }).join('');

    lista.innerHTML = html;
}

/**
 * Calcula la duración entre dos horas
 */
function calcularDuracion(inicio, fin) {
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    
    const minutos1 = h1 * 60 + m1;
    const minutos2 = h2 * 60 + m2;
    
    return minutos2 - minutos1;
}

/**
 * Obtiene texto de prioridad desde número
 */
function obtenerTextoPrioridad(prioridad) {
    if (typeof prioridad === 'string') return prioridad;
    
    const mapa = {
        3: 'Alta',
        2: 'Media',
        1: 'Baja'
    };
    return mapa[prioridad] || 'Media';
}

/**
 * Actualiza el estado de las tareas planificadas
 */
async function actualizarEstadoTareas(tareasPlan) {
    // Actualizar estado de tareas planificadas en el backend
    try {
        for (const slot of tareasPlan) {
            await tareaService.cambiarEstado(slot.id, 'PLANIFICADA');
        }
    } catch (error) {
        console.error('Error al actualizar estados:', error);
    }
}

/**
 * Exporta el plan a formato imprimible
 */
function exportarPlan() {
    if (!planActual || !planActual.tareasPlan.length) {
        alert('No hay un plan generado para exportar');
        return;
    }

    // Preparar contenido
    const fecha = document.getElementById('planFecha').value;
    const clima = document.getElementById('planClima').value;
    
    let contenido = `PLAN DEL DÍA - ${fecha}\n`;
    contenido += `Clima: ${clima}\n`;
    contenido += `Tiempo disponible: ${planActual.minutosDisponibles} minutos\n`;
    contenido += `Tiempo utilizado: ${planActual.minutosUsados} minutos\n`;
    contenido += `Tiempo libre: ${planActual.minutosSobrantes} minutos\n\n`;
    contenido += `TAREAS PLANIFICADAS:\n`;
    contenido += `${'='.repeat(50)}\n\n`;

    planActual.tareasPlan.forEach((slot, index) => {
        contenido += `${index + 1}. ${slot.nombre}\n`;
        contenido += `   Horario: ${slot.inicio} - ${slot.fin}\n\n`;
    });

    if (planActual.noProgramadas && planActual.noProgramadas.length > 0) {
        contenido += `\nTAREAS NO PROGRAMADAS:\n`;
        contenido += `${'='.repeat(50)}\n\n`;
        planActual.noProgramadas.forEach((tarea, index) => {
            contenido += `${index + 1}. ${tarea.nombre} (${tarea.dur} min)\n`;
        });
    }

    // Crear blob y descargar
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_${fecha}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Hacer funciones disponibles globalmente si es necesario
window.exportarPlan = exportarPlan;
