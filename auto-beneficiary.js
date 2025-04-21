/**
 * Auto Beneficiary Module
 * 
 * This script adds a fixed beneficiary to all posts.
 */

// Configuration for the automatic beneficiary
const AUTO_BENEFICIARY = {
    account: "postify",
    weight: 1000 // 10% (weight is in 100ths of percent, so 500 = 5%)
};

// Wait for the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function() {
    console.log("Auto-beneficiary module loaded");
    
    // Load settings from localStorage if available
    loadSavedSettings();
    
    // Add the settings button to the navigation
    addSettingsButton();
    
    // Initialize beneficiary
    setupBeneficiary();
});

// Load settings from localStorage
function loadSavedSettings() {
    const savedSettings = localStorage.getItem('auto_beneficiary_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            AUTO_BENEFICIARY.account = settings.account;
            AUTO_BENEFICIARY.weight = settings.weight;
            console.log("Auto beneficiary loaded from settings:", AUTO_BENEFICIARY);
        } catch (e) {
            console.error("Error parsing saved auto beneficiary settings", e);
        }
    }
}

// Setup the beneficiary - add it to the UI when loaded
function setupBeneficiary() {
    // Wait for everything to be fully loaded and add our beneficiary
    setTimeout(function() {
        addBeneficiaryToForm();
    }, 1000);
}

// Add beneficiary to the form
function addBeneficiaryToForm() {
    // Skip if not properly configured
    if (!AUTO_BENEFICIARY.account || AUTO_BENEFICIARY.account === 'yourusername' || AUTO_BENEFICIARY.weight <= 0) {
        console.log("Auto beneficiary not configured properly, skipping");
        return;
    }
    
    // Get existing beneficiaries
    if (typeof window.addedBeneficiaries === 'undefined') {
        window.addedBeneficiaries = [];
    }
    
    // Check if our auto beneficiary is already in the list
    const existingBeneficiary = window.addedBeneficiaries.find(b => b.account === AUTO_BENEFICIARY.account);
    if (existingBeneficiary) {
        console.log("Auto beneficiary already in list");
        return;
    }
    
    // Add our beneficiary
    const beneficiary = {
        account: AUTO_BENEFICIARY.account,
        weight: AUTO_BENEFICIARY.weight
    };
    
    window.addedBeneficiaries.push(beneficiary);
    
    // Update the hidden input with all beneficiaries
    const hiddenInput = document.getElementById('beneficiariesData');
    if (hiddenInput) {
        hiddenInput.value = JSON.stringify(window.addedBeneficiaries);
    }
    
    // Update UI
    if (typeof window.renderBeneficiaries === 'function') {
        window.renderBeneficiaries();
    }
    
    console.log("Auto beneficiary added to form");
}

// Add the settings button to the navigation
function addSettingsButton() {
    const navRightSection = document.querySelector('nav .flex.items-center.space-x-4');
    if (!navRightSection) return;
    
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'autoBeneficiarySettingsBtn';
    settingsBtn.className = 'p-2 hover:bg-gray-100 rounded-full';
    settingsBtn.title = 'Auto Beneficiary Settings';
    settingsBtn.innerHTML = '<i class="fas fa-cog text-gray-600"></i>';
    settingsBtn.addEventListener('click', showSettingsDialog);
    
    navRightSection.insertBefore(settingsBtn, navRightSection.firstChild);
}

// Show a simple settings dialog
function showSettingsDialog() {
    const username = prompt("Enter username for auto beneficiary:", AUTO_BENEFICIARY.account);
    if (username === null) return; // User cancelled
    
    const percentageStr = prompt("Enter percentage (1-100):", AUTO_BENEFICIARY.weight / 100);
    if (percentageStr === null) return; // User cancelled
    
    const percentage = parseFloat(percentageStr);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        alert("Invalid percentage. Please enter a number between 1 and 100.");
        return;
    }
    
    // Save the new settings
    AUTO_BENEFICIARY.account = username.trim();
    AUTO_BENEFICIARY.weight = Math.round(percentage * 100);
    
    // Save to localStorage
    localStorage.setItem('auto_beneficiary_settings', JSON.stringify(AUTO_BENEFICIARY));
    
    // Clear existing beneficiaries
    const hiddenInput = document.getElementById('beneficiariesData');
    if (hiddenInput) {
        try {
            // Parse existing beneficiaries
            const existingBeneficiaries = JSON.parse(hiddenInput.value || '[]');
            
            // Remove our previous auto beneficiary if it exists
            const filteredBeneficiaries = existingBeneficiaries.filter(
                b => b.account !== username
            );
            
            // Add the updated auto beneficiary
            const newBeneficiary = {
                account: AUTO_BENEFICIARY.account,
                weight: AUTO_BENEFICIARY.weight
            };
            
            filteredBeneficiaries.push(newBeneficiary);
            
            // Update window.addedBeneficiaries
            window.addedBeneficiaries = filteredBeneficiaries;
            
            // Update the hidden input
            hiddenInput.value = JSON.stringify(filteredBeneficiaries);
            
            // Update UI
            if (typeof window.renderBeneficiaries === 'function') {
                window.renderBeneficiaries();
            }
        } catch (e) {
            console.error("Error updating beneficiaries:", e);
        }
    }
    
    alert(`Auto beneficiary set to: ${username} (${percentage}%)`);
} 