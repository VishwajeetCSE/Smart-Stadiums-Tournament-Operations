/**
 * FIFA StadiumOS - App Orchestrator
 * Coordinates sidebar navigation, timer loops, and DOM rendering.
 */

// Tab Routing Handler
function switchTab(tabId) {
    // Check RBAC permission for Operations Command tab
    if (tabId === 'operations') {
        const operationsWarning = document.getElementById('operations-access-denied');
        const operationsPanel = document.getElementById('operations-content-panel');
        
        if (operationsWarning && operationsPanel) {
            if (authorizeAction('viewIncidents')) {
                operationsWarning.classList.add('hidden');
                operationsPanel.classList.remove('hidden');
            } else {
                operationsWarning.classList.remove('hidden');
                operationsPanel.classList.add('hidden');
            }
        }
    }

    // Toggle tab panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        }
    });

    // Toggle active nav links
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');
        } else {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        }
    });

    window.appState.activeTab = tabId;
    
    // Announce tab changes to Screen Readers
    announceScreenReader(`Switched to ${tabId} panel.`);

    // Trigger specific rendering per tab
    if (tabId === 'navigator') {
        drawNavigationMap();
    } else if (tabId === 'operations') {
        updateIncidentsDOM();
        updateSecurityLogsDOM();
    } else if (tabId === 'crowd') {
        updateQueuesDOM();
        updateTransportDOM();
    } else if (tabId === 'sustainability') {
        updateSustainabilityDOM();
    }

    saveStateToLocalStorage();
}

/**
 * Live Clock Loop
 */
function runLiveClock() {
    const clock = document.getElementById('live-dashboard-clock');
    if (clock) {
        clock.textContent = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    }
    setTimeout(runLiveClock, 1000);
}

/**
 * Match Day Countdown Tick
 */
let countdownSeconds = 9000; // 2.5 hours
function runMatchCountdown() {
    const clockEl = document.getElementById('kickoff-countdown');
    if (clockEl) {
        if (countdownSeconds > 0) {
            countdownSeconds--;
            const hrs = Math.floor(countdownSeconds / 3600).toString().padStart(2, '0');
            const mins = Math.floor((countdownSeconds % 3600) / 60).toString().padStart(2, '0');
            const secs = (countdownSeconds % 60).toString().padStart(2, '0');
            clockEl.textContent = `${hrs}h ${mins}m ${secs}s`;
        } else {
            clockEl.textContent = 'MATCH IN PROGRESS';
            clockEl.className = 'text-sm font-bold text-emerald';
        }
    }
    setTimeout(runMatchCountdown, 1000);
}

/**
 * Sidebar Role Selector Changed
 */
function changeUserRole(role) {
    window.appState.userRole = role;
    
    // Update profile displays
    const nameDisplay = document.getElementById('user-name-display');
    const badgeDisplay = document.getElementById('user-role-badge');
    
    if (nameDisplay) {
        nameDisplay.textContent = role === 'Fan' ? 'Guest Fan' : role === 'Volunteer' ? 'Steward Crew' : 'Director Crew';
    }
    if (badgeDisplay) {
        badgeDisplay.textContent = `${role} Mode`;
    }

    logSecurityEvent(`User role changed to: ${role}`, role, 'SUCCESS');
    
    // Reforce tab permissions if currently on operations
    if (window.appState.activeTab === 'operations') {
        switchTab('operations');
    }
    
    saveStateToLocalStorage();
}

/**
 * Main App Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup Navigation tab listeners
    const navItems = document.querySelectorAll('.nav-menu .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Handle initial state loads
    loadStateFromLocalStorage();
    
    // Sync settings in inputs
    const keyVal = sessionStorage.getItem('stadiumos_api_key');
    const keyInput = document.getElementById('gemini-key-input');
    if (keyInput && keyVal) {
        keyInput.value = keyVal;
    }
    
    const textScaleSlider = document.getElementById('accessibility-text-scale');
    if (textScaleSlider) {
        textScaleSlider.value = window.appState.accessibility.textScale;
    }
    const colorblindSelect = document.getElementById('accessibility-colorblind');
    if (colorblindSelect) {
        colorblindSelect.value = window.appState.accessibility.colorBlindMode;
    }
    const contrastCheck = document.getElementById('accessibility-high-contrast');
    if (contrastCheck) {
        contrastCheck.checked = window.appState.accessibility.highContrast;
    }
    const motionCheck = document.getElementById('accessibility-reduced-motion');
    if (motionCheck) {
        motionCheck.checked = window.appState.accessibility.reducedMotion;
    }

    // Apply initial accessibility styling
    updateAccessibilityPrefs();

    // Trigger initial match phase rendering (initializes AI banners and telemetry)
    window.changeMatchPhase('Pre-Match');
    
    // Launch Clock Loops
    runLiveClock();
    runMatchCountdown();
    
    // Populate Lucide Icons
    lucide.createIcons();
});

// Global Exports
window.changeUserRole = changeUserRole;
