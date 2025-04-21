// Reply Box Security Configuration

const replyboxSecurity = {
    // Sanitize reply content
    sanitizeReplyContent: (content) => {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u',
                'code', 'blockquote', 'a', 'ul',
                'ol', 'li'
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
            SANITIZE_DOM: true
        });
    },

    // Validate reply input
    validateReplyInput: (input) => {
        // Check length
        if (!input || input.length < 1 || input.length > 65535) {
            return false;
        }
        
        // Basic content validation
        const pattern = /^[\s\S]*$/; // Allow multiline content
        return pattern.test(input);
    },

    // Rate limiting for replies
    replyRateLimit: (() => {
        const replies = new Map();
        const limit = 10; // replies per minute
        const timeWindow = 60 * 1000; // 1 minute

        return (username) => {
            const now = Date.now();
            const userReplies = replies.get(username) || [];
            const recentReplies = userReplies.filter(time => now - time < timeWindow);
            
            if (recentReplies.length >= limit) {
                return false;
            }

            recentReplies.push(now);
            replies.set(username, recentReplies);
            return true;
        };
    })(),

    // Prevent spam links
    validateLinks: (content) => {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlPattern) || [];
        return urls.length <= 2; // Maximum 2 links per reply
    },

    // Validate mentions
    validateMentions: (content) => {
        const mentions = content.match(/@[\w.-]+/g) || [];
        return mentions.length <= 5; // Maximum 5 mentions per reply
    },

    // Sanitize reply metadata
    sanitizeMetadata: (metadata) => {
        const allowedFields = ['parent_author', 'parent_permlink', 'json_metadata'];
        const sanitized = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            if (allowedFields.includes(key)) {
                sanitized[key] = typeof value === 'string'
                    ? DOMPurify.sanitize(value)
                    : value;
            }
        }
        
        return sanitized;
    },

    // Validate reply depth
    validateReplyDepth: (depth) => {
        return typeof depth === 'number' && 
               depth >= 0 && 
               depth <= 255; // Maximum reply depth
    }
};

// Export replybox security utilities
window.replyboxSecurity = replyboxSecurity;
