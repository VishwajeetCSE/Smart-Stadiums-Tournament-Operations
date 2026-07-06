/**
 * FIFA StadiumOS - Crowd Telemetry & AI Digital Twin Module
 * Feeds live gates status, predicts queue wait times, and explains the twin state via GenAI.
 */

/**
 * Renders the gates telemetry nodes in the Digital Twin visualizer
 */
function updateDigitalTwinDOM() {
    const container = document.getElementById('twin-telemetry-nodes');
    if (!container) return;

    container.innerHTML = '';
    window.appState.telemetry.gates.forEach(gate => {
        const pct = Math.round((gate.currentOccupancy / gate.capacity) * 100);
        const isWarning = pct >= 85;
        
        const node = document.createElement('div');
        node.className = `twin-node ${isWarning ? 'warning' : ''}`;
        
        node.innerHTML = `
            <span class="twin-node-title">${gate.id}</span>
            <span class="twin-node-value">${pct}% Full</span>
            <span class="text-xs ${isWarning ? 'text-coral' : 'text-emerald'}">${gate.currentOccupancy} / ${gate.capacity} Fans</span>
        `;
        container.appendChild(node);
    });

    // Update KPI Occupancy
    const totalOccupancy = window.appState.telemetry.gates.reduce((sum, g) => sum + g.currentOccupancy, 0);
    const kpiOcc = document.getElementById('kpi-occupancy');
    if (kpiOcc) {
        kpiOcc.textContent = `${totalOccupancy.toLocaleString()} / 60,000`;
    }

    // Update KPI Wait Time (average of gates)
    const avgWait = Math.round(window.appState.telemetry.gates.reduce((sum, g) => sum + g.queueTime, 0) / window.appState.telemetry.gates.length);
    const kpiWait = document.getElementById('kpi-waittime');
    if (kpiWait) {
        kpiWait.textContent = `${avgWait} Mins`;
    }
}

/**
 * Renders concessions queue list and queue predictions
 */
function updateQueuesDOM() {
    const list = document.getElementById('concession-queue-list');
    if (!list) return;

    list.innerHTML = '';
    window.appState.telemetry.concessions.forEach(item => {
        const isHeavy = item.status === 'Heavy';
        
        const row = document.createElement('div');
        row.className = 'twin-node mt-2';
        row.style.flexDirection = 'row';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        
        row.innerHTML = `
            <div>
                <p class="font-bold text-sm">${item.id}</p>
                <p class="text-xs text-muted">Status: <span class="${isHeavy ? 'text-coral' : 'text-emerald'}">${item.status}</span></p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold">${item.queueTime} Mins</p>
                <p class="text-xs text-blue">AI Forecast: ${item.predictedQueue} Mins</p>
            </div>
        `;
        list.appendChild(row);
    });
}

/**
 * Triggers GenAI to explain the Digital Twin telemetry state
 */
async function refreshDigitalTwin() {
    const explanationBubble = document.getElementById('twin-ai-recommendation');
    if (!explanationBubble) return;

    explanationBubble.textContent = 'AI operations analyst is parsing telemetry...';

    const apiKey = sessionStorage.getItem('stadiumos_api_key');
    
    // Construct telemetry prompt
    const gatesInfo = window.appState.telemetry.gates.map(g => `${g.id}: ${g.currentOccupancy}/${g.capacity} (${g.queueTime}m wait)`).join(', ');
    const activeIncidents = window.appState.incidents.filter(i => i.status === 'In Progress').map(i => `${i.type} at ${i.location}`).join(', ');

    if (apiKey) {
        try {
            const prompt = `You are the Head Operations Analyst for the FIFA 2026 World Cup Stadium.
Given the following real-time telemetry data:
- Gates: ${gatesInfo}
- Active Incidents: ${activeIncidents || 'None'}

Provide a 2-3 sentence strategic operations summary. Spot congestion, recommend specific volunteer rerouting actions, and suggest gate redirects. Make it sound professional and urgent.`;
            
            const explanation = await callGemini(prompt);
            explanationBubble.textContent = explanation;
            logSecurityEvent('AI Digital Twin Telemetry Refreshed', window.appState.userRole, 'SUCCESS');
        } catch (e) {
            console.error(e);
            explanationBubble.textContent = `AI analysis failed: ${e.message}. Falling back to offline telemetry advisor.`;
            generateLocalTwinExplanation(explanationBubble);
        }
    } else {
        generateLocalTwinExplanation(explanationBubble);
    }
}

/**
 * Fallback local explainer logic for Digital Twin
 */
function generateLocalTwinExplanation(element) {
    let alertMsg = 'All stadium systems are stable. Fan entrances are flowing smoothly.';
    const heavyGates = window.appState.telemetry.gates.filter(g => (g.currentOccupancy / g.capacity) >= 0.85);
    
    if (heavyGates.length > 0) {
        const gateNames = heavyGates.map(g => g.id).join(' and ');
        alertMsg = `⚠️ ALERT: **${gateNames}** has exceeded 85% flow capacity. Concession lines at Food Court B are rising. Deploying Sector Volunteers to redirect Sector 108 arrivals to Gate C. Estimated recovery: 15 minutes.`;
    }
    
    // Render with basic markdown bold support
    element.innerHTML = alertMsg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    logSecurityEvent('Offline Telemetry Analysis Run', window.appState.userRole, 'SUCCESS');
}

/**
 * Simulates different phases of the Match Day, updating all sensor telemetry in state.
 */
function changeMatchPhase(phase) {
    const telemetry = window.appState.telemetry;
    
    if (phase === 'Pre-Match') {
        // High gate traffic, low concessions
        telemetry.gates[0].currentOccupancy = 1380; telemetry.gates[0].status = 'Heavy'; telemetry.gates[0].queueTime = 19;
        telemetry.gates[1].currentOccupancy = 1420; telemetry.gates[1].status = 'Heavy'; telemetry.gates[1].queueTime = 22;
        telemetry.gates[2].currentOccupancy = 610; telemetry.gates[2].status = 'Normal'; telemetry.gates[2].queueTime = 5;
        telemetry.gates[3].currentOccupancy = 150; telemetry.gates[3].status = 'Normal'; telemetry.gates[3].queueTime = 2;
        
        telemetry.concessions.forEach(c => { 
            c.queueTime = Math.round(c.queueTime / 2) || 2; 
            c.predictedQueue = Math.round(c.predictedQueue / 2) || 4; 
            c.status = 'Normal'; 
        });
        telemetry.transit.shuttles[0].occupancy = '95%';
        telemetry.transit.shuttles[1].occupancy = '80%';
    } else if (phase === 'Mid-Match') {
        // Empty gates, high concessions
        telemetry.gates.forEach(g => { g.currentOccupancy = Math.round(g.capacity * 0.1); g.status = 'Normal'; g.queueTime = 1; });
        
        telemetry.concessions[0].queueTime = 22; telemetry.concessions[0].status = 'Heavy'; telemetry.concessions[0].predictedQueue = 30;
        telemetry.concessions[1].queueTime = 28; telemetry.concessions[1].status = 'Heavy'; telemetry.concessions[1].predictedQueue = 35;
        telemetry.concessions[2].queueTime = 12; telemetry.concessions[2].status = 'Moderate'; telemetry.concessions[2].predictedQueue = 15;
        telemetry.concessions[3].queueTime = 15; telemetry.concessions[3].status = 'Moderate'; telemetry.concessions[3].predictedQueue = 18;
        
        telemetry.transit.shuttles[0].occupancy = '15%';
        telemetry.transit.shuttles[1].occupancy = '10%';
    } else if (phase === 'Post-Match') {
        // High gate exits, empty concessions
        telemetry.gates[0].currentOccupancy = 1480; telemetry.gates[0].status = 'Heavy'; telemetry.gates[0].queueTime = 25;
        telemetry.gates[1].currentOccupancy = 1490; telemetry.gates[1].status = 'Heavy'; telemetry.gates[1].queueTime = 28;
        telemetry.gates[2].currentOccupancy = 1450; telemetry.gates[2].status = 'Heavy'; telemetry.gates[2].queueTime = 24;
        telemetry.gates[3].currentOccupancy = 480; telemetry.gates[3].status = 'Heavy'; telemetry.gates[3].queueTime = 10;
        
        telemetry.concessions.forEach(c => { c.queueTime = 1; c.predictedQueue = 1; c.status = 'Normal'; });
        
        telemetry.transit.shuttles[0].occupancy = '100% (Full)';
        telemetry.transit.shuttles[1].occupancy = '100% (Full)';
    } else if (phase === 'Evacuation') {
        // Gates critical overflow, concessions closed
        telemetry.gates.forEach(g => { g.currentOccupancy = g.capacity; g.status = 'Emergency'; g.queueTime = 40; });
        telemetry.concessions.forEach(c => { c.queueTime = 0; c.predictedQueue = 0; c.status = 'Closed'; });
        
        // Log critical incident
        const hasEvac = window.appState.incidents.some(i => i.type === 'Emergency Evacuation');
        if (!hasEvac) {
            const nextId = `INC-${1000 + window.appState.incidents.length + 1}`;
            const evacInc = {
                id: nextId,
                type: 'Emergency Evacuation',
                location: 'Entire Arena',
                severity: 'Critical',
                priority: 'High',
                assignedVolunteers: 'All Available Crew (90+ Members)',
                status: 'In Progress',
                timeline: `${new Date().toLocaleTimeString()} Evacuation phase simulated.`,
                suggestedResponse: 'Open all gates, trigger safety sirens, broadcast multilingual evacuation safety alerts immediately.',
                estimatedRecovery: '2 Hours',
                finalReport: null
            };
            window.appState.incidents.unshift(evacInc);
            logSecurityEvent('Critical Evacuation Incident Logged', 'SYSTEM', 'WARNING');
        }
    }

    logSecurityEvent(`Match phase changed to: ${phase}`, window.appState.userRole, 'SUCCESS');

    // Refresh DOM panels
    updateDigitalTwinDOM();
    updateQueuesDOM();
    updateTransportDOM();
    
    // Trigger AI Digital Twin explanation
    refreshDigitalTwin();
}

// Exports
window.updateDigitalTwinDOM = updateDigitalTwinDOM;
window.updateQueuesDOM = updateQueuesDOM;
window.refreshDigitalTwin = refreshDigitalTwin;
window.changeMatchPhase = changeMatchPhase;
