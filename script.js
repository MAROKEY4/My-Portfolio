document.addEventListener('DOMContentLoaded', () => {
    const world = document.getElementById('world');
    const spaceCanvas = document.getElementById('spaceCanvas');
    const speedCanvas = document.getElementById('speedCanvas');
    const travelFlash = document.getElementById('travelFlash');
    const cursor = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');
    const notification = document.getElementById('notification');
    const currentSectorSpan = document.getElementById('currentSector');
    const navLinks = document.querySelectorAll('#navList li a');
    const menuToggle = document.getElementById('menuToggle');
    const navList = document.getElementById('navList');
    const contactForm = document.getElementById('contactForm');

    const stations = {
        home: { element: document.getElementById('station-home'), x: 0, y: 0, label: 'HOME' },
        about: { element: document.getElementById('station-about'), x: 1800, y: 0, label: 'ABOUT' },
        projects: { element: document.getElementById('station-projects'), x: -1800, y: 0, label: 'PROJECTS' },
        skills: { element: document.getElementById('station-skills'), x: 0, y: -1600, label: 'SKILLS' },
        contact: { element: document.getElementById('station-contact'), x: 0, y: 1600, label: 'CONTACT' }
    };

    let cameraX = 0, cameraY = 0;
    let targetX = 0, targetY = 0;
    let scale = 1;
    let targetScale = 1;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let prevCameraX = 0, prevCameraY = 0;
    let isTransitioning = false;
    let activeSection = 'home';
    let animFrame;

    let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };
    let velocityX = 0, velocityY = 0;
    let moveSpeed = 0.8;
    let boostMultiplier = 1;
    let friction = 0.97;

    let movementTrail = [];
    const MAX_TRAIL_POINTS = 20;

    let compassNeedle = null;
    let currentDirection = 0;

    let stars = [];

    let bgMusic = null;
    let isMusicEnabled = true;
       function initMusic() {
        bgMusic = document.getElementById('bgMusic');
        if (bgMusic) {
            bgMusic.volume = 0.3;
            bgMusic.loop = true;
            console.log("Music initialized, volume:", bgMusic.volume);
        }
        
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            console.log("Volume slider found");
            volumeSlider.value = 30;
            volumeSlider.addEventListener('input', function(e) {
                if (bgMusic) {
                    const newVolume = e.target.value / 100;
                    bgMusic.volume = newVolume;
                    console.log("Volume changed to:", newVolume);
                }
            });
        } else {
            console.log("Volume slider NOT found");
        }
    }

    function initStars() {
        for (let i = 0; i < 400; i++) {
            stars.push({
                x: Math.random() * 4000 - 2000,
                y: Math.random() * 4000 - 2000,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.6 + 0.2
            });
        }
    }

    function drawSpace() {
        const ctx = spaceCanvas.getContext('2d');
        const width = spaceCanvas.width;
        const height = spaceCanvas.height;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = 'rgba(75, 0, 130, 0.03)';
        ctx.beginPath();
        ctx.ellipse(width * 0.3, height * 0.4, width * 0.4, height * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(0, 100, 200, 0.03)';
        ctx.beginPath();
        ctx.ellipse(width * 0.7, height * 0.6, width * 0.35, height * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        
        for (let star of stars) {
            const parallaxX = cameraX * 0.02;
            const parallaxY = cameraY * 0.02;
            const screenX = (star.x - parallaxX) % width;
            const screenY = (star.y - parallaxY) % height;
            let finalX = screenX < 0 ? screenX + width : screenX;
            let finalY = screenY < 0 ? screenY + height : screenY;
            ctx.beginPath();
            ctx.arc(finalX, finalY, star.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        }
    }

    function drawSpeedLines() {
        const ctx = speedCanvas.getContext('2d');
        const width = speedCanvas.width;
        const height = speedCanvas.height;
        ctx.clearRect(0, 0, width, height);
        const speedX = Math.abs(prevCameraX - cameraX);
        const speedY = Math.abs(prevCameraY - cameraY);
        const speed = Math.sqrt(speedX * speedX + speedY * speedY);
        if (speed > 1.5) {
            const lineCount = Math.min(Math.floor(speed * 8), 40);
            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                const startX = Math.random() * width;
                const startY = Math.random() * height;
                const angle = Math.atan2(cameraY - prevCameraY, cameraX - prevCameraX);
                const endX = startX + Math.cos(angle) * 40;
                const endY = startY + Math.sin(angle) * 40;
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(0, 255, 231, ${0.15 * (speed / 8)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }

    function updateStationPositions() {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        for (const key in stations) {
            const station = stations[key];
            if (!station.element) continue;
            const screenX = centerX + (station.x - cameraX) * scale;
            const screenY = centerY + (station.y - cameraY) * scale;
            station.element.style.left = `${screenX}px`;
            station.element.style.top = `${screenY}px`;
            station.element.style.transform = `translate(-50%, -50%) scale(${scale})`;
            const dist = Math.sqrt(Math.pow(station.x - cameraX, 2) + Math.pow(station.y - cameraY, 2));
            station.element.style.opacity = dist > 800 ? '0.3' : '1';
            station.element.style.visibility = dist > 1500 ? 'hidden' : 'visible';
        }
    }

    function addWorldMapOverlay() {
        let mapOverlay = document.getElementById('worldMapOverlay');
        if (!mapOverlay) {
            mapOverlay = document.createElement('div');
            mapOverlay.id = 'worldMapOverlay';
            mapOverlay.style.position = 'fixed';
            mapOverlay.style.bottom = '24px';
            mapOverlay.style.right = '24px';
            mapOverlay.style.width = '200px';
            mapOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            mapOverlay.style.backdropFilter = 'blur(10px)';
            mapOverlay.style.borderRadius = '12px';
            mapOverlay.style.border = '1px solid rgba(0, 255, 231, 0.3)';
            mapOverlay.style.padding = '10px';
            mapOverlay.style.fontFamily = 'var(--font-hud)';
            mapOverlay.style.zIndex = '100';
            mapOverlay.style.pointerEvents = 'none';
            document.body.appendChild(mapOverlay);
        }
        
        const mapSize = 160;
        const worldRange = 2500;
        
        let html = `<div style="font-size: 0.5rem; color: #00ffe7; margin-bottom: 6px; text-align: center;">✦ SECTOR MAP ✦</div>`;
        html += `<div style="width: ${mapSize}px; height: ${mapSize}px; margin: 0 auto;">`;
        html += `<svg width="${mapSize}" height="${mapSize}" viewBox="0 0 ${mapSize} ${mapSize}" style="background: rgba(0,0,0,0.4); border-radius: 8px;">`;
        
        const centerX = mapSize / 2;
        const centerY = mapSize / 2;
        
        function worldToMap(worldX, worldY) {
            const relX = worldX - cameraX;
            const relY = worldY - cameraY;
            const scaleVal = mapSize / (worldRange * 2);
            let mapX = centerX + (relX * scaleVal);
            let mapY = centerY + (relY * scaleVal);
            mapX = Math.min(Math.max(mapX, 5), mapSize - 5);
            mapY = Math.min(Math.max(mapY, 5), mapSize - 5);
            return { x: mapX, y: mapY };
        }
        
        for (const key in stations) {
            const station = stations[key];
            const pos = worldToMap(station.x, station.y);
            const isCurrent = key === activeSection;
            html += `<circle cx="${pos.x}" cy="${pos.y}" r="${isCurrent ? 5 : 3}" fill="${isCurrent ? '#00ffe7' : '#7b2fff' }" stroke="#fff" stroke-width="0.5"/>`;
            html += `<text x="${pos.x + 6}" y="${pos.y - 3}" fill="rgba(0,255,231,0.7)" font-size="5">${station.label.slice(0, 3)}</text>`;
        }
        
        html += `<circle cx="${centerX}" cy="${centerY}" r="4" fill="none" stroke="#00ffe7" stroke-width="1.5"/>`;
        html += `<circle cx="${centerX}" cy="${centerY}" r="2" fill="#00ffe7"/>`;
        
        html += `</svg></div>`;
        html += `<div style="font-size: 0.4rem; text-align: center; margin-top: 5px;">📍 ${stations[activeSection]?.label || 'DEEP SPACE'}</div>`;
        
        mapOverlay.innerHTML = html;
    }

    function addFloatingCompassGuide() {
        let compassGuide = document.getElementById('floatingCompassGuide');
        if (!compassGuide) {
            compassGuide = document.createElement('div');
            compassGuide.id = 'floatingCompassGuide';
            compassGuide.style.position = 'fixed';
            compassGuide.style.bottom = '100px';
            compassGuide.style.left = '20px';
            compassGuide.style.background = 'rgba(0, 0, 0, 0.7)';
            compassGuide.style.backdropFilter = 'blur(10px)';
            compassGuide.style.borderRadius = '10px';
            compassGuide.style.border = '1px solid rgba(0, 255, 231, 0.3)';
            compassGuide.style.padding = '8px 12px';
            compassGuide.style.fontFamily = 'var(--font-hud)';
            compassGuide.style.zIndex = '100';
            compassGuide.style.pointerEvents = 'none';
            document.body.appendChild(compassGuide);
        }
        
        let html = '<div style="font-size: 0.5rem; color: #00ffe7; margin-bottom: 5px;">✦ NAVIGATION ✦</div>';
        
        for (const key in stations) {
            if (key === activeSection) continue;
            const station = stations[key];
            const dx = station.x - cameraX;
            const dy = station.y - cameraY;
            const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
            let normAngle = angle;
            while (normAngle < 0) normAngle += 360;
            
            let arrow = '';
            if (normAngle >= 315 || normAngle < 45) arrow = '↑';
            else if (normAngle >= 45 && normAngle < 135) arrow = '→';
            else if (normAngle >= 135 && normAngle < 225) arrow = '↓';
            else arrow = '←';
            
            const distance = Math.floor(Math.sqrt(dx * dx + dy * dy) / 10);
            
            html += `<div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.55rem;">
                <span style="color: #00ffe7;">${arrow}</span>
                <span style="color: white;">${station.label}</span>
                <span style="color: rgba(0,255,231,0.6);">${distance}km</span>
            </div>`;
        }
        
        compassGuide.innerHTML = html;
    }

    function updateCurrentSector() {
        let closest = 'DEEP SPACE';
        let minDist = Infinity;
        for (const key in stations) {
            const station = stations[key];
            const dist = Math.sqrt(Math.pow(station.x - cameraX, 2) + Math.pow(station.y - cameraY, 2));
            if (dist < minDist && dist < 500) {
                minDist = dist;
                closest = station.label;
                activeSection = key;
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.dataset.section === key) link.classList.add('active');
                });
            }
        }
        if (currentSectorSpan) currentSectorSpan.textContent = closest;
    }

    function updateCompass() {
        if (!compassNeedle) {
            compassNeedle = document.getElementById('compassNeedle');
            if (!compassNeedle) return;
        }
        let angle = 0;
        if (velocityX !== 0 || velocityY !== 0) {
            angle = Math.atan2(velocityX, -velocityY) * (180 / Math.PI);
            currentDirection = angle;
        }
        compassNeedle.style.transform = `rotate(${currentDirection}deg)`;
        compassNeedle.style.transformOrigin = 'center';
    }

    function handleFreeMovement() {
        let moveX = 0, moveY = 0;
        if (keys.ArrowUp || keys.w) moveY -= 1;
        if (keys.ArrowDown || keys.s) moveY += 1;
        if (keys.ArrowLeft || keys.a) moveX -= 1;
        if (keys.ArrowRight || keys.d) moveX += 1;
        
        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
            const currentSpeed = moveSpeed * boostMultiplier;
            velocityX += moveX * currentSpeed;
            velocityY += moveY * currentSpeed;
            const maxSpeed = 12;
            velocityX = Math.min(Math.max(velocityX, -maxSpeed), maxSpeed);
            velocityY = Math.min(Math.max(velocityY, -maxSpeed), maxSpeed);
        } else {
            velocityX *= friction;
            velocityY *= friction;
            if (Math.abs(velocityX) < 0.05) velocityX = 0;
            if (Math.abs(velocityY) < 0.05) velocityY = 0;
        }
        targetX += velocityX;
        targetY += velocityY;
    }

    function handleMouseDrag() {
        if (isDragging) {
            velocityX = 0;
            velocityY = 0;
        }
    }

    function initMusic() {
        bgMusic = document.getElementById('bgMusic');
        if (bgMusic) {
            bgMusic.volume = 0.3;
            bgMusic.loop = true;
        }
    }

    function toggleMusic() {
        isMusicEnabled = !isMusicEnabled;
        const soundControl = document.getElementById('soundControl');
        if (isMusicEnabled) {
            soundControl.classList.remove('muted');
            soundControl.innerHTML = '<i class="fas fa-music"></i>';
            if (bgMusic && bgMusic.paused) bgMusic.play().catch(e => console.log('Playback failed:', e));
        } else {
            soundControl.classList.add('muted');
            soundControl.innerHTML = '<i class="fas fa-volume-mute"></i>';
            if (bgMusic) bgMusic.pause();
        }
    }

    const aiResponses = {
        skills: `Omar has expertise in:\n• HTML/CSS (90%)\n• JavaScript (45%)\n• PHP (40%)\n• MySQL (60%)\n• Git/GitHub (85%)`,
        projects: `Omar's projects:\n1. E-Commerce Platform\n2. Task Management App\n3. Flight Booking System (35% complete)`,
        experience: `3rd year Computer Engineering student at Near East University, North Cyprus.`,
        contact: `Email: omarrodi2004@gmail.com\nPhone: +212 6 42 68 79 81\nGitHub: /MAROKEY4`,
        about: `Computer Engineering student from Morocco 🇲🇦, studying in North Cyprus.`,
        default: `Ask me about Omar's skills, projects, experience, or contact info!`
    };

    function getAIResponse(userMessage) {
        const msg = userMessage.toLowerCase();
        if (msg.includes('skill')) return aiResponses.skills;
        if (msg.includes('project')) return aiResponses.projects;
        if (msg.includes('experience')) return aiResponses.experience;
        if (msg.includes('contact')) return aiResponses.contact;
        if (msg.includes('about')) return aiResponses.about;
        return aiResponses.default;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addMessageToChat(text, isUser = false) {
        const messagesDiv = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'user-message' : 'ai-message';
        if (isUser) {
            messageDiv.innerHTML = `<span>${escapeHtml(text)}</span>`;
        } else {
            messageDiv.innerHTML = `<i class="fas fa-robot"></i><span>${escapeHtml(text).replace(/\n/g, '<br>')}</span>`;
        }
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        if (!message) return;
        addMessageToChat(message, true);
        input.value = '';
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-message';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `<i class="fas fa-robot"></i><span>Typing...</span>`;
        document.getElementById('chatbotMessages').appendChild(typingDiv);
        setTimeout(() => {
            const typingEl = document.getElementById('typingIndicator');
            if (typingEl) typingEl.remove();
            const response = getAIResponse(message);
            addMessageToChat(response, false);
        }, 800);
    }

    function initChatbot() {
        const toggle = document.getElementById('chatbotToggle');
        const windowEl = document.getElementById('chatbotWindow');
        const close = document.getElementById('closeChatbot');
        const send = document.getElementById('chatbotSend');
        const input = document.getElementById('chatbotInput');
        const suggestions = document.querySelectorAll('.suggestion-btn');
        if (toggle) toggle.addEventListener('click', () => windowEl.classList.toggle('open'));
        if (close) close.addEventListener('click', () => windowEl.classList.remove('open'));
        if (send) send.addEventListener('click', sendMessage);
        if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
        suggestions.forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('chatbotInput').value = btn.textContent;
                sendMessage();
            });
        });
    }

    let joystickActive = false;
    let joystickCenter = { x: 0, y: 0 };
    let joystickMoveX = 0, joystickMoveY = 0;

    function createMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!isMobile) return;
        
        const joystickBase = document.getElementById('joystickBase');
        const joystickThumb = document.getElementById('joystickThumb');
        if (!joystickBase || !joystickThumb) return;
        
        const maxDistance = 35;
        
        function updateJoystick(clientX, clientY) {
            const rect = joystickBase.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
            const angle = Math.atan2(dy, dx);
            
            joystickMoveX = (Math.cos(angle) * distance) / maxDistance;
            joystickMoveY = (Math.sin(angle) * distance) / maxDistance;
            
            if (distance > 5) {
                const speed = 8 * (distance / maxDistance);
                targetX -= joystickMoveX * speed;
                targetY -= joystickMoveY * speed;
                velocityX = joystickMoveX * 5;
                velocityY = joystickMoveY * 5;
            } else {
                joystickMoveX = 0;
                joystickMoveY = 0;
            }
            
            const thumbX = Math.cos(angle) * distance;
            const thumbY = Math.sin(angle) * distance;
            joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px)`;
        }
        
        joystickThumb.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            const touch = e.touches[0];
            updateJoystick(touch.clientX, touch.clientY);
        });
        
        window.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            const touch = e.touches[0];
            updateJoystick(touch.clientX, touch.clientY);
        });
        
        window.addEventListener('touchend', () => {
            joystickActive = false;
            joystickMoveX = 0;
            joystickMoveY = 0;
            joystickThumb.style.transform = 'translate(-50%, -50%)';
            velocityX = 0;
            velocityY = 0;
        });
        
        const boostBtn = document.getElementById('mobileBoostBtn');
        const homeBtn = document.getElementById('mobileHomeBtn');
        const resetBtn = document.getElementById('mobileResetBtn');
        
        if (boostBtn) {
            boostBtn.addEventListener('touchstart', (e) => { e.preventDefault(); boostMultiplier = 3; });
            boostBtn.addEventListener('touchend', () => { boostMultiplier = 1; });
        }
        if (homeBtn) {
            homeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); travelTo('home'); });
        }
        if (resetBtn) {
            resetBtn.addEventListener('touchstart', (e) => { e.preventDefault(); targetScale = 1; showNotification('VIEW RESET'); });
        }
    }

    function addMobileDragControls() {
        let isDraggingMobile = false;
        let lastDragX = 0, lastDragY = 0;
        
        world.addEventListener('touchstart', (e) => {
            if (e.target.closest('.joystick-container') || e.target.closest('.mobile-action-buttons')) return;
            if (e.target.closest('.station-panel')) return;
            e.preventDefault();
            isDraggingMobile = true;
            const touch = e.touches[0];
            lastDragX = touch.clientX;
            lastDragY = touch.clientY;
        });
        
        window.addEventListener('touchmove', (e) => {
            if (!isDraggingMobile) return;
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = (touch.clientX - lastDragX) / scale;
            const deltaY = (touch.clientY - lastDragY) / scale;
            targetX -= deltaX;
            targetY -= deltaY;
            lastDragX = touch.clientX;
            lastDragY = touch.clientY;
            velocityX = 0; velocityY = 0;
        });
        
        window.addEventListener('touchend', () => { isDraggingMobile = false; });
    }

    function addMobileZoomControls() {
        let lastTapTime = 0;
        let lastTapDistance = 0;
        
        world.addEventListener('touchstart', (e) => {
            const currentTime = new Date().getTime();
            if (currentTime - lastTapTime < 300) {
                e.preventDefault();
                targetScale = 1;
                showNotification('ZOOM RESET');
            }
            lastTapTime = currentTime;
            
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastTapDistance = Math.sqrt(dx * dx + dy * dy);
            }
        });
        
        world.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && lastTapDistance > 0) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const newDistance = Math.sqrt(dx * dx + dy * dy);
                targetScale = Math.min(Math.max(targetScale * (newDistance / lastTapDistance), 0.5), 2.5);
                lastTapDistance = newDistance;
            }
        });
    }

    function addSwipeNavigation() {
        let swipeStartX = 0, swipeStartY = 0;
        const sectionOrder = ['home', 'about', 'skills', 'projects', 'contact'];
        
        world.addEventListener('touchstart', (e) => {
            if (e.target.closest('.station-panel')) return;
            if (e.target.closest('.joystick-container')) return;
            swipeStartX = e.touches[0].clientX;
            swipeStartY = e.touches[0].clientY;
        });
        
        world.addEventListener('touchend', (e) => {
            if (swipeStartX === 0) return;
            const swipeEndX = e.changedTouches[0].clientX;
            const swipeEndY = e.changedTouches[0].clientY;
            const deltaX = swipeEndX - swipeStartX;
            const deltaY = swipeEndY - swipeStartY;
            const currentIndex = sectionOrder.indexOf(activeSection);
            
            if (Math.abs(deltaX) > 100 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0 && currentIndex > 0) travelTo(sectionOrder[currentIndex - 1]);
                else if (deltaX < 0 && currentIndex < sectionOrder.length - 1) travelTo(sectionOrder[currentIndex + 1]);
            }
            
            if (Math.abs(deltaY) > 100 && Math.abs(deltaY) > Math.abs(deltaX)) {
                if (deltaY > 0) travelTo('contact');
                else travelTo('skills');
            }
            swipeStartX = 0;
        });
    }

    function showNotification(message) {
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
            setTimeout(() => notification.classList.remove('show'), 3000);
        }
    }

    function travelTo(stationId) {
        if (isTransitioning) return;
        isTransitioning = true;
        const station = stations[stationId];
        if (!station) return;
        velocityX = 0;
        velocityY = 0;
        if (travelFlash) travelFlash.classList.add('active');
        setTimeout(() => {
            targetX = station.x;
            targetY = station.y;
            showNotification(`✦ ARRIVED AT ${station.label} SECTOR ✦`);
            setTimeout(() => {
                if (travelFlash) travelFlash.classList.remove('active');
                isTransitioning = false;
            }, 500);
        }, 200);
    }

    function generateTechLogos() {
        const techLogosContainer = document.getElementById('techLogos');
        if (!techLogosContainer) return;
        const technologies = [
            { name: 'HTML5', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
            { name: 'CSS3', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
            { name: 'JavaScript', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
            { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
            { name: 'PHP', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg' },
            { name: 'MySQL', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
            { name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
            { name: 'Java', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg' },
            { name: 'Git', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
            { name: 'VSCode', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg' },
            { name: 'C#', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' }
        ];
        technologies.forEach(tech => {
            const badge = document.createElement('div');
            badge.className = 'tech-badge';
            badge.innerHTML = `<img src="${tech.icon}" alt="${tech.name}" style="width:18px;height:18px">${tech.name}`;
            techLogosContainer.appendChild(badge);
        });
    }

    function addSpeedIndicator() {
        let speedElement = document.getElementById('speedIndicator');
        if (!speedElement) {
            speedElement = document.createElement('div');
            speedElement.id = 'speedIndicator';
            speedElement.style.position = 'fixed';
            speedElement.style.bottom = '80px';
            speedElement.style.left = '20px';
            speedElement.style.fontFamily = 'var(--font-hud)';
            speedElement.style.fontSize = '0.6rem';
            speedElement.style.color = '#00ffe7';
            speedElement.style.background = 'rgba(0,0,0,0.6)';
            speedElement.style.padding = '6px 14px';
            speedElement.style.borderRadius = '20px';
            speedElement.style.border = '1px solid rgba(0,255,231,0.3)';
            speedElement.style.backdropFilter = 'blur(4px)';
            speedElement.style.zIndex = '100';
            speedElement.style.pointerEvents = 'none';
            document.body.appendChild(speedElement);
        }
        function updateSpeed() {
            const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            const speedPercent = Math.min(Math.floor(speed / 12 * 100), 100);
            let speedIcon = '🚀';
            if (speedPercent < 10) speedIcon = '🌙';
            else if (speedPercent < 30) speedIcon = '🛸';
            else if (speedPercent < 60) speedIcon = '🚀';
            else if (speedPercent < 85) speedIcon = '⚡';
            else speedIcon = '💫';
            speedElement.innerHTML = `${speedIcon} SPEED: ${speedPercent}%`;
            requestAnimationFrame(updateSpeed);
        }
        updateSpeed();
    }

    function handleResize() {
        if (spaceCanvas) {
            spaceCanvas.width = window.innerWidth;
            spaceCanvas.height = window.innerHeight;
        }
        if (speedCanvas) {
            speedCanvas.width = window.innerWidth;
            speedCanvas.height = window.innerHeight;
        }
        updateStationPositions();
    }

    function animate() {
        handleFreeMovement();
        handleMouseDrag();
        movementTrail.push({ x: cameraX, y: cameraY });
        if (movementTrail.length > MAX_TRAIL_POINTS) movementTrail.shift();
        const smoothSpeed = 0.12;
        cameraX += (targetX - cameraX) * smoothSpeed;
        cameraY += (targetY - cameraY) * smoothSpeed;
        scale += (targetScale - scale) * 0.1;
        updateStationPositions();
        drawSpace();
        updateCompass();
        addWorldMapOverlay();
        addFloatingCompassGuide();
        const speedCanvasEl = document.getElementById('speedCanvas');
        const currentSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        if (currentSpeed > 1) {
            speedCanvasEl.classList.add('active');
            drawSpeedLines();
        } else {
            speedCanvasEl.classList.remove('active');
        }
        prevCameraX = cameraX;
        prevCameraY = cameraY;
        updateCurrentSector();
        animFrame = requestAnimationFrame(animate);
    }

    function setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            const activeElement = document.activeElement;
            const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
            if (isTyping) return;
            if (keys.hasOwnProperty(key)) { keys[key] = true; e.preventDefault(); }
            if (key === 'Shift') { boostMultiplier = 3; e.preventDefault(); }
            if (key === 'h' || key === 'H') { travelTo('home'); e.preventDefault(); }
            if (key === 'z' || key === 'Z') { targetScale = Math.min(targetScale + 0.1, 2.5); e.preventDefault(); }
            if (key === 'x' || key === 'X') { targetScale = Math.max(targetScale - 0.1, 0.5); e.preventDefault(); }
        });
        window.addEventListener('keyup', (e) => {
            const key = e.key;
            if (keys.hasOwnProperty(key)) keys[key] = false;
            if (key === 'Shift') boostMultiplier = 1;
        });
        world.addEventListener('mousedown', (e) => {
            if (e.target.closest('.station-panel')) return;
            isDragging = true;
            dragStart.x = e.clientX;
            dragStart.y = e.clientY;
            world.style.cursor = 'grabbing';
            velocityX = 0; velocityY = 0;
        });
        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = (e.clientX - dragStart.x) / scale;
                const deltaY = (e.clientY - dragStart.y) / scale;
                targetX -= deltaX;
                targetY -= deltaY;
                dragStart.x = e.clientX;
                dragStart.y = e.clientY;
            }
            if (cursor) { cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`; }
            if (cursorDot) { cursorDot.style.left = `${e.clientX}px`; cursorDot.style.top = `${e.clientY}px`; }
        });
        window.addEventListener('mouseup', () => { isDragging = false; if (world) world.style.cursor = 'default'; });
        window.addEventListener('wheel', (e) => {
            const delta = e.deltaY > 0 ? 0.95 : 1.05;
            targetScale = Math.min(Math.max(targetScale * delta, 0.5), 2.5);
            e.preventDefault();
        }, { passive: false });
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) travelTo(section);
            });
        });
        const hireBtn = document.getElementById('hireBtn');
        if (hireBtn) hireBtn.addEventListener('click', (e) => { e.preventDefault(); travelTo('contact'); });
        if (menuToggle) menuToggle.addEventListener('click', () => { if (navList) navList.classList.toggle('show'); });
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                showNotification('✦ MESSAGE TRANSMITTED SUCCESSFULLY ✦');
                contactForm.reset();
            });
        }
        const soundControl = document.getElementById('soundControl');
        if (soundControl) soundControl.addEventListener('click', toggleMusic);
        function startMusicOnClick() {
            if (bgMusic && isMusicEnabled && bgMusic.paused) bgMusic.play().catch(e => console.log('Playback failed:', e));
        }
        document.addEventListener('click', startMusicOnClick, { once: true });
    }

    function init() {
        initStars();
        generateTechLogos();
        addSpeedIndicator();
        handleResize();
        initMusic();
        initChatbot();
        createMobileControls();
        addMobileDragControls();
        addMobileZoomControls();
        addSwipeNavigation();
        setupEventListeners();
        window.addEventListener('resize', handleResize);
        animate();
    }
    
    init();
});