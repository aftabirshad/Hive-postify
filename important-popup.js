// Important Announcement Popup System
document.addEventListener('DOMContentLoaded', function() {
    // Add a console log to verify the script is running
    console.log("Important Notice popup script is running");
    
    // Always clear previous notice to ensure it shows again
    // Comment this line out when you want normal behavior
    sessionStorage.removeItem('importantNotice-notice-2023-06-01');
    
    // Configuration (admin can modify these values)
    const importantNotice = {
        enabled: true, // Change to false to turn off the popup for all users
        title: "Important Announcement",
        message: "This is an important announcement for all users. We do not store any user data such as username, password, or IP address.✅ We do not use any kind of IP detection or tracking system.. You are Free To Use",
        noticeId: "notice-2023-06-01", // Change this ID whenever you want to show the popup to all users again
        buttonText: "I Understand", // Text for the acknowledgment button
        theme: "glass-blue", // Options: "glass-blue", "glass-purple", "glass-green", "glass-white", "glass-dark"
        position: "center", // Options: "center", "bottom-right"
        blur: "medium" // Options: "light", "medium", "heavy"
    };
    
    // Only show if the announcement is enabled and user hasn't seen this specific notice ID
    if (importantNotice.enabled && sessionStorage.getItem('importantNotice-' + importantNotice.noticeId) !== 'seen') {
        console.log("Showing important notice popup");
        createImportantPopup();
        
        // Mark this specific notice as seen for this session
        sessionStorage.setItem('importantNotice-' + importantNotice.noticeId, 'seen');
    } else {
        console.log("Notice already seen or disabled", {
            enabled: importantNotice.enabled,
            seenInSession: sessionStorage.getItem('importantNotice-' + importantNotice.noticeId) === 'seen'
        });
    }
    
    function createImportantPopup() {
        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'important-popup';
        popup.setAttribute('data-theme', importantNotice.theme);
        popup.setAttribute('data-position', importantNotice.position);
        popup.setAttribute('data-blur', importantNotice.blur);
        
        popup.innerHTML = `
            <div class="important-popup-overlay"></div>
            <div class="important-popup-glass">
                <div class="important-popup-header">
                    <h3 class="important-popup-title">${importantNotice.title}</h3>
                    <button class="important-popup-close" aria-label="Close">
                        <svg viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="important-popup-body">
                    <div class="important-popup-message">
                        <p>${importantNotice.message}</p>
                    </div>
                </div>
                <div class="important-popup-footer">
                    <button class="important-popup-button">
                        ${importantNotice.buttonText}
                    </button>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            @keyframes popIn {
                0% { transform: translate(-50%, -50%) scale(0.95); opacity: 0; }
                70% { transform: translate(-50%, -50%) scale(1.02); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            .important-popup {
                position: fixed;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            
            .important-popup * {
                box-sizing: border-box;
            }
            
            .important-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(5px);
                z-index: -1;
                animation: fadeIn 0.4s ease-out;
            }
            
            .important-popup[data-position="center"] {
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                animation: popIn 0.5s ease-out forwards;
            }
            
            .important-popup[data-position="bottom-right"] {
                bottom: 30px;
                right: 30px;
                animation: slideUp 0.5s ease-out forwards;
            }
            
            .important-popup-glass {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: var(--blur-strength);
                -webkit-backdrop-filter: var(--blur-strength);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                border-radius: 16px;
                width: 380px;
                max-width: 95vw;
                overflow: hidden;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .important-popup-glass:hover {
                transform: translateY(-5px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }
            
            /* Blur variations */
            .important-popup[data-blur="light"] {
                --blur-strength: blur(5px);
            }
            
            .important-popup[data-blur="medium"] {
                --blur-strength: blur(10px);
            }
            
            .important-popup[data-blur="heavy"] {
                --blur-strength: blur(20px);
            }
            
            /* Glass Blue Theme */
            .important-popup[data-theme="glass-blue"] {
                --text-color: rgba(255, 255, 255, 0.9);
                --accent-color: rgba(59, 130, 246, 0.8);
                --glass-bg: rgba(59, 130, 246, 0.2);
                --glass-border: rgba(59, 130, 246, 0.3);
                --button-bg: rgba(59, 130, 246, 0.7);
                --button-hover: rgba(37, 99, 235, 0.8);
            }
            
            /* Glass Purple Theme */
            .important-popup[data-theme="glass-purple"] {
                --text-color: rgba(255, 255, 255, 0.9);
                --accent-color: rgba(139, 92, 246, 0.8);
                --glass-bg: rgba(139, 92, 246, 0.2);
                --glass-border: rgba(139, 92, 246, 0.3);
                --button-bg: rgba(139, 92, 246, 0.7);
                --button-hover: rgba(124, 58, 237, 0.8);
            }
            
            /* Glass Green Theme */
            .important-popup[data-theme="glass-green"] {
                --text-color: rgba(255, 255, 255, 0.9);
                --accent-color: rgba(16, 185, 129, 0.8);
                --glass-bg: rgba(16, 185, 129, 0.2);
                --glass-border: rgba(16, 185, 129, 0.3);
                --button-bg: rgba(16, 185, 129, 0.7);
                --button-hover: rgba(5, 150, 105, 0.8);
            }
            
            /* Glass White Theme */
            .important-popup[data-theme="glass-white"] {
                --text-color: rgba(31, 41, 55, 0.9);
                --accent-color: rgba(209, 213, 219, 0.8);
                --glass-bg: rgba(255, 255, 255, 0.6);
                --glass-border: rgba(255, 255, 255, 0.5);
                --button-bg: rgba(31, 41, 55, 0.7);
                --button-hover: rgba(17, 24, 39, 0.8);
            }
            
            /* Glass Dark Theme */
            .important-popup[data-theme="glass-dark"] {
                --text-color: rgba(255, 255, 255, 0.9);
                --accent-color: rgba(75, 85, 99, 0.8);
                --glass-bg: rgba(31, 41, 55, 0.6);
                --glass-border: rgba(55, 65, 81, 0.5);
                --button-bg: rgba(75, 85, 99, 0.7);
                --button-hover: rgba(55, 65, 81, 0.8);
            }
            
            .important-popup-glass {
                background: var(--glass-bg);
                border-color: var(--glass-border);
            }
            
            .important-popup-header {
                padding: 16px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .important-popup-title {
                margin: 0;
                color: var(--text-color);
                font-size: 18px;
                font-weight: 500;
                letter-spacing: 0.3px;
            }
            
            .important-popup-close {
                background: transparent;
                border: none;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                cursor: pointer;
                opacity: 0.7;
                transition: all 0.2s ease;
            }
            
            .important-popup-close svg {
                width: 18px;
                height: 18px;
                fill: var(--text-color);
            }
            
            .important-popup-close:hover {
                opacity: 1;
                background: rgba(255, 255, 255, 0.1);
                transform: rotate(90deg);
            }
            
            .important-popup-body {
                padding: 20px;
            }
            
            .important-popup-message {
                color: var(--text-color);
                font-size: 14px;
                line-height: 1.6;
            }
            
            .important-popup-message p {
                margin: 0;
            }
            
            .important-popup-footer {
                padding: 0 20px 20px 20px;
                text-align: right;
            }
            
            .important-popup-button {
                background: var(--button-bg);
                color: #ffffff;
                border: none;
                padding: 8px 20px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .important-popup-button:hover {
                background: var(--button-hover);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            }
            
            .important-popup-button:active {
                transform: translateY(0);
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .important-popup[data-position="bottom-right"] {
                    bottom: 20px;
                    right: 20px;
                    left: 20px;
                    width: auto;
                }
                
                .important-popup-glass {
                    width: 100%;
                }
                
                .important-popup-header {
                    padding: 14px 16px;
                }
                
                .important-popup-body {
                    padding: 16px;
                }
                
                .important-popup-footer {
                    padding: 0 16px 16px 16px;
                }
            }
        `;
        
        // Add to DOM
        document.head.appendChild(style);
        document.body.appendChild(popup);
        
        // Handle closing
        const closeBtn = popup.querySelector('.important-popup-close');
        const actionBtn = popup.querySelector('.important-popup-button');
        
        function closePopup() {
            popup.style.opacity = '0';
            popup.style.transform = popup.getAttribute('data-position') === 'center' 
                ? 'translate(-50%, -50%) scale(0.95)' 
                : 'translateY(20px)';
            popup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            setTimeout(() => popup.remove(), 300);
        }
        
        closeBtn.addEventListener('click', closePopup);
        actionBtn.addEventListener('click', closePopup);
    }
}); 