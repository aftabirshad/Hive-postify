// Maintenance Mode Popup System
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const maintenanceMode = {
        enabled: true, // Set to true to enable maintenance mode
        title: "Maintenance in Progress",
        message: "We are making some changes to our website based on Aftab's feedback, which he has requested or our shortcomings, we will fix it soon, but it will take us some time because I am bringing a transfer function to my HiveCeleo  website, which will show the details of the fund transfer. ",
        startTime: "Apr 26, 2025 - 12:31 PM", 
        endTime: "Apr 2025 not Defined Exect Date",
        allowClose: true, // Even if true, popup will reappear on any interaction
        redirectUrl: null, // Set to a URL if you want to redirect users instead of showing the popup
        compactMode: true // Set to true for a more compact popup
    };
    
    // Only proceed if maintenance mode is enabled
    if (maintenanceMode.enabled) {
        // Handle redirect option if set
        if (maintenanceMode.redirectUrl) {
            window.location.href = maintenanceMode.redirectUrl;
            return;
        }
        
        // Create a site-wide blocker element to prevent clicks
        const blocker = document.createElement('div');
        blocker.className = 'maintenance-blocker';
        document.body.appendChild(blocker);
        
        // Create popup elements
        const popup = createMaintenancePopup();
        document.body.appendChild(popup);
        
        // Add styles for both popup and blocker
        addMaintenanceStyles();
        
        // Prevent scrolling on the body while maintenance popup is shown
        document.body.style.overflow = 'hidden';
        
        // Handle close button if allowed
        if (maintenanceMode.allowClose) {
            const closeBtn = popup.querySelector('.close-maintenance');
            closeBtn.addEventListener('click', function(e) {
                // Prevent event bubbling
                e.stopPropagation();
                
                // Hide popup temporarily
                popup.style.opacity = '0';
                popup.style.visibility = 'hidden';
                
                // Set a flag in session storage
                sessionStorage.setItem('maintenanceDismissed', 'true');
            });
        }
        
        // Reappear when clicking anywhere on the document (except the close button)
        document.addEventListener('click', function(e) {
            // Skip if clicking inside the popup itself
            if (e.target.closest('.maintenance-content') && !e.target.closest('.maintenance-footer')) {
                return;
            }
            
            // Show popup again
            popup.style.opacity = '1';
            popup.style.visibility = 'visible';
        });
        
        // Also reappear when keyboard events or form submissions occur
        document.addEventListener('keydown', function() {
            popup.style.opacity = '1';
            popup.style.visibility = 'visible';
        });
        
        document.addEventListener('submit', function(e) {
            e.preventDefault();
            popup.style.opacity = '1';
            popup.style.visibility = 'visible';
        });
    }
    
    // Function to create the maintenance popup
    function createMaintenancePopup() {
        const popup = document.createElement('div');
        popup.className = 'maintenance-popup';
        
        popup.innerHTML = `
            <div class="maintenance-content">
                <div class="maintenance-header">
                    <div class="gears-animation">
                        <div class="gear-large"></div>
                        <div class="gear-small"></div>
                    </div>
                    <h3>${maintenanceMode.title}</h3>
                    ${maintenanceMode.allowClose ? '<button class="close-maintenance">&times;</button>' : ''}
                </div>
                <div class="maintenance-body">
                    <div class="maintenance-illustration">
                        <div class="tools-animation">
                            <div class="wrench"></div>
                            <div class="screwdriver"></div>
                            <div class="hammer"></div>
                        </div>
                    </div>
                    <div class="maintenance-message">
                        <p>${maintenanceMode.message}</p>
                    </div>
                    ${maintenanceMode.startTime ? `
                    <div class="maintenance-time">
                        <div class="progress-container">
                            <div class="progress-bar"></div>
                        </div>
                        <p><strong>Maintenance Period:</strong></p>
                        <div class="time-range">
                            <span class="start-time">${maintenanceMode.startTime}</span>
                            <span class="time-separator">to</span>
                            <span class="end-time">${maintenanceMode.endTime}</span>
                        </div>
                    </div>` : ''}
                    
                    <div class="loading-indicator">
                        <div class="loading-dot dot1"></div>
                        <div class="loading-dot dot2"></div>
                        <div class="loading-dot dot3"></div>
                    </div>
                </div>
                
                <div class="maintenance-footer">
                    <div class="created-by">
                        <p>Website created by <strong>Aftabirshad</strong></p>
                    </div>
                </div>
            </div>
        `;
        
        return popup;
    }
    
    // Function to add all maintenance-related styles
    function addMaintenanceStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0px); }
            }
            
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes counterRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(-360deg); }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-15px); }
                60% { transform: translateY(-7px); }
            }
            
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes loading {
                0% { transform: scale(1); }
                20% { transform: scale(1.3); }
                40% { transform: scale(1); }
            }
            
            @keyframes progressAnimation {
                0% { width: 5%; }
                100% { width: 95%; }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            /* Site blocker - covers the entire page */
            .maintenance-blocker {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                cursor: not-allowed;
            }
            
            .maintenance-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(15,25,55,0.9) 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.5s ease-out;
                backdrop-filter: blur(8px);
                transition: opacity 0.3s ease, visibility 0.3s ease;
            }
            
            .maintenance-content {
                background: linear-gradient(145deg, #ffffff, #f7f9fd);
                border-radius: 14px;
                width: 85%;
                max-width: 480px;
                box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.3), 
                            0 0 0 1px rgba(255, 255, 255, 0.1),
                            0 0 0 4px rgba(78, 84, 200, 0.1);
                overflow: hidden;
                position: relative;
                transform: perspective(1000px) rotateX(0deg);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                animation: fadeInUp 0.5s forwards;
            }
            
            .maintenance-content:hover {
                transform: perspective(1000px) rotateX(2deg) translateY(-5px);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35),
                            0 0 0 1px rgba(255, 255, 255, 0.15),
                            0 0 0 5px rgba(78, 84, 200, 0.15);
            }
            
            .maintenance-header {
                padding: 18px 20px;
                background: linear-gradient(135deg, #4361ee, #7209b7);
                color: white;
                text-align: center;
                position: relative;
                overflow: hidden;
                display: flex;
                justify-content: center;
                align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .maintenance-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%);
                animation: pulse 4s infinite ease-in-out;
            }
            
            .maintenance-header::after {
                content: '';
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 1px;
                background: linear-gradient(90deg, 
                                transparent, 
                                rgba(255,255,255,0.3), 
                                transparent);
            }
            
            .maintenance-header h3 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                position: relative;
                z-index: 2;
                letter-spacing: 0.5px;
            }
            
            .close-maintenance {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                font-size: 1.3rem;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                z-index: 5;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .close-maintenance:hover {
                background: rgba(255,255,255,0.25);
                transform: rotate(90deg);
            }
            
            .maintenance-body {
                padding: 22px 25px;
                text-align: center;
                position: relative;
            }
            
            .maintenance-illustration {
                height: 90px;
                margin-bottom: 15px;
                position: relative;
                background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGggZD0iTTIwIDgwQzIwIDY4Ljk1NDMgMjguOTU0MyA2MCA0MCA2MEg1MEM2MS4wNDU3IDYwIDcwIDUxLjA0NTcgNzAgNDBWMzBDNzAgMTguOTU0MyA3OC45NTQzIDEwIDkwIDEwSDExMEMxMjEuMDQ2IDEwIDEzMCAxOC45NTQzIDEzMCAzMFY0MEMxMzAgNTEuMDQ1NyAxMzguOTU0IDYwIDE1MCA2MEgxNjBDMTcxLjA0NiA2MCAxODAgNjguOTU0MyAxODAgODBWOTAiIHN0cm9rZT0iIzRlNTRjOCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtZGFzaGFycmF5PSI4IDgiLz4KPC9zdmc+');
                background-position: center;
                background-repeat: no-repeat;
                animation: float 5s ease-in-out infinite;
            }
            
            .gears-animation {
                position: absolute;
                top: 12px;
                left: 20px;
                width: 45px;
                height: 45px;
            }
            
            .gear-large {
                position: absolute;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 4px dashed rgba(255,255,255,0.5);
                animation: rotate 10s linear infinite;
            }
            
            .gear-small {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px dashed rgba(255,255,255,0.5);
                animation: counterRotate 7s linear infinite;
            }
            
            .tools-animation {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }
            
            .wrench, .screwdriver, .hammer {
                position: absolute;
                opacity: 0.8;
            }
            
            .wrench {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: #4361ee;
                left: 50%;
                margin-left: -50px;
                animation: bounce 4s infinite ease-in-out;
            }
            
            .wrench::before {
                content: "🔧";
                font-size: 24px;
                line-height: 32px;
            }
            
            .screwdriver {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: #7209b7;
                animation: bounce 4s 0.5s infinite ease-in-out;
            }
            
            .screwdriver::before {
                content: "🔩";
                font-size: 24px;
                line-height: 32px;
            }
            
            .hammer {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: #4361ee;
                right: 50%;
                margin-right: -50px;
                animation: bounce 4s 1s infinite ease-in-out;
            }
            
            .hammer::before {
                content: "🔨";
                font-size: 24px;
                line-height: 32px;
            }
            
            .maintenance-message {
                background: linear-gradient(135deg, #f8faff 0%, #eef1f8 100%);
                padding: 16px 18px;
                border-radius: 10px;
                margin-bottom: 18px;
                box-shadow: 0 3px 5px rgba(0, 0, 0, 0.03), 
                            inset 0 0 0 1px rgba(255, 255, 255, 0.7),
                            inset 0 2px 0 0 rgba(255, 255, 255, 1);
                border: 1px solid rgba(0,0,0,0.05);
            }
            
            .maintenance-message p {
                font-size: 0.95rem;
                margin: 0;
                color: #4a4a68;
                line-height: 1.5;
                font-weight: 500;
            }
            
            .maintenance-time {
                background: linear-gradient(135deg, #f8faff 0%, #eef1f8 100%);
                border-radius: 10px;
                padding: 16px 18px;
                margin-top: 15px;
                box-shadow: 0 3px 5px rgba(0, 0, 0, 0.03), 
                            inset 0 0 0 1px rgba(255, 255, 255, 0.7),
                            inset 0 2px 0 0 rgba(255, 255, 255, 1);
                border: 1px solid rgba(0,0,0,0.05);
            }
            
            .maintenance-time p {
                color: #4a4a68;
                margin: 0 0 8px 0;
                font-size: 0.9rem;
                font-weight: 600;
            }
            
            .time-range {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                color: #4361ee;
                font-weight: 600;
                font-size: 0.85rem;
            }
            
            .time-separator {
                color: #8f94fb;
                font-weight: normal;
            }
            
            .progress-container {
                height: 6px;
                width: 100%;
                background-color: rgba(0,0,0,0.04);
                border-radius: 3px;
                margin: 10px 0;
                overflow: hidden;
            }
            
            .progress-bar {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4361ee, #7209b7);
                border-radius: 3px;
                animation: progressAnimation 15s ease-in-out infinite alternate;
                background-size: 200% 100%;
                background-image: linear-gradient(90deg, #4361ee, #7209b7, #4361ee);
                animation: progressAnimation 15s ease-in-out infinite alternate, shimmer 3s infinite linear;
            }
            
            .loading-indicator {
                display: flex;
                justify-content: center;
                gap: 6px;
                margin-top: 15px;
            }
            
            .loading-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #4361ee;
            }
            
            .dot1 {
                animation: loading 1.5s 0s infinite;
            }
            
            .dot2 {
                animation: loading 1.5s 0.3s infinite;
            }
            
            .dot3 {
                animation: loading 1.5s 0.6s infinite;
            }
            
            .maintenance-footer {
                border-top: 1px solid rgba(0,0,0,0.04);
                padding: 12px 20px;
                text-align: center;
                background: rgba(78, 84, 200, 0.03);
            }
            
            .created-by {
                font-size: 0.8rem;
                color: #8f94fb;
            }
            
            .created-by strong {
                color: #4361ee;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Media query for smaller screens */
            @media (max-width: 480px) {
                .maintenance-content {
                    width: 92%;
                }
                
                .maintenance-header {
                    padding: 15px 16px;
                }
                
                .maintenance-header h3 {
                    font-size: 1.3rem;
                }
                
                .maintenance-body {
                    padding: 18px 20px;
                }
                
                .maintenance-illustration {
                    height: 70px;
                    margin-bottom: 12px;
                }
                
                .maintenance-message, .maintenance-time {
                    padding: 14px 16px;
                }
                
                .maintenance-footer {
                    padding: 10px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}); 
