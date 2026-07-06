/**
 * FIFA StadiumOS - Automated Unit Testing Suite
 * Mocks browser APIs (window, document, storage) and verifies sanitization,
 * validation schemas, RBAC logic, state configuration, and offline chatbot routers.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- ROBUST DOM MOCK SYSTEM ---
let domContentLoadedListener = null;
const eventListeners = {};

function createMockElement(tagName = 'div', id = '') {
    const el = {
        tagName: tagName.toUpperCase(),
        id: id,
        classList: {
            classes: new Set(),
            add: function(...args) { args.forEach(c => this.classes.add(c)); },
            remove: function(...args) { args.forEach(c => this.classes.delete(c)); },
            contains: function(c) { return this.classes.has(c); }
        },
        style: {
            setProperty: function(prop, val) { this[prop] = val; }
        },
        children: [],
        appendChild: function(child) {
            this.children.push(child);
            return child;
        },
        setAttribute: function(name, val) { this[name] = val; },
        getAttribute: function(name) { return this[name] || ''; },
        addEventListener: function(event, callback) {
            if (!eventListeners[event]) eventListeners[event] = [];
            eventListeners[event].push(callback);
        },
        value: '',
        textContent: '',
        innerHTML: '',
        className: ''
    };

    return new Proxy(el, {
        get(target, prop) {
            if (prop in target) return target[prop];
            if (prop === 'parentNode') return createMockElement('div');
            if (prop === 'firstChild') return target.children[0] || null;
            return undefined;
        }
    });
}

const mockDocument = {
    addEventListener: (event, callback) => {
        if (event === "DOMContentLoaded") {
            domContentLoadedListener = callback;
        }
    },
    getElementById: (id) => {
        const defaultValues = {
            "gemini-key-input": "",
            "accessibility-text-scale": "100",
            "accessibility-colorblind": "none",
            "accessibility-high-contrast": "false",
            "accessibility-reduced-motion": "false",
            "route-from-select": "Gate A",
            "route-to-select": "Sector 108"
        };
        const el = createMockElement('div', id);
        if (id in defaultValues) {
            el.value = defaultValues[id];
        }
        return el;
    },
    querySelectorAll: (selector) => {
        if (selector === ".nav-item") {
            const el1 = createMockElement('a');
            el1.setAttribute('data-tab', 'dashboard');
            return [el1];
        }
        return [createMockElement('div')];
    },
    createElement: (tag) => createMockElement(tag),
    dispatchEvent: () => {},
    documentElement: {
        style: {
            setProperty: () => {}
        }
    },
    body: createMockElement('body')
};

const mockWindow = {
    appState: {},
    sessionStorage: {
        store: {},
        getItem: function(key) { return this.store[key] || null; },
        setItem: function(key, val) { this.store[key] = String(val); },
        removeItem: function(key) { delete this.store[key]; }
    },
    localStorage: {
        store: {},
        getItem: function(key) { return this.store[key] || null; },
        setItem: function(key, val) { this.store[key] = String(val); },
        removeItem: function(key) { delete this.store[key]; }
    },
    lucide: {
        createIcons: () => {}
    },
    parseInt: parseInt,
    Event: function() {},
    CustomEvent: function(name, detail) {
        return { type: name, detail: detail };
    },
    setTimeout: (cb) => cb()
};

const context = vm.createContext({
    console: console,
    document: mockDocument,
    window: mockWindow,
    sessionStorage: mockWindow.sessionStorage,
    localStorage: mockWindow.localStorage,
    setTimeout: setTimeout,
    Date: Date,
    Event: function() {},
    CustomEvent: function(name, detail) {
        return { type: name, detail: detail };
    },
    lucide: mockWindow.lucide,
    alert: () => {}
});

// Load modules in context
const modules = ['state.js', 'security.js', 'assistant.js', 'crowd.js', 'transport.js', 'sustainability.js', 'accessibility.js', 'operations.js', 'app.js'];

modules.forEach(file => {
    const codePath = path.join(__dirname, '..', 'frontend', 'src', file);
    const code = fs.readFileSync(codePath, 'utf8');
    vm.runInContext(code, context);
});

// Run DOMContentLoaded triggers
if (domContentLoadedListener) {
    domContentLoadedListener();
}

// Extract objects for testing
const appState = context.window.appState;
const sanitizeInput = context.window.sanitizeInput;
const validateIncident = context.window.validateIncident;
const authorizeAction = context.window.authorizeAction;
const checkRateLimit = context.window.checkRateLimit;

// --- ASSERTION ENGINE ---
let testCount = 0;
let passCount = 0;

function assert(condition, message) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`✅ PASS: ${message}`);
    } else {
        console.error(`❌ FAIL: ${message}`);
    }
}

console.log("=== Starting FIFA StadiumOS Unit Tests ===");

// 1. Security Input Sanitization
assert(typeof sanitizeInput === 'function', "sanitizeInput should be a function");
const dirtyInput = "<script>alert('xss')</script>";
const clean = sanitizeInput(dirtyInput);
assert(!clean.includes("<script>"), "Input sanitization should remove HTML tags");
assert(clean.includes("&lt;script&gt;"), "Input sanitization should convert angle brackets");

// 2. Incident Validation Schemas
assert(typeof validateIncident === 'function', "validateIncident should be a function");
const invalidInc = { type: 'Explosion', location: 'Gate A', severity: 'None', priority: 'None' };
assert(validateIncident(invalidInc).isValid === false, "validateIncident should fail invalid categories");
const validInc = { type: 'Medical Emergency', location: 'Sector 108', severity: 'High', priority: 'High' };
assert(validateIncident(validInc).isValid === true, "validateIncident should pass valid categories");

// 3. Role-Based Access Control (RBAC)
appState.userRole = 'Fan';
assert(authorizeAction('viewDashboard') === true, "Fans should be allowed to view dashboard");
assert(authorizeAction('resolveIncident') === false, "Fans should NOT be allowed to resolve incidents");

appState.userRole = 'Volunteer';
assert(authorizeAction('reportIncident') === true, "Volunteers should be allowed to report incidents");
assert(authorizeAction('resolveIncident') === false, "Volunteers should NOT be allowed to resolve incidents");

appState.userRole = 'Organizer';
assert(authorizeAction('resolveIncident') === true, "Organizers should be allowed to resolve incidents");
assert(authorizeAction('clearLogs') === true, "Organizers should be allowed to clear security logs");

// 4. API Rate Limiter
assert(checkRateLimit('test-client') === true, "Initial rate limit check should pass");
for (let i = 0; i < 40; i++) {
    checkRateLimit('test-client');
}
assert(checkRateLimit('test-client') === false, "Repeated calls should exceed rate limit and fail");

// 5. Global State Telemetry
assert(appState.telemetry.gates.length === 4, "State should initialize exactly 4 gates");
assert(appState.incidents.length === 2, "State should initialize with default incidents");

// 6. Secure Session Key Handling
context.setApiKey('test_gemini_key');
assert(mockWindow.sessionStorage.getItem('stadiumos_api_key') === 'test_gemini_key', "Gemini Key should be saved in sessionStorage");
context.clearGeminiSettings();
assert(mockWindow.sessionStorage.getItem('stadiumos_api_key') === null, "Gemini Key should be removed from sessionStorage");

console.log(`\n=== Test Summary: ${passCount}/${testCount} passed ===`);
if (passCount !== testCount) {
    process.exit(1);
} else {
    process.exit(0);
}
