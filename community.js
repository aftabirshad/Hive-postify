// Initialize dhive client
const client = new dhive.Client(['https://api.hive.blog', 'https://api.hivekings.com', 'https://anyx.io', 'https://api.openhive.network']);

// Global variables
let currentUser = null;
let isLoading = false;
let searchTimeout = null;
let loadedCount = 0;
let hasMore = true;
let currentCommunity = null;
let currentFilter = 'trending';

// DOM Elements
const postsGrid = document.getElementById('postsGrid');
const searchInput = document.getElementById('searchInput');
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const loginBox = document.getElementById('loginBox');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const closeLoginModal = document.getElementById('closeLoginModal');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const communityAvatar = document.getElementById('communityAvatar');
const communityName = document.getElementById('communityName');
const subscriberCount = document.getElementById('subscriberCount');
const authorCount = document.getElementById('authorCount');
const communityDescription = document.getElementById('communityDescription');
const hiveLink = document.getElementById('hiveLink');
const joinButton = document.getElementById('joinButton');
const trendingBtn = document.getElementById('trendingBtn');
const newBtn = document.getElementById('newBtn');
const hotBtn = document.getElementById('hotBtn');
const postButton = document.getElementById('postButton');

// Get community name from URL
const urlParams = new URLSearchParams(window.location.search);
const communityNameParam = urlParams.get('name');

if (!communityNameParam) {
    window.location.href = 'communities.html';
}

// Initialize sidebar handlers
function initializeSidebar() {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebar.classList.toggle('translate-x-0');
        sidebar.classList.toggle('w-64');
        document.querySelectorAll('.sidebar-text').forEach(el => el.classList.toggle('hidden'));
    });
}

// Initialize login modal
function initializeLoginModal() {
    loginBtn.addEventListener('click', showLoginModal);
    closeLoginModal.addEventListener('click', closeLoginModalHandler);
    loginForm.addEventListener('submit', handleLogin);
}

function showLoginModal() {
    loginModal.classList.remove('hidden');
    loginModal.classList.add('flex');
    setTimeout(() => {
        loginBox.classList.remove('scale-95', 'opacity-0');
        loginBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

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
        // Get account information
        const [account] = await client.database.getAccounts([username]);
        
        if (!account) {
            showLoginError('Account not found');
            return;
        }

        // Try to derive posting key from password or check if password is the key itself
        let privatePostingKey;
        try {
            // Attempt 1: Derive from username/password
            privatePostingKey = dhive.PrivateKey.fromLogin(username, password, 'posting');
            const derivedPublicKey = privatePostingKey.createPublic().toString();
            
            const isDerivedKeyValid = account.posting.key_auths.some(([key]) => key === derivedPublicKey);

            if (!isDerivedKeyValid) {
                 // Attempt 2: Treat password directly as posting key
                 try {
                     privatePostingKey = dhive.PrivateKey.fromString(password);
                     const directPublicKey = privatePostingKey.createPublic().toString();
                     const isDirectKeyValid = account.posting.key_auths.some(([key]) => key === directPublicKey);
                     if (!isDirectKeyValid) {
                         throw new Error('Invalid password or posting key');
                     }
                 } catch (innerErr) {
                      throw new Error('Invalid password or posting key');
                 }
            }
            
            // Login successful
            currentUser = username;
            localStorage.setItem('hiveUser', username);
            localStorage.setItem('hivePostingKey', privatePostingKey.toString());
            loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${username}/avatar/small" class="w-8 h-8 rounded-full">`;
            closeLoginModalHandler();
            loadCommunityData();

        } catch (error) {
            showLoginError(error.message || 'Invalid password or posting key');
            console.error('Login validation error:', error);
        }

    } catch (error) {
        showLoginError('Error connecting to Hive or fetching account');
        console.error('Login error:', error);
    }
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
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
        } catch (e) {
            localStorage.removeItem('hiveUser');
            localStorage.removeItem('hivePostingKey');
            currentUser = null;
        }
    }
}

// Load community data
async function loadCommunityData() {
    try {
        const response = await client.call('bridge', 'get_community', {
            name: communityNameParam
        });

        if (!response) {
            throw new Error('Community not found');
        }

        currentCommunity = response;
        document.title = `${response.title || response.name} - Hive Postify`;

        // Update community header
        communityAvatar.src = `https://images.hive.blog/u/${response.name}/avatar`;
        communityAvatar.onerror = () => {
            communityAvatar.src = 'https://images.hive.blog/DQmb2DPDqGaxCrsY7Y1GtgxTz4R8fF2kVqWGhbVfKe1shoA/no-image.png';
        };
        communityName.textContent = response.title || response.name;
        subscriberCount.textContent = response.subscribers || 0;
        authorCount.textContent = response.num_authors || 0;
        if (response.about) {
            communityDescription.innerHTML = DOMPurify.sanitize(marked.parse(response.about));
        } else {
            communityDescription.textContent = 'No description available';
        }
        // Check if hiveLink exists before trying to set its href property
        if (hiveLink) {
            hiveLink.href = `https://hive.blog/c/${response.name}`;
        }

        // Update join button state
        if (currentUser) {
            console.log(`Checking initial subscription status for user: ${currentUser} in community: ${response.name}`);
            const isSubscribed = await checkSubscription(currentUser, response.name);
            console.log(`Initial subscription status: ${isSubscribed}`);
            updateJoinButton(isSubscribed);
        } else {
            console.log('No current user, setting join button to default state.');
            updateJoinButton(false);
        }

        // Load initial posts
        loadInitialPosts();
    } catch (error) {
        console.error('Error loading community:', error);
        postsGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i class="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
                <h2 class="text-2xl font-semibold text-gray-700">Error Loading Community</h2>
                <p class="text-gray-500 mt-2">Could not load details for community '${communityNameParam}'. ${error.message}</p>
                <a href="communities.html" class="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                    Back to Communities
                </a>
            </div>
        `;
    }
}

// Check if user is subscribed to community
async function checkSubscription(username, community) {
    if (!username || !community) {
        console.warn('checkSubscription: Invalid args', { username, community });
        return false;
    }
    // Use lowercase for reliable comparison
    const targetCommunityLower = community.toLowerCase();
    try {
        console.log(`Checking subscription: Is ${username} subscribed to ${targetCommunityLower} (case-insensitive)?`);
        const response = await client.call('bridge', 'get_subscriptions', { account: username });
        // Log the raw response for debugging
        console.log(`Raw get_subscriptions response for ${username}:`, JSON.stringify(response));

        // --- Robust Check ---
        // 1. Check if the response is actually an array
        if (!Array.isArray(response)) {
             console.log('Subscription check failed: API response was not an array.');
             return false;
        }

        // 2. Loop through the array
        for (const sub of response) {
            // 3. Check if each item is *itself* an array with at least one element
            if (Array.isArray(sub) && sub.length > 0) {
                // 4. Get the first element (community name), convert to string and lowercase
                const subscribedCommunity = String(sub[0]).toLowerCase();
                // 5. Compare with the target community name (lowercase)
                if (subscribedCommunity === targetCommunityLower) {
                    console.log(`Subscription check SUCCESS: Found match for ${targetCommunityLower}.`);
                    return true; // Match found! User is subscribed.
                }
            } else {
                 // Optional: Log if an item in the response wasn't the expected format
                 // console.log('Subscription check: Skipped item in response, not in expected [name, role] format:', sub);
            }
        }
        // --- End Robust Check ---

        // If the loop finished without finding a match
        console.log(`Subscription check FAIL: No match found for ${targetCommunityLower} in the response array.`);
        return false; // User is not subscribed to this community

    } catch (error) {
        // Log the specific error
        console.error(`Error during checkSubscription API call for ${username} in ${community}:`, error);
        return false; // Assume not subscribed on API error
    }
}
// Update join button state
function updateJoinButton(isSubscribed) {
    console.log(`Updating button state. Is subscribed: ${isSubscribed}`);
    if (isSubscribed) {
        joinButton.innerHTML = '<i class="fas fa-sign-out-alt mr-2"></i>Leave';
        joinButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        joinButton.classList.add('bg-gray-600', 'hover:bg-gray-700');
    } else {
        joinButton.innerHTML = 'Join';
        joinButton.classList.remove('bg-gray-600', 'hover:bg-gray-700');
        joinButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
    }
    joinButton.disabled = !currentUser;
    console.log(`Button updated. Text: ${joinButton.textContent}, Disabled: ${joinButton.disabled}`);
}

// Handle join button click
joinButton.addEventListener('click', async () => {
    if (!currentUser) {
        console.log('Join button clicked, but no user logged in. Showing login modal.');
        showLoginModal();
        return;
    }

    const postingKey = localStorage.getItem('hivePostingKey');
    if (!postingKey || !currentCommunity) {
        alert('Could not perform action. Posting key or community data missing. Please log in again.');
        console.error('Missing posting key or currentCommunity data.');
        localStorage.removeItem('hiveUser');
        localStorage.removeItem('hivePostingKey');
        currentUser = null;
        loginBtn.innerHTML = '<i class="fas fa-user text-gray-600"></i>';
        updateJoinButton(false);
        return;
    }
    // Prevent double clicks
    if (joinButton.disabled) {
        console.log('Button already processing.');
        return;
    }

    console.log(`Join/Leave button clicked by user: ${currentUser} for community: ${currentCommunity.name}`);
    joinButton.disabled = true;
    joinButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';

    let isCurrentlySubscribed;
    let operationType;
    try {
        // --- DEBUG STEP 1: Check subscription status ---
        isCurrentlySubscribed = await checkSubscription(currentUser, currentCommunity.name);
        alert(`DEBUG: Subscription status before action = ${isCurrentlySubscribed}`);

        operationType = isCurrentlySubscribed ? 'unsubscribe' : 'subscribe';
        // --- DEBUG STEP 2: Confirm the action type ---
        alert(`DEBUG: Operation determined = ${operationType}`);

        console.log(`Attempting operation: ${operationType}`);

        const json = JSON.stringify([
            operationType,
            { community: currentCommunity.name }
        ]);
        const op = [
            'custom_json',
            {
                required_auths: [],
                required_posting_auths: [currentUser],
                id: 'community',
                json: json,
            },
        ];

        console.log(`Broadcasting operation: ${JSON.stringify(op)}`);
        const broadcastResult = await client.broadcast.sendOperations([op], dhive.PrivateKey.fromString(postingKey));
        console.log('Broadcast successful:', broadcastResult);

        // Optimistic UI update
        const intendedNewState = !isCurrentlySubscribed;
        updateJoinButton(intendedNewState);
        // Update count...
        if (subscriberCount) {
            const currentCount = parseInt(subscriberCount.textContent) || 0;
            const newCount = intendedNewState ? currentCount + 1 : Math.max(0, currentCount - 1);
            subscriberCount.textContent = newCount;
        }

    } catch (error) {
        console.error(`Error during ${operationType} operation:`, error);
        alert(`Failed to ${operationType}. Error: ${error.message || 'Unknown error'}. Please try again.`);
        // Revert button on error
        updateJoinButton(isCurrentlySubscribed); // Revert to state before attempt
    } finally {
        // Re-enable button directly (removed delay and final check for debugging)
        if(currentUser) {
            console.log('Re-enabling button after attempt.');
            joinButton.disabled = false;
        } else {
            console.log('User logged out? Button remains disabled.');
        }
    }
});

// Initialize filter buttons
function initializeFilterButtons() {
    const buttons = [trendingBtn, newBtn, hotBtn];
    
    function updateButtonStyles(activeButton) {
        buttons.forEach(btn => {
            btn.classList.remove('bg-gray-900', 'text-white');
            btn.classList.add('bg-gray-200', 'hover:bg-gray-300');
        });
        activeButton.classList.remove('bg-gray-200', 'hover:bg-gray-300');
        activeButton.classList.add('bg-gray-900', 'text-white');
    }

    trendingBtn.addEventListener('click', () => {
        currentFilter = 'trending';
        updateButtonStyles(trendingBtn);
        loadInitialPosts();
    });

    newBtn.addEventListener('click', () => {
        currentFilter = 'created';
        updateButtonStyles(newBtn);
        loadInitialPosts();
    });

    hotBtn.addEventListener('click', () => {
        currentFilter = 'hot';
        updateButtonStyles(hotBtn);
        loadInitialPosts();
    });
}

// Create post card HTML
function createPostCard(post) {
    const author = post.author || 'unknown';
    const permlink = post.permlink || '';
    const title = post.title || 'Untitled';
    const body = post.body || '';
    const created = new Date(post.created).toLocaleDateString();
    const votes = post.net_votes || 0;
    const comments = post.children || 0;
    const payout = parseFloat(post.pending_payout_value || '0').toFixed(3);
    const image = post.json_metadata ? getPostImage(post.json_metadata) : null;

    return `
        <article class="post-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                 data-author="${author}" 
                 data-permlink="${permlink}">
            ${image ? `
                <div class="relative pb-[56.25%]">
                    <img src="${image}" 
                         alt="${title}" 
                         class="absolute inset-0 w-full h-full object-cover cursor-pointer"
                         onerror="this.onerror=null; this.src='https://images.hive.blog/DQmNWxPmgKxnpKgKgv5RH9CAW2aRqz9npRzHP8xNJZdpHKn/default-post-image.jpg';"
                         onclick="openPost(this)">
                </div>
            ` : ''}
            <div class="p-4">
                <div class="flex items-center mb-3">
                    <img src="https://images.hive.blog/u/${author}/avatar/small" 
                         alt="${author}" 
                         class="w-8 h-8 rounded-full mr-2 author-avatar"
                         onerror="this.src='https://images.hive.blog/DQmb2DPDqGaxCrsY7Y1GtgxTz4R8fF2kVqWGhbVfKe1shoA/no-image.png'">
                    <div>
                        <p class="font-medium author-name">@${author}</p>
                        <p class="text-sm text-gray-500 post-time">${created}</p>
                    </div>
                </div>
                <h3 class="font-semibold text-lg mb-2 line-clamp-2 post-title">${title}</h3>
                <div class="flex items-center justify-between text-sm text-gray-600">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center post-votes">
                            <i class="fas fa-arrow-up mr-1"></i>
                            ${votes}
                        </span>
                        <span class="flex items-center post-comments">
                            <i class="fas fa-comment mr-1"></i>
                            ${comments} Comments
                        </span>
                    </div>
                    <span>$${payout}</span>
                </div>
            </div>
        </article>
    `;
}

// Full screen post functionality
function openPost(imgElement) {
    const postCard = imgElement.closest('article');
    const author = postCard.dataset.author;
    const permlink = postCard.dataset.permlink;
    
    // Navigate to post page
    window.location.href = `post.html?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`;
}

// Helper function to get post image from metadata
function getPostImage(jsonMetadata) {
    try {
        const metadata = typeof jsonMetadata === 'string' ? JSON.parse(jsonMetadata) : jsonMetadata;
        if (metadata.image && metadata.image.length > 0) {
            return metadata.image[0];
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Load initial posts
async function loadInitialPosts() {
    try {
        isLoading = true;
        loadedCount = 0;
        hasMore = true;
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center py-20">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        `;

        const query = {
            tag: currentCommunity.name,
            limit: 20
        };

        let posts;
        if (currentFilter === 'trending') {
            posts = await client.database.getDiscussions('trending', query);
        } else if (currentFilter === 'created') {
            posts = await client.database.getDiscussions('created', query);
        } else if (currentFilter === 'hot') {
            posts = await client.database.getDiscussions('hot', query);
        }

        if (!posts || posts.length === 0) {
            postsGrid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <i class="fas fa-inbox text-5xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">No posts found in this community</p>
                </div>
            `;
            return;
        }

        const formattedPosts = posts.map(post => ({
            ...post,
            body: DOMPurify.sanitize(post.body || '')
                .replace(/<[^>]*>/g, '')
                .replace(/\n/g, ' ')
                .substring(0, 200) + '...'
        }));

        postsGrid.innerHTML = formattedPosts.map(post => createPostCard(post)).join('');
        
        // Store posts for pagination
        window.posts = posts;
        loadedCount = posts.length;
        hasMore = posts.length === 20;

    } catch (error) {
        console.error('Error loading posts:', error);
        postsGrid.innerHTML = `
            <div class="col-span-full text-center py-20">
                <i class="fas fa-exclamation-circle text-5xl text-red-500 mb-4"></i>
                <p class="text-gray-600">Error loading posts. Please try again later.</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// Load more posts
async function loadMorePosts() {
    if (isLoading || !hasMore) return;

    try {
        isLoading = true;
        
        // Add loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.className = 'col-span-full flex justify-center py-8';
        loadingElement.innerHTML = `
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        `;
        postsGrid.appendChild(loadingElement);

        const lastPost = window.posts[window.posts.length - 1];
        const query = {
            tag: currentCommunity.name,
            limit: 20,
            start_author: lastPost.author,
            start_permlink: lastPost.permlink
        };

        let newPosts;
        if (currentFilter === 'trending') {
            newPosts = await client.database.getDiscussions('trending', query);
        } else if (currentFilter === 'created') {
            newPosts = await client.database.getDiscussions('created', query);
        } else if (currentFilter === 'hot') {
            newPosts = await client.database.getDiscussions('hot', query);
        }

        // Remove loading indicator
        loadingElement.remove();

        // Remove the first post (it's a duplicate)
        newPosts = newPosts.slice(1);

        if (newPosts && newPosts.length > 0) {
            const formattedPosts = newPosts.map(post => ({
                ...post,
                body: DOMPurify.sanitize(post.body || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/\n/g, ' ')
                    .substring(0, 200) + '...'
            }));

            formattedPosts.forEach(post => {
                const postElement = document.createElement('div');
                postElement.innerHTML = createPostCard(post);
                postsGrid.appendChild(postElement.firstElementChild);
            });

            window.posts = window.posts.concat(newPosts);
            loadedCount += newPosts.length;
            hasMore = newPosts.length > 0;
        } else {
            hasMore = false;
        }
    } catch (error) {
        console.error('Error loading more posts:', error);
    } finally {
        isLoading = false;
    }
}

// Initialize infinite scroll
function initializeInfiniteScroll() {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !isLoading && hasMore) {
                loadMorePosts();
            }
        },
        { threshold: 0.1 }
    );

    // Create and observe the loading trigger element
    const loadingTrigger = document.createElement('div');
    loadingTrigger.id = 'loadingTrigger';
    loadingTrigger.className = 'h-10';
    postsGrid.after(loadingTrigger);
    observer.observe(loadingTrigger);
}

// Initialize search
function initializeSearch() {
    searchInput.addEventListener('input', (e) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            // Implement search functionality here
        }, 300);
    });
}

// Function to initialize the Post button for creating a new post in this community
function initializePostButton() {
    if (postButton) {
        postButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Get the community name and redirect to submit.html with it as a parameter
            if (currentCommunity && currentCommunity.name) {
                window.location.href = `submit.html?community=${currentCommunity.name}`;
            } else if (communityNameParam) {
                // Fallback to the URL parameter if currentCommunity is not loaded yet
                window.location.href = `submit.html?community=${communityNameParam}`;
            }
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    initializeLoginModal();
    initializeSidebar();
    initializeFilterButtons();
    initializeSearch();
    initializeInfiniteScroll();
    initializePostButton(); // Initialize the Post button
    loadCommunityData();
});
