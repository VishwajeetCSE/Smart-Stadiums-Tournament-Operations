/**
 * FIFA StadiumOS - Sustainability Module
 * Tracks solar energy outputs, water recycling, and food waste metrics.
 * Utilizes GenAI to suggest carbon footprint reduction plans for venue organizers.
 */

function updateSustainabilityDOM() {
    const list = document.getElementById('sustainability-metrics-list');
    if (!list) return;

    list.innerHTML = '';
    const sus = window.appState.telemetry.sustainability;

    const metrics = [
        { name: 'Solar Panels Output', value: `${sus.solarOutput} kW`, icon: 'sun', color: 'text-yellow' },
        { name: 'Recycled Greywater', value: `${sus.waterRecycled.toLocaleString()} Liters`, icon: 'droplet', color: 'text-blue' },
        { name: 'Waste Diversion Rate', value: `${sus.wasteDiverted}%`, icon: 'trash-2', color: 'text-emerald' },
        { name: 'Estimated Carbon Saved', value: `${sus.carbonSaved} Tons CO₂e`, icon: 'leaf', color: 'text-emerald' }
    ];

    metrics.forEach(m => {
        const item = document.createElement('div');
        item.className = 'twin-node mt-2';
        item.style.flexDirection = 'row';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        item.innerHTML = `
            <div>
                <p class="font-bold text-sm"><i data-lucide="${m.icon}" style="display:inline; width:14px; margin-right:4px;" class="${m.color}"></i> ${m.name}</p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold">${m.value}</p>
            </div>
        `;
        list.appendChild(item);
    });

    lucide.createIcons();
}

/**
 * Connects to Gemini to suggest stadium sustainability improvements
 */
async function generateEcoRecommendations() {
    const adviceBox = document.getElementById('sustainability-ai-tips');
    if (!adviceBox) return;

    adviceBox.textContent = 'AI sustainability copilot is calculating environmental metrics...';

    const apiKey = window.getApiKey();
    const sus = window.appState.telemetry.sustainability;

    if (apiKey) {
        try {
            const prompt = `You are a Venue Sustainability Officer for a FIFA World Cup 2026 Stadium.
We have the following metrics:
- Solar output: ${sus.solarOutput} kW
- Water recycled: ${sus.waterRecycled} L
- Waste diversion: ${sus.wasteDiverted}%

Provide 3 brief, actionable operational recommendations to increase energy efficiency, optimize water usage, and handle stadium waste. Make it concise and professional.`;
            const reply = await callGemini(prompt);
            adviceBox.textContent = reply;
            logSecurityEvent('AI Sustainability Strategy Run', window.appState.userRole, 'SUCCESS');
        } catch (e) {
            console.error(e);
            adviceBox.textContent = `Error calling AI: ${e.message}. Falling back to offline advice.`;
            generateLocalEcoAdvice(adviceBox);
        }
    } else {
        generateLocalEcoAdvice(adviceBox);
    }
}

/**
 * Fallback local operational logic for Eco-Stadia advice driven by LIVE STATE metrics
 * @param {HTMLElement} element - The DOM element to render the advice into.
 */
function generateLocalEcoAdvice(element) {
    const sus = window.appState.telemetry.sustainability;
    let advice = '';

    if (window.appState.matchPhase === 'Evacuation') {
        advice = '🚨 **CRITICAL OVERRIDE:** Evacuation in progress. All non-essential HVAC and lighting have been disabled. Backup power routed strictly to emergency exits.';
    } else if (sus.solarOutput < 100) {
        advice = `⚠️ **ENERGY DEFICIT:** Solar output is low (${sus.solarOutput} kW). **AI Action:** Peak cooling loads in corridors should be set to 24°C to save 12% HVAC consumption and prevent grid strain.`;
    } else if (sus.wasteDiverted < 60) {
        advice = `♻️ **WASTE WARNING:** Diversion rate is dropping (${sus.wasteDiverted}%). **AI Action:** Concession waste audit shows high plastic cardboards. Recommend shifting next volunteers shift to help fan recycling centers near Gate B.`;
    } else {
        advice = `✅ **ECO OPTIMAL:** Solar output (${sus.solarOutput} kW) and recycling loops are exceeding targets. **AI Action:** Redirect concession area graywater reserves to flush Sector 100 toilets, saving 4,000 Liters of fresh utility water.`;
    }
    
    element.innerHTML = advice.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    logSecurityEvent('Offline Eco Analysis Run', window.appState.userRole, 'SUCCESS');
}

window.updateSustainabilityDOM = updateSustainabilityDOM;
window.generateEcoRecommendations = generateEcoRecommendations;
