/**
 * Servicio para la Planificación Inteligente
 * Conecta con el endpoint de planificación del backend agenda-master
 */

const planificacionService = {
    /**
     * Genera un plan optimizado para el día
     */
    async generarPlan(planConfig) {
        try {
            const response = await fetch(`${window.config.API_BASE_URL}/agenda/planificar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planConfig)
            });
            
            if (!response.ok) {
                throw new Error('Error al generar plan');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en generarPlan:', error);
            throw error;
        }
    },

    /**
     * Replanifica el día considerando solo tareas pendientes
     * Útil cuando el usuario ha completado algunas tareas durante el día
     * y desea regenerar el plan solo con las tareas restantes
     */
    async replanificar(planConfig) {
        try {
            const response = await fetch(`${window.config.API_BASE_URL}/agenda/replanificar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planConfig)
            });
            
            if (!response.ok) {
                throw new Error('Error al replanificar');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en replanificar:', error);
            throw error;
        }
    }
};

window.planificacionService = planificacionService;
