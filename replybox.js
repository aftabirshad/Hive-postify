// Handle reply functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add click handler to reply button
    document.addEventListener('click', function(e) {
        const replyButton = e.target.closest('.reply');
        if (replyButton) {
            e.preventDefault();
            const parentAuthor = replyButton.getAttribute('data-parent-author');
            const parentPermlink = replyButton.getAttribute('data-parent-permlink');
            showReplyBox(parentAuthor, parentPermlink);
        }

        if (e.target.closest('.toolbar button')) {
            e.preventDefault();
            const button = e.target.closest('.toolbar button');
            
            if (button.classList.contains('upload-btn')) {
                uploadImage();
            } else {
                const format = button.getAttribute('data-format');
                if (format) {
                    const [prefix, suffix] = format.split('|');
                    insertFormat(prefix, suffix || '');
                }
            }
        }

        // Handle close button
        if (e.target.closest('.close-btn')) {
            e.preventDefault();
            closeReplyBox();
        }

        // Handle cancel button
        if (e.target.closest('.cancel-btn')) {
            e.preventDefault();
            closeReplyBox();
        }

        // Handle submit button
        if (e.target.closest('.submit-btn')) {
            e.preventDefault();
            const replyBox = document.getElementById('replyBox');
            const parentAuthor = replyBox.getAttribute('data-parent-author');
            const parentPermlink = replyBox.getAttribute('data-parent-permlink');
            submitReply(parentAuthor, parentPermlink);
        }
    });
});

function showReplyBox(parentAuthor, parentPermlink) {
    // Create reply box if it doesn't exist
    if (!document.getElementById('replyBox')) {
        const replyBox = document.createElement('div');
        replyBox.id = 'replyBox';
        replyBox.className = 'replybox';
        replyBox.setAttribute('data-parent-author', parentAuthor);
        replyBox.setAttribute('data-parent-permlink', parentPermlink);
        replyBox.innerHTML = `
            <div class="replybox-container">
                <div class="replybox-header">
                    <h3>Write a Reply</h3>
                    <button class="close-btn">×</button>
                </div>
                
                <div class="toolbar">
                    <button data-format="**|**" title="Bold"><i class="fas fa-bold"></i></button>
                    <button data-format="*|*" title="Italic"><i class="fas fa-italic"></i></button>
                    <button data-format="# |" title="Heading"><i class="fas fa-heading"></i></button>
                    <button data-format="\`|\`" title="Code"><i class="fas fa-code"></i></button>
                    <button data-format="\`\`\`\\n|\\n\`\`\`" title="Code Block"><i class="fas fa-file-code"></i></button>
                    <button data-format="> |" title="Quote"><i class="fas fa-quote-right"></i></button>
                    <button data-format="- |" title="List"><i class="fas fa-list-ul"></i></button>
                    <button data-format="1. |" title="Numbered List"><i class="fas fa-list-ol"></i></button>
                    <button data-format="[|](url)" title="Link"><i class="fas fa-link"></i></button>
                    <button data-format="![|](url)" title="Image"><i class="fas fa-image"></i></button>
                    <button class="upload-btn" title="Upload Image">
                        <i class="fas fa-upload"></i>
                    </button>
                    <input type="file" id="imageUpload" accept="image/jpeg,image/png,image/gif,image/webp,image/bmp" style="display: none">
                </div>

                <div class="editor-area">
                    <textarea id="replyText" placeholder="Write your reply here..." oninput="updatePreview()"></textarea>
                    <div id="preview" class="preview"></div>
                </div>

                <div class="replybox-footer">
                    <div class="action-buttons">
                        <button class="cancel-btn">Cancel</button>
                        <button class="submit-btn">Submit</button>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(replyBox);
        
        // Setup image upload
        document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
        
        // Focus textarea and initialize preview
        const textarea = document.getElementById('replyText');
        textarea.focus();
        updatePreview();
    }
}

function insertFormat(prefix, suffix) {
    const textarea = document.getElementById('replyText');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    textarea.value = before + prefix + selected + suffix + after;
    textarea.focus();
    
    // Put cursor after inserted text
    const newCursor = start + prefix.length + selected.length + suffix.length;
    textarea.setSelectionRange(newCursor, newCursor);
    
    // Update preview immediately
    updatePreview();
}

function updatePreview() {
    const text = document.getElementById('replyText').value;
    const preview = document.getElementById('preview');
    
    // Convert markdown to HTML and sanitize
    const html = marked.parse(text);
    const sanitized = DOMPurify.sanitize(html);
    
    preview.innerHTML = sanitized || '<p class="placeholder">Preview will appear here...</p>';
}

function uploadImage() {
    document.getElementById('imageUpload').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, GIF, WebP, or BMP)');
        return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        alert('Image size must be less than 5MB');
        return;
    }

    try {
        // Show loading state
        const uploadBtn = document.querySelector('.upload-btn');
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        uploadBtn.disabled = true;

        // Create FormData
        const formData = new FormData();
        formData.append('source', file);
        formData.append('type', 'file');
        formData.append('action', 'upload');
        formData.append('timestamp', Date.now());

        // Upload to ImgBB anonymously
        const response = await fetch('https://imgbb.com/json', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error('Upload failed: ' + (data.error || 'Unknown error'));
        }

        // Insert the image markdown
        const altText = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        insertFormat(`![${altText}](`, `${data.image.url})`);

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Image upload error:', error);
        alert('Failed to upload image: ' + error.message + '\nPlease try again.');
    } finally {
        // Reset upload button
        const uploadBtn = document.querySelector('.upload-btn');
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i>';
        uploadBtn.disabled = false;
    }
}

function insertImageMarkdown(filename, imageUrl) {
    const altText = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    insertFormat(`![${altText}](`, `${imageUrl})`);
}

function closeReplyBox() {
    const replyBox = document.getElementById('replyBox');
    if (replyBox) {
        replyBox.remove();
    }
}

async function submitReply(parentAuthor, parentPermlink) {
    const content = document.getElementById('replyText').value.trim();
    if (!content) {
        alert('Please write something before submitting.');
        return;
    }

    const username = localStorage.getItem('hiveUser');
    const postingKey = localStorage.getItem('hivePostingKey');

    if (!username || !postingKey) {
        window.pendingReply = { parentAuthor, parentPermlink, content };
        showLoginModal();
        return;
    }

    try {
        const client = new dhive.Client(['https://api.hive.blog']);
        const privateKey = dhive.PrivateKey.from(postingKey);
        const permlink = 're-' + parentPermlink + '-' + Math.floor(Date.now() / 1000);

        await client.broadcast.comment({
            parent_author: parentAuthor,
            parent_permlink: parentPermlink,
            author: username,
            permlink: permlink,
            title: '',
            body: content,
            json_metadata: JSON.stringify({
                app: 'hivetube',
                format: 'markdown'
            })
        }, privateKey);

        // Close reply box and refresh comments
        closeReplyBox();
        if (typeof loadComments === 'function') {
            loadComments();
        }

    } catch (error) {
        console.error('Error submitting reply:', error);
        alert('Failed to submit reply: ' + error.message);
    }
}