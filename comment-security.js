// Comment Security Configuration

const commentSecurity = {
    // Sanitize comment content
    sanitizeComment: (content) => {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 'code',
                'blockquote', 'a', 'ul', 'ol', 'li'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
            SANITIZE_DOM: true
        });
    },

    // Validate comment input
    validateCommentInput: (input) => {
        // Check length
        if (!input || input.length < 1 || input.length > 65535) {
            return false;
        }
        
        // Basic content validation
        const pattern = /^[\s\S]*$/; // Allow multiline content
        return pattern.test(input);
    },

    // Rate limiting for comments
    commentRateLimit: (() => {
        const comments = new Map();
        const limit = 5; // comments per minute
        const timeWindow = 60 * 1000; // 1 minute

        return (username) => {
            const now = Date.now();
            const userComments = comments.get(username) || [];
            const recentComments = userComments.filter(time => now - time < timeWindow);
            
            if (recentComments.length >= limit) {
                return false;
            }

            recentComments.push(now);
            comments.set(username, recentComments);
            return true;
        };
    })(),

    // Prevent spam links
    validateLinks: (content) => {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlPattern) || [];
        return urls.length <= 3; // Maximum 3 links per comment
    }
};

// Export comment security utilities
window.commentSecurity = commentSecurity;
