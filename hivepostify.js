document.addEventListener('DOMContentLoaded', () => {
    console.log("HivePostify script loaded and DOM ready.");

    const profileHeader = document.getElementById('userProfileHeader');
    const profileLoadingSpinner = document.getElementById('profileLoadingSpinner');
    const profileContent = document.getElementById('profileContent');
    const userContentTabs = document.getElementById('userContentTabs');
    const userPostsGrid = document.getElementById('userPostsGrid'); // Added for later use
    const loadingIndicator = document.getElementById('loadingIndicator'); // Added for later use

    console.log("Initializing dHive client..."); 
    const dhiveClient = new dhive.Client([
        // Prioritize api.hive.blog and api.peakd.com as requested
        'https://api.hive.blog',
        'https://api.peakd.com',
        'https://api.deathwing.me', 
        'https://anyx.io' 
    ], { 
        chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000'
    });
    console.log("dHive client initialized.");

    // --- DOM Elements for Profile ---
    const userAvatar = document.getElementById('userAvatar');
    const userBadgeElement = document.getElementById('userBadge'); // Get the badge element
    const userName = document.getElementById('userName');
    const userTagElement = document.getElementById('userTag'); // Get the new tag element
    const userBio = document.getElementById('userBio');
    const userLocation = document.getElementById('userLocation').querySelector('span') || document.getElementById('userLocation'); // Handle icon case
    const userJoined = document.getElementById('userJoined');
    const userActive = document.getElementById('userActive');
    const hivebuzzBadge = document.getElementById('hivebuzzBadge');
    const userFollowers = document.getElementById('userFollowers');
    const userFollowing = document.getElementById('userFollowing');
    const userPostCount = document.getElementById('userPostCount');
    const userHP = document.getElementById('userHP');

    let currentProfileUser = null;
    let isFetchingProfile = false; // Prevent multiple profile fetches
    let listenersAttached = false; // Flag to track if listeners are set up

    // --- Helper Functions ---
    function formatMonthYear(dateString) {
        const date = new Date(dateString + 'Z');
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Custom Reputation Conversion Function (from user)
    function convertReputation(rep) {
      if (rep == null || typeof rep === 'undefined') return 25; // Default for null/undefined
      let repStr = String(rep);
      let neg = repStr.startsWith("-");
      if (neg) repStr = repStr.substring(1);
      
      // Handle case where raw reputation is 0
      if (repStr === '0') return 25;
      
      let log = Math.log10(parseInt(repStr));
      let score = (log - 9) * 9 + 25;
      score = neg ? -score : score;
      // Return rounded to 0 decimal places as typically seen
      return score.toFixed(0); 
    }

    // Calculates Hive Power from VESTS
    async function vestsToHP(totalVests) { // Accepts total vests as a number
        try {
            const props = await dhiveClient.database.getDynamicGlobalProperties();
            const totalVestingFund = parseFloat(props.total_vesting_fund_hive.split(' ')[0]);
            const totalVestingShares = parseFloat(props.total_vesting_shares.split(' ')[0]);
            // Vests are already in VESTS (not MVESTS), so no need to divide by 1e6 here
            const hp = totalVestingFund * (totalVests / totalVestingShares);
            return hp.toFixed(0); // Return HP rounded to nearest integer
        } catch (error) {
            console.error("Error calculating HP:", error);
            return 'N/A';
        }
    }

    // --- Tab Switching Logic (Function) ---
    function setupTabListeners() {
        if (listenersAttached) return; // Only attach once
        listenersAttached = true;

        const tabButtons = document.querySelectorAll('.user-tab');
        console.log(`Setting up tab listeners. Found ${tabButtons.length} elements with class 'user-tab':`, tabButtons);
        tabButtons.forEach(button => {
            const tabType = button.dataset.tab;
            console.log(`Processing button for data-tab: ${tabType}`, button);
            
            if (tabType === 'notifications') {
                console.log('!!! Found the notifications button element !!!', button);
            }

            // *** Remove addEventListener and use direct onclick assignment ***
            // button.addEventListener('click', () => { ... }); 
            button.onclick = () => {
                console.log(`--- Tab clicked (onclick): ${tabType} ---`); 
                console.log(`Current user: ${currentProfileUser}, isLoading: ${isLoadingPosts}, currentType: ${currentPostType}`);

                if (isLoadingPosts || !currentProfileUser) {
                    console.log("Tab switch aborted (onclick): Still loading or no user.");
                    return; 
                }
                if (tabType === currentPostType) {
                    console.log("Tab switch aborted (onclick): Clicked active tab.");
                    return; 
                }

                console.log(`Switching to tab (onclick): ${tabType}`);
                // Update button styles (need to find all buttons again inside onclick)
                 document.querySelectorAll('.user-tab').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                });
                button.classList.add('border-blue-500', 'text-blue-600');
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

                // Load content for the new tab
                currentPostType = tabType;
                userPostsGrid.innerHTML = ''; 
                lastLoadedPost = null; // Reset post/reply pagination
                console.log(`Calling loadUserPosts (onclick) for user: ${currentProfileUser}, type: ${currentPostType}`);
                loadUserPosts(currentProfileUser, currentPostType);
            };
            console.log(`Attached onclick handler to button with data-tab: ${tabType}`);
        });
    }

    // --- Profile Loading ---
    async function loadUserProfile(username) {
        if (isFetchingProfile) return;
        isFetchingProfile = true;
        listenersAttached = false; // Reset listener flag for new profile load

        // --- Fetch Custom Configs Inside Profile Load ---
        let customUserTags = {}; 
        let customUserBadges = {};
        try {
            console.log("Fetching latest custom tags/badges configuration...");
            const [tagsResponse, badgesResponse] = await Promise.all([
                fetch('custom_tags.json'),
                fetch('custom_badges.json')
            ]);

            if (tagsResponse.ok) {
                customUserTags = await tagsResponse.json();
                console.log("Loaded fresh custom tags:", customUserTags);
            } else {
                console.warn(`Failed to fetch custom_tags.json: ${tagsResponse.status}`);
            }
            if (badgesResponse.ok) {
                customUserBadges = await badgesResponse.json();
                console.log("Loaded fresh custom badges:", customUserBadges);
            } else {
                console.warn(`Failed to fetch custom_badges.json: ${badgesResponse.status}`);
            }
        } catch (error) {
            console.error("Error fetching or parsing custom config files:", error);
             // Set to empty objects on error to avoid breaking profile load
             customUserTags = {}; 
             customUserBadges = {};
        }
        // --- End Fetch Custom Configs ---

        console.log(`Attempting to load profile for: ${username}`);
        profileHeader.classList.remove('hidden');
        profileLoadingSpinner.classList.remove('hidden');
        profileContent.classList.add('hidden');
        userContentTabs.classList.add('hidden');
        userPostsGrid.innerHTML = '';

        try {
            const accounts = await dhiveClient.database.getAccounts([username]);
            console.log("API Response for getAccounts:", accounts); // Log the raw response

            if (!accounts || accounts.length === 0 || !accounts[0]) { // Added !accounts[0] check
                console.error(`User not found or invalid account data received for ${username}:`, accounts);
                profileHeader.innerHTML = '<p class="text-red-500 text-center">User not found or invalid data.</p>';
                profileLoadingSpinner.classList.add('hidden');
                return;
            }

            const account = accounts[0];
            console.log("Assigned account object (Full Data):", JSON.stringify(account, null, 2)); // Log the full account object
            currentProfileUser = account.name; // Store the current user

            // Parse metadata
            let metadata = {};
            try {
                if (account.posting_json_metadata) {
                     metadata = JSON.parse(account.posting_json_metadata);
                } else if (account.json_metadata) { // Fallback for older profiles
                     metadata = JSON.parse(account.json_metadata);
                }
            } catch (e) {
                console.warn("Could not parse profile metadata for", username, e);
                metadata = {}; // Use empty object if parsing fails
            }
            const profile = metadata.profile || {};

            // Populate Profile Header
            userAvatar.src = profile.profile_image || `https://images.hive.blog/u/${account.name}/avatar`;
            userAvatar.onerror = () => { userAvatar.src = 'https://via.placeholder.com/96?text=Error'; }; // Basic fallback

            // --- Custom Badge Logic ---
            const userBadgeUrl = customUserBadges[account.name];
            userBadgeElement.classList.add('hidden');
            userBadgeElement.src = ''; // Clear previous
            if (userBadgeUrl) {
                console.log(`Found custom badge for ${account.name}: ${userBadgeUrl}`);
                userBadgeElement.src = userBadgeUrl;
                userBadgeElement.classList.remove('hidden'); // Show badge
            } else {
                 console.log(`No custom badge found for ${account.name}`);
            }
            // --- End Custom Badge Logic ---

            // Set username 
            userName.textContent = profile.name || account.name; 

            // --- Custom Tag Logic ---
            const userTagsData = customUserTags[account.name]; // Check if user has tags
            userTagElement.classList.add('hidden'); // Hide by default
            userTagElement.textContent = ''; // Clear previous

            if (userTagsData) {
                let tagsToShow = [];
                if (Array.isArray(userTagsData)) {
                    // It's an array of tags
                    tagsToShow = userTagsData;
                } else if (typeof userTagsData === 'string') {
                    // It's a single string tag (backward compatibility)
                    tagsToShow = [userTagsData]; 
                }

                if (tagsToShow.length > 0) {
                     // Join multiple tags with a separator or render multiple elements
                     // For now, let's join them in the single span
                     const tagsDisplay = tagsToShow.join(' / '); // Join with slashes
                     console.log(`Found custom tags for ${account.name}: ${tagsDisplay}`);
                     userTagElement.textContent = tagsDisplay;
                     userTagElement.classList.remove('hidden'); // Show the tag span
                }
            }
            // --- End Custom Tag Logic ---

            userBio.textContent = profile.about || 'No bio available.';
            
            if (profile.location) {
                 userLocation.parentElement.classList.remove('hidden'); // Show the location span
                 userLocation.textContent = profile.location;
            } else {
                userLocation.parentElement.classList.add('hidden'); // Hide if no location
            }

            userJoined.textContent = formatMonthYear(account.created);
            userActive.textContent = timeAgo(account.last_post > account.last_root_post ? account.last_post : account.last_root_post); // Show whichever is more recent activity

            // Hivebuzz Badge (Assuming simple format)
            hivebuzzBadge.src = `https://hivebuzz.me/@${account.name}/level.png`;
            hivebuzzBadge.onerror = () => { hivebuzzBadge.classList.add('hidden'); }; // Hide if error loading badge

            // Stats (Follower/Following requires another API call)
             try {
                const followCounts = await dhiveClient.database.call('get_follow_count', [account.name]);
                userFollowers.textContent = followCounts.follower_count || 0;
                userFollowing.textContent = followCounts.following_count || 0;
            } catch (followError) {
                console.error("Error fetching follow counts:", followError);
                userFollowers.textContent = 'N/A';
                userFollowing.textContent = 'N/A';
            }
            
            userPostCount.textContent = account.post_count;

            // Calculate Total HP (Own + Received)
            const ownVests = parseFloat(account.vesting_shares.split(' ')[0]);
            const receivedVests = parseFloat(account.received_vesting_shares.split(' ')[0]);
            const totalEffectiveVests = ownVests + receivedVests;
            console.log(`Calculating HP from total vests: ${totalEffectiveVests} (Own: ${ownVests}, Received: ${receivedVests})`);
            userHP.textContent = await vestsToHP(totalEffectiveVests);

            // Hide spinner, show content
            profileLoadingSpinner.classList.add('hidden');
            profileContent.classList.remove('hidden');
            userContentTabs.classList.remove('hidden'); // Show tabs now profile is loaded
            
            // Handle settings button visibility - only show for logged-in user's profile
            const loggedInUser = localStorage.getItem('hiveUser');
            const directSettingsContainer = document.getElementById('direct-settings-container');
            
            if (loggedInUser && username && loggedInUser.toLowerCase() === username.toLowerCase() && directSettingsContainer) {
                // Show settings button only if viewing your own profile
                console.log('[Profile Settings] Showing Edit Profile button for own profile');
                directSettingsContainer.classList.remove('hidden');
                
                // Add click handler for direct settings button
                const directSettingsBtn = document.getElementById('direct-settings-btn');
                if (directSettingsBtn) {
                    console.log('[Profile Settings] Found direct settings button, adding click handler');
                    directSettingsBtn.addEventListener('click', function() {
                        // Initialize settings if needed and show the form
                        showProfileSettingsForm(username, dhiveClient);
                    });
                }
            } else if (directSettingsContainer) {
                // Hide the button for other profiles
                console.log('[Profile Settings] Hiding Edit Profile button for other profile');
                directSettingsContainer.classList.add('hidden');
            }

            // *** Setup Tab Listeners AFTER tabs are visible ***
            setupTabListeners();

            // Load initial posts (Blog tab by default)
            currentPostType = 'blog'; // Ensure default is set
            // Reset active tab style (make sure only 'blog' is active initially)
            document.querySelectorAll('.user-tab').forEach(btn => {
                 if(btn.dataset.tab === 'blog') {
                      btn.classList.add('border-blue-500', 'text-blue-600');
                      btn.classList.remove('border-transparent', 'text-gray-500');
                 } else {
                      btn.classList.remove('border-blue-500', 'text-blue-600');
                      btn.classList.add('border-transparent', 'text-gray-500');
                 }
            });
            loadUserPosts(account.name, currentPostType);
            
            // Profile settings integration - check if we should show settings
            const currentUser = localStorage.getItem('hiveUser');
            console.log('[Profile Settings] Current logged-in user:', currentUser);
            console.log('[Profile Settings] Profile being viewed:', username);
            
            if (typeof window.initProfileSettings === 'function') {
                // Always initialize profile settings module if function exists
                console.log('[Profile Settings] Initializing profile settings module');
                await window.initProfileSettings(currentUser || username, dhiveClient);
                
                // If the current profile is the logged-in user's profile, add settings button
                if (currentUser && username && username.toLowerCase() === currentUser.toLowerCase()) {
                    console.log('[Profile Settings] Username match detected! Creating settings button');
                    
                    // Create a container for the settings button
                    const settingsContainer = document.createElement('div');
                    settingsContainer.id = 'profile-settings-container';
                    settingsContainer.className = 'w-full flex justify-end mb-4 mt-2';
                    
                    // Add the container to the page below profile info
                    profileContent.appendChild(settingsContainer);
                    
                    // Add settings button to the container
                    if (typeof window.addSettingsButtonIfOwnProfile === 'function') {
                        window.addSettingsButtonIfOwnProfile(username, '#profile-settings-container');
                        console.log('[Profile Settings] Added settings button to profile');
                    } else {
                        console.error('[Profile Settings] addSettingsButtonIfOwnProfile function not found');
                    }
                } else {
                    console.log('[Profile Settings] No username match, not showing settings button');
                    console.log('[Profile Settings] Comparison:', { 
                        currentUser: currentUser, 
                        username: username,
                        match: currentUser && username && username.toLowerCase() === currentUser.toLowerCase()
                    });
                }
            } else {
                console.error('[Profile Settings] initProfileSettings function not found');
            }

        } catch (error) {
            console.error("Error loading user profile:", error);
            profileHeader.innerHTML = '<p class="text-red-500 text-center">Error loading profile. Check console for details.</p>';
            profileLoadingSpinner.classList.add('hidden');
        } finally {
            isFetchingProfile = false;
        }
    }

    // --- Post Loading & Rendering ---
    let isLoadingPosts = false;
    let lastLoadedPost = null; // For pagination/infinite scroll (author/permlink)
    let currentPostType = 'blog'; // Default to blog
    
    // Function to create a post card element (matching index.html style)
    function createUserPostElement(post, type = 'blog') { 
        if (!post || !post.author || !post.permlink && type !== 'notifications') { // Allow missing author/permlink for notifications
             if(type !== 'notifications' || !post || !post.id) { // Notifications need at least an ID
                 console.warn("Attempted to create element with invalid data:", post, type);
                 return null; 
             }
        }

        const isReply = (type === 'replies');
        const element = document.createElement('div');
        
        // --- Type-Specific Rendering --- 
        if (isReply) {
            // RENDER AS LIST ITEM FOR REPLIES (Keep list style)
            element.className = 'reply-item bg-white border-b border-gray-200 p-4 flex items-start space-x-3'; 
            element.dataset.permlink = post.permlink; 
            element.dataset.author = post.author;

            const authorAvatarUrl = `https://images.hive.blog/u/${post.author}/avatar/small`;
            const postDate = timeAgo(post.created);
            
            let bodySnippet = post.body || '';
            bodySnippet = window.commentSecurity ? window.commentSecurity.sanitizeComment(bodySnippet) : DOMPurify.sanitize(bodySnippet);
            let plainBody = bodySnippet.replace(/!\[.*?\]\(.*?\)/g, '') 
                                      .replace(/<img.*?>/g, '')   
                                      .replace(/<[^>]+>/g, '')    
                                      .replace(/\n/g, ' ')       
                                      .trim();
            plainBody = plainBody.substring(0, 200) + (plainBody.length > 200 ? '...' : ''); 

            const linkUrl = `post.html?author=${post.parent_author}&permlink=${post.parent_permlink}`; 
            const rootTitle = DOMPurify.sanitize(post.root_title || 'a post', { USE_PROFILES: { html: false } });

            const replyVotes = post.active_votes?.length || 0; 
            const replyPayout = (parseFloat(post.pending_payout_value?.split(' ')[0] || 0) + 
                                 parseFloat(post.total_payout_value?.split(' ')[0] || 0) + 
                                 parseFloat(post.curator_payout_value?.split(' ')[0] || 0));

            element.innerHTML = `
                <img src="${authorAvatarUrl}" alt="${post.author}" class="w-8 h-8 rounded-full flex-shrink-0 mt-1">
                <div class="flex-grow">
                    <div class="text-sm mb-1">
                        <span class="font-semibold text-gray-800">${post.author}</span>
                        <span class="text-gray-500 ml-2">commented on</span>
                        <a href="post.html?author=${post.parent_author}&permlink=${post.parent_permlink}" class="text-blue-600 hover:underline ml-1">Re: ${rootTitle}</a>
                        <span class="text-gray-400 text-xs ml-3">${postDate}</span>
                    </div>
                    <p class="text-gray-700 text-sm mb-2">${plainBody}</p>
                    <a href="${linkUrl}" class="text-xs text-blue-500 hover:text-blue-700">View Context</a>
                    <span class="text-xs text-gray-400 ml-4" title="${replyVotes} votes"><i class="fas fa-arrow-up mr-1"></i> ${replyVotes}</span>
                    <span class="text-xs text-gray-400 ml-4" title="Payout: $${replyPayout.toFixed(2)}"><i class="fas fa-dollar-sign mr-1"></i> ${replyPayout.toFixed(2)}</span>
                </div>
            `;

        } else {
            // RENDER AS POST/BLOG CARD (Keep original card logic)
            element.className = 'post-card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-shadow duration-300 hover:shadow-lg';
            element.dataset.permlink = post.permlink;
            element.dataset.author = post.author;

            let metadata = {};
            try {
                metadata = JSON.parse(post.json_metadata || '{}');
            } catch (e) { console.warn('Could not parse post json_metadata:', e); metadata = {}; }

            let title = DOMPurify.sanitize(post.title || '', { USE_PROFILES: { html: false } });
            let bodySnippet = post.body || '';
            bodySnippet = window.postSecurity ? postSecurity.sanitizePostContent(bodySnippet) : DOMPurify.sanitize(bodySnippet);
            let plainBody = bodySnippet.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img.*?>/g, '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
            plainBody = plainBody.substring(0, 150) + (plainBody.length > 150 ? '...' : '');

            const imageUrl = metadata.image && metadata.image[0] ? 
                         `https://images.hive.blog/400x300/${metadata.image[0]}` : 
                         'https://via.placeholder.com/400x300/cccccc/969696?text=No+Image'; 
            const linkUrl = `post.html?author=${post.author}&permlink=${post.permlink}`; 
            const authorAvatarUrl = `https://images.hive.blog/u/${post.author}/avatar/small`;
            const postPayout = parseFloat(post.pending_payout_value?.split(' ')[0] || 0) + 
                               parseFloat(post.total_payout_value?.split(' ')[0] || 0) + 
                               parseFloat(post.curator_payout_value?.split(' ')[0] || 0);
            const postVotes = post.active_votes?.length || 0;
            const postDate = timeAgo(post.created);

            element.innerHTML = `
                <a href="${linkUrl}" class="block">
                    <div class="relative">
                        <img src="${imageUrl}" alt="${title}" class="w-full h-48 object-cover" onerror="this.style.display='none'; this.parentElement.innerHTML += '<div class=\'w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500\'>Image Error</div>'">
                        <div class="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            ${postDate}
                        </div>
                    </div>
                    <div class="p-4">
                        <h3 class="text-lg font-semibold mb-2 h-14 overflow-hidden line-clamp-2" title="${title}">${title}</h3>
                        <p class="text-gray-600 text-sm mb-3 h-10 line-clamp-2">${plainBody}</p>
                        <div class="flex items-center justify-between text-sm text-gray-600 mt-2">
                            <div class="flex items-center">
                                <img src="${authorAvatarUrl}" alt="${post.author}" class="w-6 h-6 rounded-full mr-2">
                                <span>${post.author}</span> 
                            </div>
                            <div class="flex items-center space-x-3">
                                <span title="${postVotes} votes"><i class="fas fa-arrow-up mr-1"></i>${postVotes}</span>
                                <span title="${post.children || 0} replies"><i class="fas fa-comment mr-1"></i>${post.children || 0}</span> 
                                <span title="Payout: $${postPayout.toFixed(2)}"><i class="fas fa-dollar-sign mr-1"></i>${postPayout.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }

        return element;
    }

    // Function to load user posts based on type (blog, posts, replies)
    async function loadUserPosts(username, type = 'blog', startAuthor = null, startPermlink = null) {
        console.log(`>>> loadUserPosts ENTRY: User=${username}, Type=${type}, StartAuthor=${startAuthor}, StartPermlink=${startPermlink}`);

        // *** Handle notification tab separately ***
        if (type === 'notifications') {
            console.log(">>> loadUserPosts: Detected 'notifications' tab. Calling loadInitialNotifications().");
            // Check if window.loadInitialNotifications exists before calling
            if (typeof window.loadInitialNotifications === 'function') {
                window.loadInitialNotifications(username, dhiveClient, userPostsGrid, loadingIndicator); 
            } else {
                console.error("Error: loadInitialNotifications function not found on window.");
                // Optionally display an error to the user
                userPostsGrid.innerHTML = '<p class="text-center text-red-500 col-span-full">Error loading notifications module.</p>';
            }
            console.log("<<< loadUserPosts EXIT: Handled 'notifications' tab.");
            return; // Exit the function early for notifications
        }
        
        if (isLoadingPosts) { console.log("<<< loadUserPosts EXIT: Already loading."); return; }
        isLoadingPosts = true;
        console.log("[Indicator] Attempting to show loading indicator...");
        loadingIndicator.classList.remove('hidden');
        console.log(`[Indicator] loadingIndicator classes: ${loadingIndicator.className}`);
        
        const isInitialLoad = (!startAuthor && !startPermlink); 

        try {
            let items = []; 
            const baseLimit = 20;
            let limit = baseLimit; // Default limit

            // --- API Call --- 
            let apiMethod = '';
            let apiParams = [];
            if (type === 'blog' || type === 'posts') {
                limit = baseLimit; // Use base limit for posts/blog
                const queryParams = { tag: username, limit: limit, start_author: startAuthor, start_permlink: startPermlink };
                apiMethod = 'condenser_api.get_discussions_by_blog';
                apiParams = [queryParams];
            } else if (type === 'replies') {
                limit = baseLimit; 
                // Load replies TO the user's content using a more reliable API
                apiMethod = 'condenser_api.get_replies_by_last_update';
                
                // This API gets replies to a specific user
                const queryParams = {
                    start_author: username,
                    start_permlink: startPermlink || '',
                    limit: limit
                };
                
                // For pagination, we need parent_author and parent_permlink from the last post
                if (startAuthor && startPermlink) {
                    queryParams.start_author = startAuthor;
                    queryParams.start_permlink = startPermlink;
                }
                
                apiParams = [queryParams.start_author, queryParams.start_permlink, queryParams.limit];
                console.log(`[API Call - Replies] Using get_replies_by_last_update with:`, apiParams);
            } else {
                 // Should not happen anymore due to the early return for 'notifications'
                throw new Error(`Invalid content type requested: ${type}`);
            }
            // *** Log Current API Node ***
            console.log(`[API Call - ${type}] Using API Node: ${dhiveClient.currentAddress}`);
            console.log(`[API Call - ${type}] Querying '${apiMethod}' for ${username} with:`, apiParams);
            if (apiMethod.startsWith('condenser_api') || apiMethod.startsWith('database_api')) {
                items = await dhiveClient.call(apiMethod.split('.')[0], apiMethod.split('.')[1], apiParams);
            } else {
                items = await dhiveClient.call(apiMethod.split('.')[0], apiMethod.split('.')[1], apiParams[0]);
            }
            // --- End API Call --- 

            console.log(`Raw data received from API for ${type}:`, items);
            // *** Log if raw data is empty for replies ***
            if (type === 'replies' && items.length === 0) {
                console.log("[API Call - Replies] Received 0 items from API.");
            }
            items = items || []; 

            // --- Handle Empty Response --- 
            if (items.length === 0) {
                console.log("[Pagination] Empty response received from API. Definitively end of content.");
                lastLoadedPost = null; // Only need to handle post pagination here
                if (isInitialLoad && userPostsGrid.children.length === 0) { 
                    userPostsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No content found.</p>';
                } else {
                    console.log("[Pagination] End of content reached, not modifying grid.");
                }
                isLoadingPosts = false;
                loadingIndicator.classList.add('hidden');
                return; 
            }

            // --- Process & Filter Fetched Items --- 
            let itemsToRender = []; // Start with empty list to add only NEW items

            // --- Store the current offset in each reply item for pagination ---
            // No longer needed since we're using author/permlink for pagination
            
            // --- Processing for Posts/Replies --- 
            itemsToRender = items; // Start with all items
            if (!isInitialLoad && itemsToRender.length > 0) {
                // --- Duplicate Check ---
                const firstItem = itemsToRender[0];
                console.log(`[Pagination Check ${type}] StartPermlink=${startPermlink}, FirstItemPermlink=${firstItem?.permlink}, FirstItemAuthor=${firstItem?.author}`);

                // Duplicate check based on type
                if (type === 'replies' && firstItem.author === startAuthor && firstItem.permlink === startPermlink) {
                     console.log(`[Pagination Check ${type}] Removing duplicate first reply`);
                     itemsToRender = itemsToRender.slice(1);
                } else if (type !== 'replies' && firstItem.author === startAuthor && firstItem.permlink === startPermlink) {
                     console.log(`[Pagination Check ${type}] Removing duplicate first item (post/blog):`, firstItem);
                     itemsToRender = itemsToRender.slice(1);
                } else {
                    console.log(`[Pagination Check ${type}] First item is not a duplicate.`);
                }
            }

            // Use last item from itemsToRender for all types
            lastLoadedPost = itemsToRender.length > 0 ? itemsToRender[itemsToRender.length - 1] : null;
            console.log(`[Pagination Update ${type}] Set lastLoadedPost (from itemsToRender) to: ${lastLoadedPost ? lastLoadedPost.author + '/' + lastLoadedPost.permlink : 'null'}`);

            if (type === 'blog' || type === 'posts') {
                 const originalCount = itemsToRender.length;
                 itemsToRender = itemsToRender.filter(post => {
                     if (post.author !== username) return false;
                     const isCommunityPost = post.category && post.category.startsWith('hive-');
                     if (type === 'blog') return !isCommunityPost;
                     if (type === 'posts') return isCommunityPost;
                     return false;
                 });
                  console.log(`[Filtering] Filtered ${originalCount} posts to ${itemsToRender.length} for type ${type}.`);
            }
            
            // --- IMPROVE: Filter replies to keep only actual replies to other users ---
            if (type === 'replies') {
                console.log(`[Processing - Replies] Processing ${itemsToRender.length} replies`);
                
                // Filter to keep only replies TO the user (not the user's own replies)
                const filteredReplies = itemsToRender.filter(reply => {
                    // Keep only replies where user is the parent_author (someone replied to them)
                    return reply.parent_author === username;
                });
                
                console.log(`[Processing - Replies] Kept ${filteredReplies.length} replies to the user's content`);
                itemsToRender = filteredReplies;
            }
            // --- End Processing for Posts/Replies --- 
            
            // --- Render Items --- 
            console.log(`Items to render after processing (count: ${itemsToRender.length}):`, itemsToRender);
            if (itemsToRender.length > 0) {
                const fragment = document.createDocumentFragment();
                itemsToRender.forEach(item => {
                    const element = createUserPostElement(item, type);
                    if (element) {
                        fragment.appendChild(element);
                    }
                });
                userPostsGrid.appendChild(fragment);
            } else if (isInitialLoad) { // Simplified condition - only check initial load
                 console.log("[Pagination] Displaying 'No content found' (initial load, 0 items after processing)."); 
                 userPostsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No content found.</p>';
                 lastLoadedPost = null;
            } // If not initial load and 0 items to render, do nothing to the grid
 
        } catch (error) {
            console.error(`Error loading ${type} for ${username}:`, error);
            if (isInitialLoad && userPostsGrid.children.length === 0) { 
                userPostsGrid.innerHTML = `<p class="text-center text-red-500 col-span-full">Error loading content. Check console.</p>`;
            }
        } finally {
            isLoadingPosts = false;
            console.log("[Indicator] Attempting to hide loading indicator...");
            loadingIndicator.classList.add('hidden');
            console.log(`[Indicator] loadingIndicator classes after hide: ${loadingIndicator.className}`);
            console.log(`<<< loadUserPosts EXIT: User=${username}, Type=${type}, FinalLastPost=${!!lastLoadedPost}`);
        }
    }

    // --- Routing ---
    function handleHashChange() {
        const hash = window.location.hash;
        console.log(`Hash changed or page loaded. Current hash: ${hash}`);

        if (hash && hash.startsWith('#@')) {
            const username = hash.substring(2); // Remove '#@'
            console.log(`Extracted username: ${username}`);

            if (username && username.trim() !== '') {
                if (currentProfileUser !== username.trim()) { // Only reload if username changes
                    userPostsGrid.innerHTML = ''; // Clear grid immediately for new user
                    lastLoadedPost = null; // Reset pagination
                    loadUserProfile(username.trim());
                }
                // Optionally hide general filter buttons if viewing a profile
                document.querySelector('.flex.justify-center.space-x-4.py-4').classList.add('hidden');
                 // Clear search input if navigating to a profile
                const searchInput = document.getElementById('searchInput');
                if (searchInput) searchInput.value = '';

            } else {
                // Handle invalid username (e.g., show error or redirect)
                console.warn("Invalid username extracted from hash.");
                profileHeader.innerHTML = '<p class="text-yellow-500 text-center">Invalid user profile URL format.</p>';
                profileHeader.classList.remove('hidden');
                userContentTabs.classList.add('hidden');
            }
        } else {
            // No username in hash, potentially show a default state or message
            console.log("No username found in hash. Displaying default message.");
            profileHeader.classList.add('hidden'); // Hide profile section
            userContentTabs.classList.add('hidden'); // Hide tabs
            userPostsGrid.innerHTML = '<p class="text-center text-gray-500">Navigate to hivepostify.html#@username to view a profile.</p>';
            // Show general filter buttons if not viewing a profile
             document.querySelector('.flex.justify-center.space-x-4.py-4').classList.remove('hidden');

        }
    }

    // Initial load and listen for hash changes
    // Wrap in an async IIFE to allow await for tag loading
    (async () => {
        // Now set up routing
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
    })();

    // --- Infinite Scroll Logic ---
    let isThrottled = false;
    const throttleDelay = 500; // Milliseconds to wait between scroll checks

    window.addEventListener('scroll', () => {
        if (isThrottled) return; // Skip if throttled
        isThrottled = true;

        const checkScroll = () => {
             const buffer = 300; 
             const scrollY = window.scrollY;
             const windowHeight = window.innerHeight;
             const bodyHeight = document.body.offsetHeight;
             const scrollPosition = windowHeight + scrollY;
             const distanceToBottom = bodyHeight - scrollPosition;
             const canScrollMore = scrollPosition >= bodyHeight - buffer;
             
             // --- Detailed Scroll Log START ---
             console.log(`[Scroll Check] scrollY: ${scrollY.toFixed(0)}, windowH: ${windowHeight}, bodyH: ${bodyHeight}, pos: ${scrollPosition.toFixed(0)}, distBot: ${distanceToBottom.toFixed(0)}, canScroll: ${canScrollMore}`);
             // --- Detailed Scroll Log END ---
             
             if (canScrollMore && currentProfileUser) {
                 // Log existing state
                 const isNotifsLoading = typeof window.isLoadingNotifications === 'function' ? window.isLoadingNotifications() : 'N/A';
                 console.log(`[Scroll Check - Trigger Condition Met] State: Type=${currentPostType}, isPostsLoading=${isLoadingPosts}, isNotifsLoading=${isNotifsLoading}, User=${currentProfileUser}, lastPost=${!!lastLoadedPost}`); // Updated log
                 
                 // Check if loading posts OR notifications
                 const currentlyLoading = isLoadingPosts || (typeof window.isLoadingNotifications === 'function' && window.isLoadingNotifications());
                 console.log(`[Scroll Check - Trigger Condition Met] currentlyLoading=${currentlyLoading}`); // Log loading state check

                 if (!currentlyLoading) {
                     if (currentPostType === 'notifications') {
                         // Call loadMoreNotifications
                         console.log(`[Scroll Trigger] Attempting to call window.loadMoreNotifications().`); 
                         if (typeof window.loadMoreNotifications === 'function') {
                             window.loadMoreNotifications(); // No args needed as it uses internal state
                         } else {
                              console.error("[Scroll Trigger] Error: loadMoreNotifications function not found on window.");
                         }
                     } else if (lastLoadedPost) { 
                         // Handle all post types including replies
                         console.log(`[Scroll Trigger] Attempting to load more ${currentPostType} after: ${lastLoadedPost.author}/${lastLoadedPost.permlink}`);
                         
                         // All content types use standard pagination now
                         loadUserPosts(currentProfileUser, currentPostType, lastLoadedPost.author, lastLoadedPost.permlink);
                     } else {
                         console.log("[Scroll Check] Conditions not met to load more (maybe end of list or wrong type).");
                     }
                 } else {
                     console.log("[Scroll Check] Not loading more (already loading posts or notifications).");
                 }
             }
        }

        window.requestAnimationFrame(checkScroll); 

        setTimeout(() => {
            isThrottled = false; // Reset throttle after delay
        }, throttleDelay);
    });

    // --- Profile Settings Form ---
    function showProfileSettingsForm(username, dhiveClient) {
        console.log('[Profile Settings] Showing settings form for', username);

        // Prevent multiple instances
        if (document.getElementById('profile-settings-overlay')) {
            console.log('[Profile Settings] Form already open, focusing it');
            return;
        }

        // Create settings overlay
        const overlay = document.createElement('div');
        overlay.id = 'profile-settings-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
        overlay.style.display = 'flex'; // Ensure it's displayed
        document.body.appendChild(overlay);

        // Create form container
        const formContainer = document.createElement('div');
        formContainer.className = 'bg-white rounded-lg p-6 max-w-lg w-full max-h-90vh overflow-y-auto';
        formContainer.style.maxHeight = '90vh'; // Fallback if max-h-90vh doesn't work
        overlay.appendChild(formContainer);

        // Form title
        const title = document.createElement('h2');
        title.className = 'text-2xl font-bold mb-4 text-gray-800';
        title.textContent = 'Edit Profile';
        formContainer.appendChild(title);

        // Create the main form
        const form = document.createElement('form');
        form.id = 'profile-settings-form';
        form.className = 'space-y-4';
        formContainer.appendChild(form);

        // Function to create form sections
        function createFormSection(label, inputType, id, placeholder, value = '', helpText = '') {
            const section = document.createElement('div');
            section.className = 'mb-4';
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = id;
            labelElement.className = 'block text-sm font-medium text-gray-700 mb-1';
            labelElement.textContent = label;
            section.appendChild(labelElement);
            
            if (inputType === 'textarea') {
                const input = document.createElement('textarea');
                input.id = id;
                input.name = id;
                input.className = 'mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2';
                input.placeholder = placeholder;
                input.value = value;
                input.rows = 4;
                section.appendChild(input);
            } else {
                const input = document.createElement('input');
                input.type = inputType;
                input.id = id;
                input.name = id;
                input.className = 'mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 p-2';
                input.placeholder = placeholder;
                input.value = value;
                section.appendChild(input);
            }
            
            if (helpText) {
                const help = document.createElement('p');
                help.className = 'mt-1 text-sm text-gray-500';
                help.textContent = helpText;
                section.appendChild(help);
            }
            
            return section;
        }

        // Function to create buttons
        function createButton(text, type, className, clickHandler) {
            const button = document.createElement('button');
            button.type = type;
            button.className = className;
            button.textContent = text;
            if (clickHandler) {
                button.addEventListener('click', clickHandler);
            }
            return button;
        }

        // Create a loading spinner element
        function createSpinner() {
            const spinner = document.createElement('div');
            spinner.className = 'w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin';
            return spinner;
        }

        // Load user data
        async function loadUserData() {
            try {
                // Add loading state
                form.innerHTML = '';
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'text-center py-4 flex flex-col items-center';
                const spinner = createSpinner();
                const loadingText = document.createElement('p');
                loadingText.className = 'mt-2';
                loadingText.textContent = 'Loading profile data...';
                
                loadingDiv.appendChild(spinner);
                loadingDiv.appendChild(loadingText);
                form.appendChild(loadingDiv);
                
                // Fetch user data from API
                const accounts = await dhiveClient.database.getAccounts([username]);
                
                if (!accounts || accounts.length === 0) {
                    form.innerHTML = '<p class="text-red-500 p-4">Error: Could not load user data</p>';
                    return;
                }
                
                const account = accounts[0];
                let metadata = {};
                
                try {
                    if (account.posting_json_metadata) {
                        metadata = JSON.parse(account.posting_json_metadata);
                    } else if (account.json_metadata) {
                        metadata = JSON.parse(account.json_metadata);
                    }
                } catch (e) {
                    console.warn("Could not parse profile metadata", e);
                    metadata = {};
                }
                
                const profile = metadata.profile || {};
                
                // Clear form
                form.innerHTML = '';
                
                // Add form sections
                form.appendChild(createFormSection('Profile Image URL', 'url', 'profile_image', 'https://example.com/image.jpg', profile.profile_image || '', 'Direct link to profile image (JPG, PNG)'));
                form.appendChild(createFormSection('Cover Image URL', 'url', 'cover_image', 'https://example.com/cover.jpg', profile.cover_image || '', 'Direct link to cover image (JPG, PNG)'));
                form.appendChild(createFormSection('Display Name', 'text', 'name', 'Your Name', profile.name || ''));
                form.appendChild(createFormSection('About', 'textarea', 'about', 'Tell us about yourself...', profile.about || ''));
                form.appendChild(createFormSection('Location', 'text', 'location', 'City, Country', profile.location || ''));
                form.appendChild(createFormSection('Website', 'url', 'website', 'https://yourwebsite.com', profile.website || ''));
                
                // Buttons container
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'flex justify-end space-x-2 mt-6';
                
                // Cancel button
                const cancelButton = createButton('Cancel', 'button', 'px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400', () => {
                    overlay.remove();
                });
                buttonsContainer.appendChild(cancelButton);
                
                // Save button
                const saveButton = createButton('Save Changes', 'submit', 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700', (e) => {
                    e.preventDefault();
                    saveProfileChanges(account, metadata);
                });
                buttonsContainer.appendChild(saveButton);
                
                form.appendChild(buttonsContainer);
                
            } catch (error) {
                console.error('[Profile Settings] Error loading user data:', error);
                form.innerHTML = '<p class="text-red-500 p-4">Error loading profile data. Please try again later.</p>';
            }
        }
        
        // Save profile changes
        async function saveProfileChanges(account, metadata) {
            try {
                // Show saving spinner
                const buttonsContainer = form.querySelector('div:last-child');
                buttonsContainer.innerHTML = '';
                
                const savingDiv = document.createElement('div');
                savingDiv.className = 'flex items-center justify-center w-full';
                
                const spinner = createSpinner();
                const savingText = document.createElement('span');
                savingText.className = 'ml-2';
                savingText.textContent = 'Saving changes...';
                
                savingDiv.appendChild(spinner);
                savingDiv.appendChild(savingText);
                buttonsContainer.appendChild(savingDiv);
                
                // Get form data
                const profileData = {
                    profile_image: document.getElementById('profile_image').value.trim(),
                    cover_image: document.getElementById('cover_image').value.trim(),
                    name: document.getElementById('name').value.trim(),
                    about: document.getElementById('about').value.trim(),
                    location: document.getElementById('location').value.trim(),
                    website: document.getElementById('website').value.trim()
                };
                
                // Update metadata
                if (!metadata.profile) {
                    metadata.profile = {};
                }
                
                // Only update fields that have values
                Object.entries(profileData).forEach(([key, value]) => {
                    if (value) {
                        metadata.profile[key] = value;
                    } else {
                        delete metadata.profile[key];
                    }
                });
                
                // Check if user is logged in 
                const loggedInUser = localStorage.getItem('hiveUser');
                const userPrivateKey = localStorage.getItem('hivePostingKey');
                
                console.log('[Profile Settings] Checking login status:', {
                    loggedInUser,
                    hasPrivateKey: !!userPrivateKey,
                    currentUsername: username
                });
                
                if (!loggedInUser || !userPrivateKey) {
                    throw new Error('You must be logged in with your posting key to update your profile');
                }
                
                if (loggedInUser !== username) {
                    throw new Error('You can only update your own profile');
                }
                
                console.log('[Profile Settings] Preparing to update profile via hive.blog API');
                
                try {
                    // Create a temporary dhive client specifically for hive.blog API
                    const tempClient = new dhive.Client([
                        'https://api.hive.blog'
                    ], { 
                        chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000'
                    });
                    
                    // Create the private key from string properly
                    let privateKey;
                    try {
                        privateKey = dhive.PrivateKey.fromString(userPrivateKey);
                        console.log('[Profile Settings] Private key created successfully');
                    } catch(keyError) {
                        console.error('[Profile Settings] Error creating private key:', keyError);
                        throw new Error('Invalid posting key format. Please log out and log in again.');
                    }
                    
                    // Debug - log the operation structure without sensitive data
                    console.log('[Profile Settings] Operation structure:', {
                        type: 'account_update2',
                        account: username,
                        hasJson: !!metadata,
                        metadataKeys: metadata ? Object.keys(metadata) : []
                    });
                    
                    // Create the operation
                    const op = [
                        'account_update2',
                        {
                            account: username,
                            json_metadata: '',
                            posting_json_metadata: JSON.stringify(metadata),
                            extensions: []
                        }
                    ];
                    
                    console.log('[Profile Settings] Sending broadcast to API...');
                    
                    // Try to broadcast the transaction with explicit error handling
                    const result = await tempClient.broadcast.sendOperations([op], privateKey);
                    
                    console.log('[Profile Settings] Broadcast result:', result);
                    console.log('[Profile Settings] Profile updated successfully');
                    
                    // Show success message
                    formContainer.innerHTML = `
                        <div class="text-center py-8">
                            <div class="text-green-500 text-6xl mb-4">✓</div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">Profile Updated Successfully</h3>
                            <p class="text-gray-600 mb-6">Your changes have been saved to the blockchain.</p>
                            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                        </div>
                    `;
                    
                    // Add close button functionality
                    formContainer.querySelector('button').addEventListener('click', () => {
                        overlay.remove();
                        // Reload the page to show updated profile
                        window.location.reload();
                    });
                } catch (broadcastError) {
                    console.error('[Profile Settings] Error broadcasting transaction:', broadcastError);
                    
                    let errorMessage = 'Failed to update profile';
                    
                    // Check for specific error types
                    if (broadcastError.message && broadcastError.message.includes('postin')) {
                        errorMessage = 'Invalid posting key. Please log out and log in again with the correct posting key.';
                    } else if (broadcastError.message) {
                        errorMessage = `Error: ${broadcastError.message}`;
                    }
                    
                    throw new Error(errorMessage);
                }
                
            } catch (error) {
                console.error('[Profile Settings] Error saving profile changes:', error);
                
                // Show error message
                const buttonsContainer = form.querySelector('div:last-child');
                buttonsContainer.innerHTML = `
                    <div class="flex items-center justify-between w-full">
                        <p class="text-red-500">${error.message || 'Error saving changes. Please try again.'}</p>
                        <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Try Again</button>
                    </div>
                `;
                
                // Add try again button functionality
                buttonsContainer.querySelector('button').addEventListener('click', () => {
                    saveProfileChanges(account, metadata);
                });
            }
        }
        
        // Initialize by loading user data
        loadUserData();
        
        // Close when clicking outside the form
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    // Direct implementation for profile controls
    (function() {
        // Run immediately when script loads
        console.log("DIRECT PROFILE CONTROLS INITIALIZATION");
        
        // Add direct profile and create button elements with a delay to ensure DOM is ready
        setTimeout(function() {
            try {
                console.log("Attempting to add profile controls directly");
                const loggedInUser = localStorage.getItem('hiveUser');
                console.log("Logged in user:", loggedInUser);
                
                if (!loggedInUser) {
                    console.log("No user logged in, not adding controls");
                    return;
                }
                
                // Remove any existing controls
                document.querySelectorAll('#hive-profile-controls').forEach(el => {
                    console.log("Removing existing controls");
                    el.remove();
                });
                
                // Create container element
                const container = document.createElement('div');
                container.id = 'hive-profile-controls';
                container.innerHTML = `
                    <div style="position:fixed; top:20px; right:20px; display:flex; align-items:center; z-index:9999; background:white; padding:5px 10px; border-radius:20px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                        <button id="hive-create-button" style="background:#3b82f6; color:white; border:none; padding:5px 15px; border-radius:20px; margin-right:10px; cursor:pointer; font-weight:bold;">
                            <i class="fas fa-plus"></i> Create
                        </button>
                        <div style="position:relative;">
                            <button id="hive-profile-button" style="display:flex; align-items:center; background:none; border:none; cursor:pointer;">
                                <img src="https://images.hive.blog/u/${loggedInUser}/avatar/small" 
                                     alt="${loggedInUser}" 
                                     style="width:32px; height:32px; border-radius:50%; border:2px solid #3b82f6;">
                                <span style="margin-left:8px; font-weight:bold;">${loggedInUser}</span>
                            </button>
                            <div id="hive-profile-dropdown" style="display:none; position:absolute; top:40px; right:0; width:200px; background:white; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.2); z-index:10000; overflow:hidden;">
                                <a href="hivepostify.html#@${loggedInUser}" style="display:block; padding:10px 15px; color:#333; text-decoration:none; border-bottom:1px solid #e5e7eb; font-weight:500;">
                                    <i class="fas fa-user" style="margin-right:8px;"></i> My Profile
                                </a>
                                <a href="#" id="hive-logout-link" style="display:block; padding:10px 15px; color:#333; text-decoration:none; font-weight:500;">
                                    <i class="fas fa-sign-out-alt" style="margin-right:8px;"></i> Logout
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                
                // Append to body
                document.body.appendChild(container);
                console.log("Profile controls added to body");
                
                // Add event handlers
                const profileButton = document.getElementById('hive-profile-button');
                const createButton = document.getElementById('hive-create-button');
                const dropdown = document.getElementById('hive-profile-dropdown');
                const logoutLink = document.getElementById('hive-logout-link');
                
                if (profileButton && dropdown) {
                    profileButton.onclick = function(e) {
                        console.log("Profile button clicked");
                        e.stopPropagation();
                        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                    };
                    console.log("Profile button click handler added");
                } else {
                    console.error("Could not find profile button or dropdown");
                }
                
                if (createButton) {
                    createButton.onclick = function() {
                        console.log("Create button clicked, redirecting to submit.html");
                        window.location.href = 'submit.html';
                    };
                    console.log("Create button click handler added");
                } else {
                    console.error("Could not find create button");
                }
                
                if (logoutLink) {
                    logoutLink.onclick = function(e) {
                        console.log("Logout link clicked");
                        e.preventDefault();
                        localStorage.removeItem('hiveUser');
                        localStorage.removeItem('hivePostingKey');
                        alert('You have been logged out.');
                        window.location.reload();
                    };
                    console.log("Logout link click handler added");
                } else {
                    console.error("Could not find logout link");
                }
                
                // Close dropdown when clicking outside
                document.addEventListener('click', function() {
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                });
                console.log("Document click handler added to close dropdown");
                
                console.log("Profile controls setup completed successfully");
            } catch (error) {
                console.error("Error setting up profile controls:", error);
            }
        }, 500); // Delay to ensure DOM is ready
        
        // Also set up login form handler
        document.addEventListener('DOMContentLoaded', function() {
            try {
                console.log("Setting up login form handler");
                const loginForm = document.getElementById('loginForm');
                
                if (loginForm) {
                    console.log("Found login form, adding submit handler");
                    loginForm.addEventListener('submit', function(e) {
                        e.preventDefault();
                        console.log("Login form submitted");
                        
                        const username = document.getElementById('username').value.trim();
                        const postingKey = document.getElementById('posting_key').value.trim();
                        
                        if (username && postingKey) {
                            console.log("Setting credentials for:", username);
                            localStorage.setItem('hiveUser', username);
                            localStorage.setItem('hivePostingKey', postingKey);
                            
                            // Close login modal if present
                            const loginModal = document.getElementById('loginModal');
                            if (loginModal) loginModal.style.display = 'none';
                            
                            alert(`Welcome, ${username}! You are now logged in.`);
                            window.location.reload(); // Reload to show controls
                        } else {
                            alert('Please enter both username and posting key');
                        }
                    });
                    console.log("Login form handler set up successfully");
                } else {
                    console.log("No login form found on this page");
                }
            } catch (error) {
                console.error("Error setting up login form handler:", error);
            }
        });
    })();
});