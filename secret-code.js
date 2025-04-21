// SUPER SIMPLE SECRET CODE SYSTEM - ONLY A+F+T TRIGGER

// The secret code to check
const correctCode = "lovehive";

// Emojis for the animation
const emojis = ["❤️", "💖", "💕", "💓", "💗", "💘", "💝", "💞", "🌟", "✨", "🌈", "🦄", "🎉", "🎊", "😍"];

// For A+F+T combination tracking
const keysPressed = {
    a: false,
    f: false,
    t: false
};

// This function shows our secret box
function showSecretBox() {
    console.log("SHOWING SECRET BOX NOW!");
    
    // Check if box already exists
    if (document.querySelector('.secret-code-box')) {
        console.log("Box already exists");
        return;
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'secret-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // Create box
    const box = document.createElement('div');
    box.className = 'secret-code-box';
    box.style.backgroundColor = 'white';
    box.style.borderRadius = '10px';
    box.style.width = '300px';
    box.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    
    // Create header
    const header = document.createElement('div');
    header.style.padding = '15px';
    header.style.backgroundColor = '#f8f9fa';
    header.style.borderBottom = '1px solid #e9ecef';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h3');
    title.textContent = 'Secret Code';
    title.style.margin = '0';
    title.style.fontSize = '16px';
    title.style.color = '#343a40';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'transparent';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#6c757d';
    closeBtn.onclick = function() {
        document.body.removeChild(overlay);
    };
    
    // Create content
    const content = document.createElement('div');
    content.style.padding = '20px';
    
    const text = document.createElement('p');
    text.textContent = 'Enter the secret code:';
    text.style.margin = '0 0 15px 0';
    text.style.color = '#495057';
    
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Enter code...';
    input.style.width = '100%';
    input.style.padding = '8px 12px';
    input.style.border = '1px solid #ced4da';
    input.style.borderRadius = '4px';
    input.style.marginBottom = '15px';
    input.style.boxSizing = 'border-box';
    
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.style.backgroundColor = '#0d6efd';
    submitBtn.style.color = 'white';
    submitBtn.style.border = 'none';
    submitBtn.style.padding = '8px 16px';
    submitBtn.style.borderRadius = '4px';
    submitBtn.style.cursor = 'pointer';
    
    // Assemble the components
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    content.appendChild(text);
    content.appendChild(input);
    content.appendChild(submitBtn);
    
    box.appendChild(header);
    box.appendChild(content);
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    // Focus on input
    setTimeout(() => input.focus(), 100);
    
    // Handle submit click
    submitBtn.onclick = function() {
        checkCode(input.value, overlay);
    };
    
    // Handle enter key
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            checkCode(input.value, overlay);
        }
    };
    
    // Close when clicking overlay
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Check the entered code
function checkCode(code, overlay) {
    if (code === correctCode) {
        // Success - close box and start animation
        document.body.removeChild(overlay);
        startEmojiRain();
    } else {
        // Wrong code - shake the box
        const box = document.querySelector('.secret-code-box');
        box.style.animation = 'shake 0.5s';
        
        // Add shake animation if needed
        if (!document.querySelector('#shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Clear input
        document.querySelector('input').value = '';
        document.querySelector('input').focus();
    }
}

// Start emoji rain animation
function startEmojiRain() {
    console.log("Starting emoji rain!");
    
    // Create container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9998';
    
    document.body.appendChild(container);
    
    // Create animation style
    if (!document.querySelector('#falling-animation')) {
        const style = document.createElement('style');
        style.id = 'falling-animation';
        style.textContent = `
            @keyframes falling {
                0% {
                    transform: translateY(-10vh) rotate(0deg);
                    opacity: 1;
                }
                85% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(110vh) rotate(720deg);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create emojis
    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            emoji.style.position = 'fixed';
            emoji.style.left = `${Math.random() * 100}%`;
            emoji.style.fontSize = `${Math.floor(Math.random() * 24) + 16}px`;
            emoji.style.animation = `falling ${Math.random() * 3 + 2}s linear`;
            
            container.appendChild(emoji);
            
            // Remove after animation
            setTimeout(() => {
                emoji.remove();
            }, 5000);
        }, Math.random() * 1500);
    }
    
    // Remove container after animation
    setTimeout(() => {
        container.remove();
    }, 7000);
}

// Set up key event listeners - ONLY A+F+T COMBINATION WORKS
document.addEventListener('keydown', function(e) {
    console.log("KEY PRESSED:", e.key);
    
    // Update key state
    if (e.key.toLowerCase() === 'a') {
        keysPressed.a = true;
        console.log("A pressed, keysPressed:", keysPressed);
    }
    if (e.key.toLowerCase() === 'f') {
        keysPressed.f = true;
        console.log("F pressed, keysPressed:", keysPressed);
    }
    if (e.key.toLowerCase() === 't') {
        keysPressed.t = true;
        console.log("T pressed, keysPressed:", keysPressed);
    }
    
    // Check if A+F+T combination is active
    if (keysPressed.a && keysPressed.f && keysPressed.t) {
        console.log("A+F+T COMBINATION DETECTED!");
        showSecretBox();
        
        // Reset key states
        keysPressed.a = false;
        keysPressed.f = false;
        keysPressed.t = false;
    }
});

// Reset keys when they are released
document.addEventListener('keyup', function(e) {
    if (e.key.toLowerCase() === 'a') {
        keysPressed.a = false;
    }
    if (e.key.toLowerCase() === 'f') {
        keysPressed.f = false;
    }
    if (e.key.toLowerCase() === 't') {
        keysPressed.t = false;
    }
});

// Log that the script is loaded
console.log("Secret code script loaded - ONLY A+F+T COMBINATION WORKS!"); 