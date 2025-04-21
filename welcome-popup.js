// Welcome popup for new users
document.addEventListener('DOMContentLoaded', function() {
    // Check if user has seen the popup before
    if (!localStorage.getItem('popupShown')) {
        // Create popup elements
        const popup = document.createElement('div');
        popup.className = 'welcome-popup';
        
        popup.innerHTML = `
            <div class="welcome-content">
                <div class="welcome-header">
                    <div class="confetti-animation">
                        <div class="confetti c1"></div>
                        <div class="confetti c2"></div>
                        <div class="confetti c3"></div>
                    </div>
                    <h3>Welcome to Hive Postify!</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="welcome-body">
                    <div class="welcome-badge">
                        <div class="badge-glow"></div>
                        <div class="badge-icon">👋</div>
                    </div>
                    <div class="creator-info">
                        <div class="avatar-container">
                            <img src="https://images.hive.blog/u/aftabirshad/avatar" class="creator-avatar" alt="Creator Avatar">
                            <div class="avatar-ring"></div>
                        </div>
                        <div class="creator-text">
                            <p class="creator-heading">This website created by <strong>Aftabirshad</strong></p>
                            <p class="creator-link">Follow <a href="http://127.0.0.1:5502/hivepostify.html#@aftabirshad">@aftabirshad</a> for more updates</p>
                        </div>
                    </div>
                    <div class="custom-message">
                        <p>Thanks for visiting my Hive Postify application. Explore the posts, communities and enjoy all the features of Hive blockchain in a user-friendly interface.</p>
                    </div>
                    <div class="feature-highlights">
                        <div class="feature">
                            <div class="feature-icon">📝</div>
                            <div class="feature-text">Create Posts</div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">👥</div>
                            <div class="feature-text">Join Communities</div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">💬</div>
                            <div class="feature-text">Comment & Engage</div>
                        </div>
                    </div>
                </div>
                <div class="welcome-footer">
                    <button class="got-it-btn">
                        <span>Got it!</span>
                        <div class="btn-shine"></div>
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
            
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0px); }
            }
            
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes shine {
                0% { background-position: -100% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes confettiFall {
                0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(150px) rotate(360deg); opacity: 0; }
            }
            
            @keyframes wave {
                0% { transform: rotate(0deg); }
                25% { transform: rotate(15deg); }
                50% { transform: rotate(0deg); }
                75% { transform: rotate(-15deg); }
                100% { transform: rotate(0deg); }
            }
            
            .welcome-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(15,32,75,0.9) 100%);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.4s ease-out;
                backdrop-filter: blur(8px);
            }
            
            .welcome-content {
                background: linear-gradient(145deg, #ffffff, #f8faff);
                border-radius: 16px;
                width: 85%;
                max-width: 480px;
                box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.25),
                            0 0 0 1px rgba(255, 255, 255, 0.1),
                            0 0 0 4px rgba(26, 80, 153, 0.1);
                overflow: hidden;
                position: relative;
                transform: perspective(1000px) rotateX(0deg);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                animation: fadeInUp 0.6s forwards;
            }
            
            .welcome-content:hover {
                transform: perspective(1000px) rotateX(2deg) translateY(-5px);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3),
                            0 0 0 1px rgba(255, 255, 255, 0.15),
                            0 0 0 5px rgba(26, 80, 153, 0.15);
            }
            
            .welcome-header {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 18px 20px;
                background: linear-gradient(135deg, #1a5099, #0077b6);
                color: white;
                position: relative;
                overflow: hidden;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .welcome-header::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%);
                animation: pulse 4s infinite ease-in-out;
            }
            
            .welcome-header::after {
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
            
            .welcome-header h3 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 700;
                text-shadow: 0 2px 4px rgba(0,0,0,0.2);
                position: relative;
                z-index: 2;
                letter-spacing: 0.5px;
            }
            
            .close-popup {
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
            
            .close-popup:hover {
                background: rgba(255,255,255,0.25);
                transform: rotate(90deg);
            }
            
            .welcome-body {
                padding: 22px;
                text-align: center;
                position: relative;
            }
            
            .welcome-badge {
                position: relative;
                width: 80px;
                height: 80px;
                margin: -40px auto 15px;
                background: linear-gradient(135deg, #1a5099, #0077b6);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
                z-index: 5;
                border: 4px solid white;
            }
            
            .badge-glow {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
                animation: pulse 2s infinite;
                z-index: 1;
            }
            
            .badge-icon {
                font-size: 36px;
                z-index: 2;
                animation: wave 2s infinite;
            }
            
            .confetti-animation {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                pointer-events: none;
            }
            
            .confetti {
                position: absolute;
                width: 10px;
                height: 10px;
                opacity: 0;
                border-radius: 2px;
                animation: confettiFall 3s infinite;
            }
            
            .c1 {
                top: 10%;
                left: 20%;
                background-color: #90e0ef;
                animation-delay: 0s;
            }
            
            .c2 {
                top: 0%;
                left: 50%;
                background-color: #ffb703;
                animation-delay: 0.5s;
            }
            
            .c3 {
                top: 5%;
                left: 80%;
                background-color: #f72585;
                animation-delay: 1s;
            }
            
            .creator-info {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                background: linear-gradient(135deg, #f8faff 0%, #eef1f8 100%);
                padding: 12px 15px;
                border-radius: 10px;
                box-shadow: 0 3px 5px rgba(0, 0, 0, 0.03), 
                            inset 0 0 0 1px rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(0,0,0,0.05);
            }
            
            .avatar-container {
                position: relative;
                width: 56px;
                height: 56px;
                margin-right: 15px;
                flex-shrink: 0;
            }
            
            .creator-avatar {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #1a5099;
                position: relative;
                z-index: 2;
            }
            
            .avatar-ring {
                position: absolute;
                top: -2px;
                left: -2px;
                width: calc(100% + 4px);
                height: calc(100% + 4px);
                border: 2px dashed #1a5099;
                border-radius: 50%;
                animation: spin 10s linear infinite;
            }
            
            .creator-text {
                flex: 1;
                text-align: left;
            }
            
            .creator-heading {
                font-size: 0.95rem;
                margin: 0 0 5px 0;
                color: #333;
            }
            
            .creator-link {
                margin: 0;
                color: #666;
                font-size: 0.85rem;
            }
            
            .creator-link a {
                color: #1a5099;
                text-decoration: none;
                font-weight: bold;
                transition: color 0.2s;
            }
            
            .creator-link a:hover {
                color: #0077b6;
                text-decoration: underline;
            }
            
            .custom-message {
                background: linear-gradient(135deg, #f8faff 0%, #eef1f8 100%);
                padding: 14px 16px;
                margin: 15px 0;
                border-radius: 10px;
                position: relative;
                box-shadow: 0 3px 5px rgba(0, 0, 0, 0.03), 
                            inset 0 0 0 1px rgba(255, 255, 255, 0.7);
                border: 1px solid rgba(0,0,0,0.05);
            }
            
            .custom-message::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: linear-gradient(to bottom, #1a5099, #0077b6);
                border-radius: 10px 0 0 10px;
            }
            
            .custom-message p {
                margin: 0;
                font-size: 0.9rem;
                color: #444;
                line-height: 1.5;
                padding-left: 10px;
            }
            
            .feature-highlights {
                display: flex;
                justify-content: space-around;
                margin-top: 15px;
            }
            
            .feature {
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: fadeInUp 0.5s forwards;
                animation-delay: calc(var(--i, 0) * 0.1s + 0.3s);
            }
            
            .feature:nth-child(1) { --i: 1; }
            .feature:nth-child(2) { --i: 2; }
            .feature:nth-child(3) { --i: 3; }
            
            .feature-icon {
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #f8faff 0%, #eef1f8 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                margin-bottom: 6px;
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
                border: 1px solid rgba(0,0,0,0.05);
                transition: transform 0.2s;
            }
            
            .feature:hover .feature-icon {
                transform: scale(1.1);
            }
            
            .feature-text {
                font-size: 0.75rem;
                color: #333;
                font-weight: 500;
            }
            
            .welcome-footer {
                padding: 15px 20px;
                text-align: right;
                border-top: 1px solid rgba(0,0,0,0.05);
                background: rgba(26, 80, 153, 0.03);
            }
            
            .got-it-btn {
                position: relative;
                background: linear-gradient(135deg, #1a5099, #0077b6);
                color: white;
                border: none;
                padding: 8px 22px;
                border-radius: 20px;
                cursor: pointer;
                font-weight: bold;
                font-size: 0.9rem;
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
            }
            
            .got-it-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 12px rgba(0, 0, 0, 0.15);
            }
            
            .btn-shine {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                            rgba(255,255,255,0) 0%, 
                            rgba(255,255,255,0.2) 50%, 
                            rgba(255,255,255,0) 100%);
                background-size: 200% 100%;
                animation: shine 2s infinite;
            }
            
            /* Media query for smaller screens */
            @media (max-width: 480px) {
                .welcome-content {
                    width: 92%;
                }
                
                .welcome-header {
                    padding: 15px 16px;
                }
                
                .welcome-header h3 {
                    font-size: 1.3rem;
                }
                
                .welcome-body {
                    padding: 18px;
                }
                
                .welcome-badge {
                    width: 70px;
                    height: 70px;
                    margin-top: -35px;
                }
                
                .badge-icon {
                    font-size: 30px;
                }
                
                .creator-info {
                    padding: 10px 12px;
                }
                
                .creator-avatar {
                    width: 50px;
                    height: 50px;
                }
                
                .avatar-container {
                    width: 50px;
                    height: 50px;
                }
                
                .feature-icon {
                    width: 36px;
                    height: 36px;
                    font-size: 18px;
                }
            }
        `;
        
        // Add to DOM
        document.head.appendChild(style);
        document.body.appendChild(popup);
        
        // Close popup and save state when "Got it" is clicked
        const gotItBtn = popup.querySelector('.got-it-btn');
        const closeBtn = popup.querySelector('.close-popup');
        
        function closePopup() {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => popup.remove(), 300);
            localStorage.setItem('popupShown', 'true');
        }
        
        gotItBtn.addEventListener('click', closePopup);
        closeBtn.addEventListener('click', closePopup);
    }
}); 