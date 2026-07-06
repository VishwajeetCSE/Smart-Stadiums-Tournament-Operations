/**
 * FIFA StadiumOS - Indoor Navigator Module
 * Draws interactive MetLife/Azteca stadium layout and computes navigation paths.
 * Highlights accessibility routing, media accreditation restrictions, and VIP paths.
 */

// Node coordinates on 600x400 canvas
const MAP_NODES = {
    'Gate A': { x: 120, y: 200 },
    'Gate B': { x: 300, y: 60 },
    'Gate C': { x: 480, y: 200 },
    'Gate D': { x: 300, y: 340 },
    'Sector 108': { x: 230, y: 130 },
    'Food Court A': { x: 370, y: 130 },
    'Concourse B': { x: 230, y: 270 },
    'Media Room': { x: 370, y: 270 }
};

/**
 * Draws the complete stadium map on the canvas based on toggles
 */
function drawNavigationMap() {
    const canvas = document.getElementById('stadium-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid
    ctx.strokeStyle = 'hsla(220, 10%, 25%, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }

    // 1. Draw Field (Green center rectangle)
    ctx.fillStyle = 'hsla(150, 75%, 20%, 0.4)';
    ctx.strokeStyle = 'hsl(150, 75%, 45%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(210, 140, 180, 120);
    ctx.fill();
    ctx.stroke();
    
    // Field lines
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(300, 140);
    ctx.lineTo(300, 260);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(300, 200, 30, 0, 2 * Math.PI);
    ctx.stroke();

    // 2. Draw Stands (Concentric rounded rings)
    ctx.strokeStyle = 'hsla(220, 10%, 40%, 0.6)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(300, 200, 150, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'hsla(220, 10%, 30%, 0.5)';
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.arc(300, 200, 110, 0, 2 * Math.PI);
    ctx.stroke();

    // 3. Highlight Special Zones
    const isVipToggled = document.getElementById('nav-vip-toggle')?.checked;
    const isMediaToggled = document.getElementById('nav-media-toggle')?.checked;
    const isAccessToggled = document.getElementById('nav-accessible-toggle')?.checked;

    if (isVipToggled) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
        ctx.strokeStyle = 'hsl(45, 95%, 55%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(300, 340, 45, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    if (isMediaToggled) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.strokeStyle = 'hsl(210, 85%, 60%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(330, 240, 80, 50);
        ctx.fill();
        ctx.stroke();
    }

    if (isAccessToggled) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.strokeStyle = 'hsl(150, 75%, 45%)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        // Draw step-free access zones
        ctx.beginPath();
        ctx.arc(120, 200, 30, 0, 2 * Math.PI);
        ctx.arc(480, 200, 30, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    }

    // 4. Draw Nodes
    Object.keys(MAP_NODES).forEach(name => {
        const node = MAP_NODES[name];
        ctx.fillStyle = 'hsl(220, 10%, 93%)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = 'hsl(220, 10%, 65%)';
        ctx.font = '10px Outfit';
        ctx.fillText(name, node.x - 25, node.y - 12);
    });

    // 5. Compute and Draw Route Path
    calculateRoute(ctx, isVipToggled, isMediaToggled, isAccessToggled);
}

/**
 * Calculates and draws the active path between inputs
 */
function calculateRoute(ctx, isVip, isMedia, isAccess) {
    const fromVal = document.getElementById('route-from-select')?.value;
    const toVal = document.getElementById('route-to-select')?.value;
    const instructionBox = document.getElementById('route-instructions-box');
    if (!fromVal || !toVal || !instructionBox) return;

    // RBAC and Accreditation Checks
    const userRole = window.appState.userRole;
    
    if (toVal === 'Media Room' && userRole === 'Fan') {
        instructionBox.innerHTML = '<span class="text-coral">⚠️ ACCESS DENIED: Media Accreditation Area requires **Volunteer** or **Organizer** credentials.</span>';
        return;
    }
    if (fromVal === 'Gate D' && userRole !== 'Organizer') {
        instructionBox.innerHTML = '<span class="text-coral">⚠️ ACCESS DENIED: Gate D (VIP Corridor) is restricted to **Organizer** credentials only.</span>';
        return;
    }

    const startNode = MAP_NODES[fromVal];
    const endNode = MAP_NODES[toVal];
    
    // Draw Route Path
    ctx.strokeStyle = isAccess ? 'hsl(150, 75%, 45%)' : 'hsl(210, 85%, 60%)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startNode.x, startNode.y);

    // Compute route checkpoints
    let checkpoints = [];
    if (isAccess) {
        // Step-free routing (always passes through Gate A/C access lifts)
        checkpoints.push({ x: startNode.x, y: 200 });
        checkpoints.push({ x: 300, y: 200 });
        checkpoints.push({ x: endNode.x, y: endNode.y });
    } else {
        // Direct routing
        checkpoints.push({ x: startNode.x, y: endNode.y });
        checkpoints.push({ x: endNode.x, y: endNode.y });
    }

    checkpoints.forEach(pt => {
        ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Rerender icons on path
    ctx.fillStyle = 'hsl(355, 85%, 63%)';
    ctx.beginPath();
    ctx.arc(endNode.x, endNode.y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Output instructions
    let instr = `<strong>Navigation SOP (Calculated Route):</strong><br>`;
    instr += `1. Depart from <strong>${fromVal}</strong>.<br>`;
    if (isAccess) {
        instr += `2. <span class="text-emerald">Access Lift Route Active:</span> Bypassing main stairs, follow the green indicators to elevators.<br>`;
    } else {
        instr += `2. Head down the concourse toward sector pathways.<br>`;
    }
    if (isVip && fromVal === 'Gate D') {
        instr += `3. <span class="text-yellow">VIP Corridor Active:</span> Clear security clearance checks.<br>`;
    }
    instr += `3. Arrive at <strong>${toVal}</strong>. Estimated walking time: ${isAccess ? '4' : '2'} minutes.`;
    
    instructionBox.innerHTML = instr;
    logSecurityEvent(`Route Computed: ${fromVal} -> ${toVal}`, userRole, 'SUCCESS');
}

window.drawNavigationMap = drawNavigationMap;
