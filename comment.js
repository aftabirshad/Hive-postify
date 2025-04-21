// Handle comment voting
async function handleCommentVote(author, permlink, weight) {
    const username = localStorage.getItem('hiveUser');
    const postingKey = localStorage.getItem('hivePostingKey');

    if (!username || !postingKey) {
        // Store vote details for after login
        window.pendingCommentVote = { author, permlink, weight };
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
        const commentElement = document.querySelector(`[data-comment-id="${author}/${permlink}"]`);
        if (commentElement) {
            const upvoteBtn = commentElement.querySelector('.comment-upvote');
            const downvoteBtn = commentElement.querySelector('.comment-downvote');
            
            if (weight > 0) {
                upvoteBtn.classList.add('voted-up');
                downvoteBtn.classList.remove('voted-down');
            } else if (weight < 0) {
                downvoteBtn.classList.add('voted-down');
                upvoteBtn.classList.remove('voted-up');
            } else {
                upvoteBtn.classList.remove('voted-up');
                downvoteBtn.classList.remove('voted-down');
            }

            // Update vote count
            const voteCount = commentElement.querySelector('.comment-vote-count');
            if (voteCount) {
                let count = parseInt(voteCount.textContent) || 0;
                if (weight > 0) count++;
                else if (weight < 0) count--;
                voteCount.textContent = count;
            }
        }
    } catch (error) {
        showError('Vote failed: ' + error.message);
    }
}

// Render a single comment with voting buttons
function renderComment(comment) {
    // Check if user has already voted
    const username = localStorage.getItem('hiveUser');
    let userVote = 0;
    if (username && comment.active_votes) {
        const vote = comment.active_votes.find(v => v.voter === username);
        if (vote) {
            userVote = vote.percent;
        }
    }

    // Calculate total votes
    const totalVotes = comment.active_votes ? comment.active_votes.reduce((sum, vote) => {
        return sum + (vote.percent > 0 ? 1 : vote.percent < 0 ? -1 : 0);
    }, 0) : 0;

    return `
        <div class="comment" data-comment-id="${comment.author}/${comment.permlink}">
            <div class="comment-header">
                <img src="https://images.hive.blog/u/${comment.author}/avatar" class="comment-avatar" alt="">
                <a href="https://hive.blog/@${comment.author}" class="comment-author" target="_blank">@${comment.author}</a>
                <span class="comment-date">${new Date(comment.created).toLocaleDateString()}</span>
            </div>
            
            <div class="comment-body markdown-body">
                ${processContent(comment.body)}
            </div>
            
            <div class="comment-footer">
                <div class="comment-actions">
                    <button class="comment-upvote ${userVote > 0 ? 'voted-up' : ''}" 
                            onclick="handleCommentVote('${comment.author}', '${comment.permlink}', 10000)">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <span class="comment-vote-count">${totalVotes}</span>
                    <button class="comment-downvote ${userVote < 0 ? 'voted-down' : ''}"
                            onclick="handleCommentVote('${comment.author}', '${comment.permlink}', -10000)">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="reply-btn" onclick="showReplyBox('${comment.author}', '${comment.permlink}')">
                        <i class="fas fa-reply"></i> Reply
                    </button>
                </div>
            </div>
            
            <div class="comment-replies">
                ${comment.replies ? comment.replies.map(reply => renderComment(reply)).join('') : ''}
            </div>
        </div>
    `;
}