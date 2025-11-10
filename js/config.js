/**
 * Configuración global de la aplicación
 */

const config = {
    // URL base del backend
    API_BASE_URL: 'http://localhost:8081/api',
    
    // Usuario ID hardcoded (no hay sistema de autenticación, se usa valor fijo)
    // El backend requiere este campo pero no valida usuarios reales
    USUARIO_ID: 1,
    
    // Configuración de timeouts (en milisegundos)
    REQUEST_TIMEOUT: 10000
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
config.getFechaHoy = function() {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
};

// Hacer disponible globalmente
window.config = config;
