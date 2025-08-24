const i18n = {
    en: {
        pageTitle: "TeslaCam Player",
        headerTitle: "TeslaCam Player",
        toggleSidebar: "Toggle Sidebar",
        toggleTheme: "Toggle Theme",
        toggleLanguage: "切换到中文",
        drivingRecords: "Driving Records",
        date: "Date",
        eventType: "Event Type",
        allTypes: "All Types",
        recentClips: "Recent Clips",
        savedClips: "Saved Clips",
        sentryClips: "Sentry Clips",
        noRecordsFound: "No records found",
        selectFolder: "Select Folder",
        selectFolderPrompt: "Please select the root folder containing TeslaCam",
        minutes: "minutes",
        preview: "Preview",
        noSignal: "No Signal",
        front: "Front",
        back: "Back",
        left: "Left",
        right: "Right",
        play: "Play",
        pause: "Pause",
        toggleDay: "Switch to Day Mode",
        toggleNight: "Switch to Night Mode",
    },
    zh: {
        pageTitle: "TeslaCam 播放器",
        headerTitle: "TeslaCam 播放器",
        toggleSidebar: "切换侧边栏",
        toggleTheme: "切换主题",
        toggleLanguage: "Switch to English",
        drivingRecords: "行车记录",
        date: "日期",
        eventType: "事件类型",
        allTypes: "所有类型",
        recentClips: "最近片段",
        savedClips: "保存片段",
        sentryClips: "哨兵模式",
        noRecordsFound: "没有找到匹配的记录",
        selectFolder: "选择文件夹",
        selectFolderPrompt: "请选择包含 TeslaCam 文件夹的根目录",
        minutes: "分钟",
        preview: "预览图",
        noSignal: "无信号",
        front: "前",
        back: "后",
        left: "左",
        right: "右",
        play: "播放",
        pause: "暂停",
        toggleDay: "切换到日间模式",
        toggleNight: "切换到夜间模式",
    }
};

class VideoListComponent {
    constructor(elementId, eventHandler, viewer) {
        this.container = document.getElementById(elementId);
        this.eventHandler = eventHandler;
        this.viewer = viewer;
        if (!this.container) {
            throw new Error(`Element with id "${elementId}" not found.`);
        }
    }

    render(events) {
        const lang = this.viewer.currentLanguage;
        const translations = i18n[lang];
        this.container.innerHTML = '';
        if (!events || events.length === 0) {
            this.container.innerHTML = `<div class="empty-state"><p>${translations.noRecordsFound}</p></div>`;
            return;
        }
        const fragment = document.createDocumentFragment();
        events.forEach(event => {
            const card = this.createVideoCard(event);
            if (card) fragment.appendChild(card);
        });
        this.container.appendChild(fragment);
    }

    createVideoCard(event) {
        if (!event || !event.segments || event.segments.length === 0) return null;
        const firstSegment = event.segments[0];
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.eventId = event.eventId;
        card.onclick = () => this.eventHandler(event.eventId);

        const thumbnailDiv = document.createElement('div');
        thumbnailDiv.className = 'video-thumbnail';
        if (event.thumbFile) {
            const thumbUrl = URL.createObjectURL(event.thumbFile);
            const img = document.createElement('img');
            img.src = thumbUrl;
            img.alt = '预览图';
            img.onload = () => URL.revokeObjectURL(img.src);
            thumbnailDiv.appendChild(img);
        } else {
            thumbnailDiv.innerHTML = `<div class="no-thumb">${this.getEventTypeLabel(event.eventType)}</div>`;
        }
        const durationDiv = document.createElement('div');
        durationDiv.className = 'video-duration';
        durationDiv.textContent = `${event.segments.length} ${i18n[this.viewer.currentLanguage].minutes}`;
        thumbnailDiv.appendChild(durationDiv);
        card.appendChild(thumbnailDiv);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'video-info';
        const startTime = this.parseTimestamp(firstSegment.timestamp);
        infoDiv.innerHTML = `
            <div class="video-time">${startTime.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            <div class="video-type">${this.getEventTypeLabel(event.eventType)}</div>
        `;
        card.appendChild(infoDiv);
        return card;
    }

    getEventTypeLabel(type) {
        const lang = this.viewer.currentLanguage;
        return i18n[lang][type.charAt(0).toLowerCase() + type.slice(1)] || type;
    }

    parseTimestamp(timestamp) {
        const [datePart, timePart] = timestamp.split('_');
        return new Date(`${datePart}T${timePart.replace(/-/g, ':')}`);
    }
}

class MultiCameraPlayer {
    constructor() {
        this.players = {
            front: document.getElementById('front-player'),
            back: document.getElementById('back-player'),
            left: document.getElementById('left-player'),
            right: document.getElementById('right-player')
        };
        this.playerContainers = {
            front: document.getElementById('front-container'),
            back: document.getElementById('back-container'),
            left: document.getElementById('left-container'),
            right: document.getElementById('right-container')
        };
        this.currentUrls = { front: null, back: null, left: null, right: null };
        this.activeCamera = 'front';
        this.isPlaying = false;
        this.isSeeking = false;
        this.playbackRate = 1.0;
    }

    setActive(cameraType) {
        if (!this.players[cameraType]) return;
        this.activeCamera = cameraType;

        const layouts = {
            front: { back: 'top-right', left: 'bottom-left', right: 'bottom-right' },
            back: { front: 'top-left', left: 'bottom-left', right: 'bottom-right' },
            left: { front: 'top-left', back: 'top-right', right: 'bottom-right' },
            right: { front: 'top-left', back: 'top-right', left: 'bottom-left' }
        };
        const pipMapping = layouts[cameraType] || {};
        const positionClasses = ['pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right'];

        Object.keys(this.playerContainers).forEach(key => {
            const container = this.playerContainers[key];
            if (!container) return;

            container.classList.remove('is-main', 'is-pip', 'hidden', ...positionClasses);
            container.dataset.camera = key;

            if (key === cameraType) {
                container.classList.add('is-main');
            } else if (pipMapping[key]) {
                container.classList.add('is-pip', `pos-${pipMapping[key]}`);
            } else {
                container.classList.add('is-pip', 'hidden');
            }
        });
    }

    async loadSegmentForAllCameras(segment) {
        this.cleanup();
        const cameras = ['front', 'back', 'left', 'right'];
        for (const camera of cameras) {
            const file = segment.files[camera];
            const player = this.players[camera];
            const cameraView = this.playerContainers[camera];

            if (file && player) {
                this.currentUrls[camera] = URL.createObjectURL(file);
                player.src = this.currentUrls[camera];
                // Re-apply the rate here as cleanup() / .src change resets the player state.
                player.defaultPlaybackRate = this.playbackRate;
                player.playbackRate = this.playbackRate;
                if(cameraView) cameraView.classList.remove('error', 'empty');
            } else {
                if (player) player.src = '';
                if(cameraView) cameraView.classList.add('empty');
            }
        }
        await this.waitForAllVideosLoaded();
    }

    async waitForAllVideosLoaded() {
        const loadPromises = Object.values(this.players).filter(p => p.src).map(player =>
            new Promise((resolve) => {
                if (player.readyState >= 2) resolve();
                else {
                    player.addEventListener('loadeddata', resolve, { once: true });
                    player.addEventListener('error', resolve, { once: true });
                }
            })
        );
        await Promise.all(loadPromises);
    }

    async syncAllPlayers() {
        if (this.isSeeking) return;
        const mainPlayer = this.players[this.activeCamera];
        if (!mainPlayer || !mainPlayer.src) return;
        const currentTime = mainPlayer.currentTime;
        Object.keys(this.players).forEach(key => {
            if (key !== this.activeCamera && this.players[key] && this.players[key].src) {
                const player = this.players[key];
                if (Math.abs(player.currentTime - currentTime) > 0.1) {
                    player.currentTime = currentTime;
                }
            }
        });
    }

    async playAll() {
        const playPromises = Object.values(this.players).filter(p => p.src).map(p => p.play().catch(e => console.warn('Play failed:', e)));
        await Promise.all(playPromises);
    }

    pauseAll() {
        Object.values(this.players).forEach(p => { if (p.src) p.pause(); });
    }

    seekAll(time) {
        this.isSeeking = true;
        Object.values(this.players).forEach(p => { if (p.src) p.currentTime = time; });
        setTimeout(() => { this.isSeeking = false; }, 100);
    }

    cleanup() {
        this.pauseAll();
        Object.values(this.players).forEach(player => {
            player.src = '';
            player.removeAttribute('src');
            player.load();
        });
        Object.keys(this.currentUrls).forEach(key => {
            if (this.currentUrls[key]) {
                URL.revokeObjectURL(this.currentUrls[key]);
                this.currentUrls[key] = null;
            }
        });
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        Object.values(this.players).forEach(p => {
            if (p) {
                p.defaultPlaybackRate = rate;
                p.playbackRate = rate;
            }
        });
    }
}

class ContinuousVideoPlayer {
    constructor(multiCameraPlayer) {
        this.multiCameraPlayer = multiCameraPlayer;
        this.currentEvent = null;
        this.currentSegmentIndex = 0;
        this.totalDuration = 0;
        this.segmentDurations = [];
        this.segmentStartTimes = [];
        this.isTransitioning = false;
        this.bindEvents();
    }

    bindEvents() {
        const refPlayer = this.multiCameraPlayer.players.front;
        if (!refPlayer) return;
        refPlayer.addEventListener('ended', () => { if (!this.isTransitioning) this.playNextSegment(); });
        refPlayer.addEventListener('timeupdate', () => this.multiCameraPlayer.syncAllPlayers());
    }

    async calculateEventDurations(event) {
        if (!event.segments || event.segments.length === 0) {
            event.totalDuration = 0;
            event.segmentDurations = [];
            event.segmentStartTimes = [];
            return;
        }
        const getVideoDuration = (file) => new Promise((resolve) => {
            if (!file) { resolve(60); return; }
            const video = document.createElement('video');
            const url = URL.createObjectURL(file);
            const cleanup = () => {
                video.onloadedmetadata = null;
                video.onerror = null;
                video.src = '';
                URL.revokeObjectURL(url);
            };
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const duration = video.duration;
                cleanup();
                resolve(isFinite(duration) ? duration : 60);
            };
            video.onerror = () => { cleanup(); resolve(60); };
            video.src = url;
        });
        const segmentCount = event.segments.length;
        const durations = new Array(segmentCount).fill(60);
        if (segmentCount > 0) {
            const lastSegment = event.segments[segmentCount - 1];
            const repFile = lastSegment.files.front || lastSegment.files.back || lastSegment.files.left || lastSegment.files.right;
            durations[segmentCount - 1] = await getVideoDuration(repFile);
        }
        event.segmentDurations = [];
        event.segmentStartTimes = [];
        let accumulatedTime = 0;
        for (let i = 0; i < segmentCount; i++) {
            event.segmentStartTimes[i] = accumulatedTime;
            const segmentDuration = durations[i];
            event.segmentDurations[i] = segmentDuration;
            accumulatedTime += segmentDuration;
        }
        event.totalDuration = accumulatedTime;
    }

    async loadEvent(event) {
        this.currentEvent = event;
        this.currentSegmentIndex = 0;
        this.segmentDurations = event.segmentDurations || [];
        this.segmentStartTimes = event.segmentStartTimes || [];
        this.totalDuration = event.totalDuration || 0;
        await this.loadSegment(0);
    }

    async loadSegment(index) {
        if (!this.currentEvent || index < 0 || index >= this.currentEvent.segments.length) return;
        this.currentSegmentIndex = index;
        const segment = this.currentEvent.segments[index];
        await this.multiCameraPlayer.loadSegmentForAllCameras(segment);
    }

    async playNextSegment() {
        if (this.currentSegmentIndex < this.currentEvent.segments.length - 1) {
            this.isTransitioning = true;
            await this.loadSegment(this.currentSegmentIndex + 1);
            await this.multiCameraPlayer.playAll();
            this.isTransitioning = false;
        } else {
            console.log("All segments played.");
            this.multiCameraPlayer.pauseAll();
        }
    }

    getCurrentTime() {
        if (!this.currentEvent) return 0;
        const segmentStartTime = this.segmentStartTimes[this.currentSegmentIndex] || 0;
        const activePlayer = this.multiCameraPlayer.players[this.multiCameraPlayer.activeCamera];
        const segmentCurrentTime = activePlayer ? activePlayer.currentTime : 0;
        return segmentStartTime + segmentCurrentTime;
    }

    async seekToTime(targetTime) {
        if (!this.currentEvent) return;
        let targetSegmentIndex = 0;
        for (let i = 0; i < this.segmentStartTimes.length; i++) {
            if (targetTime >= this.segmentStartTimes[i]) targetSegmentIndex = i;
            else break;
        }
        const segmentStartTime = this.segmentStartTimes[targetSegmentIndex];
        const segmentTime = targetTime - segmentStartTime;
        if (targetSegmentIndex !== this.currentSegmentIndex) {
            await this.loadSegment(targetSegmentIndex);
        }
        this.multiCameraPlayer.seekAll(segmentTime);
    }

    getTotalDuration() { return this.totalDuration; }
}

class ModernVideoControls {
    constructor(continuousPlayer, viewer) {
        this.continuousPlayer = continuousPlayer;
        this.multiCameraPlayer = continuousPlayer.multiCameraPlayer;
        this.viewer = viewer;
        this.player = this.multiCameraPlayer.players.front;
        this.container = document.getElementById('playerArea');
        this.totalDuration = 0;
        this.isPlaying = false;
        this.isDragging = false;
        this.wasPlaying = false;
        this.currentEventStartTime = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        if (!this.container) return;
        this.overlay = this.container.querySelector('#videoControlsOverlay');
        this.playPauseBtn = this.container.querySelector('#playPauseBtn');
        this.playPauseIcon = this.container.querySelector('#playPauseIcon');
        this.progressContainer = this.container.querySelector('#progressContainer');
        this.progressPlayed = this.container.querySelector('#progressPlayed');
        this.progressHandle = this.container.querySelector('#progressHandle');
        this.videoTimeDisplay = this.container.querySelector('#videoTimeDisplay');
        this.timePreview = this.container.querySelector('#timePreview');
        this.realTimeClock = this.container.querySelector('#realTimeClock');
        this.speedControl = this.container.querySelector('#speedControl');
        this.speedBtn = this.container.querySelector('#speedBtn');
        this.speedOptions = this.container.querySelector('.speed-options');
    }

    bindEvents() {
        if (this.playPauseBtn) this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        if (this.progressContainer) {
            this.progressContainer.addEventListener('mousedown', (e) => this.startDrag(e));
            document.addEventListener('mousemove', (e) => this.onDrag(e));
            document.addEventListener('mouseup', (e) => this.stopDrag(e));

            this.progressContainer.addEventListener('mousemove', (e) => {
                if (!this.isDragging) this.showTimePreview(e);
            });
            this.progressContainer.addEventListener('mouseleave', () => {
                if (!this.isDragging) this.hideTimePreview();
            });
        }

        if (this.player) {
            this.player.addEventListener('timeupdate', () => {
                if (!this.isDragging) this.updateProgress();
            });
            this.player.addEventListener('play', () => this.updatePlayState(true));
            this.player.addEventListener('pause', () => this.updatePlayState(false));
        }

        if (this.container) {
            this.container.addEventListener('mouseenter', () => this.showControls());
            this.container.addEventListener('mouseleave', () => this.hideControls());
        }

        if (this.speedBtn) {
            this.speedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.speedControl.classList.toggle('active');
            });
        }

        if (this.speedOptions) {
            this.speedOptions.addEventListener('click', (e) => {
                e.stopPropagation();
                if (e.target.dataset.speed) {
                    this.setSpeed(parseFloat(e.target.dataset.speed));
                    this.speedControl.classList.remove('active');
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (this.speedControl && this.speedControl.classList.contains('active') && !this.speedControl.contains(e.target)) {
                this.speedControl.classList.remove('active');
            }
        });
    }

    setTotalDuration(duration) {
        this.totalDuration = duration || 0;
        this.updateProgress();
    }

    async togglePlayPause() {
        if (!this.multiCameraPlayer.isPlaying) await this.multiCameraPlayer.playAll();
        else this.multiCameraPlayer.pauseAll();
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        this.wasPlaying = this.multiCameraPlayer.isPlaying;
        if (this.wasPlaying) {
            this.multiCameraPlayer.pauseAll();
        }
        this.timePreview.classList.remove('show');
    }

    onDrag(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        
        const currentTime = pos * this.totalDuration;

        this.progressPlayed.style.width = `${pos * 100}%`;
        this.progressHandle.style.left = `${pos * 100}%`;
        this.videoTimeDisplay.textContent = `${this.formatTime(currentTime)} / ${this.formatTime(this.totalDuration)}`;
    }

    async stopDrag(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const rect = this.progressContainer.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (this.totalDuration > 0) {
            const targetTime = pos * this.totalDuration;
            
            this.progressPlayed.style.width = `${pos * 100}%`;
            this.progressHandle.style.left = `${pos * 100}%`;
            this.videoTimeDisplay.textContent = `${this.formatTime(targetTime)} / ${this.formatTime(this.totalDuration)}`;

            await this.continuousPlayer.seekToTime(targetTime);
        }

        if (this.wasPlaying) {
            await this.multiCameraPlayer.playAll();
        }
    }

    showTimePreview(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const pos = Math.max(0, Math.min(1, mouseX / rect.width));
        const time = pos * this.totalDuration;
        this.timePreview.style.left = `${pos * 100}%`;
        this.timePreview.querySelector('.time-preview-time').textContent = this.formatTime(time);
        this.timePreview.classList.add('show');
        this.progressHandle.style.left = `${pos * 100}%`;
    }

    hideTimePreview() {
        this.timePreview.classList.remove('show');
        this.updateProgress();
    }

    updateProgress() {
        const currentTime = this.continuousPlayer.getCurrentTime();
        if (this.totalDuration > 0) {
            const progress = (currentTime / this.totalDuration) * 100;
            this.progressPlayed.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
        }
        this.updateTimeDisplay();
        this.updateRealTimeClock();
    }

    setEventStartTime(startTime) {
        this.currentEventStartTime = startTime ? this.parseTimestamp(startTime) : null;
        this.updateRealTimeClock();
    }

    parseTimestamp(timestamp) {
        const [datePart, timePart] = timestamp.split('_');
        return new Date(`${datePart}T${timePart.replace(/-/g, ':')}`);
    }

    updateRealTimeClock() {
        if (!this.realTimeClock) return;

        if (!this.currentEventStartTime) {
            this.realTimeClock.textContent = '--:--:--';
            return;
        }

        try {
            const newTime = new Date(this.currentEventStartTime.getTime());
            const currentTime = this.continuousPlayer.getCurrentTime();
            newTime.setSeconds(newTime.getSeconds() + currentTime);

            const locale = this.viewer.currentLanguage === 'zh' ? 'zh-CN' : 'en-CA'; // en-CA for yyyy-mm-dd
            this.realTimeClock.textContent = newTime.toLocaleString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-');
        } catch (e) {
            this.realTimeClock.textContent = '错误';
            console.error("Error updating real-time clock:", e);
        }
    }

    updatePlayState(playing) {
        this.isPlaying = playing;
        this.multiCameraPlayer.isPlaying = playing;
        this.playPauseIcon.src = playing ? 'assets/CodeBubbyAssets/2_38/2.svg' : 'assets/CodeBubbyAssets/2_38/10.svg';
        this.playPauseIcon.alt = i18n[this.viewer.currentLanguage][playing ? 'pause' : 'play'];
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.continuousPlayer.getCurrentTime());
        const total = this.formatTime(this.totalDuration);
        this.videoTimeDisplay.textContent = `${current} / ${total}`;
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showControls() {
        this.overlay.classList.add('show');
    }

    hideControls() {
        if (this.speedControl?.classList.contains('active')) {
            return;
        }
        this.overlay.classList.remove('show');
    }

    setSpeed(rate) {
        this.multiCameraPlayer.setPlaybackRate(rate);
        this.speedBtn.textContent = `${rate.toFixed(1)}x`;
        
        this.speedOptions.querySelectorAll('div').forEach(div => {
            div.classList.remove('active');
        });
        const activeOption = this.speedOptions.querySelector(`[data-speed="${rate.toFixed(1)}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }
}

class TeslaCamViewer {
    constructor() {
        this.allFiles = [];
        this.eventGroups = [];
        this.currentEvent = null;
        this.currentLanguage = 'zh';
        this.dom = {
            folderInput: document.getElementById('folderInput'),
            selectFolderBtn: document.getElementById('selectFolderBtn'),
            dateFilter: document.getElementById('dateFilter'),
            eventFilter: document.getElementById('eventFilter'),
            sidebar: document.querySelector('.sidebar'),
            toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
            playerArea: document.getElementById('playerArea'),
            overlay: document.getElementById('overlay'),
            themeToggleBtn: document.getElementById('themeToggleBtn'),
            langToggleBtn: document.getElementById('langToggleBtn'),
        };
        this.videoListComponent = new VideoListComponent('fileList', (eventId) => this.playEvent(eventId), this);
        this.multiCameraPlayer = new MultiCameraPlayer();
        this.continuousPlayer = new ContinuousVideoPlayer(this.multiCameraPlayer);
        this.videoControls = new ModernVideoControls(this.continuousPlayer, this);
        this.initializeEventListeners();
        this.loadTheme();
        this.loadLanguage();
    }

    initializeEventListeners() {
        this.dom.selectFolderBtn.addEventListener('click', () => this.dom.folderInput.click());
        this.dom.folderInput.addEventListener('change', (e) => this.handleFolderSelection(e.target.files));
        this.dom.dateFilter.addEventListener('change', () => this.filterAndRender());
        this.dom.eventFilter.addEventListener('change', () => this.filterAndRender());
        this.dom.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.dom.overlay.addEventListener('click', () => this.toggleSidebar(false));
        this.dom.playerArea.addEventListener('click', (e) => {
            const container = e.target.closest('.video-container.is-pip');
            if (container) this.switchCamera(container.dataset.camera);
        });
        this.dom.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        this.dom.langToggleBtn.addEventListener('click', () => this.toggleLanguage());
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                const isDark = e.matches;
                document.body.classList.toggle('dark-theme', isDark);
                this.updateThemeIcon(isDark);
            }
        });
    }

    handleGlobalKeydown(e) {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        if (e.key === ' ' && !isTyping) {
            e.preventDefault();
            this.videoControls.togglePlayPause();
        }
    }

    async handleFolderSelection(files) {
        this.allFiles = Array.from(files);
        this.eventGroups = await this.processFiles(this.allFiles);
        this.filterAndRender();
    }

    async processFiles(files) {
        const eventMap = new Map();
        const videoFiles = files.filter(f => f.name.endsWith('.mp4') && f.webkitRelativePath.includes('TeslaCam/'));
        for (const file of videoFiles) {
            const eventType = this.getEventType(file.webkitRelativePath);
            if (eventType === 'Unknown') continue;
            const timestampMatch = file.name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})-\d{2}/);
            if (!timestampMatch) continue;
            const eventId = file.webkitRelativePath.substring(0, file.webkitRelativePath.lastIndexOf('/'));
            if (!eventMap.has(eventId)) eventMap.set(eventId, { eventId, eventType, segments: new Map() });
            const event = eventMap.get(eventId);
            const minuteTimestamp = timestampMatch[1];
            if (!event.segments.has(minuteTimestamp)) event.segments.set(minuteTimestamp, { timestamp: minuteTimestamp, files: {} });
            const segment = event.segments.get(minuteTimestamp);
            const cameraType = this.getCameraType(file.name);
            if (cameraType) segment.files[cameraType] = file;
        }
        const thumbFiles = files.filter(f => f.name === 'thumb.png');
        for(const thumb of thumbFiles) {
            const thumbDir = thumb.webkitRelativePath.substring(0, thumb.webkitRelativePath.lastIndexOf('/'));
            if (eventMap.has(thumbDir)) eventMap.get(thumbDir).thumbFile = thumb;
        }
        return Array.from(eventMap.values()).map(event => {
            event.segments = Array.from(event.segments.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            if (event.segments.length > 0) event.startTime = event.segments[0].timestamp;
            return event;
        }).filter(e => e.segments.length > 0).sort((a, b) => b.startTime.localeCompare(a.startTime));
    }

    filterAndRender() {
        const dateFilter = this.dom.dateFilter.value;
        const eventFilter = this.dom.eventFilter.value;
        const filteredEvents = this.eventGroups.filter(event => 
            (!dateFilter || event.startTime.startsWith(dateFilter)) && 
            (!eventFilter || event.eventType === eventFilter)
        );
        this.videoListComponent.render(filteredEvents);
    }

    async playEvent(eventId) {
        const event = this.eventGroups.find(e => e.eventId === eventId);
        if (!event) return;
        this.currentEvent = event;

        this.videoControls.setEventStartTime(event.startTime);
        
        if (!event.totalDuration || event.totalDuration <= 0) {
            await this.continuousPlayer.calculateEventDurations(event);
        }

        await this.continuousPlayer.loadEvent(event); 
        this.videoControls.setTotalDuration(this.continuousPlayer.getTotalDuration());
        
        this.multiCameraPlayer.setActive('front');

        await this.multiCameraPlayer.playAll();

        document.querySelectorAll('.video-card.active').forEach(c => c.classList.remove('active'));
        document.querySelector(`.video-card[data-event-id="${eventId}"]`)?.classList.add('active');
        if (window.innerWidth < 768) this.toggleSidebar(false);
    }

    switchCamera(camera) {
        if (camera === this.multiCameraPlayer.activeCamera || !this.currentEvent) return;
        this.multiCameraPlayer.setActive(camera);
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateThemeIcon(isDark);
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        let isDark;
        if (savedTheme) {
            isDark = savedTheme === 'dark';
        } else {
            isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        document.body.classList.toggle('dark-theme', isDark);
        this.updateThemeIcon(isDark);
    }

    updateThemeIcon(isDark) {
        if (this.dom.themeToggleBtn) {
            this.dom.themeToggleBtn.textContent = isDark ? '🌙' : '☀️';
            this.dom.themeToggleBtn.title = i18n[this.currentLanguage][isDark ? 'toggleDay' : 'toggleNight'];
        }
    }

    toggleLanguage() {
        const newLang = this.currentLanguage === 'zh' ? 'en' : 'zh';
        this.setLanguage(newLang);
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        this.updateAllUIText(lang);
    }

    loadLanguage() {
        const savedLang = localStorage.getItem('language');
        let lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        if (savedLang) {
            lang = savedLang;
        }
        this.setLanguage(lang);
    }

    updateAllUIText(lang) {
        const translations = i18n[lang];
        if (!translations) return;

        document.title = translations.pageTitle;
        this.dom.langToggleBtn.textContent = lang === 'zh' ? 'En' : '中';
        this.dom.langToggleBtn.title = translations.toggleLanguage;
        this.dom.themeToggleBtn.title = translations.toggleTheme;
        this.dom.toggleSidebarBtn.title = translations.toggleSidebar;

        document.querySelector('.sidebar-header h2').textContent = translations.drivingRecords;
        document.querySelector('.filter-group label[for="dateFilter"]').textContent = translations.date;
        document.querySelector('.filter-group label[for="eventFilter"]').textContent = translations.eventType;
        document.querySelector('#eventFilter option[value=""]').textContent = translations.allTypes;
        document.querySelector('#eventFilter option[value="RecentClips"]').textContent = translations.recentClips;
        document.querySelector('#eventFilter option[value="SavedClips"]').textContent = translations.savedClips;
        document.querySelector('#eventFilter option[value="SentryClips"]').textContent = translations.sentryClips;
        document.querySelector('#selectFolderBtn').textContent = translations.selectFolder;
        document.querySelector('.header-title span').textContent = translations.headerTitle;

        const emptyState = document.querySelector('.empty-state p');
        if (emptyState) {
            emptyState.textContent = this.allFiles.length > 0 ? translations.noRecordsFound : translations.selectFolderPrompt;
        }
        
        this.videoControls.updatePlayState(this.multiCameraPlayer.isPlaying);
        this.videoControls.updateRealTimeClock();
        this.filterAndRender();
    }

    toggleSidebar(forceState) {
        let isNowCollapsed;
        if (typeof forceState !== 'undefined') {
            isNowCollapsed = !forceState;
            this.dom.sidebar.classList.toggle('collapsed', isNowCollapsed);
        } else {
            isNowCollapsed = this.dom.sidebar.classList.toggle('collapsed');
        }
        
        this.dom.toggleSidebarBtn.classList.toggle('collapsed', isNowCollapsed);
        this.dom.overlay.classList.toggle('active', !isNowCollapsed && window.innerWidth < 768);
    }

    getEventType(path) {
        if (path.includes('RecentClips/')) return 'RecentClips';
        if (path.includes('SavedClips/')) return 'SavedClips';
        if (path.includes('SentryClips/')) return 'SentryClips';
        return 'Unknown';
    }

    getCameraType(fileName) {
        if (fileName.includes('-front.mp4')) return 'front';
        if (fileName.includes('-back.mp4')) return 'back';
        if (fileName.includes('-left_repeater.mp4')) return 'left';
        if (fileName.includes('-right_repeater.mp4')) return 'right';
        return null;
    }

    destroy() { if (this.multiCameraPlayer) this.multiCameraPlayer.cleanup(); }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.viewer = new TeslaCamViewer();
        window.addEventListener('beforeunload', () => { if (window.viewer) window.viewer.destroy(); });
        console.log('TeslaCam Player Initialized');
    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Player initialization failed. Check console for details.");
    }
});