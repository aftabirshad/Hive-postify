// Initialize dhive client
const client = new dhive.Client(['https://api.hive.blog', 'https://api.hivekings.com', 'https://anyx.io', 'https://api.openhive.network']);

// Global variables
let currentUser = null;
let isLoading = false;
let searchTimeout = null;
let loadedCount = 0;
let hasMore = true;
let currentSort = 'rank';

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
const sortRankBtn = document.getElementById('sortRank');
const sortSubscribersBtn = document.getElementById('sortSubscribers');
const sortNewBtn = document.getElementById('sortNew');

// Initialize login modal handlers
function initializeLoginModal() {
    loginBtn.addEventListener('click', () => {
        if (!currentUser) {
            showLoginModal();
        } else {
            // Logout
            currentUser = null;
            loginBtn.innerHTML = '<i class="fas fa-user text-gray-600"></i>';
            localStorage.removeItem('hiveUser');
            localStorage.removeItem('hivePostingKey');
        }
    });

    closeLoginModal.addEventListener('click', hideLoginModal);

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            hideLoginModal();
        }
    });

    loginBox.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    loginForm.addEventListener('submit', handleLogin);
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
function hideLoginModal() {
    loginBox.classList.remove('scale-100', 'opacity-100');
    loginBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        loginModal.classList.remove('flex');
        loginModal.classList.add('hidden');
        loginError.classList.add('hidden');
        loginForm.reset();
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
        // Initialize dhive client with multiple nodes for reliability
        const client = new dhive.Client([
            'https://api.hive.blog',
            'https://api.hivekind.com',
            'https://api.openhive.network'
        ]);

        try {
            // Get account information
            const [account] = await client.database.getAccounts([username]);
            
            if (!account) {
                showLoginError('Account not found');
                return;
            }

            // Try to generate private key from master password
            let privateKey;
            try {
                privateKey = dhive.PrivateKey.fromLogin(username, password, 'posting');
                const publicKey = privateKey.createPublic();

                // Check if the derived public key matches any of the account's posting keys
                const postingKeyMatch = account.posting.key_auths.some(([key]) => key === publicKey.toString());

                if (!postingKeyMatch) {
                    // If master password didn't work, try using the password directly as a private key
                    try {
                        privateKey = dhive.PrivateKey.from(password);
                        const publicKey = privateKey.createPublic();
                        
                        if (!account.posting.key_auths.some(([key]) => key === publicKey.toString())) {
                            showLoginError('Invalid password or posting key');
                            return;
                        }
                    } catch {
                        showLoginError('Invalid password or posting key');
                        return;
                    }
                }

                // Login successful
                currentUser = username;
                loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${username}/avatar/small" class="w-8 h-8 rounded-full">`;
                localStorage.setItem('hiveUser', username);
                localStorage.setItem('hivePostingKey', privateKey.toString());
                hideLoginModal();
                fetchCommunities();

            } catch (error) {
                showLoginError('Invalid password or posting key');
                console.error('Login error:', error);
            }

        } catch (error) {
            showLoginError('Error connecting to Hive blockchain');
            console.error('API error:', error);
        }
    } catch (error) {
        showLoginError('Connection error');
        console.error('Connection error:', error);
    }
}

// Show login error
function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
}

// Check login status
async function checkLogin() {
    const username = localStorage.getItem('hiveUser');
    if (username) {
        currentUser = username;
        loginBtn.innerHTML = `<img src="https://images.hive.blog/u/${username}/avatar/small" class="w-8 h-8 rounded-full">`;
    }
}

// Initialize sidebar handlers
function initializeSidebar() {
    menuToggle.addEventListener('click', () => {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0', 'w-64');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('translate-x-0', 'w-64');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
        }
    });
}

// Initialize sort buttons
function initializeSortButtons() {
    const buttons = [sortRankBtn, sortSubscribersBtn, sortNewBtn];
    
    function updateButtonStyles(activeButton) {
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-700');
        });
        activeButton.classList.remove('bg-gray-100', 'text-gray-700');
        activeButton.classList.add('bg-blue-600', 'text-white');
    }

    sortRankBtn.addEventListener('click', () => {
        currentSort = 'rank';
        updateButtonStyles(sortRankBtn);
        fetchCommunities(searchInput.value);
    });

    sortSubscribersBtn.addEventListener('click', () => {
        currentSort = 'subs';
        updateButtonStyles(sortSubscribersBtn);
        fetchCommunities(searchInput.value);
    });

    sortNewBtn.addEventListener('click', () => {
        currentSort = 'new';
        updateButtonStyles(sortNewBtn);
        fetchCommunities(searchInput.value);
    });
}

// Create community card HTML
function createCommunityCard(community) {
    const author = community.author || 'unknown';
    return `
        <div class="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
            <div class="relative h-32 bg-gradient-to-r from-blue-500 to-purple-600 p-4">
                <div class="absolute -bottom-10 left-4 w-20 h-20 rounded-xl overflow-hidden ring-4 ring-white shadow-lg">
                    <img src="https://images.hive.blog/u/${community.name}/avatar" 
                         alt="${community.name}"
                         class="w-full h-full object-cover"
                         onerror="this.src='https://images.hive.blog/DQmb2DPDqGaxCrsY7Y1GtgxTz4R8fF2kVqWGhbVfKe1shoA/no-image.png'">
                </div>
            </div>
            
            <div class="p-4 pt-12">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            ${community.name}
                        </h3>
                        <div class="flex items-center text-sm text-gray-500 mt-1">
                            <span class="flex items-center">
                                <i class="fas fa-users mr-1"></i>
                                ${community.subscribers || 0}
                            </span>
                            <span class="mx-2">•</span>
                            <span class="flex items-center">
                                <i class="fas fa-file-alt mr-1"></i>
                                ${community.num_authors || 0} authors
                            </span>
                        </div>
                    </div>
                    <a href="https://hive.blog/c/${community.name}" 
                       target="_blank"
                       class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
                
                <p class="text-gray-600 text-sm line-clamp-2 mb-4">
                    ${community.about || ''}
                </p>
                
                <div class="flex items-center justify-between text-sm border-t border-gray-100 pt-4 mt-4">
                    <div class="flex items-center text-gray-500">
                        <i class="fas fa-tag mr-2"></i>
                        <span>Created by @${community.admins?.[0] || 'unknown'}</span>
                    </div>
                    <a href="community.html?name=${community.name}" class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                        Join
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Fetch communities from Hive
async function fetchCommunities(searchQuery = '', loadMore = false) {
    if (isLoading) return;
    isLoading = true;

    try {
        if (!loadMore) {
            loadedCount = 0;
            hasMore = true;
            communitiesGrid.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            `;
        }

        const response = await client.call('bridge', 'list_communities', {
            sort: currentSort,
            limit: 100
        });

        let communities = response;

        // Filter for search if needed
        if (searchQuery) {
            communities = communities.filter(community => 
                community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (community.title && community.title.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Slice communities for infinite scroll
        const start = loadMore ? loadedCount : 0;
        const end = start + 20;
        const displayCommunities = communities.slice(start, end);

        if (displayCommunities.length > 0) {
            loadedCount += displayCommunities.length;
            hasMore = loadedCount < communities.length;
        } else {
            hasMore = false;
        }

        if (!displayCommunities || displayCommunities.length === 0) {
            if (!loadMore) {
                communitiesGrid.innerHTML = `
                    <div class="col-span-full flex justify-center items-center py-20">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users text-gray-400 text-5xl mb-4"></i>
                            <p class="text-gray-600">No communities found</p>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Create HTML for communities
        const communitiesHtml = displayCommunities.map(community => createCommunityCard(community)).join('');
        
        // Update grid
        if (loadMore) {
            communitiesGrid.insertAdjacentHTML('beforeend', communitiesHtml);
        } else {
            communitiesGrid.innerHTML = communitiesHtml;
        }
    } catch (error) {
        console.error('Error fetching communities:', error);
        if (!loadMore) {
            communitiesGrid.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle mb-2 text-2xl"></i>
                    <p>Error loading communities. Please try again later.</p>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}

// Initialize search handler
function initializeSearch() {
    searchInput.addEventListener('input', (e) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(() => {
            fetchCommunities(e.target.value);
        }, 300);
    });
}

// Initialize infinite scroll
window.addEventListener('scroll', () => {
    if (!hasMore || isLoading) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageEnd = document.documentElement.offsetHeight - 1000;
    
    if (scrollPosition >= pageEnd) {
        fetchCommunities('', true);
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    initializeLoginModal();
    initializeSidebar();
    initializeSortButtons();
    initializeSearch();
    fetchCommunities();
});