// Initialize dhive client (Keeping api.hive.blog priority)
const client = new dhive.Client(
    [
        'https://api.hive.blog',
        'https://api.deathwing.me',
        'https://api.openhive.network',
        'https://anyx.io',
        'https://api.hivekings.com'
    ],
    {
        timeout: 4000, // Revert timeout
        failoverThreshold: 3,
        consoleOnFailover: true
    }
);

// Global variables
let currentUser = null;
let isLoading = false;
let searchTimeout = null;
let allSubscribedCommunities = []; // To store fetched communities for filtering

// DOM Elements
const communitiesGrid = document.getElementById('communitiesGrid');
const searchInput = document.getElementById('searchInput');
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const loginBox = document.getElementById('loginBox');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const closeLoginModal = document.getElementById('closeLoginModal');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorMessageText = document.getElementById('errorMessageText');
const noSubscriptionsMessage = document.getElementById('noSubscriptionsMessage');
const loginPromptBtn = document.getElementById('loginPromptBtn');

// Initialize sidebar
function initializeSidebar() {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('translate-x-0');
        sidebar.classList.toggle('w-64');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.toggle('hidden'));
    });
}

// Initialize login modal handlers
function initializeLoginModal() {
    loginBtn.addEventListener('click', showLoginModal);
    closeLoginModal.addEventListener('click', closeLoginModalHandler);
    loginForm.addEventListener('submit', handleLogin);
    // Also add listener to the prompt button if user is not logged in
    loginPromptBtn.addEventListener('click', showLoginModal);
}

// Show login modal
function showLoginModal() {
    loginModal.classList.remove('hidden');
    loginModal.classList.add('flex');
    setTimeout(() => {
        loginBox.classList.remove('scale-95', 'opacity-0');
        loginBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// Hide login modal
function closeLoginModalHandler() {
    loginBox.classList.remove('scale-100', 'opacity-100');
    loginBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        loginModal.classList.remove('flex');
        loginModal.classList.add('hidden');
    }, 200);
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }

    try {
        const [account] = await client.database.getAccounts([username]);
        if (!account) {
            showLoginError('Account not found');
            return;
        }
        let privatePostingKey;
        try {
            privatePostingKey = dhive.PrivateKey.fromLogin(username, password, 'posting');
            const derivedPublicKey = privatePostingKey.createPublic().toString();
            const isDerivedKeyValid = account.posting.key_auths.some(([key]) => key === derivedPublicKey);
            if (!isDerivedKeyValid) {
                 try {
                     privatePostingKey = dhive.PrivateKey.fromString(password);
                     const directPublicKey = privatePostingKey.createPublic().toString();
                     if (!account.posting.key_auths.some(([key]) => key === directPublicKey)) {
                         throw new Error('Invalid password or posting key');
                     }
                 } catch (innerErr) { throw new Error('Invalid password or posting key'); }
            }
            // Login successful
            currentUser = username;
            localStorage.setItem('hiveUser', username);
            localStorage.setItem('hivePostingKey', privatePostingKey.toString());
            loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${username}/avatar/small" class="w-8 h-8 rounded-full">`;
            loginError.classList.add('hidden');
            closeLoginModalHandler();
            // Reload subscriptions after login
            noSubscriptionsMessage.classList.add('hidden'); // Hide prompt
            loadSubscribedCommunities();
        } catch (error) {
            showLoginError(error.message || 'Invalid password or posting key');
            console.error('Login validation error:', error);
        }
    } catch (error) {
        showLoginError('Error connecting to Hive or fetching account');
        console.error('Login error:', error);
    }
}

// Show login error
function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

// Create community card HTML
function createCommunityCard(community) {
    const card = document.createElement('div');
    card.className = 'community-card bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col';
    // Add data attribute for searching
    card.dataset.communityName = (community.title || '').toLowerCase();
    card.dataset.communityId = (community.name || '').toLowerCase();

    const avatarUrl = community.name ? `https://images.hive.blog/u/${community.name}/avatar/medium` : 'https://images.hive.blog/DQmb2DPDqGaxCrsY7Y1GtgxTz4R8fF2kVqWGhbVfKe1shoA/no-image.png';
    const title = community.title || community.name || 'Unnamed Community';
    const about = community.about || 'No description available.';
    // Sanitize and truncate description
    const sanitizedAbout = DOMPurify.sanitize(about, { USE_PROFILES: { html: false } })
                            .replace(/\n/g, ' ').substring(0, 100) + (about.length > 100 ? '...' : '');

    card.innerHTML = `
        <div class="p-4 flex items-center border-b border-gray-200">
            <img src="${avatarUrl}" 
                 alt="${title} Avatar" 
                 class="w-12 h-12 rounded-full mr-4 flex-shrink-0"
                 onerror="this.src='https://images.hive.blog/DQmb2DPDqGaxCrsY7Y1GtgxTz4R8fF2kVqWGhbVfKe1shoA/no-image.png'">
            <div class="flex-grow overflow-hidden">
                <h3 class="text-lg font-semibold truncate" title="${title}">${title}</h3>
                <p class="text-sm text-gray-500">${community.name}</p>
            </div>
        </div>
        <div class="p-4 text-sm text-gray-600 flex-grow">
            <p class="line-clamp-3">${sanitizedAbout}</p>
        </div>
        <div class="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs text-gray-500 mt-auto">
            <span><i class="fas fa-users mr-1"></i> ${community.subscribers || 0} subs</span>
            <span><i class="fas fa-edit mr-1"></i> ${community.num_authors || 0} authors</span>
        </div>
        <a href="community.html?name=${community.name}" class="absolute inset-0" aria-label="View ${title}"></a>
    `;
    // Added absolute link overlay

    return card;
}

// Fetch subscribed communities (Using fetch for condenser_api.get_subscriptions)
async function loadSubscribedCommunities() {
    console.log(`DEBUG: --- Entering loadSubscribedCommunities --- Current user = ${currentUser}`);
    if (typeof currentUser !== 'string' || !currentUser.trim()) {
        // ... handle not logged in ...
        console.warn("loadSubscribedCommunities PREVENTED: currentUser is not valid.", currentUser);
        loadingIndicator.classList.add('hidden'); errorMessage.classList.add('hidden'); communitiesGrid.innerHTML = '';
        noSubscriptionsMessage.querySelector('h2').textContent = 'Login Required';
        noSubscriptionsMessage.querySelector('p').textContent = 'You need to be logged in.';
        noSubscriptionsMessage.classList.remove('hidden'); loginPromptBtn.classList.remove('hidden');
        return;
    }

    console.log(`Loading subscriptions for user: ${currentUser} using direct fetch...`);
    isLoading = true; loadingIndicator.classList.remove('hidden'); errorMessage.classList.add('hidden');
    communitiesGrid.innerHTML = ''; noSubscriptionsMessage.classList.add('hidden');
    allSubscribedCommunities = [];

    const userForCall = currentUser;
    const requestBody = {
        jsonrpc: "2.0",
        method: "condenser_api.get_subscriptions", // Use condenser_api method name
        params: [userForCall], // Pass username directly in an array
        id: 1
    };
    console.log(">>> Sending direct fetch request:", JSON.stringify(requestBody));

    try {
        // --- Using direct fetch ---
        const response = await fetch("https://api.hive.blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) { // Check for network errors (4xx, 5xx)
            throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Raw fetch response data for get_subscriptions:`, JSON.stringify(data));

        // Check for JSON RPC error within the response body
        if (data.error) {
            throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        const subscriptions = data.result; // Extract result

        // --- End direct fetch ---


        if (!Array.isArray(subscriptions)) {
             console.warn("API response result was not an array. Treating as no subscriptions.", subscriptions);
             subscriptions = [];
        }
        if (subscriptions.length === 0) {
            // ... handle no subscriptions message ...
            console.log("No subscriptions found for this user.");
            loadingIndicator.classList.add('hidden'); noSubscriptionsMessage.querySelector('h2').textContent = 'No Subscriptions Yet';
            noSubscriptionsMessage.querySelector('p').textContent = 'You have not subscribed to any communities yet.';
            loginPromptBtn.classList.add('hidden'); noSubscriptionsMessage.classList.remove('hidden');
            isLoading = false; return;
        }

        console.log(`Found ${subscriptions.length} raw subscription entries.`);

        // Validate and Extract Community Names
        const communityNames = subscriptions
            .map(sub => (Array.isArray(sub) && sub.length > 0 && typeof sub[0] === 'string') ? sub[0].trim() : null)
            .filter(name => name && name.length > 0);

        if (communityNames.length === 0) {
            // ... handle no valid subscriptions message ...
            console.log("No valid community names found after filtering subscriptions.");
             loadingIndicator.classList.add('hidden'); noSubscriptionsMessage.querySelector('h2').textContent = 'No Valid Subscriptions';
             noSubscriptionsMessage.querySelector('p').textContent = 'Could not find valid subscribed communities.';
             loginPromptBtn.classList.add('hidden'); noSubscriptionsMessage.classList.remove('hidden');
             isLoading = false; return;
        }

        // --- Fetch details using dhive client's bridge.get_community (keep this for now) ---
        try {
            console.log(`Fetching details for ${communityNames.length} valid communities...`);
            const communityPromises = communityNames.map(name => {
                 console.log(`Calling bridge.get_community for name: '${name}'`);
                 return client.call('bridge', 'get_community', { name }).catch(err => {
                    console.warn(`Failed fetch details for '${name}':`, err); return null;
                });
            });
            const communityDetails = await Promise.all(communityPromises);
            allSubscribedCommunities = communityDetails.filter(details => details !== null);
            console.log(`Successfully fetched details for ${allSubscribedCommunities.length} communities.`);
            displayCommunities(allSubscribedCommunities);
        } catch (detailsError) {
            console.error(`Error fetching community details:`, detailsError);
            errorMessageText.textContent = `Fetched subscriptions, but failed to load details: ${detailsError.message}`;
            errorMessage.classList.remove('hidden');
        }
        // --- End Fetch details ---

    } catch (error) {
        // Catches errors from fetch or JSON parsing or details fetching block
        console.error(`Error in loadSubscribedCommunities (using fetch):`, error);
        errorMessageText.textContent = `Failed to load subscriptions: ${error.message}`;
        errorMessage.classList.remove('hidden');
    } finally {
        isLoading = false;
        loadingIndicator.classList.add('hidden');
    }
}

// Display communities
function displayCommunities(communities) {
    communitiesGrid.innerHTML = ''; // Clear grid first
    if (communities.length === 0 && currentUser) {
        // This case might be handled by loadSubscribedCommunities, but double-check
         noSubscriptionsMessage.querySelector('h2').textContent = 'No Subscriptions Found';
         noSubscriptionsMessage.querySelector('p').textContent = 'No subscribed communities to display.';
         loginPromptBtn.classList.add('hidden');
         noSubscriptionsMessage.classList.remove('hidden');
        return;
    } else {
         noSubscriptionsMessage.classList.add('hidden'); // Ensure message is hidden if displaying cards
    }

    communities.forEach(community => {
        const card = createCommunityCard(community);
        communitiesGrid.appendChild(card);
    });
}

// Initialize search
function initializeSearch() {
    searchInput.addEventListener('input', () => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim().toLowerCase();
            filterCommunities(query);
        }, 300);
    });
}

function filterCommunities(query) {
    console.log(`Filtering subscriptions by query: ${query}`);
    const filteredCommunities = allSubscribedCommunities.filter(community => {
        const nameMatch = (community.name || '').toLowerCase().includes(query);
        const titleMatch = (community.title || '').toLowerCase().includes(query);
        return nameMatch || titleMatch;
    });
    displayCommunities(filteredCommunities);
}

// Check if user is logged in
function checkLogin() {
    const storedUser = localStorage.getItem('hiveUser');
    const storedKey = localStorage.getItem('hivePostingKey');
    if (storedUser && storedKey) {
        try {
            dhive.PrivateKey.fromString(storedKey);
            currentUser = storedUser;
            loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${storedUser}/avatar/small" class="w-8 h-8 rounded-full">`;
            console.log(`User ${currentUser} logged in from storage.`);
            return true;
        } catch (e) {
            console.error("Invalid key in storage, clearing.");
            localStorage.removeItem('hiveUser');
            localStorage.removeItem('hivePostingKey');
            currentUser = null;
        }
    }
    console.log("No valid user session found in storage.");
    loginBtn.innerHTML = '<i class="fas fa-user text-gray-600"></i>'; // Default icon
    return false;
}

// Initialize everything when DOM is loaded (Simplified logic)
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Subscriptions page DOM loaded.");
    const loggedIn = checkLogin(); // This sets currentUser if successful

    initializeLoginModal();
    initializeSidebar();
    initializeSearch();

    // --- Load subscriptions only if logged in ---
    if (loggedIn) {
        console.log("User is logged in (from checkLogin), proceeding to load subscriptions.");
        await loadSubscribedCommunities();
    } else {
        console.log("User is not logged in (from checkLogin), showing login prompt.");
        // Display the prompt message directly without calling loadSubscribedCommunities again
        loadingIndicator.classList.add('hidden');
        errorMessage.classList.add('hidden');
        communitiesGrid.innerHTML = '';
        noSubscriptionsMessage.querySelector('h2').textContent = 'Login Required';
        noSubscriptionsMessage.querySelector('p').textContent = 'You need to be logged in to see your subscriptions.';
        noSubscriptionsMessage.classList.remove('hidden');
        loginPromptBtn.classList.remove('hidden'); // Ensure login prompt button is visible
    }
}); 