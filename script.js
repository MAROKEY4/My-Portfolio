// Complete script.js - Space Portfolio with Fixed Mobile Controls
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
        
        if (speed > 2) {
            const lineCount = Math.min(Math.floor(speed * 5), 30);
            for (let i = 0; i < lineCount; i++) {
                ctx.beginPath();
                const startX = Math.random() * width;
                const startY = Math.random() * height;
                const angle = Math.atan2(cameraY - prevCameraY, cameraX - prevCameraX);
                const endX = startX + Math.cos(angle) * (30 + speed * 2);
                const endY = startY + Math.sin(angle) * (30 + speed * 2);
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = `rgba(12, 208, 28, ${0.2 + (speed / 20)})`;
                ctx.lineWidth = 2;
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
            station.element.style.left = screenX + 'px';
            station.element.style.top = screenY + 'px';
            station.element.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
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
            mapOverlay.style.width = '180px';
            mapOverlay.style.background = 'rgba(0, 0, 0, 0.85)';
            mapOverlay.style.backdropFilter = 'blur(10px)';
            mapOverlay.style.borderRadius = '12px';
            mapOverlay.style.border = '1px solid rgba(0, 255, 231, 0.3)';
            mapOverlay.style.padding = '8px';
            mapOverlay.style.fontFamily = 'var(--font-hud)';
            mapOverlay.style.zIndex = '100';
            mapOverlay.style.pointerEvents = 'none';
            document.body.appendChild(mapOverlay);
        }
        
        const mapSize = 140;
        const worldRange = 2500;
        
        let html = '<div style="font-size: 0.45rem; color: #00ffe7; margin-bottom: 5px; text-align: center;">SECTOR MAP</div>';
        html += '<div style="width: ' + mapSize + 'px; height: ' + mapSize + 'px; margin: 0 auto;">';
        html += '<svg width="' + mapSize + '" height="' + mapSize + '" viewBox="0 0 ' + mapSize + ' ' + mapSize + '" style="background: rgba(0,0,0,0.4); border-radius: 8px;">';
        
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
            html += '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="' + (isCurrent ? 5 : 3) + '" fill="' + (isCurrent ? '#00ffe7' : '#7b2fff') + '" stroke="#fff" stroke-width="0.5"/>';
            html += '<text x="' + (pos.x + 5) + '" y="' + (pos.y - 3) + '" fill="rgba(0,255,231,0.7)" font-size="4.5">' + station.label.slice(0, 3) + '</text>';
        }
        
        html += '<circle cx="' + centerX + '" cy="' + centerY + '" r="4" fill="none" stroke="#00ffe7" stroke-width="1.5"/>';
        html += '<circle cx="' + centerX + '" cy="' + centerY + '" r="2" fill="#00ffe7"/>';
        
        html += '</svg></div>';
        html += '<div style="font-size: 0.35rem; text-align: center; margin-top: 4px;">YOU ARE HERE</div>';
        
        mapOverlay.innerHTML = html;
    }

    function addFloatingCompassGuide() {
        let compassGuide = document.getElementById('floatingCompassGuide');
        if (!compassGuide) {
            compassGuide = document.createElement('div');
            compassGuide.id = 'floatingCompassGuide';
            compassGuide.style.position = 'fixed';
            compassGuide.style.bottom = '80px';
            compassGuide.style.left = '20px';
            compassGuide.style.background = 'rgba(0, 0, 0, 0.7)';
            compassGuide.style.backdropFilter = 'blur(10px)';
            compassGuide.style.borderRadius = '10px';
            compassGuide.style.border = '1px solid rgba(0, 255, 231, 0.3)';
            compassGuide.style.padding = '6px 10px';
            compassGuide.style.fontFamily = 'var(--font-hud)';
            compassGuide.style.zIndex = '100';
            compassGuide.style.pointerEvents = 'none';
            document.body.appendChild(compassGuide);
        }
        
        let html = '<div style="font-size: 0.45rem; color: #00ffe7; margin-bottom: 4px;">NAVIGATION</div>';
        
        for (const key in stations) {
            if (key === activeSection) continue;
            const station = stations[key];
            const dx = station.x - cameraX;
            const dy = station.y - cameraY;
            let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
            let normAngle = angle;
            while (normAngle < 0) normAngle += 360;
            
            let arrow = '';
            if (normAngle >= 315 || normAngle < 45) arrow = 'N';
            else if (normAngle >= 45 && normAngle < 135) arrow = 'E';
            else if (normAngle >= 135 && normAngle < 225) arrow = 'S';
            else arrow = 'W';
            
            const distance = Math.floor(Math.sqrt(dx * dx + dy * dy) / 10);
            
            html += '<div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 0.5rem;">';
            html += '<span style="color: #00ffe7;">' + arrow + '</span>';
            html += '<span style="color: white;">' + station.label + '</span>';
            html += '<span style="color: rgba(0,255,231,0.6);">' + distance + 'km</span>';
            html += '</div>';
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
        compassNeedle.style.transform = 'rotate(' + currentDirection + 'deg)';
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

    function isScrollablePanel(element) {
        let target = element;
        for (let i = 0; i < 10; i++) {
            if (!target) break;
            if (target.id === 'station-skills' || target.id === 'station-projects' || target.id === 'station-contact') {
                return true;
            }
            if (target.classList && target.classList.contains('station-panel')) {
                const parent = target.parentElement;
                if (parent && (parent.id === 'station-skills' || parent.id === 'station-projects' || parent.id === 'station-contact')) {
                    return true;
                }
            }
            target = target.parentElement;
        }
        return false;
    }

    function initMobileDrag() {
        let dragActive = false;
        let dragStartX = 0, dragStartY = 0;
        let dragStartTargetX = 0, dragStartTargetY = 0;
        
        function onTouchStart(e) {
            const isScrollable = isScrollablePanel(e.target);
            
            if (isScrollable) {
                return;
            }
            
            if (e.target.closest('.btn-primary') || 
                e.target.closest('.btn-outline') ||
                e.target.closest('.plink') ||
                e.target.closest('.submit-btn') ||
                e.target.closest('#chatbotInput') ||
                e.target.closest('#chatbotSend') ||
                e.target.closest('.suggestion-btn') ||
                e.target.closest('#soundControl') ||
                e.target.closest('#chatbotToggle') ||
                e.target.closest('#closeChatbot') ||
                e.target.closest('.social-btn') ||
                e.target.closest('.tech-badge') ||
                e.target.closest('a')) {
                return;
            }
            
            e.preventDefault();
            dragActive = true;
            const touch = e.touches[0];
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            dragStartTargetX = targetX;
            dragStartTargetY = targetY;
            velocityX = 0;
            velocityY = 0;
        }
        
        function onTouchMove(e) {
            if (!dragActive) return;
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = (touch.clientX - dragStartX) / scale;
            const deltaY = (touch.clientY - dragStartY) / scale;
            targetX = dragStartTargetX - deltaX;
            targetY = dragStartTargetY - deltaY;
        }
        
        function onTouchEnd(e) {
            dragActive = false;
        }
        
        document.body.addEventListener('touchstart', onTouchStart, { passive: false });
        document.body.addEventListener('touchmove', onTouchMove, { passive: false });
        document.body.addEventListener('touchend', onTouchEnd);
        document.body.addEventListener('touchcancel', onTouchEnd);
    }

    function initMouseDrag() {
        let mouseDragActive = false;
        let mouseStartX = 0, mouseStartY = 0;
        let mouseStartTargetX = 0, mouseStartTargetY = 0;
        
        world.addEventListener('mousedown', (e) => {
            if (e.target.closest('.station-panel')) return;
            mouseDragActive = true;
            mouseStartX = e.clientX;
            mouseStartY = e.clientY;
            mouseStartTargetX = targetX;
            mouseStartTargetY = targetY;
            world.style.cursor = 'grabbing';
            velocityX = 0;
            velocityY = 0;
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!mouseDragActive) return;
            const deltaX = (e.clientX - mouseStartX) / scale;
            const deltaY = (e.clientY - mouseStartY) / scale;
            targetX = mouseStartTargetX - deltaX;
            targetY = mouseStartTargetY - deltaY;
        });
        
        window.addEventListener('mouseup', () => {
            mouseDragActive = false;
            if (world) world.style.cursor = 'default';
        });
    }

    function initPinchZoom() {
        let initialDistance = 0;
        let initialScale = 1;
        
        function getDistance(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        document.body.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                initialDistance = getDistance(e.touches);
                initialScale = targetScale;
            }
        }, { passive: false });
        
        document.body.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const newDistance = getDistance(e.touches);
                const scaleChange = newDistance / initialDistance;
                targetScale = Math.min(Math.max(initialScale * scaleChange, 0.5), 2.5);
            }
        }, { passive: false });
    }

    function initDoubleTapReset() {
        let lastTap = 0;
        
        document.body.addEventListener('touchstart', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                targetScale = 1;
                showNotification('VIEW RESET');
            }
            lastTap = now;
        });
    }

      function initMusic() {
        bgMusic = document.getElementById('bgMusic');
        if (bgMusic) {
            bgMusic.volume = 0.3;
            bgMusic.loop = true;
        }
        
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeDown = document.getElementById('volumeDownBtn');
        const volumeUp = document.getElementById('volumeUpBtn');
        
        if (volumeSlider && bgMusic) {
            volumeSlider.value = 30;
            volumeSlider.addEventListener('input', (e) => {
                const newVolume = e.target.value / 100;
                bgMusic.volume = newVolume;
                console.log('Volume changed to:', newVolume);
            });
        }
        
        // Volume down button
        if (volumeDown && bgMusic) {
            volumeDown.addEventListener('click', () => {
                let currentVolume = bgMusic.volume;
                let newVolume = Math.max(0, currentVolume - 0.1);
                bgMusic.volume = newVolume;
                if (volumeSlider) volumeSlider.value = newVolume * 100;
                showNotification('Volume: ' + Math.round(newVolume * 100) + '%');
            });
        }
        
        // Volume up button
        if (volumeUp && bgMusic) {
            volumeUp.addEventListener('click', () => {
                let currentVolume = bgMusic.volume;
                let newVolume = Math.min(1, currentVolume + 0.1);
                bgMusic.volume = newVolume;
                if (volumeSlider) volumeSlider.value = newVolume * 100;
                showNotification('Volume: ' + Math.round(newVolume * 100) + '%');
            });
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
        skills: 'Omar has expertise in: HTML/CSS 90%, JavaScript 45%, PHP 40%, MySQL 60%, Git/GitHub 85%',
        projects: 'Omar projects: E-Commerce Platform, Task Management App, Wildlife Conservation System 45%',
        experience: '3rd year Computer Engineering student at Near East University, North Cyprus.',
        contact: 'Email: omarrodi2004@gmail.com, Phone: +212 6 42 68 79 81, GitHub: /MAROKEY4',
        about: 'Computer Engineering student from Morocco, studying in North Cyprus.',
        default: 'Ask me about Omar skills, projects, experience, or contact info!'
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
            messageDiv.innerHTML = '<span>' + escapeHtml(text) + '</span>';
        } else {
            messageDiv.innerHTML = '<i class="fas fa-robot"></i><span>' + escapeHtml(text).replace(/\n/g, '<br>') + '</span>';
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
        typingDiv.innerHTML = '<i class="fas fa-robot"></i><span>Typing...</span>';
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
            showNotification('ARRIVED AT ' + station.label + ' SECTOR');
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
            badge.innerHTML = '<img src="' + tech.icon + '" alt="' + tech.name + '" style="width:18px;height:18px">' + tech.name;
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
            speedElement.innerHTML = speedIcon + ' SPEED: ' + speedPercent + '%';
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
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) travelTo(section);
            });
        });
        
        const hireBtn = document.getElementById('hireBtn');
        if (hireBtn) hireBtn.addEventListener('click', (e) => { e.preventDefault(); travelTo('contact'); });
        
        const soundControl = document.getElementById('soundControl');
        if (soundControl) soundControl.addEventListener('click', toggleMusic);
        
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                showNotification('MESSAGE TRANSMITTED SUCCESSFULLY');
                contactForm.reset();
            });
        }
        
        // Mobile menu toggle - FIXED
        if (menuToggle && navList) {
            menuToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                navList.classList.toggle('show');
                console.log('Menu toggled');
            });
        }
        
        // Close menu when clicking a link
        const mobileLinks = document.querySelectorAll('#navList li a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (navList.classList.contains('show')) {
                    navList.classList.remove('show');
                }
            });
        });
        
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
        initMobileDrag();
        initPinchZoom();
        initDoubleTapReset();
        initMouseDrag();
        setupEventListeners();
        window.addEventListener('resize', handleResize);
        animate();
    }
    
    init();
});