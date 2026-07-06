/**
 * FIFA StadiumOS - Transport Module
 * Manages transit boards, parking zones capacity, and traffic delays.
 */

function updateTransportDOM() {
    const list = document.getElementById('transit-status-list');
    if (!list) return;

    list.innerHTML = '';

    // Render Shuttle Statuses
    window.appState.telemetry.transit.shuttles.forEach(shuttle => {
        const item = document.createElement('div');
        item.className = 'twin-node mt-2';
        item.style.flexDirection = 'row';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        
        item.innerHTML = `
            <div>
                <p class="font-bold text-sm"><i data-lucide="bus" style="display:inline; width:14px; margin-right:4px;"></i> ${shuttle.id}</p>
                <p class="text-xs text-muted">Frequency: ${shuttle.interval}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-emerald">${shuttle.status}</p>
                <p class="text-xs text-blue">Load: ${shuttle.occupancy}</p>
            </div>
        `;
        list.appendChild(item);
    });

    // Add Metro connection status
    const metroItem = document.createElement('div');
    metroItem.className = 'twin-node mt-2';
    metroItem.style.flexDirection = 'row';
    metroItem.style.justifyContent = 'space-between';
    metroItem.style.alignItems = 'center';
    metroItem.innerHTML = `
        <div>
            <p class="font-bold text-sm"><i data-lucide="train" style="display:inline; width:14px; margin-right:4px;"></i> World Cup Station Link</p>
            <p class="text-xs text-muted">Subway / Rail</p>
        </div>
        <div class="text-right">
            <p class="text-sm font-bold text-yellow">${window.appState.telemetry.transit.metroLine}</p>
        </div>
    `;
    list.appendChild(metroItem);

    // Render Parking Capacities
    const parkingGrid = document.getElementById('parking-capacity-grid');
    if (parkingGrid) {
        parkingGrid.innerHTML = '<h4>Parking Zone Capacity</h4>';
        const parking = window.appState.telemetry.transit.parking;
        
        Object.keys(parking).forEach(zone => {
            const pct = parking[zone];
            const isFull = pct >= 90;
            
            const pNode = document.createElement('div');
            pNode.className = 'twin-node mt-2';
            pNode.style.flexDirection = 'row';
            pNode.style.justifyContent = 'space-between';
            
            pNode.innerHTML = `
                <span class="text-xs font-bold">${zone.toUpperCase()}</span>
                <span class="text-xs ${isFull ? 'text-coral' : 'text-emerald'}">${pct}% Full</span>
            `;
            parkingGrid.appendChild(pNode);
        });
    }

    lucide.createIcons();
}

window.updateTransportDOM = updateTransportDOM;
