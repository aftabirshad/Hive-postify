console.log("submit.js: Script file starting to load..."); // Log right at the start

// --- Toolbar Function in Global Scope ---
// Make applyFormat available globally
function applyFormat(format) {
    console.log(`Global applyFormat called with format: ${format}`);
    const postBody = document.getElementById('postBody');
    const imageUploadInput = document.getElementById('imageUploadInput');
    
    if (!postBody) {
        console.error("Cannot apply format: postBody textarea not found");
        return;
    }
    
    const start = postBody.selectionStart;
    const end = postBody.selectionEnd;
    const selectedText = postBody.value.substring(start, end);
    let prefix = '';
    let suffix = '';
    let replacement = '';

    switch (format) {
        case 'bold':
            prefix = '**'; suffix = '**';
            replacement = `${prefix}${selectedText || 'bold text'}${suffix}`;
            break;
        case 'italic':
            prefix = '*'; suffix = '*';
            replacement = `${prefix}${selectedText || 'italic text'}${suffix}`;
            break;
        case 'heading':
            // Add # based on current line start or selection
            const lineStart = postBody.value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = postBody.value.substring(lineStart, start);
            const headingMatch = currentLine.match(/^#+/);
            const currentLevel = headingMatch ? headingMatch[0].length : 0;
            const newLevel = currentLevel >= 6 ? 1 : currentLevel + 1;
            prefix = `\n${ '#'.repeat(newLevel)} `;
            suffix = '\n';
            replacement = `${prefix}${selectedText || 'Heading'}${suffix}`;
            break;
        case 'link':
            const url = prompt("Enter link URL:", "https://");
            if (url) {
                prefix = '['; suffix = `](${url})`;
                replacement = `${prefix}${selectedText || 'link text'}${suffix}`;
            } else {
                return;
            }
            break;
        case 'image': // Trigger file input click
            console.log('Image toolbar button clicked via global function, triggering file input.');
            if (imageUploadInput) {
                imageUploadInput.click();
            } else {
                console.error("Image upload input not found");
            }
            return; // Don't insert markdown directly here
        case 'ul':
            prefix = '\n- '; suffix = '';
            replacement = `${prefix}${selectedText || 'List item'}`;
            break;
        case 'ol':
            prefix = '\n1. '; suffix = '';
            replacement = `${prefix}${selectedText || 'List item'}`;
            break;
        case 'code':
            prefix = '`'; suffix = '`';
            replacement = `${prefix}${selectedText || 'inline code'}${suffix}`;
            break;
        case 'code_block': // Renamed for clarity if needed
            prefix = '```\n'; suffix = '\n```';
            replacement = `${prefix}${selectedText || 'code here'}${suffix}`;
            break;
        case 'quote':
            prefix = '\n> '; suffix = '';
            replacement = `${prefix}${selectedText || 'Quoted text'}`;
            break;
        default:
            console.error("Unknown format:", format);
            return; // Unknown format
    }

    // Insert the replacement text
    postBody.setRangeText(replacement, start, end, 'select');
    // Adjust cursor position
    postBody.selectionStart = start + prefix.length;
    postBody.selectionEnd = postBody.selectionStart + (selectedText.length > 0 ? selectedText.length : replacement.length - prefix.length - suffix.length);
    postBody.focus();
    
    // Update preview if function exists
    if (typeof updatePreview === 'function') {
        updatePreview();
    } else {
        // Simple automatic preview update if the original function isn't available
        const postPreview = document.getElementById('postPreview');
        if (postPreview && postBody) {
            try {
                const markdown = postBody.value;
                let html = marked.parse(markdown);
                html = DOMPurify.sanitize(html, { 
                    USE_PROFILES: { html: true },
                    ADD_TAGS: ['center'] // Explicitly allow the <center> tag
                });
                postPreview.innerHTML = html;
                // Apply syntax highlighting to code blocks in the preview
                postPreview.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            } catch (e) {
                console.error("Error updating preview:", e);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("submit.js: DOMContentLoaded event fired. Initializing script...");

    // --- Configuration ---
    // const IMGBB_API_KEY = '6a9156f124f644575e16429232f42595'; // Removed, using anonymous upload
    const HIVE_API_NODES = ['https://api.deathwing.me', 'https://api.hive.blog', 'https://anyx.io'];
    const APP_NAME = 'hivepostify/1.0'; // Customize your app name

    // --- DOM Elements ---
    const postForm = document.getElementById('postForm');
    const postTitle = document.getElementById('postTitle');
    const postCommunity = document.getElementById('postCommunity');
    const postTags = document.getElementById('postTags');
    const postBody = document.getElementById('postBody');
    const uploadImageBtn = document.getElementById('uploadImageBtn');
    const imageUploadInput = document.getElementById('imageUploadInput');
    const imageUploadSpinner = document.getElementById('imageUploadSpinner');
    const postPreview = document.getElementById('postPreview');
    const postBeneficiaries = document.getElementById('postBeneficiaries');
    const submitMessage = document.getElementById('submitMessage');
    const submitBtn = document.getElementById('submitBtn');
    const submitBtnText = document.getElementById('submitBtnText');
    const submitSpinner = document.getElementById('submitSpinner');
    const loginRequiredMessage = document.getElementById('loginRequiredMessage');
    const loggedInUserSpan = document.getElementById('loggedInUser'); // For showing username in nav
    const loginBtn = document.getElementById('loginBtn'); // To potentially update based on login state
    const beneficiaryError = document.getElementById('beneficiaryError'); // Error display below list
    const formattingToolbar = document.getElementById('formattingToolbar'); // Get toolbar

    // --- Login Modal Elements ---
    const loginModal = document.getElementById('loginModal');
    const loginBox = document.getElementById('loginBox');
    const loginFormModal = document.getElementById('loginFormModal');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginErrorModal = document.getElementById('loginErrorModal');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const loginSubmitText = document.getElementById('loginSubmitText');
    const loginSpinner = document.getElementById('loginSpinner');
    const closeLoginModalBtn = document.getElementById('closeLoginModal');

    // --- New Elements ---
    const tagInput = document.getElementById('tagInput');
    const tagDisplayArea = document.getElementById('tagDisplayArea');
    const postTagsHidden = document.getElementById('postTags'); // Hidden input
    const tagError = document.getElementById('tagError');

    const beneficiaryList = document.getElementById('beneficiaryList');
    const addBeneficiaryBtn = document.getElementById('addBeneficiaryBtn');
    const addBeneficiaryFields = document.getElementById('addBeneficiaryFields');
    const beneficiaryUsernameInput = document.getElementById('beneficiaryUsername');
    const beneficiaryPercentageInput = document.getElementById('beneficiaryPercentage');
    const confirmAddBeneficiaryBtn = document.getElementById('confirmAddBeneficiaryBtn');
    const cancelAddBeneficiaryBtn = document.getElementById('cancelAddBeneficiaryBtn');
    const beneficiaryTotalPercentage = document.getElementById('beneficiaryTotalPercentage');
    const addBeneficiaryPanel = document.getElementById('addBeneficiaryPanel'); // Panel container
    const closeAddBeneficiaryPanelBtn = document.getElementById('closeAddBeneficiaryPanelBtn'); // Extra close button

    // --- Beneficiary Modal Elements ---
    const beneficiaryModal = document.getElementById('beneficiaryModal');
    const beneficiaryModalBox = document.getElementById('beneficiaryModalBox');
    const modalBeneficiaryUsernameInput = document.getElementById('modalBeneficiaryUsername');
    const modalBeneficiaryPercentageInput = document.getElementById('modalBeneficiaryPercentage');
    const modalBeneficiaryError = document.getElementById('modalBeneficiaryError');
    const modalConfirmAddBeneficiaryBtn = document.getElementById('modalConfirmAddBeneficiaryBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const closeBeneficiaryModalBtn = document.getElementById('closeBeneficiaryModalBtn');

    // --- INITIAL ELEMENT CHECKS ---
    console.log("Checking essential elements...");
    console.log("Button (#addBeneficiaryBtn):", document.getElementById('addBeneficiaryBtn'));
    console.log("Modal (#beneficiaryModal):", document.getElementById('beneficiaryModal'));
    console.log("--- End Initial Element Checks ---");

    // --- dHive Client ---
    const dhiveClient = new dhive.Client(HIVE_API_NODES, {
        chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000'
    });

    // --- Login State ---
    let currentUser = null; // Set initially to null
    let postingKey = null; // Set initially to null
    let addedTags = []; // Store added tags
    let addedBeneficiaries = []; // Store added beneficiaries {account: 'user', weight: 1000}

    // --- Functions ---

    // Basic function to show messages
    function showMessage(message, isError = false) {
        submitMessage.textContent = message;
        submitMessage.className = `p-4 rounded-md text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
        submitMessage.classList.remove('hidden');
    }

    // Render Markdown Preview
    function updatePreview() {
        const markdown = postBody.value;
        let html = marked.parse(markdown);
        html = DOMPurify.sanitize(html, { 
            USE_PROFILES: { html: true },
            ADD_TAGS: ['center'] // Explicitly allow the <center> tag
        });
        postPreview.innerHTML = html;
        // Apply syntax highlighting to code blocks in the preview
        postPreview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    // Make updatePreview available globally
    window.updatePreview = updatePreview;

    // --- Insert Formatted Text Helper (Similar to replybox.js insertFormat) ---
    function insertFormattedText(prefix, suffix = '', defaultText = '') {
        const textarea = postBody; // Target the main post body textarea
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        const before = text.substring(0, start);
        const after = text.substring(end);

        const textToInsert = selected || defaultText;
        textarea.value = before + prefix + textToInsert + suffix + after;
        textarea.focus();

        // Put cursor after inserted text (or select inserted default text)
        const newCursorStart = start + prefix.length;
        const newCursorEnd = newCursorStart + textToInsert.length;
        textarea.setSelectionRange(newCursorStart, newCursorEnd);

        updatePreview();
    }

    // --- Image Upload Logic (Adapted from replybox.js) ---
    async function handleImageUpload(event) {
        console.log("Global handleImageUpload started.");
        const imageUploadInput = document.getElementById('imageUploadInput');
        const imageUploadSpinner = document.getElementById('imageUploadSpinner');
        const formattingToolbar = document.getElementById('formattingToolbar');
        const postBody = document.getElementById('postBody');
        
        const file = event.target.files[0];
        if (!file) {
            console.log("No file selected.");
            return;
        }
        console.log("File selected:", file.name, file.type, file.size);

        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPG, PNG, GIF, WebP, or BMP)');
            return;
        }

        // Check file size (max 5MB suggested by replybox.js)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Image size must be less than 5MB');
            return;
        }

        const imgToolbarBtn = formattingToolbar?.querySelector('button[data-format="image"]');
        if (imgToolbarBtn) imgToolbarBtn.disabled = true;
        if (imageUploadSpinner) imageUploadSpinner.classList.remove('hidden');
        console.log("Spinner shown, button disabled.");

        try {
            // Create FormData for anonymous ImgBB upload
            const formData = new FormData();
            formData.append('source', file);
            formData.append('type', 'file');
            formData.append('action', 'upload');
            formData.append('timestamp', Date.now());

            const uploadUrl = 'https://imgbb.com/json';
            console.log(`Posting to ${uploadUrl}...`);
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: formData
            });
            console.log(`ImgBB response status: ${response.status}`);

            if (!response.ok) {
                 throw new Error(`ImgBB upload failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log("ImgBB response JSON parsed:", data);

            if (!data.success || !data.image || !data.image.url) {
                throw new Error('Upload failed: ' + (data.error?.message || 'Invalid response from ImgBB'));
            }

            // Insert the image markdown 
            const altText = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            if (postBody) {
                const start = postBody.selectionStart;
                const end = postBody.selectionEnd;
                const text = postBody.value;
                const before = text.substring(0, start);
                const after = text.substring(end);
                const imageMarkdown = `![${altText}](${data.image.url})`;
                
                postBody.value = before + imageMarkdown + after;
                postBody.focus();
                
                // Update the preview
                if (typeof updatePreview === 'function') {
                    updatePreview();
                }
            }
            console.log("Image markdown inserted.");
            alert('Image uploaded and inserted!');

        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image: ' + error.message + ' Please try again.');
        } finally {
            console.log("Image upload finally block.");
            if (imgToolbarBtn) imgToolbarBtn.disabled = false;
            if (imageUploadSpinner) imageUploadSpinner.classList.add('hidden');
            if (imageUploadInput) imageUploadInput.value = ''; // Reset file input
            console.log("Spinner hidden, button enabled, input reset.");
        }
    }

    // --- Tag Functions ---
    function renderTags() {
        tagDisplayArea.innerHTML = '';
        addedTags.forEach((tag, index) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-item';
            tagElement.textContent = tag;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-item-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove tag';
            removeBtn.onclick = () => removeTag(index);
            tagElement.appendChild(removeBtn);
            tagDisplayArea.appendChild(tagElement);
        });
        // Update hidden input
        postTagsHidden.value = addedTags.join(' ');
        // Clear and check error
        tagError.classList.add('hidden');
        if (addedTags.length > 4) { // Max 5 tags total (community doesn't count here yet)
             tagError.textContent = 'Maximum 5 tags allowed.';
             tagError.classList.remove('hidden');
        }
    }

    function addTag(tag) {
        tag = tag.trim().toLowerCase().replace(/[^a-z0-9-]+/g, ''); // Clean tag
        if (tag && !addedTags.includes(tag) && addedTags.length < 5) {
            addedTags.push(tag);
            renderTags();
        } else if (addedTags.length >= 5) {
             tagError.textContent = 'Maximum 5 tags allowed.';
             tagError.classList.remove('hidden');
        }
    }

    function removeTag(index) {
        addedTags.splice(index, 1);
        renderTags();
    }

    // --- Show/Hide Beneficiary Modal Functions ---
    function openBeneficiaryModal() {
        // alert("Add Beneficiary button was clicked!"); // <-- REMOVE Basic test alert
        console.log("Opening Beneficiary Modal (from submit.js - Should NOT be called by button click anymore)"); // Added note
        modalBeneficiaryUsernameInput.value = ''; // Clear inputs
        modalBeneficiaryPercentageInput.value = '';
        modalBeneficiaryError.classList.add('hidden'); // Hide previous errors

        beneficiaryModal.classList.remove('hidden');
        beneficiaryModal.classList.add('flex'); // Use flex for centering

        // Animation for modal box appearing
        setTimeout(() => {
            beneficiaryModalBox.classList.remove('scale-95', 'opacity-0');
            beneficiaryModalBox.classList.add('scale-100', 'opacity-100');
            modalBeneficiaryUsernameInput.focus(); // Focus username input
            console.log("Beneficiary Modal opened and focused");
        }, 10);
    }

    function closeBeneficiaryModal() {
        console.log("Closing Beneficiary Modal");
        beneficiaryModalBox.classList.remove('scale-100', 'opacity-100');
        beneficiaryModalBox.classList.add('scale-95', 'opacity-0');

        // Wait for animation before hiding overlay
        setTimeout(() => {
            beneficiaryModal.classList.add('hidden');
            beneficiaryModal.classList.remove('flex');
            console.log("Beneficiary Modal closed");
        }, 300); // Match animation duration (0.3s)
    }

    // --- Beneficiary Functions ---
    function renderBeneficiaries() {
        const listElement = document.getElementById('beneficiaryListDisplay');
        if (!listElement) {
            console.error("Cannot render beneficiaries: beneficiaryListDisplay element not found.");
            return;
        }
        listElement.innerHTML = ''; // Clear the list display area
        let currentTotalPercent = 0;
        addedBeneficiaries.forEach((ben, index) => {
            const percent = ben.weight / 100;
            currentTotalPercent += percent;
            const benElement = document.createElement('div');
            // Added Tailwind classes for layout and styling
            benElement.className = 'beneficiary-item flex justify-between items-center text-sm py-1 px-2 bg-gray-100 rounded mb-1'; 
            benElement.innerHTML = `
                <span>
                    <i class="fas fa-user fa-fw text-gray-500 mr-1"></i>${ben.account} 
                    (<i class="fas fa-percentage fa-fw text-gray-500 mr-0.5"></i>${percent.toFixed(0)}%)
                </span>
                <button type="button" class="remove-item-btn ml-2 text-red-500 hover:text-red-700 focus:outline-none font-bold" title="Remove beneficiary">&times;</button>
            `;
            // Attach onclick directly to the button within the innerHTML
            const removeBtn = benElement.querySelector('.remove-item-btn');
            if (removeBtn) {
                 removeBtn.onclick = () => removeBeneficiary(index);
            } else {
                console.warn("Could not find remove button for beneficiary:", ben.account);
            }
            listElement.appendChild(benElement);
        });
        
        // Ensure total percentage element exists before updating
        const totalElement = document.getElementById('beneficiaryTotalDisplay');
        if (totalElement) {
            totalElement.textContent = `Total Assigned: ${currentTotalPercent.toFixed(0)}%`;
        } else {
            console.error("Cannot update total percentage: beneficiaryTotalDisplay element not found.");
        }
    }

    function addBeneficiary() {
        alert("Modal Add button clicked! Running addBeneficiary function..."); // <--- Simple alert test
        console.log("--- addBeneficiary function started ---");
        // Ensure modal error element exists before trying to hide/show it
        const errorElement = document.getElementById('modalBeneficiaryError');
        if (errorElement) {
            errorElement.classList.add('hidden'); // Hide previous modal error
            errorElement.textContent = ''; // Clear previous message
        } else {
            console.error("Could not find modalBeneficiaryError element!");
            // Optionally alert the user if the error display itself is broken
            // alert("Error display element is missing!"); 
        }

        const usernameInput = document.getElementById('modalBeneficiaryUsername');
        const percentageInput = document.getElementById('modalBeneficiaryPercentage');

        // Check if input elements exist
        if (!usernameInput || !percentageInput) {
             console.error("CRITICAL: Could not find username or percentage input fields in the modal!");
             if (errorElement) {
                 errorElement.textContent = 'Modal input fields are missing. Cannot add beneficiary.';
                 errorElement.classList.remove('hidden');
             }
             return; // Cannot proceed
        }

        const username = usernameInput.value.trim().toLowerCase();
        const percentageText = percentageInput.value;
        const percentage = parseFloat(percentageText);
        console.log(`Read values - Username: '${username}', Percentage Text: '${percentageText}', Parsed Percentage: ${percentage}`);

        // --- Validation Function ---
        function failValidation(message) {
            console.error("Validation failed:", message);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.classList.remove('hidden');
            }
            return false; // Indicate failure
        }

        // Run Validations
        if (!username) {
             return failValidation('Username is required.');
        }
        console.log("Validation passed: Username present.");

        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
             return failValidation('Percentage must be between 1 and 100.');
        }
        console.log("Validation passed: Percentage is valid number.");

        if (addedBeneficiaries.length >= 8) {
             return failValidation('Maximum 8 beneficiaries allowed.');
        }
        console.log("Validation passed: Beneficiary count ok.");
        
        if (addedBeneficiaries.some(b => b.account === username)) {
            return failValidation(`Beneficiary '${username}' already added.`);
        }
        console.log("Validation passed: Beneficiary not already added.");

        const currentTotalWeight = addedBeneficiaries.reduce((sum, b) => sum + b.weight, 0);
        const newWeight = Math.round(percentage * 100);
        console.log(`Weight calculation - Current Total: ${currentTotalWeight}, New Weight: ${newWeight}`);

        if (currentTotalWeight + newWeight > 10000) {
            const remainingPercent = ((10000 - currentTotalWeight) / 100).toFixed(2);
            return failValidation(`Cannot add ${percentage}%. Total exceeds 100%. Remaining: ${remainingPercent}%.`);
        }
        console.log("Validation passed: Total weight ok.");

        // --- If all validation passed --- 
        console.log("All validation checks passed. Proceeding to add beneficiary.");
        try {
            // Add beneficiary
            addedBeneficiaries.push({ account: username, weight: newWeight });
            console.log("SUCCESS: Beneficiary added to array:", { account: username, weight: newWeight });
            console.log("Current addedBeneficiaries array:", addedBeneficiaries);
            
            // Render the updated list on the main page
            console.log("Calling renderBeneficiaries()...");
            renderBeneficiaries(); 
            console.log("Finished renderBeneficiaries()");

            // Close modal ONLY on success
            console.log("Calling closeBeneficiaryModal()...");
            closeBeneficiaryModal();
            console.log("Finished closeBeneficiaryModal()");

        } catch (error) {
            console.error("ERROR during beneficiary push/render/close:", error);
            if (errorElement) {
                 errorElement.textContent = 'An unexpected error occurred while adding the beneficiary.';
                 errorElement.classList.remove('hidden');
            }
        }
        console.log("--- addBeneficiary function finished ---");
    }

    function removeBeneficiary(index) {
        addedBeneficiaries.splice(index, 1);
        renderBeneficiaries();
    }

    // Generate Permlink
    function generatePermlink(title) {
        let permlink = title.toLowerCase()
                           .replace(/[^a-z0-9-]+/g, '-') // Replace non-alphanumeric chars with -
                           .replace(/^-+|-+$/g, '') // Trim leading/trailing -
                           .substring(0, 255); // Max length
        if (permlink.length === 0) {
             permlink = 'post'; // Fallback if title is all special chars
        }
        // Add random suffix to ensure uniqueness (simple approach)
        permlink += '-' + Math.random().toString(36).substring(2, 7);
        return permlink;
    }

    // Handle Form Submission
    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!currentUser || !postingKey) {
            showMessage('Login information is missing. Cannot submit post. Please log in again.', true);
            openLoginModal(); 
            return;
        }

        showMessage('', false); 
        submitBtn.disabled = true;
        submitSpinner.classList.remove('hidden');
        submitBtnText.textContent = 'Publishing...';

        try {
            const title = postTitle.value.trim();
            const body = postBody.value.trim();
            const community = postCommunity.value.trim().toLowerCase();
            
            // Make sure we use the globally available addedBeneficiaries array
            // that is maintained by our inline script
            const hiddenInput = document.getElementById('beneficiariesData');
            let beneficiaries = window.addedBeneficiaries || [];
            if (hiddenInput && hiddenInput.value) {
                try {
                    beneficiaries = JSON.parse(hiddenInput.value);
                } catch (e) {
                    console.error("Error parsing beneficiaries data:", e);
                }
            }
            console.log('Submitting post with beneficiaries:', beneficiaries);

            // --- Validation ---
            if (!title) throw new Error('Title cannot be empty.');
            if (!body) throw new Error('Body cannot be empty.');
            if (addedTags.length === 0 && !community) throw new Error('Please enter at least one tag (or specify a community).');
            if (addedTags.length > 5) throw new Error('Maximum 5 custom tags allowed.'); // Should be prevented by UI

            // Prepare final tags array, including community if needed
            let finalTags = [...addedTags]; // Copy tags from our state
            let parentPermlink = finalTags.length > 0 ? finalTags[0] : 'general'; // Default parent
            
            if (community) {
                if (!community.startsWith('hive-')) {
                    throw new Error('Invalid community format. It should start with "hive-".');
                }
                parentPermlink = community; // Parent permlink MUST be community
                if (!finalTags.includes(community)) {
                    finalTags.unshift(community); // Add community as first tag if not already present
                }
                // Ensure community is first even if typed manually
                 if (finalTags[0] !== community) {
                    finalTags = finalTags.filter(t => t !== community);
                    finalTags.unshift(community);
                 }
            }
            // Ensure max 5 tags total (including community if added)
            finalTags = finalTags.slice(0, 5);
            
            // --- Prepare Operation Data ---
            const permlink = generatePermlink(title);
            // Beneficiaries already prepared in addedBeneficiaries array

            const jsonMetadata = JSON.stringify({
                tags: finalTags, // Use the final processed tags
                app: APP_NAME,
                format: 'markdown',
                beneficiaries: beneficiaries.length > 0 ? beneficiaries : undefined 
            });

            const commentOp = [
                'comment',
                {
                    parent_author: '', 
                    parent_permlink: parentPermlink,
                    author: currentUser,
                    permlink: permlink,
                    title: title,
                    body: body,
                    json_metadata: jsonMetadata
                }
            ];

            const commentOptions = {
                author: currentUser,
                permlink: permlink,
                max_accepted_payout: '1000000.000 HBD', 
                percent_hbd: 10000, 
                allow_votes: true,
                allow_curation_rewards: true,
                extensions: []
            };

            if (beneficiaries.length > 0) {
                console.log('Adding beneficiaries to comment options:', beneficiaries);
                commentOptions.extensions.push([0, { beneficiaries }]);
            }

            console.log('Broadcasting comment operation with key type:', typeof postingKey);
            
            // Use a direct broadcast approach
            const operations = [];
            operations.push(['comment', commentOp[1]]);
            operations.push(['comment_options', commentOptions]);
            
            // Add community operation if posting to a community
            if (community) {
                console.log(`Adding community operation for posting to: ${community}`);
                // This is the additional operation required to properly post to a community
                const communityOp = [
                    'custom_json',
                    {
                        required_auths: [],
                        required_posting_auths: [currentUser],
                        id: 'community',
                        json: JSON.stringify(['submit_comment', {
                            author: currentUser,
                            permlink: permlink,
                            community: community
                        }])
                    }
                ];
                operations.push(communityOp);
            }
            
            const result = await dhiveClient.broadcast.sendOperations(operations, postingKey);

            console.log('Broadcast Result:', result);
            showMessage('Post published successfully! Redirecting...'); 
            
            // Clear form and state on success
            postForm.reset();
            addedTags = [];
            // Reset beneficiaries in both places
            window.addedBeneficiaries = [];  
            addedBeneficiaries = [];
            document.getElementById('beneficiariesData').value = '[]';
            renderTags();
            // Call our inline render function for beneficiaries
            if (typeof renderBeneficiaries === 'function') {
                renderBeneficiaries();
            }
            updatePreview(); 

            // Redirect to the new post after a short delay
            setTimeout(() => {
                window.location.href = `https://hive.blog/@${currentUser}/${permlink}`;
                // Or use your own post view page: window.location.href = `post.html?author=${currentUser}&permlink=${permlink}`;
            }, 2000); 

        } catch (error) {
            console.error('Post Submission Error:', error);
            const errorMessage = error?.data?.message || error?.message || 'An unknown error occurred.';
            showMessage(`Error: ${errorMessage}`, true);
        } finally {
            submitBtn.disabled = false;
            submitSpinner.classList.add('hidden');
            submitBtnText.textContent = 'Publish Post';
        }
    }

    // --- Login Modal Functions ---
    function openLoginModal() {
        loginModal.classList.remove('hidden');
        loginModal.classList.add('flex');
        loginErrorModal.classList.add('hidden'); // Hide previous errors
        loginPasswordInput.value = ''; // Clear password field
        // Animation
        setTimeout(() => { 
            loginBox.classList.remove('scale-95', 'opacity-0');
            loginBox.classList.add('scale-100', 'opacity-100');
        }, 10); 
    }

    function closeLoginModal() {
        loginBox.classList.remove('scale-100', 'opacity-100');
        loginBox.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            loginModal.classList.add('hidden');
            loginModal.classList.remove('flex');
        }, 300); 
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim(); // Can be password or posting key

        if (!username || !password) {
            loginErrorModal.textContent = 'Username and password/key are required.';
            loginErrorModal.classList.remove('hidden');
            return;
        }

        loginErrorModal.classList.add('hidden');
        loginSubmitBtn.disabled = true;
        loginSpinner.classList.remove('hidden');
        loginSubmitText.textContent = 'Logging in...';

        try {
            let privateKey = null;
            
            // Check if it looks like a posting key (starts with 5, length 51)
            if (password.startsWith('5') && password.length === 51) {
                try {
                    // Create an actual PrivateKey object, not just a string
                    privateKey = dhive.PrivateKey.fromString(password);
                    console.log("Using provided posting key");
                } catch (keyError) {
                    throw new Error('Invalid Posting Key format.');
                }
            } else {
                // Derive posting key from password
                console.log("Attempting to derive posting key from password...");
                try {
                    privateKey = dhive.PrivateKey.fromLogin(username, password, 'posting');
                    console.log("Derived posting key successfully");
                } catch (deriveError) {
                    console.warn("Failed to derive posting key from password:", deriveError);
                    throw new Error('Login failed: Invalid username or password/key.');
                }
            }

            // Validate the account exists
            try {
                const acc = await dhiveClient.database.getAccounts([username]);
                if (!acc || acc.length === 0) {
                    throw new Error('Account not found on Hive.')
                }
            } catch(accError) {
                console.error("Error checking account during login:", accError);
                throw new Error('Failed to verify account on Hive.');
            }

            // --- Login Success ---
            currentUser = username;
            postingKey = privateKey; // Store the PrivateKey object directly
            
            // Store in localStorage for persistence across page loads
            localStorage.setItem('hive_username', currentUser);
            // Store the string representation
            localStorage.setItem('hive_posting_key', password);

            closeLoginModal();
            updateLoginStateUI(true); // Update UI to logged-in state
            showMessage('Login successful!', false);

        } catch (error) {
            console.error('Login Error:', error);
            loginErrorModal.textContent = error.message || 'Login failed. Please check credentials.';
            loginErrorModal.classList.remove('hidden');
        } finally {
            loginSubmitBtn.disabled = false;
            loginSpinner.classList.add('hidden');
            loginSubmitText.textContent = 'Log in';
        }
    }

    // --- UI Update on Login/Logout ---
    function updateLoginStateUI(isLoggedIn) {
        if (isLoggedIn) {
            loggedInUserSpan.textContent = `@${currentUser}`;
            loggedInUserSpan.classList.remove('hidden');
            loginBtn.innerHTML = '<i class="fas fa-sign-out-alt text-gray-600"></i>'; // Change icon to logout
            loginBtn.title = 'Log out';
            postForm.style.display = 'block';
            loginRequiredMessage.classList.add('hidden');
        } else {
            loggedInUserSpan.textContent = '';
            loggedInUserSpan.classList.add('hidden');
            loginBtn.innerHTML = '<i class="fas fa-user text-gray-600"></i>'; // Change icon to login
            loginBtn.title = 'Log in';
            postForm.style.display = 'none';
            loginRequiredMessage.classList.remove('hidden');
            currentUser = null;
            postingKey = null;
            localStorage.removeItem('hive_username');
            localStorage.removeItem('hive_posting_key');
        }
    }

    // Handle clicking the nav login/logout button
    function handleNavUserClick() {
         if (currentUser) {
             // Log out
             console.log("Logging out...");
             updateLoginStateUI(false); 
             showMessage('You have been logged out.');
         } else {
             // Show login modal
             openLoginModal();
         }
    }

    // --- Event Listeners ---
    postBody.addEventListener('input', updatePreview);
    imageUploadInput.addEventListener('change', handleImageUpload);
    postForm.addEventListener('submit', handleFormSubmit);
    loginBtn.addEventListener('click', handleNavUserClick); 
    loginFormModal.addEventListener('submit', handleLoginSubmit); 
    closeLoginModalBtn.addEventListener('click', closeLoginModal);
    loginModal.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            closeLoginModal();
        }
    });

    // Tag Input Listener
    tagInput.addEventListener('keyup', (event) => {
        if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addTag(tagInput.value);
            tagInput.value = ''; // Clear input
        }
    });
    // Prevent submitting form on Enter in tag input
    tagInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
             addTag(tagInput.value);
             tagInput.value = '';
        }
    });

    // --- REMOVED Beneficiary Button Listener (Now handled by inline onclick in HTML) ---
    /*
    console.log("submit.js: Attempting to find addBeneficiaryBtn...");
    const addBtnElement = document.getElementById('addBeneficiaryBtn');
    console.log("submit.js: Found addBeneficiaryBtn element:", addBtnElement);
    
    if (addBtnElement) {
        try {
            console.log("submit.js: Attempting to attach click listener to addBeneficiaryBtn...");
            addBtnElement.addEventListener('click', openBeneficiaryModal);
            console.log("submit.js: Successfully attached click listener to addBeneficiaryBtn.");
        } catch (error) {
            console.error("submit.js: CRITICAL ERROR attaching listener to addBeneficiaryBtn:", error);
        }
    } else {
        console.error("submit.js: CRITICAL ERROR - Could not find addBeneficiaryBtn element to attach listener!");
    }
    */
    
    // Beneficiary Modal Button Listeners (These still need to be attached by submit.js)
    console.log("submit.js: Attaching listeners for modal buttons...");
    if (modalConfirmAddBeneficiaryBtn) { // Add checks for these elements too
        modalConfirmAddBeneficiaryBtn.addEventListener('click', addBeneficiary);
    } else {
        console.error("submit.js: Could not find modalConfirmAddBeneficiaryBtn");
    }
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeBeneficiaryModal);
    } else {
        console.error("submit.js: Could not find modalCancelBtn");
    }
    if (closeBeneficiaryModalBtn) {
        closeBeneficiaryModalBtn.addEventListener('click', closeBeneficiaryModal);
    } else {
        console.error("submit.js: Could not find closeBeneficiaryModalBtn");
    }
    if (beneficiaryModal) { // Check modal exists before adding listener
        // Close modal if clicking outside the modal box
        beneficiaryModal.addEventListener('click', (event) => {
            if (event.target === beneficiaryModal) {
                closeBeneficiaryModal();
            }
        });
    } else {
         console.error("submit.js: Could not find beneficiaryModal to attach background click listener");
    }
    

    // Add Toolbar Listeners
    if (formattingToolbar) {
        formattingToolbar.addEventListener('click', (e) => {
            console.log("submit.js: Click detected inside formatting toolbar."); // Log any click
            const btn = e.target.closest('.toolbar-btn');
            if (btn && btn.dataset.format) {
                const format = btn.dataset.format;
                console.log(`submit.js: Toolbar button clicked! data-format: ${format}`); // Log identified button
                e.preventDefault(); // Prevent default button behavior
                applyFormat(format); // Apply the format
            } else {
                 console.log("submit.js: Click inside toolbar was not on a recognized button.");
            }
        });
        console.log("submit.js: Added 'click' listener to formattingToolbar.");
    } else {
        console.error("submit.js: formattingToolbar element not found, cannot add listener.");
    }

    // Image Upload Listener
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', handleImageUpload);
        console.log("submit.js: Added 'change' listener to imageUploadInput.");
    } else {
        console.error("submit.js: imageUploadInput element not found, cannot add image upload listener.");
    }

    // --- Initial Setup ---
    // Check localStorage on load to see if already logged in
    const storedUser = localStorage.getItem('hive_username');
    const storedKey = localStorage.getItem('hive_posting_key');
    if (storedUser && storedKey) {
        console.log("Found existing login session in localStorage.");
        currentUser = storedUser;
        
        // Create a proper PrivateKey object from the stored key
        try {
            if (storedKey.startsWith('5') && storedKey.length === 51) {
                postingKey = dhive.PrivateKey.fromString(storedKey);
            } else {
                postingKey = dhive.PrivateKey.fromLogin(storedUser, storedKey, 'posting');
            }
            updateLoginStateUI(true);
        } catch (e) {
            console.error("Error recreating posting key from stored data:", e);
            localStorage.removeItem('hive_username');
            localStorage.removeItem('hive_posting_key');
            updateLoginStateUI(false);
        }
    } else {
        console.log("No active login session found.");
        updateLoginStateUI(false);
    }

    // Initialize preview
    updatePreview(); 

    // Initial renders
    renderBeneficiaries(); // Render initial beneficiary state (empty)
    renderTags(); // Render initial tag state (empty)

    // Check if user is stored in localStorage for hiveUser
    const storedHiveUser = localStorage.getItem('hiveUser');
    if (storedHiveUser) {
        currentUser = storedHiveUser;
        console.log(`User found in storage: ${currentUser}`);
    } else {
        console.log("No user found in storage.");
    }
    
    updateHeaderUI(); // Update header based on stored or null user

    // Check for community parameter in URL and auto-fill community field
    const urlParams = new URLSearchParams(window.location.search);
    const communityParam = urlParams.get('community');
    if (communityParam && postCommunity) {
        postCommunity.value = communityParam;
        console.log(`Auto-filled community field with: ${communityParam}`);
    }

    // Only load posts if postsGrid exists (i.e., we are on the main page)
    if (postsGrid) {
        loadInitialPosts();
    }

    // Initialize other page-specific things if needed
}); 