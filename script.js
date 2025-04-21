// DOM Elements
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const searchInput = document.getElementById('searchInput');
const postsGrid = document.getElementById('postsGrid');
const loginBtn = document.getElementById('loginBtn');
const createPostBtn = document.getElementById('createPost');
const trendingBtn = document.getElementById('trendingBtn');
const newBtn = document.getElementById('newBtn');
const topBtn = document.getElementById('topBtn');
const loginModal = document.getElementById('loginModal');
const loginBox = document.getElementById('loginBox');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Post Modal Elements
const postModal = document.getElementById('postModal');
const postBox = document.getElementById('postBox');
const closePostModal = document.getElementById('closePostModal');
const postAuthorAvatar = document.getElementById('postAuthorAvatar');
const postAuthor = document.getElementById('postAuthor');
const postDate = document.getElementById('postDate');
const postTitle = document.getElementById('postTitle');
const postContent = document.getElementById('postContent');
const postVotes = document.getElementById('postVotes');
const postComments = document.getElementById('postComments');
const postPayout = document.getElementById('postPayout');

// New Header Elements
const createPostLink = document.getElementById('createPostLink');
const userProfileDropdownContainer = document.getElementById('userProfileDropdownContainer');
const userProfileToggle = document.getElementById('userProfileToggle');
const userProfileImage = document.getElementById('userProfileImage');
const userProfileDropdown = document.getElementById('userProfileDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// API endpoints
const HIVE_API = 'https://api.hive.blog';
const HIVE_CDN = 'https://images.hive.blog';

// Initialize posts array and tracking variables
let currentPosts = [];
let isLoading = false;
let currentPage = 1;
const postsPerPage = 20;
let currentFilter = 'trending';
let lastPost = null;
let isSearching = false;

// Security initialization check
function checkSecurity() {
    if (!window.postSecurity || !window.commentSecurity || 
        !window.replyboxSecurity || !window.communitySecurity) {
        console.error('Security modules not loaded');
        return false;
    }
    return true;
}

// Global state
let currentUser = null;
let securityInitialized = checkSecurity();

// Function to update header UI based on login status
function updateHeaderUI() {
    // Check if elements exist before manipulating them (important for different pages)
    if (currentUser) {
        // Logged in
        if (loginBtn) loginBtn.classList.add('hidden');
        if (createPostLink) {
            createPostLink.classList.remove('hidden');
            createPostLink.classList.add('flex'); // Use flex to align icon and text
        }
        if (userProfileDropdownContainer) userProfileDropdownContainer.classList.remove('hidden');
        if (userProfileImage) {
            userProfileImage.src = `https://images.hive.blog/u/${currentUser}/avatar/small`;
            userProfileImage.alt = `${currentUser}'s Profile`;
        }
        if (userProfileDropdown) userProfileDropdown.classList.add('hidden'); // Ensure dropdown is hidden initially
    } else {
        // Logged out
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (createPostLink) createPostLink.classList.add('hidden');
        if (userProfileDropdownContainer) userProfileDropdownContainer.classList.add('hidden');
    }
}

// Fetch posts from Hive blockchain
async function fetchHivePosts(filter = 'trending', tag = '', limit = 20, start_author = '', start_permlink = '') {
    try {
        let query;

        if (filter === 'created') {
            // Exactly same as hive.blog/created
            query = {
                "id": 1,
                "jsonrpc": "2.0",
                "method": "call",
                "params": [
                    "database_api",
                    "get_discussions_by_created",
                    [{
                        "tag": "",
                        "limit": limit,
                        "truncate_body": 0,
                        "start_author": start_author,
                        "start_permlink": start_permlink
                    }]
                ]
            };
        } else {
            // Keep existing logic for trending and hot
            query = {
                id: 1,
                jsonrpc: '2.0',
                method: filter === 'hot' ? 'condenser_api.get_discussions_by_hot' : 'condenser_api.get_discussions_by_trending',
                params: [{
                    tag: '',
                    limit: limit,
                    start_author: start_author,
                    start_permlink: start_permlink
                }]
            };
        }

        const response = await fetch('https://api.hive.blog', {
            method: 'POST',
            body: JSON.stringify(query),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        const posts = data.result || [];
        if (posts.length > 0) {
            lastPost = posts[posts.length - 1];
        }

        return posts;
    } catch (error) {
        console.error('Error fetching Hive posts:', error);
        throw error;
    }
}

// Format Hive post data
function formatHivePost(post) {
    // Sanitize post content using security module
    if (window.postSecurity) {
        post.body = postSecurity.sanitizePostContent(post.body);
        if (post.title) {
            post.title = DOMPurify.sanitize(post.title);
        }
    }
    try {
        let json_metadata = {};
        try {
            json_metadata = JSON.parse(post.json_metadata);
        } catch (e) {
            json_metadata = {};
        }

        // Get first image from post
        let image = null;

        // Try to get image from json metadata first
        if (json_metadata.image && json_metadata.image[0]) {
            image = json_metadata.image[0];
        } 
        // Try to get image from body if not in metadata
        else {
            const imgRegex = /https?:\/\/[^\s<>"'`]*?\.(?:png|jpg|jpeg|gif)(?:\?[^)\s<>"'`]*)?/i;
            const match = post.body.match(imgRegex);
            if (match) {
                image = match[0];
            }
        }

        // Process image URL to use Hive.blog CDN
        if (image) {
            // Convert to HTTPS
            image = image.replace(/^http:/, 'https:');
            
            // Always use Hive.blog CDN
            if (!image.includes('images.hive.blog')) {
                image = `https://images.hive.blog/0x0/${encodeURIComponent(image)}`;
            }
        } else {
            // Default image if none found
            image = 'https://images.hive.blog/DQmNWxPmgKxnpKgKgv5RH9CAW2aRqz9npRzHP8xNJZdpHKn/default-post-image.jpg';
        }

        return {
            author: post.author,
            title: post.title || 'Untitled',
            thumbnail: image,
            likes: parseInt(post.net_votes) || 0,
            comments: parseInt(post.children) || 0,
            timeAgo: getTimeAgo(new Date(post.created + 'Z')),
            payout: parseFloat(post.pending_payout_value.split(' ')[0]) || 0,
            permlink: post.permlink,
            authorImage: `https://images.hive.blog/u/${post.author}/avatar/small`
        };
    } catch (error) {
        console.error('Error formatting post:', error);
        return null;
    }
}

// Get time ago string
function getTimeAgo(date) {
    try {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        
        return Math.floor(seconds) + " seconds ago";
    } catch (error) {
        console.error('Error calculating time ago:', error);
        return 'some time ago';
    }
}

// Load initial posts
async function loadInitialPosts() {
    try {
        const posts = await fetchHivePosts(currentFilter);
        if (posts && posts.length > 0) {
            currentPosts = posts.map(formatHivePost).filter(post => post !== null);
            renderPosts(currentPosts);
        }
    } catch (error) {
        console.error('Error loading initial posts:', error);
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="flex flex-col items-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <p class="text-gray-600">Error loading posts. Please try again.</p>
                </div>
            </div>
        `;
    }
}

// Retry loading function
async function retryLoading() {
    try {
        await loadInitialPosts();
    } catch (error) {
        console.error('Error retrying load:', error);
    }
}

// Load more posts
async function loadMorePosts() {
    if (!isLoading && lastPost) {
        isLoading = true;
        
        // Add loading indicator at bottom
        const loadingEl = document.createElement('div');
        loadingEl.className = 'col-span-full flex justify-center items-center py-8';
        loadingEl.innerHTML = `
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        `;
        postsGrid.appendChild(loadingEl);

        try {
            const newPosts = await fetchHivePosts(
                currentFilter, 
                '', 
                postsPerPage, 
                lastPost.author, 
                lastPost.permlink
            );

            // Remove loading indicator
            loadingEl.remove();

            if (newPosts && newPosts.length > 0) {
                const formattedPosts = newPosts.map(formatHivePost).filter(post => post !== null);
                
                // Add new posts to grid
                const postsHtml = formattedPosts.map(post => createPostCard(post)).join('');

                // Add new posts to existing grid
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = postsHtml;
                while (tempDiv.firstChild) {
                    postsGrid.appendChild(tempDiv.firstChild);
                }

                // Update current posts and last post
                currentPosts = [...currentPosts, ...formattedPosts];
                lastPost = newPosts[newPosts.length - 1];
            }
        } catch (error) {
            console.error('Error loading more posts:', error);
            loadingEl.innerHTML = `
                <div class="text-red-500">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Error loading more posts
                </div>
            `;
        } finally {
            isLoading = false;
        }
    }
}

// Infinite scroll handler
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    // Load more posts when user is near bottom
    if (scrollTop + clientHeight >= scrollHeight - 1000 && !isLoading) {
        loadMorePosts();
    }
});

// Handle filter button clicks
async function handleFilterClick(filter) {
    if (currentFilter === filter) return;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-gray-900', 'text-white');
        btn.classList.add('bg-gray-200', 'hover:bg-gray-300');
    });
    
    const buttonId = filter === 'created' ? 'newBtn' : `${filter}Btn`;
    document.getElementById(buttonId).classList.remove('bg-gray-200', 'hover:bg-gray-300');
    document.getElementById(buttonId).classList.add('bg-gray-900', 'text-white');

    try {
        // Show loading state
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                <p class="text-gray-600">Loading...</p>
            </div>
        `;

        // Reset everything
        currentFilter = filter;
        currentPage = 1;
        currentPosts = [];
        lastPost = null;
        isLoading = false;

        // Load new posts
        const posts = await fetchHivePosts(filter);
        if (posts && posts.length > 0) {
            currentPosts = posts.map(formatHivePost).filter(post => post !== null);
            renderPosts(currentPosts);
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error changing filter:', error);
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="flex flex-col items-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <p class="text-gray-600">Error loading posts. Please try again.</p>
                </div>
            </div>
        `;
    }
}

// Add click event listeners to filter buttons
document.getElementById('trendingBtn').addEventListener('click', () => handleFilterClick('trending'));
document.getElementById('hotBtn').addEventListener('click', () => handleFilterClick('hot'));
document.getElementById('newBtn').addEventListener('click', () => handleFilterClick('created'));

// Render posts function
function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="flex flex-col items-center">
                    <i class="fas fa-inbox text-gray-400 text-5xl mb-4"></i>
                    <p class="text-gray-600">No posts found</p>
                </div>
            </div>
        `;
        return;
    }

    postsGrid.innerHTML = posts.map(post => createPostCard(post)).join('');

    // Add click handlers to post cards
    document.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('click', () => {
            const author = card.dataset.author;
            const permlink = card.dataset.permlink;
            
            // Navigate to post.html instead of using the modal
            window.location.href = `post.html?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`;
        });
    });
}

// Configure marked for GitHub-style Markdown
marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {}
        }
        return code;
    },
    pedantic: false,
    gfm: true,
    breaks: true,
    sanitize: false,
    smartypants: false,
    xhtml: false
});

// Show post modal with animation
function showPostModal() {
    postModal.classList.remove('hidden');
    postModal.classList.add('flex');
    setTimeout(() => {
        postBox.classList.remove('scale-95', 'opacity-0');
        postBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// Hide post modal with animation
function hidePostModal() {
    postBox.classList.remove('scale-100', 'opacity-100');
    postBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        postModal.classList.remove('flex');
        postModal.classList.add('hidden');
    }, 300);
}

// Format post content
function formatPostContent(post) {
    // Sanitize content before formatting
    if (window.postSecurity) {
        post.body = postSecurity.sanitizePostContent(post.body);
    }
    let content = post.body;

    // Convert image URLs to use HTTPS and Hive CDN
    content = content.replace(
        /(https?:\/\/[^\s<>"'`]*?\.(?:png|jpg|jpeg|gif))(?:\?[^)\s<>"'`]*)?/gi,
        (match) => {
            const httpsUrl = match.replace(/^http:/, 'https:');
            
            // Always use Hive.blog CDN
            if (!httpsUrl.includes('images.hive.blog')) {
                return `https://images.hive.blog/0x0/${encodeURIComponent(httpsUrl)}`;
            }
            return httpsUrl;
        }
    );

    // Render markdown and sanitize HTML
    const htmlContent = DOMPurify.sanitize(marked.parse(content));
    return htmlContent;
}

// Load and display post
async function loadPost(author, permlink) {
    // Validate inputs
    if (!author || !permlink || typeof author !== 'string' || typeof permlink !== 'string') {
        console.error('Invalid post parameters');
        return;
    }
    try {
        const client = new dhive.Client([
            'https://api.hive.blog',
            'https://api.hivekind.com',
            'https://api.openhive.network'
        ]);

        const [post] = await client.database.getDiscussions('single', [{
            author: author,
            permlink: permlink
        }]);

        if (!post) {
            console.error('Post not found');
            return;
        }

        // Set post metadata
        postAuthorAvatar.src = `https://images.hive.blog/u/${post.author}/avatar/small`;
        postAuthorAvatar.alt = post.author;
        postAuthor.textContent = post.author;
        postDate.textContent = new Date(post.created + 'Z').toLocaleDateString();
        postTitle.textContent = post.title;
        
        // Format and display content
        postContent.innerHTML = formatPostContent(post);
        
        // Set post stats
        postVotes.textContent = post.net_votes;
        postComments.textContent = post.children;
        postPayout.textContent = parseFloat(post.pending_payout_value.split(' ')[0]).toFixed(2);

        // Show modal
        showPostModal();

        // Apply syntax highlighting to code blocks
        postContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

    } catch (error) {
        console.error('Error loading post:', error);
    }
}

// Close post modal handlers
closePostModal?.addEventListener('click', hidePostModal);

postModal?.addEventListener('click', (e) => {
    if (e.target === postModal) {
        hidePostModal();
    }
});

postBox?.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Login functionality
function showLoginModal() {
    loginModal.classList.remove('hidden');
    loginModal.classList.add('flex');
    // Trigger animation after a small delay
    setTimeout(() => {
        loginBox.classList.remove('scale-95', 'opacity-0');
        loginBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideLoginModal() {
    loginBox.classList.remove('scale-100', 'opacity-100');
    loginBox.classList.add('scale-95', 'opacity-0');
    // Wait for animation to finish before hiding
    setTimeout(() => {
        loginModal.classList.remove('flex');
        loginModal.classList.add('hidden');
        loginError.classList.add('hidden');
        loginForm.reset();
    }, 300);
}

loginBtn?.addEventListener('click', () => {
    if (!currentUser) {
        showLoginModal();
    } else {
        // Logout
        currentUser = null;
        loginBtn.innerHTML = '<i class="fas fa-user text-gray-600"></i>';
        createPostBtn.classList.add('hidden');
        localStorage.removeItem('hiveUser');
    }
});

closeLoginModal?.addEventListener('click', hideLoginModal);

loginModal?.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        hideLoginModal();
    }
});

loginBox?.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Handle login form submission
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    const username = loginForm.username.value.trim().toLowerCase();
    const password = loginForm.password.value;

    if (!username || !password) {
        showLoginError('Please enter both username and password.');
        return;
    }

    // --- Placeholder for actual Hive login verification ---
    // Replace this with your actual login logic using Hive Keychain or other methods.
    // For demonstration, we'll simulate a successful login.
    // If login is successful:
    try {
        // Example: const loginSuccess = await performHiveLogin(username, password);
        // if (loginSuccess) {
            console.log(`Simulating login for: ${username}`); // Replace with actual login
            currentUser = username; // Set the current user
            localStorage.setItem('hiveUser', username); // Store username
            updateHeaderUI(); // Update the header
            hideLoginModal(); // Close the modal
            loginForm.reset(); // Reset the form
            // Optionally, reload posts or perform other actions after login
        // } else {
        //    showLoginError('Invalid username or password.');
        // }
    } catch (error) {
         console.error('Login error:', error);
         showLoginError('An error occurred during login. Please try again.');
    }
    // --- End Placeholder ---
});

// Handle signup link click
document.getElementById('signupLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    // You can add the signup URL here when provided
    alert('Signup functionality coming soon!');
});

function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

// Check for stored user session
const storedUser = localStorage.getItem('hiveUser');
if (storedUser) {
    currentUser = storedUser;
    loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${storedUser}/avatar/small" class="w-8 h-8 rounded-full">`;
    createPostBtn.classList.remove('hidden');
}

// Mock login functionality
// loginBtn?.addEventListener('click', () => {
//     const isLoggedIn = loginBtn.classList.contains('logged-in');
//     if (!isLoggedIn) {
//         loginBtn.classList.add('logged-in');
//         loginBtn.innerHTML = '<i class="fas fa-user text-blue-600"></i>';
//         createPostBtn.classList.remove('hidden');
//     }
// });

// Toggle sidebar
menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    // Toggle text visibility
    const textLabels = document.querySelectorAll('.sidebar-text');
    textLabels.forEach(label => {
        label.classList.toggle('hidden');
    });
    // Adjust sidebar width
    sidebar.classList.toggle('w-16');
    sidebar.classList.toggle('w-64');
});

// Initialize the page
loadInitialPosts();

// Add scroll event listener for infinite scroll
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 1000 && !isLoading) {
        loadMorePosts();
    }
});

// Handle search
let searchTimeout;

searchInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    // Show loading indicator in search bar
    const searchIcon = searchInput.nextElementSibling.querySelector('i');
    searchIcon.className = 'fas fa-spinner animate-spin';
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    // Reset if search is empty
    if (!searchTerm) {
        searchIcon.className = 'fas fa-search text-gray-600';
        currentFilter = 'trending';
        loadInitialPosts();
        return;
    }
    
    // Set new timeout for search
    searchTimeout = setTimeout(() => {
        performSearch(searchTerm);
    }, 500);
});

// Perform search with loading state
async function performSearch(searchTerm) {
    isSearching = true;
    
    // Show loading state
    postsGrid.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-20">
            <div class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
                <p class="text-gray-600">Searching Hive posts...</p>
            </div>
        </div>
    `;
    
    try {
        // Use tag-based search for better results
        const posts = await fetchHivePosts('trending', searchTerm);
        const searchResults = posts
            .map(formatHivePost)
            .filter(post => post !== null);
        
        // Update search icon back to normal
        const searchIcon = searchInput.nextElementSibling.querySelector('i');
        searchIcon.className = 'fas fa-search text-gray-600';
        
        // Show results or no results message
        if (searchResults.length === 0) {
            postsGrid.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-20">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                        <p class="text-gray-600 text-lg mb-2">No results found for "${searchTerm}"</p>
                        <p class="text-gray-500">Try different keywords or check your spelling</p>
                    </div>
                </div>
            `;
        } else {
            currentPosts = searchResults;
            lastPost = posts[posts.length - 1];
            renderPosts(searchResults);
        }
    } catch (error) {
        console.error('Error searching posts:', error);
        postsGrid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="flex flex-col items-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <p class="text-gray-600 text-lg mb-2">Error searching posts</p>
                    <p class="text-gray-500">Please try again later</p>
                </div>
            </div>
        `;
    } finally {
        isSearching = false;
    }
}

// Full screen post functionality
function openPost(imgElement) {
    const postCard = imgElement.closest('article');
    const author = postCard.dataset.author;
    const permlink = postCard.dataset.permlink;
    
    // Navigate to post page
    window.location.href = `post.html?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`;
}

// Update the createPostCard function to add onclick handler for images
function createPostCard(post) {
    return `
        <article class="post-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                 data-author="${post.author}" 
                 data-permlink="${post.permlink}">
            <div class="relative pb-[56.25%]">
                <img src="${post.thumbnail}" 
                     alt="${post.title}" 
                     class="absolute inset-0 w-full h-full object-cover cursor-pointer"
                     onerror="this.onerror=null; this.src='https://images.hive.blog/DQmNWxPmgKxnpKgKgv5RH9CAW2aRqz9npRzHP8xNJZdpHKn/default-post-image.jpg';"
                     onclick="openPost(this)">
            </div>
            <div class="p-4">
                <div class="flex items-center mb-3">
                    <img src="${post.authorImage}" 
                         alt="${post.author}" 
                         class="w-8 h-8 rounded-full mr-2 author-avatar">
                    <div>
                        <p class="font-medium author-name">@${post.author}</p>
                        <p class="text-sm text-gray-500 post-time">${post.timeAgo}</p>
                    </div>
                </div>
                <h3 class="font-semibold text-lg mb-2 line-clamp-2 post-title">${post.title}</h3>
                <div class="flex items-center justify-between text-sm text-gray-600">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center post-votes">
                            <i class="fas fa-arrow-up mr-1"></i>
                            ${post.likes}
                        </span>
                        <span class="flex items-center post-comments">
                            <i class="fas fa-comment mr-1"></i>
                            ${post.comments} Comments
                        </span>
                    </div>
                    <span>$${post.payout}</span>
                </div>
            </div>
        </article>
    `;
}

// Upvote/Downvote functionality
document.querySelectorAll('.upvote-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const scoreElement = this.nextElementSibling;
        let score = parseInt(scoreElement.textContent);
        if (this.classList.contains('active')) {
            scoreElement.textContent = score - 1;
            this.classList.remove('active');
            this.querySelector('i').classList.remove('text-green-600');
        } else {
            scoreElement.textContent = score + 1;
            this.classList.add('active');
            this.querySelector('i').classList.add('text-green-600');
            
            // Remove downvote if exists
            const downvoteBtn = this.parentElement.querySelector('.downvote-btn');
            if (downvoteBtn.classList.contains('active')) {
                downvoteBtn.classList.remove('active');
                downvoteBtn.querySelector('i').classList.remove('text-red-600');
                scoreElement.textContent = parseInt(scoreElement.textContent) + 1;
            }
        }
    });
});

document.querySelectorAll('.downvote-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const scoreElement = this.previousElementSibling;
        let score = parseInt(scoreElement.textContent);
        if (this.classList.contains('active')) {
            scoreElement.textContent = score + 1;
            this.classList.remove('active');
            this.querySelector('i').classList.remove('text-red-600');
        } else {
            scoreElement.textContent = score - 1;
            this.classList.add('active');
            this.querySelector('i').classList.add('text-red-600');
            
            // Remove upvote if exists
            const upvoteBtn = this.parentElement.querySelector('.upvote-btn');
            if (upvoteBtn.classList.contains('active')) {
                upvoteBtn.classList.remove('active');
                upvoteBtn.querySelector('i').classList.remove('text-green-600');
                scoreElement.textContent = parseInt(scoreElement.textContent) - 1;
            }
        }
    });
});

// Make functions available globally
window.fetchHivePosts = fetchHivePosts;
window.formatHivePost = formatHivePost;
window.getTimeAgo = getTimeAgo;
window.formatPostContent = formatPostContent;
window.openPost = function(element) {
    let author, permlink;
    
    // Check if element is an image or has dataset properties
    if (element.tagName === 'IMG') {
        const postCard = element.closest('article');
        author = postCard.dataset.author;
        permlink = postCard.dataset.permlink;
    } else {
        author = element.dataset.author;
        permlink = element.dataset.permlink;
    }
    
    if (author && permlink) {
        // Navigate directly to post.html
        window.location.href = `post.html?author=${encodeURIComponent(author)}&permlink=${encodeURIComponent(permlink)}`;
    }
};

// Event Listener for Profile Dropdown Toggle
if (userProfileToggle) {
    userProfileToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling up to the window
        if (userProfileDropdown) {
            userProfileDropdown.style.display = userProfileDropdown.style.display === 'none' ? 'block' : 'none';
            userProfileDropdown.classList.toggle('hidden'); // Toggle Tailwind class as well if needed
        }
    });
}

// Event Listener for Logout Button
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log(`Logging out ${currentUser}`);
        currentUser = null;
        localStorage.removeItem('hiveUser'); // Clear stored username
        updateHeaderUI();
        if (userProfileDropdown) {
             userProfileDropdown.style.display = 'none'; // Hide dropdown after logout
             userProfileDropdown.classList.add('hidden');
        }
        // Optionally redirect to homepage or refresh
        // window.location.reload(); 
    });
}

// Hide dropdown if clicked outside
window.addEventListener('click', (e) => {
    if (userProfileDropdown && !userProfileDropdown.classList.contains('hidden')) {
        if (!userProfileDropdownContainer.contains(e.target)) {
             userProfileDropdown.style.display = 'none';
             userProfileDropdown.classList.add('hidden');
        }
    }
});

// Initialize UI on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('hiveUser');
    if (storedUser) {
        currentUser = storedUser;
        console.log(`User found in storage: ${currentUser}`);
    } else {
        console.log("No user found in storage.");
    }
    
    updateHeaderUI(); // Update header based on stored or null user

    // Only load posts if postsGrid exists (i.e., we are on the main page)
    if (postsGrid) {
        loadInitialPosts();
    }

    // Initialize other page-specific things if needed
});
