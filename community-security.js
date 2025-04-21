// Community Security Configuration

const communitySecurity = {
    // Sanitize community content
    sanitizeCommunityContent: (content) => {
        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'p', 'br', 'strong', 
                'em', 'img', 'a', 'ul', 'ol', 'li'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 
                'target', 'rel', 'class'
            ],
            ALLOW_DATA_ATTR: false,
            SANITIZE_DOM: true
        });
    },

    // Validate community name
    validateCommunityName: (name) => {
        const pattern = /^[a-zA-Z0-9-]{3,32}$/;
        return pattern.test(name);
    },

    // Validate community description
    validateDescription: (description) => {
        return description && 
               description.length >= 10 && 
               description.length <= 1000;
    },

    // Rate limiting for community actions
    communityActionLimit: (() => {
        const actions = new Map();
        const limit = 10; // actions per minute
        const timeWindow = 60 * 1000; // 1 minute

        return (username) => {
            const now = Date.now();
            const userActions = actions.get(username) || [];
            const recentActions = userActions.filter(time => now - time < timeWindow);
            
            if (recentActions.length >= limit) {
                return false;
            }

            recentActions.push(now);
            actions.set(username, recentActions);
            return true;
        };
    })(),

    // Validate community rules
    validateRules: (rules) => {
        if (!Array.isArray(rules)) return false;
        if (rules.length > 10) return false; // Max 10 rules
        
        return rules.every(rule => 
            typeof rule === 'string' && 
            rule.length >= 5 && 
            rule.length <= 200
        );
    },

    // Sanitize community metadata
    sanitizeMetadata: (metadata) => {
        const allowedFields = ['description', 'rules', 'language', 'nsfw'];
        const sanitized = {};
        
        for (const [key, value] of Object.entries(metadata)) {
            if (allowedFields.includes(key)) {
                sanitized[key] = typeof value === 'string' 
                    ? DOMPurify.sanitize(value)
                    : value;
            }
        }
        
        return sanitized;
    }
};

// Export community security utilities
window.communitySecurity = communitySecurity;
