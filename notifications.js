// notifications.js - Handles Notification Tab Logic

// Shared state/dependencies stored internally
let _currentUsername = null;
let _dhiveClient = null;
let _userPostsGrid = null;
let _loadingIndicator = null;

let isLoadingNotifications = false;
let lastNotificationId = null;
let displayedNotificationIds = new Set();
const NOTIFICATIONS_PER_PAGE = 20;

// Function to fetch notifications from the API
// Uses stored _dhiveClient and _currentUsername
async function fetchNotifications(startId = null) {
    if (!_dhiveClient) {
        console.error("[Notifications] dhiveClient is not initialized internally.");
        return [];
    }
     if (!_currentUsername) {
        console.error("[Notifications] Username is not initialized internally.");
        return [];
    }
    if (startId === -1) {
        console.log("[Notifications] End reached. Not fetching.");
        return []; // End of list marker
    }

    const params = { account: _currentUsername, limit: NOTIFICATIONS_PER_PAGE };
    if (startId !== null) {
        params.last_id = startId;
    }
    console.log(`[Notifications] Querying 'bridge.account_notifications' for ${_currentUsername} with:`, params);
    try {
        const notifications = await _dhiveClient.call('bridge', 'account_notifications', params);
        console.log("[Notifications] Raw data received:", notifications);
        return notifications || []; // Return data or empty array if API returns null/undefined
    } catch (error) {
        console.error(`[Notifications] Error calling bridge.account_notifications for ${_currentUsername}:`, error);
        return null; // Return null on error
    }
}

// Function to create a single notification list item element
// Assumes timeAgo is globally available
function createNotificationElement(notification) {
     if (!notification || !notification.id) return null;

     const element = document.createElement('div');
     element.className = 'notification-item bg-white border-b border-gray-200 p-4 flex items-start space-x-3';
     element.dataset.id = notification.id;

     try {
        const date = timeAgo(notification.date); // Assumes timeAgo is globally available
        let actor = 'Someone';
        let actionText = notification.msg || 'did something';
        let details = '';
        let linkUrl = notification.url || '#';
        let avatarUrl = 'https://via.placeholder.com/40?text=?';

        const type = notification.type;
        const msg = notification.msg || '';
        const msgParts = msg.split(' ');

        if (msgParts[0]?.startsWith('@')) {
            actor = msgParts[0].substring(1).replace(/[^a-zA-Z0-9.-]/g, '');
        } else {
            actor = msgParts[0]?.replace(/[^a-zA-Z0-9.-]/g, '') || 'Unknown';
        }
         if (actor && actor !== 'Unknown') {
            avatarUrl = `https://images.hive.blog/u/${actor}/avatar/small`;
         }

        switch (type) {
            case 'vote':
            case 'unvote':
                actionText = msgParts[1] || type;
                details = msg.substring(msg.indexOf(msgParts[2])).trim();
                break;
            case 'reply':
            case 'reply_comment':
                actionText = 'replied to';
                details = msg.substring(msg.indexOf(msgParts[2])).trim();
                 break;
            case 'mention':
                actionText = 'mentioned you in';
                 details = msg.substring(msg.indexOf(msgParts[3])).trim();
                break;
            case 'follow':
                 actionText = msgParts[1] || type;
                 details = '';
                break;
             case 'reblog':
                 actionText = 'reblogged your post';
                 details = '';
                 break;
            default:
                 actionText = msgParts.slice(1).join(' ').trim();
                 actionText = actionText.charAt(0).toUpperCase() + actionText.slice(1);
                 details = '';
                break;
        }

        element.innerHTML = `
            <img src="${avatarUrl}" alt="${actor}" class="w-10 h-10 rounded-full mr-3 flex-shrink-0" onerror="this.src='https://via.placeholder.com/40?text=?';">
            <div class="flex-grow">
                <p class="text-sm mb-1">
                    <span class="font-semibold text-gray-800">${actor}</span>
                    <span class="text-gray-600 ml-1">${actionText}</span>
                    ${details ? `<span class="text-gray-600 ml-1">${details}</span>` : ''}
                </p>
                <div class="flex items-center justify-between">
                     <span class="text-gray-400 text-xs">${date}</span>
                </div>
            </div>
        `;

    } catch (renderError) {
         console.error("[Notifications] ERROR rendering notification item:", renderError, notification);
         element.className = 'notification-item bg-white border-b border-gray-200 p-4';
         element.innerHTML = '<div class="text-red-500">Error rendering this notification.</div>';
    }
     return element;
}

// Function to render a batch of new notifications
// Uses stored _userPostsGrid
function renderNotifications(notifications) {
    if (!_userPostsGrid) {
        console.error("[Notifications] userPostsGrid is not initialized internally.");
        return 0; // Return 0 rendered
    }

    const fragment = document.createDocumentFragment();
    let newItemsRendered = 0;

    notifications.forEach(notif => {
        if (!displayedNotificationIds.has(notif.id)) {
            const element = createNotificationElement(notif);
            if (element) {
                fragment.appendChild(element);
                displayedNotificationIds.add(notif.id);
                console.log(`[Notifications] ADDED ID: ${notif.id}`);
                newItemsRendered++;
            }
        } else {
            console.log(`[Notifications] SKIPPED Duplicate ID: ${notif.id}`);
        }
    });

    if (newItemsRendered > 0) {
        _userPostsGrid.appendChild(fragment);
    }
    console.log(`[Notifications] Rendered ${newItemsRendered} new notification(s).`);
    return newItemsRendered; // Return count of *new* items added
}

// Function to load the initial batch of notifications
// Stores the passed dependencies for later use
async function loadInitialNotifications(username, dhiveClient, userPostsGrid, loadingIndicator) {
    // Store dependencies
    _currentUsername = username;
    _dhiveClient = dhiveClient;
    _userPostsGrid = userPostsGrid;
    _loadingIndicator = loadingIndicator;

    // Validation
    if (!_currentUsername || !_dhiveClient || !_userPostsGrid || !_loadingIndicator) {
         console.error("[Notifications] Initial load failed: Missing required dependencies.");
         // Optionally display error in the grid
         if (_userPostsGrid) _userPostsGrid.innerHTML = '<p class="text-center text-red-500 col-span-full">Error initializing notifications module.</p>';
         return; 
    }

    if (isLoadingNotifications) return;
    console.log(`[Notifications] Loading initial notifications for ${_currentUsername}`);
    isLoadingNotifications = true;
    _loadingIndicator.classList.remove('hidden');
    _userPostsGrid.innerHTML = ''; // Clear previous content

    lastNotificationId = null; // Reset pagination
    displayedNotificationIds.clear(); // Clear displayed set

    const initialNotifications = await fetchNotifications(null); // Pass null for startId

    if (initialNotifications.length === 0) {
        _userPostsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No notifications found.</p>';
        lastNotificationId = -1; // Mark as end if initial load is empty
    } else {
        const renderedCount = renderNotifications(initialNotifications);
        // Set lastNotificationId based on the *last item received from the API*,
        // regardless of filtering result, to ensure correct pagination.
        lastNotificationId = initialNotifications[initialNotifications.length - 1].id;
        console.log(`[Notifications] Initial load complete. Rendered ${renderedCount} new items. Next last_id set to: ${lastNotificationId}`);
        // If the first batch yielded 0 *new* items after filtering, mark as end
        if (renderedCount === 0) {
            console.log("[Notifications] Initial batch contained only duplicates. Marking end.");
            lastNotificationId = -1;
        }
    }

    _loadingIndicator.classList.add('hidden');
    isLoadingNotifications = false;
}

// Function to load more notifications (for infinite scroll)
// No longer needs username parameter, uses stored dependencies
async function loadMoreNotifications() {
    // Check if initialized
    if (!_currentUsername || !_dhiveClient || !_userPostsGrid || !_loadingIndicator) {
         console.error("[Notifications] Cannot load more: Module not initialized.");
         return; 
    }

    if (isLoadingNotifications || lastNotificationId === -1 || lastNotificationId === null) {
        // Don't load if already loading, or explicitly at the end, or initial load hasn't happened yet
        if (lastNotificationId === -1) console.log("[Notifications] Scroll load skipped: End of list reached.");
        return;
    }
    console.log(`[Notifications] Attempting to load more for ${_currentUsername}, starting AFTER ID: ${lastNotificationId}`);
    isLoadingNotifications = true;
    _loadingIndicator.classList.remove('hidden');

    try {
        const moreNotifications = await fetchNotifications(lastNotificationId);
        console.log(`[Notifications] Fetched result (null means fetch error):`, moreNotifications);

        if (moreNotifications === null) {
            // Fetch error occurred, don't change lastNotificationId, allow retry on next scroll
            console.warn("[Notifications] Fetch failed. Will attempt again on next scroll.");
        } else if (moreNotifications.length === 0) {
            // API returned empty array, signifies end of list
            console.log("[Notifications] Reached end of notifications (API returned empty array).");
            lastNotificationId = -1; // Mark as end
        } else {
            // We got new data
            const renderedCount = renderNotifications(moreNotifications);
            lastNotificationId = moreNotifications[moreNotifications.length - 1].id;
            console.log(`[Notifications] More load complete. Rendered ${renderedCount} new items. Next last_id set to: ${lastNotificationId}`);
            if (renderedCount === 0) {
                console.log(`[Notifications] More batch contained only duplicates. Set last_id to -1.`);
                lastNotificationId = -1;
            }
        }
    } catch (error) {
        console.error(`[Notifications] Unexpected error during loadMoreNotifications processing for ${_currentUsername}:`, error);
        // This catch is for errors *outside* fetchNotifications (e.g., in rendering)
    } finally {
        _loadingIndicator.classList.add('hidden');
        isLoadingNotifications = false;
        console.log(`[Notifications] loadMoreNotifications finished. isLoadingNotifications set to: ${isLoadingNotifications}, lastId: ${lastNotificationId}`); // Added final log
    }
}

// Expose necessary functions globally (or use a more structured approach like modules/classes)
// Pass dependencies on initial load now
window.loadInitialNotifications = loadInitialNotifications;
window.loadMoreNotifications = loadMoreNotifications; // No longer needs username arg
window.isLoadingNotifications = () => isLoadingNotifications; // Function to check loading state 