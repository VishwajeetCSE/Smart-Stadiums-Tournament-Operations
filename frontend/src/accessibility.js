/**
 * FIFA StadiumOS - Accessibility Module
 * Manages color-blind screen filters, text scaling, contrast adjustments, and ARIA announcements.
 */

/**
 * Updates accessibility states based on config panel settings
 */
function updateAccessibilityPrefs() {
    const textScaleSlider = document.getElementById('accessibility-text-scale');
    const scaleTextVal = document.getElementById('text-scale-value');
    const colorblindSelect = document.getElementById('accessibility-colorblind');
    const highContrastCheck = document.getElementById('accessibility-high-contrast');
    const reducedMotionCheck = document.getElementById('accessibility-reduced-motion');

    if (!textScaleSlider || !colorblindSelect || !highContrastCheck || !reducedMotionCheck) return;

    const scale = textScaleSlider.value;
    const colorblind = colorblindSelect.value;
    const contrast = highContrastCheck.checked;
    const motion = reducedMotionCheck.checked;

    // Apply text scale
    window.appState.accessibility.textScale = scale;
    document.documentElement.style.setProperty('--text-scale', scale / 100);
    if (scaleTextVal) scaleTextVal.textContent = `${scale}%`;

    // Apply colorblindness
    window.appState.accessibility.colorBlindMode = colorblind;
    document.body.className = ''; // Reset body classes
    document.body.classList.add('dark-theme'); // default
    if (colorblind !== 'none') {
        document.body.classList.add(`colorblind-${colorblind}`);
    }

    // Apply high contrast
    window.appState.accessibility.highContrast = contrast;
    if (contrast) {
        document.body.classList.add('contrast-high');
    } else {
        document.body.classList.remove('contrast-high');
    }

    // Apply reduced motion
    window.appState.accessibility.reducedMotion = motion;
    logSecurityEvent('Accessibility preferences modified', window.appState.userRole, 'SUCCESS');
    announceScreenReader(`Accessibility settings updated. Text size is ${scale} percent. High contrast mode is ${contrast ? 'on' : 'off'}.`);
}

/**
 * Pushes standard notifications to ARIA polite announcer region
 * @param {string} text Message for screen reader
 */
function announceScreenReader(text) {
    const announcer = document.getElementById('sr-announcer');
    if (announcer) {
        announcer.textContent = ''; // clear
        setTimeout(() => {
            announcer.textContent = text;
        }, 100);
    }
}

// Exports
window.updateAccessibilityPrefs = updateAccessibilityPrefs;
window.announceScreenReader = announceScreenReader;
