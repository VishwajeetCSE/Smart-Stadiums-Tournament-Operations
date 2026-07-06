/**
 * FIFA StadiumOS - AI Assistant Module
 * Integrates Google Gemini API, voice recognition (STT), and voice synthesis (TTS).
 */

let speechRecognition = null;
let isListening = false;

// Initialize voice recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRec();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';

    speechRecognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        const input = document.getElementById('chat-query-input');
        if (input) {
            input.value = text;
        }
        logSecurityEvent('Voice Input Transcribed', window.appState.userRole, 'SUCCESS');
        submitChatQuery();
    };

    speechRecognition.onerror = function() {
        logSecurityEvent('Voice Recognition Error', 'SYSTEM', 'FAILED');
        toggleMicUI(false);
    };

    speechRecognition.onend = function() {
        toggleMicUI(false);
    };
}

/**
 * Toggles microphone recording
 */
function toggleVoiceInput() {
    if (!speechRecognition) {
        alert('Speech recognition is not supported in this browser.');
        return;
    }
    if (!authorizeAction('useVoice')) {
        alert('Insufficient permission.');
        return;
    }

    if (isListening) {
        speechRecognition.stop();
        toggleMicUI(false);
    } else {
        speechRecognition.start();
        toggleMicUI(true);
    }
}

function toggleMicUI(active) {
    isListening = active;
    const btn = document.getElementById('voice-recognition-btn');
    if (btn) {
        if (active) {
            btn.classList.add('btn-emerald');
            btn.classList.remove('btn-secondary');
            btn.innerHTML = '<i data-lucide="mic-off"></i>';
        } else {
            btn.classList.remove('btn-emerald');
            btn.classList.add('btn-secondary');
            btn.innerHTML = '<i data-lucide="mic"></i>';
        }
        lucide.createIcons();
    }
}

/**
 * Natively speaks text using Text-to-Speech (TTS)
 */
function speakResponse(text) {
    if (!speechSynthesis) return;
    
    // Cancel any ongoing speaking
    speechSynthesis.cancel();
    
    const cleanText = text.replace(/\*\*|#|\*/g, ''); // strip markdown
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Choose appropriate voice based on current language
    speechSynthesis.speak(utterance);
}

/**
 * Securely saves Gemini API key to sessionStorage
 */
function saveGeminiSettings() {
    const input = document.getElementById('gemini-key-input');
    if (input) {
        const val = input.value.trim();
        if (val) {
            setApiKey(val);
            alert('Gemini API key saved in memory for this session.');
            input.value = '';
            appendChatMessage('System', 'Gemini API is now live. Ask me any World Cup operational question!');
        } else {
            alert('Please enter a valid key.');
        }
    }
}

/**
 * Clears Gemini API key from session storage
 */
function clearGeminiSettings() {
    setApiKey('');
    alert('Gemini API key cleared from memory.');
    appendChatMessage('System', 'Gemini API deactivated. Falling back to local operational guides.');
}

/**
 * Master interface to fetch responses from Gemini API client-side
 * @param {string} prompt The command or question
 * @returns {Promise<string>} The AI generated output
 */
async function callGemini(prompt) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('API Key missing');
    }

    if (!checkRateLimit('gemini-api')) {
        throw new Error('Rate limit exceeded');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Gemini API returned an error');
    }

    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
}

/**
 * Appends a bubble to the chat logs
 */
function appendChatMessage(sender, text) {
    const chatScreen = document.getElementById('assistant-chat-screen');
    if (!chatScreen) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender === 'User' ? 'user-msg' : 'system-msg'}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    // Parse basic bold markdown
    const formatted = sanitizeInput(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
    bubble.innerHTML = formatted;
    msgDiv.appendChild(bubble);
    chatScreen.appendChild(msgDiv);
    
    // Scroll to bottom
    chatScreen.scrollTop = chatScreen.scrollHeight;
}

/**
 * Form Submission handler
 */
async function submitChatQuery() {
    const input = document.getElementById('chat-query-input');
    if (!input) return;

    const rawQuery = input.value.trim();
    if (!rawQuery) return;

    input.value = '';
    
    if (!authorizeAction('useChat')) {
        alert('Access denied: Unauthorized action.');
        return;
    }

    appendChatMessage('User', rawQuery);
    
    const isGeminiAvailable = !!getApiKey();
    
    if (isGeminiAvailable) {
        appendChatMessage('System', 'Thinking...');
        try {
            const prompt = `You are the FIFA StadiumOS AI Copilot helping staff/fans during the World Cup 2026.
User asks: "${rawQuery}"
Respond in a helpful, concise manner. Support formatting with markdown bold where appropriate. Keep response under 100 words.`;
            const reply = await callGemini(prompt);
            
            // Remove the 'Thinking...' bubble
            const chatScreen = document.getElementById('assistant-chat-screen');
            if (chatScreen && chatScreen.lastChild) {
                chatScreen.removeChild(chatScreen.lastChild);
            }
            
            appendChatMessage('System', reply);
            speakResponse(reply);
        } catch (e) {
            console.error(e);
            // Remove 'Thinking...'
            const chatScreen = document.getElementById('assistant-chat-screen');
            if (chatScreen && chatScreen.lastChild) {
                chatScreen.removeChild(chatScreen.lastChild);
            }
            appendChatMessage('System', `Error communicating with Gemini: ${e.message}. Falling back to local offline logic.`);
            handleLocalFallbackQuery(rawQuery);
        }
    } else {
        handleLocalFallbackQuery(rawQuery);
    }
}

/**
 * Local offline keyword-matching logic
 */
function handleLocalFallbackQuery(query) {
    const lowercase = query.toLowerCase();
    let reply = '';
    
    if (lowercase.includes('gate') || lowercase.includes('entry') || lowercase.includes('crowd')) {
        reply = 'According to local sensors, **Gate B** is currently heavily congested with an 18-minute wait time. I recommend entering through **Gate C** which has a 5-minute queue.';
    } else if (lowercase.includes('vip') || lowercase.includes('route') || lowercase.includes('corridor')) {
        reply = 'Accessing VIP corridors requires explicit **Organizer** accreditation. Fans are restricted to standard public seating corridors.';
    } else if (lowercase.includes('food') || lowercase.includes('concession') || lowercase.includes('eat')) {
        reply = 'Concession stands are located on all concourses. **Food Court A** currently has a 9-minute queue, while **Food Court B** is at 14 minutes.';
    } else if (lowercase.includes('sustain') || lowercase.includes('waste') || lowercase.includes('green')) {
        reply = 'FIFA StadiumOS tracks eco sustainability in real-time. MetLife Stadium utilities are running with **245 kW solar energy output** and 84% waste diversion rate.';
    } else {
        reply = 'I am currently running in offline mode. Paste a **Gemini API Key** in the left panel to activate real-time intelligence for all stadium queries!';
    }
    
    appendChatMessage('System', reply);
    speakResponse(reply);
}

// Exports
window.callGemini = callGemini;
window.submitChatQuery = submitChatQuery;
window.saveGeminiSettings = saveGeminiSettings;
window.clearGeminiSettings = clearGeminiSettings;
window.toggleVoiceInput = toggleVoiceInput;
