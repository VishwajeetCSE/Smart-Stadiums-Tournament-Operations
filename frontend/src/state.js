/**
 * FIFA StadiumOS - Global State Management
 * Tracks user roles, live telemetry, security logs, and AI incident command boards.
 */

// Initialize default state
const DEFAULT_STATE = {
    userRole: 'Fan', // 'Fan', 'Volunteer', 'Organizer'
    activeTab: 'dashboard',
    matchPhase: 'Pre-Match',
    
    // Accessibility Preferences
    accessibility: {
        textScale: 100, // percentage 100-150
        colorBlindMode: 'none', // 'none', 'deuteranopia', 'protanopia', 'tritanopia'
        highContrast: false,
        reducedMotion: false,
        voiceNavigation: false
    },

    // Live Telemetry (Digital Twin Data)
    telemetry: {
        gates: [
            { id: 'Gate A', currentOccupancy: 820, capacity: 1500, status: 'Normal', queueTime: 8, predictedQueue: 12 },
            { id: 'Gate B', currentOccupancy: 1350, capacity: 1500, status: 'Heavy', queueTime: 18, predictedQueue: 25 },
            { id: 'Gate C', currentOccupancy: 610, capacity: 1500, status: 'Normal', queueTime: 5, predictedQueue: 7 },
            { id: 'Gate D (VIP)', currentOccupancy: 150, capacity: 500, status: 'Normal', queueTime: 2, predictedQueue: 3 }
        ],
        concessions: [
            { id: 'Food Court A', queueTime: 9, predictedQueue: 15, status: 'Moderate' },
            { id: 'Food Court B', queueTime: 14, predictedQueue: 20, status: 'Heavy' },
            { id: 'Merchandise East', queueTime: 4, predictedQueue: 5, status: 'Normal' },
            { id: 'Merchandise West', queueTime: 8, predictedQueue: 10, status: 'Normal' }
        ],
        transit: {
            shuttles: [
                { id: 'Metro Shuttle A', occupancy: '85%', interval: '4 min', status: 'Active' },
                { id: 'Express Shuttle B', occupancy: '45%', interval: '8 min', status: 'Active' }
            ],
            parking: { zoneA: 92, zoneB: 78, zoneC: 34 }, // percentage full
            metroLine: 'Operational (Minor Delays)'
        },
        sustainability: {
            solarOutput: 245, // kW
            waterRecycled: 14500, // Liters
            wasteDiverted: 84, // percentage
            carbonSaved: 18.2 // Tons CO2e
        }
    },

    // AI Incident Commander logs
    incidents: [
        {
            id: 'INC-1001',
            type: 'Crowd Congestion',
            location: 'Gate B Entrance',
            severity: 'Medium',
            priority: 'High',
            assignedVolunteers: 'Team Alpha (4 Members)',
            status: 'In Progress',
            timeline: '23:05 Incident detected. 23:10 Rerouted VIP shuttle.',
            suggestedResponse: 'Redirect sector 105 arrivals to Gate C. Increase gate screening staff.',
            estimatedRecovery: '15 Mins',
            finalReport: null
        },
        {
            id: 'INC-1002',
            type: 'Liquid Spill',
            location: 'Sector 108 Concourse',
            severity: 'Low',
            priority: 'Medium',
            assignedVolunteers: 'Volunteer Support Carlos M.',
            status: 'Resolved',
            timeline: '22:40 Spill reported. 22:45 Cleanup team dispatched. 22:52 Area dried.',
            suggestedResponse: 'Dry area, put caution cones.',
            estimatedRecovery: 'Completed',
            finalReport: 'Area dried and inspected by Sector Commander at 22:55. Safe for public thoroughfare.'
        }
    ],

    // Security Audit Logging
    securityLogs: [
        { timestamp: new Date().toISOString(), event: 'System initialization', user: 'SYSTEM', status: 'SUCCESS' }
    ]
};

// Global State object
window.appState = { ...DEFAULT_STATE };

// Temporary session key store (Memory / Session-only)
let geminiApiKey = sessionStorage.getItem('stadiumos_api_key') || '';

/**
 * Gets the current Gemini API Key safely.
 * @returns {string} API Key
 */
function getApiKey() {
    return geminiApiKey;
}

/**
 * Sets the Gemini API Key strictly in sessionStorage / memory.
 * @param {string} key API Key
 */
function setApiKey(key) {
    geminiApiKey = key;
    if (key) {
        sessionStorage.setItem('stadiumos_api_key', key);
    } else {
        sessionStorage.removeItem('stadiumos_api_key');
    }
    logSecurityEvent('API Key Configured', window.appState.userRole, 'SUCCESS');
}

/**
 * Helper to log security/access events
 */
function logSecurityEvent(event, user, status) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event: event,
        user: user,
        status: status
    };
    window.appState.securityLogs.unshift(logEntry);
    if (window.appState.securityLogs.length > 50) {
        window.appState.securityLogs.pop();
    }
    // Dispatch update event
    document.dispatchEvent(new CustomEvent('securityLogUpdated'));
}

/**
 * Saves non-sensitive state to localStorage for persistence
 */
function saveStateToLocalStorage() {
    const persistState = {
        userRole: window.appState.userRole,
        accessibility: window.appState.accessibility,
        incidents: window.appState.incidents,
        securityLogs: window.appState.securityLogs
    };
    localStorage.setItem('fifa_stadiumos_state', JSON.stringify(persistState));
}

/**
 * Loads persistent state from localStorage
 */
function loadStateFromLocalStorage() {
    try {
        const data = localStorage.getItem('fifa_stadiumos_state');
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.userRole) window.appState.userRole = parsed.userRole;
            if (parsed.accessibility) window.appState.accessibility = { ...window.appState.accessibility, ...parsed.accessibility };
            if (parsed.incidents) window.appState.incidents = parsed.incidents;
            if (parsed.securityLogs) window.appState.securityLogs = parsed.securityLogs;
            logSecurityEvent('State loaded from storage', window.appState.userRole, 'SUCCESS');
        }
    } catch (e) {
        console.error('Error loading persistent state:', e);
        logSecurityEvent('State load failed', 'SYSTEM', 'FAILED');
    }
}

// Global Exports
window.getApiKey = getApiKey;
window.setApiKey = setApiKey;
window.saveStateToLocalStorage = saveStateToLocalStorage;
window.loadStateFromLocalStorage = loadStateFromLocalStorage;
window.logSecurityEvent = logSecurityEvent;
