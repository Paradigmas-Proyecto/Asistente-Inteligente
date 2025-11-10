/**
 * Servicio para gestión de Tareas
 * Conecta con la API REST del backend agenda-master
 */

const tareaService = {
    /**
     * Obtiene todas las tareas
     * GET /api/tareas
     */
    async listarTodas() {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas`);
            if (!response.ok) throw new Error('Error al obtener tareas');
            return await response.json();
        } catch (error) {
            console.error('Error en listarTodas:', error);
            throw error;
        }
    },

    /**
     * Obtiene una tarea por ID
     * GET /api/tareas/{id}
     */
    async obtener(id) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas/${id}`);
            if (!response.ok) throw new Error('Tarea no encontrada');
            return await response.json();
        } catch (error) {
            console.error('Error en obtener:', error);
            throw error;
        }
    },

    /**
     * Crea una nueva tarea
     * POST /api/tareas
     */
    async crear(tarea) {
        try {
            // Asegurar que tenga usuarioId
            const tareaConUsuario = {
                ...tarea,
                usuarioId: config.USUARIO_ID
            };
            
            const response = await fetch(`${config.API_BASE_URL}/tareas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tareaConUsuario)
            });
            
            if (!response.ok) throw new Error('Error al crear tarea');
            return await response.json();
        } catch (error) {
            console.error('Error en crear:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('No se pudo conectar al servidor. Verificar que esté en el puerto 8081');
            }
            throw error;
        }
    },

    /**
     * Actualiza una tarea existente
     * PUT /api/tareas/{id}
     */
    async actualizar(id, tarea) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tarea)
            });
            
            if (!response.ok) throw new Error('Error al actualizar tarea');
            return await response.json();
        } catch (error) {
            console.error('Error en actualizar:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('No se pudo conectar al servidor. Verificar que esté en el puerto 8081');
            }
            throw error;
        }
    },

    /**
     * Elimina una tarea
     * DELETE /api/tareas/{id}
     */
    async eliminar(id) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Error al eliminar tarea');
            return true;
        } catch (error) {
            console.error('Error en eliminar:', error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error('No se pudo conectar al servidor. Verificar que esté en el puerto 8081');
            }
            throw error;
        }
    },

    /**
     * Lista tareas por usuario y fecha
     * GET /api/tareas/por-fecha?usuarioId={id}&fecha={fecha}
     */
    async listarPorUsuarioYFecha(usuarioId, fecha) {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/tareas/por-fecha?usuarioId=${usuarioId}&fecha=${fecha}`
            );
            
            if (!response.ok) throw new Error('Error al obtener tareas por fecha');
            return await response.json();
        } catch (error) {
            console.error('Error en listarPorUsuarioYFecha:', error);
            throw error;
        }
    },

    /**
     * Lista tareas por estado
     * GET /api/tareas/por-estado?estado={estado}
     */
    async listarPorEstado(estado) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas/por-estado?estado=${estado}`);
            if (!response.ok) throw new Error('Error al obtener tareas por estado');
            return await response.json();
        } catch (error) {
            console.error('Error en listarPorEstado:', error);
            throw error;
        }
    },

    /**
     * Lista tareas por prioridad
     * GET /api/tareas/por-prioridad?prioridad={prioridad}
     */
    async listarPorPrioridad(prioridad) {
        try {
            const response = await fetch(`${config.API_BASE_URL}/tareas/por-prioridad?prioridad=${prioridad}`);
            if (!response.ok) throw new Error('Error al obtener tareas por prioridad');
            return await response.json();
        } catch (error) {
            console.error('Error en listarPorPrioridad:', error);
            throw error;
        }
    },

    /**
     * Cambia el estado de una tarea
     * PATCH /api/tareas/{id}/estado?nuevo={estado}
     */
    async cambiarEstado(id, nuevoEstado) {
        try {
            const response = await fetch(
                `${config.API_BASE_URL}/tareas/${id}/estado?nuevo=${nuevoEstado}`,
                { method: 'PATCH' }
            );
            
            if (!response.ok) throw new Error('Error al cambiar estado');
            return await response.json();
        } catch (error) {
            console.error('Error en cambiarEstado:', error);
            throw error;
        }
    },

    /**
     * Filtra tareas según criterios (cliente-side)
     * Este método siempre filtra localmente, independiente del modo
     */
    async filtrar(filtros) {
        // Obtiene TODAS las tareas
        let tareas = await this.listarTodas();
        // Filtra por fecha
        if (filtros.fecha) {
            tareas = tareas.filter(t => t.fecha === filtros.fecha);
        }
        // Filtra por estado
        if (filtros.estado) {
            tareas = tareas.filter(t => t.estado === filtros.estado);
        }
        // Filtra por prioridad
        if (filtros.prioridad) {
            tareas = tareas.filter(t => t.prioridad === filtros.prioridad);
        }
        // Filtra por usuario
        if (filtros.usuarioId) {
            tareas = tareas.filter(t => t.usuarioId === filtros.usuarioId);
        }
    /*
    tareaService.filtrar({
        fecha: '2024-11-07',
        estado: 'PENDIENTE',
        prioridad: 'ALTA'
    });
    */
        return tareas;
    },

    /**
     * Obtiene estadísticas de tareas (cliente-side)
     * Este método siempre calcula localmente, independiente del modo
     */
    async obtenerEstadisticas() {
        const tareas = await this.listarTodas();
        
        return {
            total: tareas.length,
            pendientes: tareas.filter(t => t.estado === 'PENDIENTE').length,
            planificadas: tareas.filter(t => t.estado === 'PLANIFICADA').length,
            completadas: tareas.filter(t => t.estado === 'COMPLETADA').length,
            porPrioridad: {
                alta: tareas.filter(t => t.prioridad === 'ALTA').length,
                media: tareas.filter(t => t.prioridad === 'MEDIA').length,
                baja: tareas.filter(t => t.prioridad === 'BAJA').length
            }
        };
    }
};

// Hacer disponible globalmente
window.tareaService = tareaService;
