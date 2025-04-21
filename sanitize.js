/**
 * HiveSanitizer - Comprehensive XSS protection for Hive-based websites
 * This library provides centralized sanitization functions to protect against
 * cross-site scripting (XSS) and other injection attacks.
 */

(function() {
    // Check if DOMPurify is available and load it if not
    if (typeof DOMPurify === 'undefined') {
        console.warn('DOMPurify is not loaded. HiveSanitizer will attempt to load it.');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.8/purify.min.js';
        script.integrity = 'sha512-1EQu5TBKIn2jN40glZ0S3rlgh3ov4n0r3UlAG5qbIJ/UUmMnmjBY3nnRSNXbcJFZ/xpQ53lWjC3GDbEMZmXB8g==';
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        document.head.appendChild(script);
        
        script.onload = function() {
            console.log('DOMPurify loaded successfully.');
            initializeSanitizer();
        };
        
        script.onerror = function() {
            console.error('Failed to load DOMPurify. HiveSanitizer will use fallback methods.');
            initializeSanitizer(true);
        };
    } else {
        initializeSanitizer();
    }

    function initializeSanitizer(useFallback = false) {
        // Configuration
        const config = {
            allowedTags: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div', 'br', 'hr',
                'b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img',
                'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
            ],
            allowedAttributes: {
                'a': ['href', 'target', 'rel', 'title'],
                'img': ['src', 'alt', 'title', 'width', 'height'],
                '*': ['class', 'id', 'style']
            },
            forbiddenTags: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'meta'],
            forbiddenAttributes: ['onerror', 'onload', 'onclick', 'onmouseover', 'eval']
        };
        
        // Global sanitizer object
        window.HiveSanitizer = {
            /**
             * Sanitizes HTML content to prevent XSS attacks
             * @param {string} html - The HTML string to sanitize
             * @param {boolean} allowMediaContent - Whether to allow media content (images, videos)
             * @returns {string} Sanitized HTML
             */
            sanitizeHTML: function(html, allowMediaContent = true) {
                if (!html) return '';
                
                if (useFallback) {
                    return this.fallbackSanitize(html, allowMediaContent);
                }
                
                const purifyConfig = {
                    ALLOWED_TAGS: allowMediaContent ? config.allowedTags : config.allowedTags.filter(tag => tag !== 'img'),
                    ALLOWED_ATTR: config.allowedAttributes,
                    FORBID_TAGS: config.forbiddenTags,
                    FORBID_ATTR: config.forbiddenAttributes,
                    ADD_URI_SAFE_ATTR: ['target'],
                    ALLOW_DATA_ATTR: false
                };
                
                return DOMPurify.sanitize(html, purifyConfig);
            },
            
            /**
             * Sanitizes plain text to be safely displayed
             * @param {string} text - Text to sanitize
             * @returns {string} Sanitized text
             */
            sanitizeText: function(text) {
                if (!text) return '';
                const textNode = document.createTextNode(text);
                const div = document.createElement('div');
                div.appendChild(textNode);
                return div.innerHTML;
            },
            
            /**
             * Sanitizes a URL to prevent javascript: protocol and other harmful links
             * @param {string} url - The URL to sanitize
             * @returns {string} Sanitized URL or empty string if harmful
             */
            sanitizeURL: function(url) {
                if (!url) return '';
                
                // Remove whitespace
                url = url.trim();
                
                // Check for javascript: or data: protocols
                if (/^(javascript|data|vbscript):/i.test(url)) {
                    console.warn('Potentially harmful URL blocked:', url);
                    return '';
                }
                
                // Ensure http/https for external links
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                }
                
                return url;
            },
            
            /**
             * Sanitizes Hive content specifically
             * @param {object} content - Hive content object
             * @returns {object} Sanitized content
             */
            sanitizeHiveContent: function(content) {
                if (!content) return {};
                
                // Create a deep copy to avoid modifying the original
                const sanitized = JSON.parse(JSON.stringify(content));
                
                if (sanitized.body) {
                    sanitized.body = this.sanitizeHTML(sanitized.body);
                }
                
                if (sanitized.title) {
                    sanitized.title = this.sanitizeText(sanitized.title);
                }
                
                if (sanitized.json_metadata) {
                    try {
                        if (typeof sanitized.json_metadata === 'string') {
                            const metadata = JSON.parse(sanitized.json_metadata);
                            // Sanitize specific fields in metadata
                            if (metadata.description) {
                                metadata.description = this.sanitizeText(metadata.description);
                            }
                            if (metadata.tags && Array.isArray(metadata.tags)) {
                                metadata.tags = metadata.tags.map(tag => this.sanitizeText(tag));
                            }
                            sanitized.json_metadata = JSON.stringify(metadata);
                        }
                    } catch (e) {
                        console.error('Failed to sanitize json_metadata:', e);
                        sanitized.json_metadata = '{}';
                    }
                }
                
                return sanitized;
            },
            
            /**
             * Sanitizes JSON input from API responses
             * @param {string|object} json - JSON string or object to sanitize
             * @returns {object} Sanitized JSON object
             */
            sanitizeJSON: function(json) {
                let obj;
                
                if (typeof json === 'string') {
                    try {
                        obj = JSON.parse(json);
                    } catch (e) {
                        console.error('Failed to parse JSON:', e);
                        return {};
                    }
                } else {
                    obj = json;
                }
                
                if (!obj) return {};
                
                // Process the object recursively
                this.sanitizeJSONObject(obj);
                
                return obj;
            },
            
            /**
             * Recursively sanitizes a JSON object
             * @param {object} obj - Object to sanitize
             */
            sanitizeJSONObject: function(obj) {
                if (!obj || typeof obj !== 'object') return;
                
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const value = obj[key];
                        
                        if (typeof value === 'string') {
                            // Detect if the string looks like HTML
                            if (/<[a-z][\s\S]*>/i.test(value)) {
                                obj[key] = this.sanitizeHTML(value);
                            }
                        } else if (Array.isArray(value)) {
                            value.forEach((item, index) => {
                                if (typeof item === 'object') {
                                    this.sanitizeJSONObject(item);
                                } else if (typeof item === 'string' && /<[a-z][\s\S]*>/i.test(item)) {
                                    value[index] = this.sanitizeHTML(item);
                                }
                            });
                        } else if (typeof value === 'object') {
                            this.sanitizeJSONObject(value);
                        }
                    }
                }
            },
            
            /**
             * Fallback sanitization method when DOMPurify is not available
             * @param {string} html - HTML to sanitize
             * @param {boolean} allowMediaContent - Whether to allow media content
             * @returns {string} Sanitized HTML
             */
            fallbackSanitize: function(html, allowMediaContent) {
                if (!html) return '';
                
                // Create a temporary element
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Remove forbidden tags
                config.forbiddenTags.forEach(tag => {
                    const elements = tempDiv.getElementsByTagName(tag);
                    for (let i = elements.length - 1; i >= 0; i--) {
                        const element = elements[i];
                        element.parentNode.removeChild(element);
                    }
                });
                
                // Remove forbidden attributes from all elements
                const allElements = tempDiv.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const element = allElements[i];
                    
                    // Check if this tag is allowed
                    if (!config.allowedTags.includes(element.tagName.toLowerCase())) {
                        // Replace with textContent
                        const text = element.textContent;
                        const textNode = document.createTextNode(text);
                        element.parentNode.replaceChild(textNode, element);
                        continue;
                    }
                    
                    // Check all attributes
                    for (let j = element.attributes.length - 1; j >= 0; j--) {
                        const attr = element.attributes[j];
                        const attrName = attr.name.toLowerCase();
                        
                        // Check for forbidden attributes
                        if (config.forbiddenAttributes.some(forbidden => attrName.includes(forbidden))) {
                            element.removeAttribute(attrName);
                            continue;
                        }
                        
                        // Check for javascript: in URLs
                        if ((attrName === 'href' || attrName === 'src') && 
                            (/^(javascript|data|vbscript):/i.test(attr.value))) {
                            element.removeAttribute(attrName);
                        }
                    }
                }
                
                // Optionally remove media content
                if (!allowMediaContent) {
                    const images = tempDiv.getElementsByTagName('img');
                    for (let i = images.length - 1; i >= 0; i--) {
                        images[i].parentNode.removeChild(images[i]);
                    }
                }
                
                return tempDiv.innerHTML;
            },
            
            /**
             * Auto-sanitize user-generated content on the page
             */
            autoSanitize: function() {
                // Find elements with user-generated content
                const userContentElements = document.querySelectorAll('[data-user-content]');
                
                userContentElements.forEach(element => {
                    const allowMedia = element.getAttribute('data-allow-media') !== 'false';
                    element.innerHTML = this.sanitizeHTML(element.innerHTML, allowMedia);
                });
                
                // Add an attribute to show this has been sanitized
                userContentElements.forEach(el => {
                    el.setAttribute('data-sanitized', 'true');
                });
            }
        };
        
        // Extend the HTMLElement prototype to provide safe insertion methods
        HTMLElement.prototype.safeHTML = function(html) {
            this.innerHTML = HiveSanitizer.sanitizeHTML(html);
            return this;
        };
        
        HTMLElement.prototype.safeText = function(text) {
            this.textContent = text;
            return this;
        };
        
        // Auto-sanitize on content load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                HiveSanitizer.autoSanitize();
            });
        } else {
            HiveSanitizer.autoSanitize();
        }
        
        // Monkey-patch fetch to sanitize JSON responses
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            return originalFetch.apply(this, args).then(response => {
                const originalJson = response.json;
                response.json = function() {
                    return originalJson.call(this).then(data => {
                        return HiveSanitizer.sanitizeJSON(data);
                    });
                };
                return response;
            });
        };
        
        // Intercept document.write to sanitize content
        const originalWrite = document.write;
        document.write = function(html) {
            return originalWrite.call(this, HiveSanitizer.sanitizeHTML(html));
        };
        
        // Create a symbol to mark safe HTML
        const SAFE_HTML = Symbol('SAFE_HTML');
        
        // Create a method to mark HTML as already sanitized
        String.prototype.markAsSafe = function() {
            const safe = Object(this);
            safe[SAFE_HTML] = true;
            return safe;
        };
        
        // Safe version that checks if HTML is already sanitized
        function isSafe(html) {
            return html && html[SAFE_HTML] === true;
        }
        
        // Override innerHTML property
        const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        
        Object.defineProperty(Element.prototype, 'innerHTML', {
            set: function(html) {
                // Only sanitize if not already marked as safe
                if (!isSafe(html) && !this.hasAttribute('data-bypass-sanitizer')) {
                    // Check if this is a user content area
                    const needsSanitizing = 
                        this.hasAttribute('data-user-content') || 
                        this.classList.contains('user-content') ||
                        this.classList.contains('comment') ||
                        this.classList.contains('post-content');
                    
                    if (needsSanitizing) {
                        html = HiveSanitizer.sanitizeHTML(html);
                    }
                }
                return originalInnerHTMLDescriptor.set.call(this, html);
            },
            get: originalInnerHTMLDescriptor.get,
            configurable: true
        });
    }
})(); 