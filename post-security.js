// Post Security Configuration

const postSecurity = {
    // Sanitize post content
    sanitizePostContent: (content) => {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'p', 'br', 'hr', 'strong', 'em', 'u',
                'code', 'pre', 'blockquote', 'a', 'img',
                'ul', 'ol', 'li', 'table', 'thead', 'tbody',
                'tr', 'th', 'td'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title',
                'target', 'rel', 'class', 'id'
            ],
            ALLOW_DATA_ATTR: false,
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['allowfullscreen', 'frameborder', 'sandbox'],
            SANITIZE_DOM: true
        });
    },

    // Validate post title
    validateTitle: (title) => {
        return title && 
               title.length >= 3 && 
               title.length <= 255 &&
               /^[\w\s\-.,!?'"()]+$/.test(title);
    },

    // Validate post tags
    validateTags: (tags) => {
        if (!Array.isArray(tags)) return false;
        if (tags.length > 8) return false; // Max 8 tags
        
        return tags.every(tag => 
            typeof tag === 'string' &&
            tag.length >= 2 &&
            tag.length <= 24 &&
            /^[a-z0-9-]+$/.test(tag)
        );
    },

    // Rate limiting for posts
    postRateLimit: (() => {
        const posts = new Map();
        const limit = 4; // posts per hour
        const timeWindow = 60 * 60 * 1000; // 1 hour

        return (username) => {
            const now = Date.now();
            const userPosts = posts.get(username) || [];
            const recentPosts = userPosts.filter(time => now - time < timeWindow);
            
            if (recentPosts.length >= limit) {
                return false;
            }

            recentPosts.push(now);
            posts.set(username, recentPosts);
            return true;
        };
    })(),

    // Validate image URLs
    validateImageUrl: (url) => {
        if (!url) return false;
        
        // Check if URL is from allowed domains
        const allowedDomains = [
            'images.hive.blog',
            'images.ecency.com',
            'files.peakd.com'
        ];
        
        try {
            const urlObj = new URL(url);
            return allowedDomains.some(domain => 
                urlObj.hostname === domain
            );
        } catch {
            return false;
        }
    },

    // Sanitize post metadata
    sanitizeMetadata: (metadata) => {
        const allowedFields = [
            'tags', 'image', 'app', 'format',
            'community', 'language'
        ];
        const sanitized = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            if (allowedFields.includes(key)) {
                if (key === 'image') {
                    sanitized[key] = postSecurity.validateImageUrl(value) 
                        ? value 
                        : '';
                } else {
                    sanitized[key] = typeof value === 'string'
                        ? DOMPurify.sanitize(value)
                        : value;
                }
            }
        }
        
        return sanitized;
    }
};

// Export post security utilities
window.postSecurity = postSecurity;
