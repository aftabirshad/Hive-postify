document.addEventListener('DOMContentLoaded', function() {
    // Get post parameters and load post
    const urlParams = new URLSearchParams(window.location.search);
    const author = urlParams.get('author');
    const permlink = urlParams.get('permlink');

    if (!author || !permlink) {
        showError('Invalid post URL');
        return;
    }

    loadPost(author, permlink);
    
    // Login modal event listeners
    document.getElementById('closeLoginModal').addEventListener('click', hideLoginModal);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Close modal when clicking outside
    document.getElementById('loginModal').addEventListener('click', (e) => {
        if (e.target === loginModal) {
            hideLoginModal();
        }
    });

    // Prevent modal close when clicking inside the login box
    document.getElementById('loginBox').addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

async function loadPost(author, permlink) {
    try {
        const response = await fetch('https://api.hive.blog', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "condenser_api.get_content",
                params: [author, permlink],
                id: 1
            })
        });

        const data = await response.json();
        
        if (!data.result || !data.result.body) {
            throw new Error('Post not found');
        }

        renderPost(data.result);
        loadComments();

    } catch (error) {
        showError('Failed to load post. Please try again.');
        console.error('Error:', error);
    }
}

function renderPost(post) {
    try {
        const metadata = JSON.parse(post.json_metadata);
        const tags = metadata.tags || [];
        
        // Check if user has already voted
        const username = localStorage.getItem('hiveUser');
        let userVote = 0;
        if (username && post.active_votes) {
            const vote = post.active_votes.find(v => v.voter === username);
            if (vote) {
                userVote = vote.percent;
            }
        }
        
        document.getElementById('postContainer').innerHTML = `
            <div class="back-navigation">
                <button onclick="goBack()" class="back-button">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                    </svg>
                    <span>Back</span>
                </button>
            </div>

            <article class="post">
                <h1 class="post-title">${post.title}</h1>
                
                <div class="post-meta">
                    <img src="https://images.hive.blog/u/${post.author}/avatar" class="author-avatar" alt="">
                    <a href="hivepostify.html#@${post.author}" class="author-name">@${post.author}</a>
                    <span class="post-date">${new Date(post.created).toLocaleDateString()}</span>
                </div>

                <div class="markdown-body">
                    ${processContent(post.body)}
                </div>

                <div class="post-footer">
                    <div class="post-actions">
                        <div class="left-actions">
                            <div class="vote-section">
                                <button class="vote-btn upvote ${userVote > 0 ? 'voted-up' : ''}" title="Upvote" onclick="handleVote('${post.author}', '${post.permlink}', 10000)">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 2L4 14h6v7h4v-7h6L12 2z"/>
                                    </svg>
                                    <span class="vote-count">${post.net_votes > 0 ? post.net_votes : ''}</span>
                                </button>
                                <button class="vote-btn downvote ${userVote < 0 ? 'voted-down' : ''}" title="Downvote" onclick="handleVote('${post.author}', '${post.permlink}', -10000)">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M12 22l8-12h-6V3h-4v7H4l8 12z"/>
                                    </svg>
                                </button>
                            </div>
                            <span class="payout">$${parseFloat(post.pending_payout_value).toFixed(2)}</span>
                        </div>
                        
                        <div class="right-actions">
                            <button class="action-btn reblog" title="Reblog on Hive">
                                <svg viewBox="0 0 24 24">
                                    <path d="M17.9 8.18C17.64 7.96 17.32 7.76 17 7.58v-.82c0-2.84-2.34-5.14-5.23-5.14S6.54 3.92 6.54 6.76v.82c-.32.18-.64.38-.9.6C4.94 8.8 4.5 9.6 4.5 10.48v1.54c0 .88.44 1.68 1.14 2.3.66.58 1.56 1.04 2.58 1.32.14.04.28.06.42.08v.02c0 .78.54 1.44 1.26 1.64l2.08.58c.34.1.64.32.84.62.2.28.3.62.3.96v1.98h8.14v-1.98c0-.34.1-.68.3-.96.2-.3.5-.52.84-.62l2.08-.58c.72-.2 1.26-.86 1.26-1.64v-.02c.14-.02.28-.04.42-.08 1.02-.28 1.92-.74 2.58-1.32.7-.62 1.14-1.42 1.14-2.3v-1.54c0-.88-.44-1.68-1.14-2.3z"/>
                                </svg>
                                <span>Reblog</span>
                            </button>

                            <button class="action-btn reply" onclick="showReplyBox('${post.author}', '${post.permlink}')" title="Reply">
                                <svg viewBox="0 0 24 24">
                                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                </svg>
                                <span>Reply</span>
                            </button>
                        </div>
                    </div>
                    <div class="tags-container">
                        ${tags.map(tag => `
                            <div class="tag-box">
                                <span class="tag-link">#${tag}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </article>

            <div class="comments-section" id="commentsSection">
                <div id="commentsContainer"></div>
            </div>`;

    } catch (error) {
        console.error('Error rendering post:', error);
        showError('Error displaying post content');
    }
}

function processContent(content) {
    try {
        // First clean the content
        content = content
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Process Markdown
        content = content
            // Process headings
            .replace(/^#{1,6}\s+(.*)$/gm, (match, text) => {
                const level = match.indexOf(' ');
                return `<h${level}>${text.trim()}</h${level}>`;
            })
            // Process bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Process italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Process code blocks
            .replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code>${code.trim()}</code></pre>`;
            })
            // Process inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Process images (simplified to match Hive.blog exactly)
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2">')
            // Process links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            // Process lists
            .replace(/^[\s]*[-*+][\s]+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            // Process numbered lists
            .replace(/^[\s]*\d+\.[\s]+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>')
            // Process blockquotes
            .replace(/^>[\s](.*)$/gm, '<blockquote>$1</blockquote>')
            // Process horizontal rules
            .replace(/^[\s]*-{3,}[\s]*$/gm, '<hr>')
            // Process tables
            .replace(/^\|(.+)\|$/gm, (match, content) => {
                const cells = content.split('|').map(cell => cell.trim());
                return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
            })
            // Process paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Wrap in paragraphs if not already wrapped
        if (!content.startsWith('<')) {
            content = `<p>${content}</p>`;
        }

        // Clean up any empty paragraphs
        content = content.replace(/<p>\s*<\/p>/g, '');

        // Add styles for Markdown content
        const style = document.createElement('style');
        style.textContent = `
            .markdown-body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 100%;
            }
            .markdown-body p { margin: 0.5em 0; }
            .markdown-body img {
                max-width: 100%;
                height: auto;
                margin: 0.5em 0;
            }
            .markdown-body h1 { font-size: 2em; margin: 1em 0 0.5em; }
            .markdown-body h2 { font-size: 1.5em; margin: 1em 0 0.5em; }
            .markdown-body h3 { font-size: 1.25em; margin: 1em 0 0.5em; }
            .markdown-body h4 { font-size: 1.1em; margin: 1em 0 0.5em; }
            .markdown-body h5 { font-size: 1em; margin: 1em 0 0.5em; }
            .markdown-body h6 { font-size: 0.9em; margin: 1em 0 0.5em; }
            .markdown-body code {
                padding: 0.2em 0.4em;
                background: #f6f8fa;
                border-radius: 3px;
                font-family: monospace;
                font-size: 0.9em;
            }
            .markdown-body pre code {
                display: block;
                padding: 1em;
                overflow-x: auto;
                line-height: 1.45;
            }
            .markdown-body blockquote {
                margin: 1em 0;
                padding-left: 1em;
                color: #666;
                border-left: 4px solid #ddd;
            }
            .markdown-body ul, .markdown-body ol {
                padding-left: 2em;
                margin: 0.5em 0;
            }
            .markdown-body li { margin: 0.25em 0; }
            .markdown-body table {
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }
            .markdown-body td, .markdown-body th {
                border: 1px solid #ddd;
                padding: 6px 13px;
            }
            .markdown-body tr:nth-child(even) {
                background: #f8f8f8;
            }
            .markdown-body hr {
                height: 1px;
                background: #ddd;
                border: none;
                margin: 1em 0;
            }
            .markdown-body a {
                color: #1a5099;
                text-decoration: none;
            }
            .markdown-body a:hover {
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);

        return `<div class="markdown-body">${content}</div>`;
    } catch (error) {
        console.error('Error processing content:', error);
        return content;
    }
}

async function loadComments(sortBy = 'trending') {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const author = urlParams.get('author');
        const permlink = urlParams.get('permlink');
        
        const query = {
            jsonrpc: "2.0",
            method: "bridge.get_discussion",
            params: { author, permlink },
            id: 1
        };

        const response = await fetch('https://api.hive.blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        if (!data.result) throw new Error('Failed to load comments');

        // Create a map of all comments
        const commentMap = {};
        Object.values(data.result).forEach(comment => {
            if (comment.author !== author || comment.permlink !== permlink) {
                commentMap[`${comment.author}/${comment.permlink}`] = {
                    ...comment,
                    replies: []
                };
            }
        });

        // Organize comments into a tree structure
        const rootComments = [];
        Object.values(commentMap).forEach(comment => {
            if (comment.parent_author === author && comment.parent_permlink === permlink) {
                rootComments.push(comment);
            } else {
                const parentKey = `${comment.parent_author}/${comment.parent_permlink}`;
                if (commentMap[parentKey]) {
                    commentMap[parentKey].replies.push(comment);
                }
            }
        });

        // Sort root comments
        const sortComments = (comments) => {
            switch(sortBy) {
                case 'trending':
                    comments.sort((a, b) => parseFloat(b.net_rshares) - parseFloat(a.net_rshares));
                    break;
                case 'new':
                    comments.sort((a, b) => new Date(b.created) - new Date(a.created));
                    break;
                case 'top':
                    comments.sort((a, b) => {
                        const aVotes = a.active_votes.reduce((sum, vote) => sum + parseFloat(vote.rshares), 0);
                        const bVotes = b.active_votes.reduce((sum, vote) => sum + parseFloat(vote.rshares), 0);
                        return bVotes - aVotes;
                    });
                    break;
            }
            // Sort replies recursively
            comments.forEach(comment => {
                if (comment.replies.length > 0) {
                    sortComments(comment.replies);
                }
            });
            return comments;
        };

        const sortedComments = sortComments(rootComments);

        const renderCommentTree = (comment, depth = 0) => {
            const style = depth > 0 ? `margin-left: ${depth * 2}rem;` : '';
            return `
                <div class="comment-tree" style="${style}">
                    ${renderComment(comment)}
                    ${comment.replies.map(reply => renderCommentTree(reply, depth + 1)).join('')}
                </div>
            `;
        };

        const commentsContainer = document.getElementById('commentsContainer');
        commentsContainer.innerHTML = `
            <div class="comments-header">
                <h3>Comments</h3>
                <div class="comment-filters">
                    <button onclick="loadComments('trending')" class="filter-btn ${sortBy === 'trending' ? 'active' : ''}">
                        <i class="fas fa-fire"></i> Trending
                    </button>
                    <button onclick="loadComments('new')" class="filter-btn ${sortBy === 'new' ? 'active' : ''}">
                        <i class="fas fa-clock"></i> New
                    </button>
                    <button onclick="loadComments('top')" class="filter-btn ${sortBy === 'top' ? 'active' : ''}">
                        <i class="fas fa-arrow-up"></i> Top Votes
                    </button>
                </div>
            </div>
            <div class="comments-list">
                ${sortedComments.map(comment => renderCommentTree(comment)).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error loading comments:', error);
        document.getElementById('commentsContainer').innerHTML = `
            <div class="error-message">Failed to load comments. Please try again.</div>
        `;
    }
}

function renderComment(comment) {
    return `
        <div class="comment-container">
            <div class="comment-header">
                <img src="https://images.hive.blog/u/${comment.author}/avatar" class="comment-avatar">
                <a href="hivepostify.html#@${comment.author}" class="comment-author">${comment.author}</a>
                <span class="comment-date">${new Date(comment.created).toLocaleDateString()}</span>
            </div>
            <div class="comment-content markdown-body">
                ${processContent(comment.body)}
            </div>
            <div class="comment-footer">
                <div class="voting-wrapper">
                    <button class="vote-button" onclick="handleVote('${comment.author}', '${comment.permlink}', 10000)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 4 L20 14 L4 14 Z" />
                        </svg>
                    </button>
                    <button class="vote-button" onclick="handleVote('${comment.author}', '${comment.permlink}', -10000)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 20 L4 10 L20 10 Z" />
                        </svg>
                    </button>
                </div>
                <span class="payout-value">$${parseFloat(comment.pending_payout_value || 0).toFixed(2)}</span>
                <button class="reply" onclick="showReplyBox('${comment.author}', '${comment.permlink}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
            </div>
        </div>
    `;
}

// Login Modal Functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    const loginBox = document.getElementById('loginBox');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        loginBox.classList.remove('scale-95', 'opacity-0');
        loginBox.classList.add('scale-100', 'opacity-100');
    }, 10);
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    const loginBox = document.getElementById('loginBox');
    loginBox.classList.remove('scale-100', 'opacity-100');
    loginBox.classList.add('scale-95', 'opacity-0');
    // Wait for animation to finish before hiding
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.getElementById('loginError').classList.add('hidden');
        document.getElementById('loginForm').reset();
    }, 300);
}

// Handle login form submission - exactly same as index.html
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
                localStorage.setItem('hiveUser', username);
                localStorage.setItem('hivePostingKey', privateKey.toString());
                hideLoginModal();

                // Process pending vote if exists
                if (window.pendingVote) {
                    handleVote(window.pendingVote.author, window.pendingVote.permlink, window.pendingVote.weight);
                    window.pendingVote = null;
                }

            } catch (error) {
                showLoginError('Invalid password or posting key');
                return;
            }

        } catch (error) {
            showLoginError('Error connecting to Hive. Please try again.');
            return;
        }
    } catch (error) {
        showLoginError('Login failed: ' + error.message);
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Update handleVote function to check login first
async function handleVote(author, permlink, weight) {
    const username = localStorage.getItem('hiveUser');
    const postingKey = localStorage.getItem('hivePostingKey');

    if (!username || !postingKey) {
        // Store vote details for after login
        window.pendingVote = { author, permlink, weight };
        showLoginModal();
        return;
    }

    try {
        const client = new dhive.Client([
            'https://api.hive.blog',
            'https://api.hivekind.com',
            'https://api.openhive.network'
        ]);

        const privateKey = dhive.PrivateKey.from(postingKey);
        
        await client.broadcast.vote({
            voter: username,
            author: author,
            permlink: permlink,
            weight: weight
        }, privateKey);

        // Update vote display
        const upvoteBtn = document.querySelector('.upvote');
        const downvoteBtn = document.querySelector('.downvote');
        if (upvoteBtn && downvoteBtn) {
            if (weight > 0) {
                upvoteBtn.classList.add('voted-up');
                downvoteBtn.classList.remove('voted-down');
            } else if (weight < 0) {
                downvoteBtn.classList.add('voted-down');
                upvoteBtn.classList.remove('voted-up');
            }
        }
    } catch (error) {
        showError('Vote failed: ' + error.message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function goBack() {
    window.location.href = 'index.html';
}

const style = document.createElement('style');
style.textContent = `
    .comments-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding: 0.5rem 0;
    }

    .comment-filters {
        display: flex;
        gap: 0.5rem;
    }

    .filter-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 20px;
        background: #f0f0f0;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .filter-btn:hover {
        background: #e0e0e0;
    }

    .filter-btn.active {
        background: #1a73e8;
        color: white;
    }

    .filter-btn i {
        font-size: 0.9rem;
    }

    .vote-btn.upvote {
        color: #757575;
        transition: color 0.2s ease;
    }
    
    .vote-btn.downvote {
        color: #757575;
        transition: color 0.2s ease;
    }
    
    .vote-btn.upvote.voted-up {
        color: #4CAF50;
    }
    
    .vote-btn.downvote.voted-down {
        color: #f44336;
    }
    
    .vote-btn.upvote:hover {
        color: #4CAF50;
    }
    
    .vote-btn.downvote:hover {
        color: #f44336;
    }
`;
document.head.appendChild(style);

const markdownStyles = document.createElement('style');
markdownStyles.textContent = `
    .markdown-body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        padding: 20px 0;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, 
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
    }
    .markdown-body h1 { font-size: 2em; }
    .markdown-body h2 { font-size: 1.5em; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1.1em; }
    .markdown-body h5 { font-size: 1em; }
    .markdown-body h6 { font-size: 0.9em; }
    .markdown-body img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 10px 0;
    }
    .markdown-body .image-wrapper {
        text-align: center;
        margin: 20px 0;
    }
    .markdown-body .image-caption {
        display: block;
        color: #666;
        font-size: 0.9em;
        margin-top: 0.75em;
    }
    .markdown-body table.hive-table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
    }
    .markdown-body .table-container {
        overflow-x: auto;
        margin: 16px 0;
    }
    .markdown-body table.hive-table th,
    .markdown-body table.hive-table td {
        border: 1px solid #ddd;
        padding: 8px 12px;
        text-align: left;
    }
    .markdown-body table.hive-table th {
        background-color: #f6f6f6;
    }
    .markdown-body table.hive-table tr:nth-child(even) {
        background-color: #f9f9f9;
    }
    .markdown-body blockquote {
        border-left: 4px solid #ddd;
        padding-left: 16px;
        margin: 16px 0;
        color: #666;
    }
    .markdown-body code {
        background-color: #f4f4f4;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.9em;
    }
    .markdown-body pre code {
        display: block;
        padding: 16px;
        overflow-x: auto;
        line-height: 1.45;
    }
    .markdown-body hr.hive-divider {
        height: 1px;
        background-color: #ddd;
        border: none;
        margin: 24px 0;
    }
    .markdown-body center {
        display: block;
        margin: 16px 0;
    }
    .markdown-body ul, .markdown-body ol {
        padding-left: 2em;
        margin: 1em 0;
    }
    .markdown-body li {
        margin: 0.5em 0;
    }
`;
document.head.appendChild(markdownStyles);