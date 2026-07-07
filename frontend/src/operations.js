/**
 * FIFA StadiumOS - AI Incident Commander & Operations Console
 * Processes logs, triages emergencies, and generates multilingual broadcasts using GenAI.
 */

function updateIncidentsDOM() {
    const tableBody = document.getElementById('incidents-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    window.appState.incidents.forEach(incident => {
        const isResolved = incident.status === 'Resolved';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${incident.id}</strong></td>
            <td>${incident.type}</td>
            <td>${incident.location}</td>
            <td><span class="text-xs font-bold ${incident.severity === 'Critical' || incident.severity === 'High' ? 'text-coral' : 'text-yellow'}">${incident.severity}</span></td>
            <td>${incident.assignedVolunteers}</td>
            <td><span class="text-xs ${isResolved ? 'text-emerald' : 'text-coral'}">${incident.status}</span></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="inspectIncident('${incident.id}')">Inspect</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update incident counts in KPI
    const kpiCount = document.getElementById('kpi-incidents');
    if (kpiCount) {
        const activeCount = window.appState.incidents.filter(i => i.status !== 'Resolved').length;
        kpiCount.textContent = `${activeCount} Active`;
    }
}

function updateSecurityLogsDOM() {
    const logsBody = document.getElementById('security-logs-body');
    if (!logsBody) return;

    logsBody.innerHTML = '';
    window.appState.securityLogs.forEach(log => {
        const isSuccess = log.status === 'SUCCESS';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-xs text-muted">${new Date(log.timestamp).toLocaleTimeString()}</td>
            <td class="text-xs font-bold">${log.event}</td>
            <td class="text-xs">${log.user}</td>
            <td class="text-xs ${isSuccess ? 'text-emerald' : 'text-coral'}">${log.status}</td>
        `;
        logsBody.appendChild(row);
    });
}

function clearSecurityLogs() {
    if (!authorizeAction('clearLogs')) {
        alert('Access denied: Unauthorized action.');
        return;
    }
    window.appState.securityLogs = [
        { timestamp: new Date().toISOString(), event: 'Audit log cleared', user: window.appState.userRole, status: 'SUCCESS' }
    ];
    updateSecurityLogsDOM();
    window.saveStateToLocalStorage();
}

/**
 * Inspection Panel updates
 */
function inspectIncident(id) {
    const incident = window.appState.incidents.find(i => i.id === id);
    const detailPanel = document.getElementById('ai-sop-incident-detail');
    if (!incident || !detailPanel) return;

    const isResolved = incident.status === 'Resolved';
    
    let html = `
        <div class="incident-inspector mt-2">
            <div class="inspector-row mb-2">
                <span class="text-xs text-muted">Incident ID:</span>
                <strong>${incident.id}</strong>
            </div>
            <div class="inspector-row mb-2">
                <span class="text-xs text-muted">Severity / Priority:</span>
                <span class="font-bold text-coral">${incident.severity} / ${incident.priority}</span>
            </div>
            <div class="inspector-row mb-2">
                <span class="text-xs text-muted">Assigned Crew:</span>
                <p class="text-sm font-medium">${incident.assignedVolunteers}</p>
            </div>
            <div class="inspector-row mb-2">
                <span class="text-xs text-muted">Historical Log:</span>
                <p class="text-xs text-muted bg-dark p-2 rounded">${incident.timeline}</p>
            </div>
            <div class="inspector-row mb-4">
                <span class="text-xs text-muted">AI Operational Response:</span>
                <p class="text-sm font-bold text-emerald">${incident.suggestedResponse}</p>
            </div>
    `;

    if (!isResolved) {
        html += `
            <div class="inspector-actions mt-4 flex flex-col gap-2">
                <button class="btn btn-primary btn-sm w-full" onclick="generateEmergencyBroadcast('${incident.id}')">
                    <i data-lucide="radio"></i> Generate Multilingual Broadcast
                </button>
                <button class="btn btn-emerald btn-sm w-full mt-2" onclick="resolveActiveIncident('${incident.id}')">
                    <i data-lucide="check-circle"></i> Mark Incident Resolved
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="inspector-row mt-4">
                <span class="text-xs text-emerald font-bold">✓ Resolution Summary:</span>
                <p class="text-xs text-muted bg-dark p-2 rounded">${incident.finalReport || 'Completed.'}</p>
            </div>
        `;
    }

    html += `</div>`;
    detailPanel.innerHTML = html;
    lucide.createIcons();
}

/**
 * Marks an active incident resolved
 */
function resolveActiveIncident(id) {
    if (!authorizeAction('resolveIncident')) {
        alert('Access denied: Only Organizers can resolve incidents.');
        return;
    }
    const incident = window.appState.incidents.find(i => i.id === id);
    if (!incident) return;

    incident.status = 'Resolved';
    incident.finalReport = `Incident resolved by Organizer at ${new Date().toLocaleTimeString()}. Cleanup completed, area cleared.`;
    incident.timeline += `\n${new Date().toLocaleTimeString()} Resolved by Organizer.`;
    
    updateIncidentsDOM();
    inspectIncident(id);
    logSecurityEvent(`Resolved Incident: ${id}`, window.appState.userRole, 'SUCCESS');
}

/**
 * Triggers GenAI to generate Emergency announcements in 5 languages
 */
async function generateEmergencyBroadcast(id) {
    const incident = window.appState.incidents.find(i => i.id === id);
    if (!incident) return;

    const detailPanel = document.getElementById('ai-sop-incident-detail');
    if (!detailPanel) return;

    // Loading overlay
    detailPanel.innerHTML = '<div class="text-center p-4">GenAI is writing announcements...</div>';

    const apiKey = sessionStorage.getItem('stadiumos_api_key');
    
    if (apiKey) {
        try {
            const prompt = `You are a Stadium Safety announcer. Write a short, calm safety broadcast announcement for: "${incident.type} at ${incident.location}".
The message must notify fans about the issue, give safety advice, and remain under 30 words.
Translate this announcement into exactly these 5 languages:
- English
- Spanish (Español)
- French (Français)
- Arabic (العربية)
- Japanese (日本語)

Do not add extra explanations. Just list the translated text under language headers.`;
            const reply = await callGemini(prompt);
            
            detailPanel.innerHTML = `
                <h4>AI Multilingual Emergency Broadcast</h4>
                <div class="twin-speech-bubble text-xs mt-2" style="max-height: 200px; overflow-y: auto;">
                    ${reply.replace(/\n/g, '<br>')}
                </div>
                <button class="btn btn-secondary btn-sm w-full mt-4" onclick="inspectIncident('${id}')">Back to Incident</button>
            `;
            logSecurityEvent(`Multilingual Emergency Broadcast Generated: ${id}`, window.appState.userRole, 'SUCCESS');
        } catch (e) {
            console.error(e);
            alert(`AI Broadcast failed: ${e.message}. Using offline broadcast template.`);
            generateLocalBroadcast(id, detailPanel);
        }
    } else {
        generateLocalBroadcast(id, detailPanel);
    }
}

/**
 * Fallback local multilingual broadcast text
 */
function generateLocalBroadcast(id, element) {
    const incident = window.appState.incidents.find(i => i.id === id);
    const loc = incident.location;
    const msg = `
**[English]** Attention fans, a minor issue is reported near ${loc}. Please follow volunteers guidance. Thank you.
<br>
**[Español]** Atención aficionados, se reporta un problema menor cerca de ${loc}. Por favor siga las instrucciones.
<br>
**[Français]** Attention, un incident mineur est signalé près de ${loc}. Veuillez suivre les directives des bénévoles.
<br>
**[Arabic]** انتباه، تم الإبلاغ عن مشكلة بسيطة بالقرب من ${loc}. يرجى اتباع إرشادات المتطوعين.
<br>
**[日本語]** サポーターの皆様、${loc}付近で軽微な事案が発生しております。係員の指示に従ってください。
    `;
    element.innerHTML = `
        <h4>Multilingual Emergency Broadcast (Offline)</h4>
        <div class="twin-speech-bubble text-xs mt-2">
            ${msg}
        </div>
        <button class="btn btn-secondary btn-sm w-full mt-4" onclick="inspectIncident('${id}')">Back to Incident</button>
    `;
    logSecurityEvent(`Offline Emergency Broadcast Run: ${id}`, window.appState.userRole, 'SUCCESS');
}

/**
 * Modal controller
 */
function openIncidentModal() {
    if (!authorizeAction('reportIncident')) {
        alert('Access denied: Unauthorized action.');
        return;
    }
    const modal = document.getElementById('incident-report-modal');
    const errBox = document.getElementById('modal-error-box');
    if (modal) {
        modal.classList.remove('hidden');
        if (errBox) errBox.classList.add('hidden');
    }
}

function closeIncidentModal() {
    const modal = document.getElementById('incident-report-modal');
    if (modal) modal.classList.add('hidden');
}

/**
 * Submit modal incident
 */
function submitNewIncident() {
    const type = document.getElementById('modal-incident-type').value;
    const loc = document.getElementById('modal-incident-location').value.trim();
    const severity = document.getElementById('modal-incident-severity').value;
    const priority = document.getElementById('modal-incident-priority').value;
    const errBox = document.getElementById('modal-error-box');

    const rawIncident = { type, location: loc, severity, priority };
    
    // Security sanitization and validation
    const sanitizedLoc = sanitizeInput(loc);
    const validation = validateIncident(rawIncident);

    if (!validation.isValid) {
        if (errBox) {
            errBox.textContent = validation.error;
            errBox.classList.remove('hidden');
        }
        return;
    }

    const nextId = `INC-${1000 + window.appState.incidents.length + 1}`;
    
    const newInc = {
        id: nextId,
        type: type,
        location: sanitizedLoc,
        severity: severity,
        priority: priority,
        assignedVolunteers: 'Crew Dispatched (TBD)',
        status: 'In Progress',
        timeline: `${new Date().toLocaleTimeString()} Incident logged.`,
        suggestedResponse: severity === 'High' || severity === 'Critical' ? 'Deploy Emergency Medical team and clear security pathway.' : 'Dispatch nearest steward to assist cleanup and direct crowds.',
        estimatedRecovery: severity === 'High' ? '30 Mins' : '10 Mins',
        finalReport: null
    };

    window.appState.incidents.unshift(newInc);
    logSecurityEvent(`Logged Incident: ${nextId}`, window.appState.userRole, 'SUCCESS');
    
    closeIncidentModal();
    updateIncidentsDOM();
}

window.updateIncidentsDOM = updateIncidentsDOM;
window.updateSecurityLogsDOM = updateSecurityLogsDOM;
window.clearSecurityLogs = clearSecurityLogs;
window.inspectIncident = inspectIncident;
window.resolveActiveIncident = resolveActiveIncident;
window.resolveActiveIncident = resolveActiveIncident;
window.openIncidentModal = openIncidentModal;
window.closeIncidentModal = closeIncidentModal;
window.submitNewIncident = submitNewIncident;
window.generateEmergencyBroadcast = generateEmergencyBroadcast;
