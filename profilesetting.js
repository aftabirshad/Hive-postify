// profilesetting.js - Handles profile settings functionality

// Self-check when loaded
console.log('[ProfileSettings] Module loading...');

// Shared state/dependencies stored internally
let _currentUsername = null;
let _dhiveClient = null;
let _keychainAvailable = false;
let _isSettingsVisible = false;
let _originalProfileData = null;

// Constants for API endpoints and properties
const ACCOUNT_UPDATE_OPERATION = 'account_update';
const ACCOUNT_UPDATE_METADATA_OPERATION = 'account_update2';
const PROFILE_IMAGE_SIZE = 'small'; // For preview
const PROFILE_IMAGE_PLACEHOLDER = 'https://images.hive.blog/u/null/avatar';

// Profile settings fields with validators
const PROFILE_FIELDS = {
    profile_image: {
        type: 'image',
        maxLength: 500,
        validate: url => isValidImageUrl(url)
    },
    cover_image: {
        type: 'image',
        maxLength: 500,
        validate: url => isValidImageUrl(url)
    },
    name: {
        type: 'text',
        maxLength: 30,
        validate: text => text.length <= 30
    },
    about: {
        type: 'textarea',
        maxLength: 160,
        validate: text => text.length <= 160
    },
    location: {
        type: 'text',
        maxLength: 30,
        validate: text => text.length <= 30
    },
    website: {
        type: 'url',
        maxLength: 100,
        validate: url => url === '' || isValidUrl(url)
    }
};

// Helper function to validate image URLs
function isValidImageUrl(url) {
    if (!url) return true; // Empty is allowed
    return /^https?:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

// Helper function to validate URLs
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// Function to initialize the settings module
async function initProfileSettings(username, dhiveClient) {
    console.log('[ProfileSettings] Initializing with username:', username);
    _currentUsername = username;
    _dhiveClient = dhiveClient;
    _keychainAvailable = typeof window.hive_keychain !== 'undefined';
    
    if (!_currentUsername || !_dhiveClient) {
        console.error('[ProfileSettings] Cannot initialize: missing username or dhiveClient');
        return false;
    }
    
    // Check if Hive Keychain is available
    if (!_keychainAvailable) {
        console.warn('[ProfileSettings] Hive Keychain not detected. Some features may be limited.');
    }
    
    try {
        // Fetch user profile data from the blockchain
        const response = await _dhiveClient.database.getAccounts([_currentUsername]);
        if (response && response.length > 0) {
            const account = response[0];
            
            // Parse JSON metadata if it exists
            try {
                const metadata = JSON.parse(account.json_metadata) || {};
                _originalProfileData = metadata.profile || {};
                console.log('[ProfileSettings] Loaded profile data:', _originalProfileData);
                return true;
            } catch (parseError) {
                console.error('[ProfileSettings] Error parsing json_metadata:', parseError);
                _originalProfileData = {};
                return true; // Still return true to allow editing empty profile
            }
        } else {
            console.error('[ProfileSettings] Account not found:', _currentUsername);
            return false;
        }
    } catch (error) {
        console.error('[ProfileSettings] Error initializing profile settings:', error);
        return false;
    }
}

// Function to build and insert the settings UI
function createSettingsUI(containerSelector) {
    console.log('[ProfileSettings] Creating settings UI in container:', containerSelector);
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error('[ProfileSettings] Container not found:', containerSelector);
        return;
    }
    
    // Create settings button to show/hide the form
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'settings-toggle-btn bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-full flex items-center';
    settingsBtn.innerHTML = '<i class="fas fa-cog mr-2"></i> Edit Profile';
    settingsBtn.onclick = toggleSettingsForm;
    
    // Create settings form container
    const settingsContainer = document.createElement('div');
    settingsContainer.id = 'profile-settings-form-container';
    settingsContainer.className = 'bg-white rounded-lg shadow-lg p-6 mb-6 w-full max-w-3xl mx-auto';
    
    // Build form HTML
    settingsContainer.innerHTML = `
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Public Profile Settings</h2>
        <form id="profile-settings-form">
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="profile_image">
                    Profile picture URL
                </label>
                <div class="flex items-start space-x-4">
                    <div class="flex-grow">
                        <input type="text" id="profile_image" name="profile_image" 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value="${_originalProfileData?.profile_image || ''}" 
                            placeholder="https://example.com/image.jpg">
                        <p class="text-sm text-gray-500 mt-1">Direct link to profile image (JPG, PNG, GIF)</p>
                    </div>
                    <div class="flex-shrink-0">
                        <img id="profile_image_preview" src="${_originalProfileData?.profile_image || PROFILE_IMAGE_PLACEHOLDER}" 
                            class="w-16 h-16 rounded-full object-cover border-2 border-gray-200">
                    </div>
                </div>
                <div class="mt-2">
                    <button type="button" id="profile_image_upload" class="text-blue-600 hover:text-blue-800 text-sm">
                        <i class="fas fa-upload mr-1"></i> Upload an image
                    </button>
                </div>
            </div>
            
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="cover_image">
                    Cover image URL (Optimal: 2048 x 512 pixels)
                </label>
                <div class="flex items-start space-x-4">
                    <div class="flex-grow">
                        <input type="text" id="cover_image" name="cover_image" 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value="${_originalProfileData?.cover_image || ''}" 
                            placeholder="https://example.com/cover.jpg">
                        <p class="text-sm text-gray-500 mt-1">Direct link to cover image (JPG, PNG)</p>
                    </div>
                    <div class="flex-shrink-0">
                        <div id="cover_image_preview" class="w-32 h-8 bg-gray-200 rounded border-2 border-gray-200 bg-center bg-cover"
                            style="${_originalProfileData?.cover_image ? `background-image: url(${_originalProfileData.cover_image})` : ''}"></div>
                    </div>
                </div>
                <div class="mt-2">
                    <button type="button" id="cover_image_upload" class="text-blue-600 hover:text-blue-800 text-sm">
                        <i class="fas fa-upload mr-1"></i> Upload an image
                    </button>
                </div>
            </div>
            
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
                    Display Name
                </label>
                <input type="text" id="name" name="name" maxlength="30"
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value="${_originalProfileData?.name || ''}" 
                    placeholder="Your display name">
                <p class="text-sm text-gray-500 mt-1">Your name or nickname (max 30 characters)</p>
            </div>
            
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="about">
                    About
                </label>
                <textarea id="about" name="about" maxlength="160" rows="3"
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Brief bio about yourself">${_originalProfileData?.about || ''}</textarea>
                <p class="text-sm text-gray-500 mt-1">Brief bio about yourself (max 160 characters)</p>
                <p class="text-sm text-right" id="about_counter">0/160</p>
            </div>
            
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="location">
                    Location
                </label>
                <input type="text" id="location" name="location" maxlength="30"
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value="${_originalProfileData?.location || ''}" 
                    placeholder="Your location">
                <p class="text-sm text-gray-500 mt-1">Where you're located (max 30 characters)</p>
            </div>
            
            <div class="mb-8">
                <label class="block text-gray-700 text-sm font-bold mb-2" for="website">
                    Website
                </label>
                <input type="url" id="website" name="website" 
                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value="${_originalProfileData?.website || ''}" 
                    placeholder="https://yourwebsite.com">
                <p class="text-sm text-gray-500 mt-1">Your website or blog URL</p>
            </div>
            
            <div class="flex items-center justify-between border-t pt-6">
                <button type="button" id="reset_profile_btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                    Reset
                </button>
                <div>
                    <button type="button" id="cancel_profile_btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2">
                        Cancel
                    </button>
                    <button type="submit" id="save_profile_btn" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        Save Changes
                    </button>
                </div>
            </div>
            
            <div id="profile_update_message" class="mt-4 p-3 rounded hidden"></div>
        </form>
    `;
    
    // Add elements to container
    container.appendChild(settingsBtn);
    container.appendChild(settingsContainer);
    console.log('[ProfileSettings] Added settings UI elements to container');
    
    // Set up event listeners for the form
    setupFormEventListeners();
    console.log('[ProfileSettings] Set up form event listeners');
}

// Function to show/hide the settings form
function toggleSettingsForm() {
    console.log('[ProfileSettings] Toggling settings form visibility');
    const settingsContainer = document.getElementById('profile-settings-form-container');
    if (!settingsContainer) {
        console.error('[ProfileSettings] Settings container not found for toggle');
        return;
    }
    
    if (settingsContainer.classList.contains('hidden')) {
        console.log('[ProfileSettings] Showing settings form');
        settingsContainer.classList.remove('hidden');
        _isSettingsVisible = true;
    } else {
        console.log('[ProfileSettings] Hiding settings form');
        settingsContainer.classList.add('hidden');
        _isSettingsVisible = false;
    }
}

// Function to set up all event listeners for the settings form
function setupFormEventListeners() {
    const form = document.getElementById('profile-settings-form');
    if (!form) return;
    
    // Image preview handlers
    const profileImageInput = document.getElementById('profile_image');
    const profileImagePreview = document.getElementById('profile_image_preview');
    
    profileImageInput.addEventListener('change', function() {
        if (this.value) {
            profileImagePreview.src = this.value;
        } else {
            profileImagePreview.src = PROFILE_IMAGE_PLACEHOLDER;
        }
    });
    
    profileImagePreview.addEventListener('error', function() {
        this.src = PROFILE_IMAGE_PLACEHOLDER;
    });
    
    // Cover image preview handler
    const coverImageInput = document.getElementById('cover_image');
    const coverImagePreview = document.getElementById('cover_image_preview');
    
    coverImageInput.addEventListener('change', function() {
        if (this.value) {
            coverImagePreview.style.backgroundImage = `url(${this.value})`;
        } else {
            coverImagePreview.style.backgroundImage = '';
        }
    });
    
    // About text counter
    const aboutTextarea = document.getElementById('about');
    const aboutCounter = document.getElementById('about_counter');
    
    aboutTextarea.addEventListener('input', function() {
        aboutCounter.textContent = `${this.value.length}/160`;
    });
    
    // Trigger initial count
    aboutCounter.textContent = `${aboutTextarea.value.length}/160`;
    
    // Image upload buttons
    const profileImageUploadBtn = document.getElementById('profile_image_upload');
    const coverImageUploadBtn = document.getElementById('cover_image_upload');
    
    profileImageUploadBtn.addEventListener('click', function() {
        showImageUploadDialog('profile_image');
    });
    
    coverImageUploadBtn.addEventListener('click', function() {
        showImageUploadDialog('cover_image');
    });
    
    // Form action buttons
    const resetBtn = document.getElementById('reset_profile_btn');
    const cancelBtn = document.getElementById('cancel_profile_btn');
    const saveBtn = document.getElementById('save_profile_btn');
    
    resetBtn.addEventListener('click', resetForm);
    cancelBtn.addEventListener('click', cancelForm);
    form.addEventListener('submit', submitForm);
}

// Function to show a fake upload dialog (actual upload would require a server)
function showImageUploadDialog(fieldId) {
    alert('Image upload requires a server endpoint. For now, please use a direct image URL from an image hosting service.');
    
    // In a real implementation, you would:
    // 1. Show a file selector dialog
    // 2. Upload the file to a server or IPFS
    // 3. Get the URL of the uploaded file
    // 4. Set the URL in the corresponding input field
}

// Function to reset form to original values
function resetForm() {
    const form = document.getElementById('profile-settings-form');
    const profileImagePreview = document.getElementById('profile_image_preview');
    const coverImagePreview = document.getElementById('cover_image_preview');
    const aboutCounter = document.getElementById('about_counter');
    
    // Reset all form fields to original values
    form.profile_image.value = _originalProfileData?.profile_image || '';
    form.cover_image.value = _originalProfileData?.cover_image || '';
    form.name.value = _originalProfileData?.name || '';
    form.about.value = _originalProfileData?.about || '';
    form.location.value = _originalProfileData?.location || '';
    form.website.value = _originalProfileData?.website || '';
    
    // Reset image previews
    profileImagePreview.src = _originalProfileData?.profile_image || PROFILE_IMAGE_PLACEHOLDER;
    
    if (_originalProfileData?.cover_image) {
        coverImagePreview.style.backgroundImage = `url(${_originalProfileData.cover_image})`;
    } else {
        coverImagePreview.style.backgroundImage = '';
    }
    
    // Reset about counter
    aboutCounter.textContent = `${form.about.value.length}/160`;
    
    // Hide any messages
    document.getElementById('profile_update_message').classList.add('hidden');
}

// Function to cancel editing and hide the form
function cancelForm() {
    resetForm();
    toggleSettingsForm();
}

// Function to validate and submit the form
async function submitForm(event) {
    event.preventDefault();
    
    const form = document.getElementById('profile-settings-form');
    const messageBox = document.getElementById('profile_update_message');
    
    // Validate all fields
    let isValid = true;
    const formData = {};
    
    for (const fieldName in PROFILE_FIELDS) {
        const field = PROFILE_FIELDS[fieldName];
        const value = form[fieldName].value.trim();
        
        // Skip empty fields
        if (!value) {
            formData[fieldName] = '';
            continue;
        }
        
        // Validate field value
        if (!field.validate(value)) {
            isValid = false;
            form[fieldName].classList.add('border-red-500');
            
            // Show error message
            let errorMsg = '';
            switch (field.type) {
                case 'image':
                    errorMsg = 'Please enter a valid image URL (jpg, png, gif, webp)';
                    break;
                case 'url':
                    errorMsg = 'Please enter a valid URL including http:// or https://';
                    break;
                default:
                    errorMsg = `Maximum length is ${field.maxLength} characters`;
            }
            
            // Create or update error message
            let errorEl = form[fieldName].nextElementSibling.nextElementSibling;
            if (!errorEl || !errorEl.classList.contains('error-message')) {
                errorEl = document.createElement('p');
                errorEl.className = 'error-message text-red-500 text-xs italic mt-1';
                form[fieldName].parentNode.insertBefore(errorEl, form[fieldName].nextElementSibling.nextElementSibling);
            }
            errorEl.textContent = errorMsg;
        } else {
            // Clear error formatting
            form[fieldName].classList.remove('border-red-500');
            const errorEl = form[fieldName].nextElementSibling.nextElementSibling;
            if (errorEl && errorEl.classList.contains('error-message')) {
                errorEl.remove();
            }
            
            // Add to form data
            formData[fieldName] = value;
        }
    }
    
    if (!isValid) {
        messageBox.textContent = 'Please fix the errors before saving.';
        messageBox.className = 'mt-4 p-3 rounded bg-red-100 text-red-800';
        messageBox.classList.remove('hidden');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('save_profile_btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    messageBox.textContent = 'Preparing to update profile...';
    messageBox.className = 'mt-4 p-3 rounded bg-blue-100 text-blue-800';
    messageBox.classList.remove('hidden');
    
    try {
        // Prepare the updated profile data
        const updatedProfile = { ...formData };
        
        // Get current metadata to avoid overwriting other fields
        const accounts = await _dhiveClient.database.getAccounts([_currentUsername]);
        if (!accounts || accounts.length === 0) {
            throw new Error('Could not fetch account data');
        }
        
        const account = accounts[0];
        let metadata = {};
        
        try {
            metadata = JSON.parse(account.json_metadata) || {};
        } catch (e) {
            // If parsing fails, start with empty object
            console.warn('[ProfileSettings] Error parsing existing metadata, starting fresh');
        }
        
        // Update only the profile section of metadata
        metadata.profile = updatedProfile;
        
        // Convert to JSON string
        const updatedMetadata = JSON.stringify(metadata);
        
        // If keychain is available, use it
        if (_keychainAvailable) {
            messageBox.textContent = 'Requesting signature through Hive Keychain...';
            
            window.hive_keychain.requestJsonSignedCall(
                _currentUsername,
                'account_update2',
                {
                    account: _currentUsername,
                    json_metadata: updatedMetadata
                },
                'Posting',
                response => {
                    if (response.success) {
                        handleSuccessfulUpdate(updatedProfile);
                    } else {
                        handleFailedUpdate(response.message || 'Unknown error');
                    }
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalBtnText;
                }
            );
        } else {
            // If keychain is not available, suggest alternatives
            messageBox.textContent = 'Hive Keychain not available. Please install Hive Keychain extension to update your profile.';
            messageBox.className = 'mt-4 p-3 rounded bg-yellow-100 text-yellow-800';
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        handleFailedUpdate(error.message);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
    }
}

// Function to handle successful profile update
function handleSuccessfulUpdate(newProfileData) {
    // Update the stored original data to match the new data
    _originalProfileData = { ...newProfileData };
    
    const messageBox = document.getElementById('profile_update_message');
    messageBox.textContent = 'Profile updated successfully! Changes will be visible shortly.';
    messageBox.className = 'mt-4 p-3 rounded bg-green-100 text-green-800';
    
    // Update visible profile elements on the page
    updateVisibleProfileElements(newProfileData);
    
    // Automatically hide the form after a delay
    setTimeout(() => {
        toggleSettingsForm();
    }, 3000);
}

// Function to handle failed profile update
function handleFailedUpdate(errorMessage) {
    const messageBox = document.getElementById('profile_update_message');
    messageBox.textContent = `Error updating profile: ${errorMessage}`;
    messageBox.className = 'mt-4 p-3 rounded bg-red-100 text-red-800';
}

// Function to update visible profile elements on the page
function updateVisibleProfileElements(profileData) {
    // Find and update visible profile picture if present
    const profilePicElements = document.querySelectorAll('.profile-picture');
    if (profilePicElements.length > 0 && profileData.profile_image) {
        profilePicElements.forEach(el => {
            el.src = profileData.profile_image;
        });
    }
    
    // Find and update visible cover image if present
    const coverImageElements = document.querySelectorAll('.profile-cover-image');
    if (coverImageElements.length > 0 && profileData.cover_image) {
        coverImageElements.forEach(el => {
            el.style.backgroundImage = `url(${profileData.cover_image})`;
        });
    }
    
    // Find and update visible display name if present
    const displayNameElements = document.querySelectorAll('.profile-display-name');
    if (displayNameElements.length > 0 && profileData.name) {
        displayNameElements.forEach(el => {
            el.textContent = profileData.name;
        });
    }
    
    // Find and update visible about text if present
    const aboutElements = document.querySelectorAll('.profile-about');
    if (aboutElements.length > 0) {
        aboutElements.forEach(el => {
            el.textContent = profileData.about || '';
        });
    }
    
    // Find and update visible location if present
    const locationElements = document.querySelectorAll('.profile-location');
    if (locationElements.length > 0) {
        locationElements.forEach(el => {
            el.textContent = profileData.location || '';
            el.closest('.location-container')?.classList.toggle('hidden', !profileData.location);
        });
    }
    
    // Find and update visible website if present
    const websiteElements = document.querySelectorAll('.profile-website');
    if (websiteElements.length > 0) {
        websiteElements.forEach(el => {
            if (profileData.website) {
                el.href = profileData.website;
                el.textContent = profileData.website.replace(/^https?:\/\//, '');
                el.closest('.website-container')?.classList.remove('hidden');
            } else {
                el.closest('.website-container')?.classList.add('hidden');
            }
        });
    }
}

// Function to check if the current page shows the logged-in user's profile
function isOwnProfile(pageUsername, loggedInUsername) {
    return pageUsername === loggedInUsername;
}

// Function to add settings button to profile if it's the user's own profile
function addSettingsButtonIfOwnProfile(pageUsername, containerSelector) {
    console.log('[ProfileSettings] addSettingsButtonIfOwnProfile called with:', { 
        pageUsername, 
        containerSelector,
        currentUsername: _currentUsername
    });
    
    // Check if the username matches, ignoring case
    const isOwnProfile = pageUsername && _currentUsername && 
                        pageUsername.toLowerCase() === _currentUsername.toLowerCase();
    
    console.log('[ProfileSettings] Is own profile?', isOwnProfile);
    
    if (isOwnProfile) {
        createSettingsUI(containerSelector);
    } else {
        console.log('[ProfileSettings] Not creating settings UI because usernames don\'t match');
    }
}

// Add a test function to verify the module is loaded correctly
function testProfileSettings() {
    console.log('[ProfileSettings] Test function called - module is loaded!');
    alert('Profile settings module is loaded and working!');
    return true;
}

// Self-register when loaded
window.testProfileSettings = testProfileSettings;

// Log when fully loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('[ProfileSettings] Module fully loaded and registered global functions');
});

// Export functions globally
window.initProfileSettings = initProfileSettings;
window.addSettingsButtonIfOwnProfile = addSettingsButtonIfOwnProfile;
window.createSettingsUI = createSettingsUI;
window.testProfileSettings = testProfileSettings; 