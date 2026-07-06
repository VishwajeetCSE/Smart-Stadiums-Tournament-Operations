/**
 * FIFA StadiumOS - Security Module
 * Implements input sanitization, rate limiting, role-based access control (RBAC), and validation.
 */

// Simple Rate Limiter State
const rateLimitMap = new Map();
const LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

const ROLE_PERMISSIONS = {
    'Fan': ['viewDashboard', 'useChat', 'useVoice', 'viewMap'],
    'Volunteer': ['viewDashboard', 'useChat', 'useVoice', 'viewMap', 'reportIncident', 'viewIncidents', 'configureSettings'],
    'Organizer': ['viewDashboard', 'useChat', 'useVoice', 'viewMap', 'reportIncident', 'viewIncidents', 'configureSettings', 'resolveIncident', 'accessSecurityLogs', 'clearLogs']
};

/**
 * Escapes HTML characters to prevent Cross-Site Scripting (XSS)
 * @param {string} str Raw user input
 * @returns {string} Sanitized string
 */
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Validates if the current user has permission to perform an action
 * @param {string} action The permission to check
 * @returns {boolean} True if authorized
 */
function authorizeAction(action) {
    const userRole = window.appState.userRole || 'Fan';
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    const isAuthorized = permissions.includes(action);
    
    if (!isAuthorized) {
        logSecurityEvent(`Unauthorized Access Attempt: ${action}`, userRole, 'DENIED');
    }
    
    return isAuthorized;
}

/**
 * Evaluates rate limits for simulated API calls (like sending chat queries)
 * @param {string} clientId Identifier (e.g. 'chat' or 'incident')
 * @returns {boolean} True if under limit, False if rate-limited
 */
function checkRateLimit(clientId) {
    const now = Date.now();
    if (!rateLimitMap.has(clientId)) {
        rateLimitMap.set(clientId, []);
    }
    
    const timestamps = rateLimitMap.get(clientId);
    // Filter timestamps inside the window
    const activeTimestamps = timestamps.filter(t => (now - t) < LIMIT_WINDOW_MS);
    
    if (activeTimestamps.length >= MAX_REQUESTS) {
        logSecurityEvent(`Rate Limit Exceeded: ${clientId}`, window.appState.userRole, 'BLOCKED');
        return false;
    }
    
    activeTimestamps.push(now);
    rateLimitMap.set(clientId, activeTimestamps);
    return true;
}

/**
 * Validates a reported incident structure against strict schemas
 * @param {object} incident Incident details
 * @returns {object} { isValid: boolean, error: string }
 */
function validateIncident(incident) {
    const validTypes = ['Medical Emergency', 'Crowd Congestion', 'Liquid Spill', 'Equipment Failure', 'Suspicious Activity'];
    const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
    const validPriorities = ['Low', 'Medium', 'High'];

    if (!incident.type || !validTypes.includes(incident.type)) {
        return { isValid: false, error: 'Invalid incident type.' };
    }
    if (!incident.location || incident.location.length < 3 || incident.location.length > 50) {
        return { isValid: false, error: 'Location must be between 3 and 50 characters.' };
    }
    if (!incident.severity || !validSeverities.includes(incident.severity)) {
        return { isValid: false, error: 'Invalid severity grade.' };
    }
    if (!incident.priority || !validPriorities.includes(incident.priority)) {
        return { isValid: false, error: 'Invalid priority level.' };
    }
    
    return { isValid: true, error: null };
}

// Export functions to global scope for native module support
window.sanitizeInput = sanitizeInput;
window.authorizeAction = authorizeAction;
window.checkRateLimit = checkRateLimit;
window.validateIncident = validateIncident;
