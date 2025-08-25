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
        allTypes: "📂 All Types",
        recentClips: "🕒 Recent Clips",
        savedClips: "💾 Saved Clips",
        sentryClips: "🤖 Sentry Clips",
        noRecordsFound: "No records found",
        selectFolder: "📁 Select Folder",
        helpStep1: "Insert your Tesla USB drive into your PC",
        helpStep2: "Select the 'TeslaCam' directory from the drive",
        helpNote: "Note: This tool does not upload your data. All operations are performed locally. (Gaode Maps may have inaccuracies due to limited WGS-84 support.)",
        mapModalTitle: "View on Map",
        gaodeMap: "Gaode Map",
        googleMap: "Google Map",
        revealFile: "Reveal File Path",
        downloadFile: "Download Current File",
        filePathAlertTitle: "Current Video File Path",
        selectDate: "Select Date",
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
        allTypes: "🎥 所有类型",
        recentClips: "🕒 最近片段",
        savedClips: "💾 保存片段",
        sentryClips: "🤖 哨兵模式",
        noRecordsFound: "没有找到匹配的记录",
        selectFolder: "📁 选择文件夹",
        helpStep1: "插入特斯拉U盘到你的PC",
        helpStep2: "选择U盘中的TeslaCam目录",
        helpNote: "注意：本工具不会上传你的数据，一切操作都是本地行为。（由于高德对WGS-84支持不够，所以高德地图有误差）",
        mapModalTitle: "在地图上查看",
        gaodeMap: "高德地图",
        googleMap: "谷歌地图",
        revealFile: "显示文件路径",
        downloadFile: "下载当前文件",
        filePathAlertTitle: "当前视频文件路径",
        selectDate: "选择日期",
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

// --- Coordinate Conversion Functions ---
const x_pi = 3.14159265358979324 * 3000.0 / 180.0;
const PI = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function transformlat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}

function transformlng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}

function wgs84togcj02(lng, lat) {
    let dlat = transformlat(lng - 105.0, lat - 35.0);
    let dlng = transformlng(lng - 105.0, lat - 35.0);
    const radlat = lat / 180.0 * PI;
    let magic = Math.sin(radlat);
    magic = 1 - ee * magic * magic;
    const sqrtmagic = Math.sqrt(magic);
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
    dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
    const mglat = lat + dlat;
    const mglng = lng + dlng;
    return [mglng, mglat];
}

function gcj02tobd09(lng, lat) {
    const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
    const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
    const bd_lng = z * Math.cos(theta) + 0.0065;
    const bd_lat = z * Math.sin(theta) + 0.006;
    return [bd_lng, bd_lat];
}
// --- End Coordinate Conversion ---

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
            if (this.viewer.allFiles.length > 0) {
                this.container.innerHTML = `<div class="empty-state"><p>${translations.noRecordsFound}</p></div>`;
            } else {
                this.viewer.showInitialHelpMessage();
            }
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
        const timeString = startTime.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        let cityHtml = '';
        if (event.city && event.lat && event.lon) {
            cityHtml = `<span class="city-link" data-lat="${event.lat}" data-lon="${event.lon}">${event.city}</span> `;
        } else if (event.city) {
            cityHtml = `${event.city} `;
        }

        const eventTypeLabel = this.getEventTypeLabel(event.eventType);

        infoDiv.innerHTML = `
            <div class="video-time">${cityHtml}${timeString}</div>
            <div class="video-type" title="${eventTypeLabel}">${eventTypeLabel.split(' ')[0]}</div>
        `;
        card.appendChild(infoDiv);
        
        // Attach event listener to the card, but check for city-link target
        card.onclick = (e) => {
            if (e.target.classList.contains('city-link')) {
                e.stopPropagation(); // Prevent card click from firing
                this.viewer.showMapModal(e.target.dataset.lat, e.target.dataset.lon);
            } else {
                this.eventHandler(event.eventId);
            }
        };

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
        this.lastSyncTime = 0;
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

        const now = performance.now();
        if (now - this.lastSyncTime < 100) { // Throttle to max 10 times per second
            return;
        }
        this.lastSyncTime = now;

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
        this.realTimeClock = document.getElementById('realTimeClock');
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

        const currentEvent = this.continuousPlayer.currentEvent;
        if (!currentEvent) {
            this.realTimeClock.textContent = '--:--:--';
            return;
        }

        try {
            let newTime;
            const activePlayer = this.multiCameraPlayer.players[this.multiCameraPlayer.activeCamera];
            const segmentTime = activePlayer ? activePlayer.currentTime : 0;

            if (currentEvent.eventType === 'RecentClips') {
                const currentSegmentIndex = this.continuousPlayer.currentSegmentIndex;
                const segment = currentEvent.segments[currentSegmentIndex];
                const activeCameraFile = segment.files[this.multiCameraPlayer.activeCamera];

                if (activeCameraFile && activeCameraFile.name) {
                    const timestampMatch = activeCameraFile.name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
                    if (timestampMatch) {
                        const segmentStartTime = this.parseTimestamp(timestampMatch[0]);
                        if (segmentStartTime) {
                            newTime = new Date(segmentStartTime.getTime());
                            newTime.setSeconds(newTime.getSeconds() + segmentTime);
                        }
                    }
                }
            } 
            
            // Fallback or default behavior for Sentry/Saved and if RecentClips logic fails
            if (!newTime) {
                if (!this.currentEventStartTime) {
                    this.realTimeClock.textContent = '--:--:--';
                    return;
                }
                newTime = new Date(this.currentEventStartTime.getTime());
                const totalElapsedTime = this.continuousPlayer.getCurrentTime();
                newTime.setSeconds(newTime.getSeconds() + totalElapsedTime);
            }

            const locale = this.viewer.currentLanguage === 'zh' ? 'zh-CN' : 'en-CA';
            this.realTimeClock.textContent = newTime.toLocaleString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/\//g, '-').replace(',', '');

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

        const revealBtn = this.viewer.dom.revealFileBtn;
        if (revealBtn) {
            revealBtn.disabled = playing || !this.viewer.currentEvent;
        }
        const downloadBtn = this.viewer.dom.downloadFileBtn;
        if (downloadBtn) {
            downloadBtn.disabled = playing || !this.viewer.currentEvent;
        }
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

    addEventMarkers(event) {
        if (!this.progressContainer) return;
        // Clear previous markers
        this.progressContainer.querySelectorAll('.event-marker').forEach(m => m.remove());

        if (!event.eventTimestamp || !event.startTime || !this.totalDuration) {
            return;
        }

        try {
            const eventTime = new Date(event.eventTimestamp);
            const videoStartTime = this.parseTimestamp(event.startTime);
            
            const timeOffset = (eventTime.getTime() - videoStartTime.getTime()) / 1000;

            if (timeOffset >= 0 && timeOffset <= this.totalDuration) {
                const positionPercent = (timeOffset / this.totalDuration) * 100;
                
                const marker = document.createElement('div');
                marker.className = 'event-marker';
                marker.style.left = `${positionPercent}%`;
                marker.title = `Event: ${eventTime.toLocaleTimeString()}`;
                this.progressContainer.appendChild(marker);
            }
        } catch (e) {
            console.error("Error creating event marker:", e);
        }
    }
}

class TeslaCamViewer {
    constructor() {
        this.allFiles = [];
        this.eventGroups = [];
        this.currentEvent = null;
        this.currentLanguage = 'zh';
        this.currentMapCoordinates = null;
        this.flatpickrInstance = null;
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
            mapModal: document.getElementById('mapModal'),
            mapModalTitle: document.getElementById('mapModalTitle'),
            gaodeMapBtn: document.getElementById('gaodeMapBtn'),
            googleMapBtn: document.getElementById('googleMapBtn'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            revealFileBtn: document.getElementById('revealFileBtn'),
            downloadFileBtn: document.getElementById('downloadFileBtn'),
            headerLocationDisplay: document.getElementById('headerLocationDisplay'),
        };
        this.videoListComponent = new VideoListComponent('fileList', (eventId) => this.playEvent(eventId), this);
        this.multiCameraPlayer = new MultiCameraPlayer();
        this.continuousPlayer = new ContinuousVideoPlayer(this.multiCameraPlayer);
        this.videoControls = new ModernVideoControls(this.continuousPlayer, this);
        this.initializeEventListeners();
        this.initializeFlatpickr();
        this.loadTheme();
        this.loadLanguage();
    }

    initializeEventListeners() {
        this.dom.selectFolderBtn.addEventListener('click', () => this.dom.folderInput.click());
        this.dom.folderInput.addEventListener('change', (e) => this.handleFolderSelection(e.target.files));
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

        window.addEventListener('resize', () => this.handleResize());

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                const isDark = e.matches;
                document.body.classList.toggle('dark-theme', isDark);
                this.updateThemeIcon(isDark);
            }
        });

        // Map Modal Listeners
        this.dom.closeModalBtn.addEventListener('click', () => this.hideMapModal());
        this.dom.mapModal.addEventListener('click', (e) => {
            if (e.target === this.dom.mapModal) {
                this.hideMapModal();
            }
        });
        this.dom.gaodeMapBtn.addEventListener('click', () => this.openMap('gaode'));
        this.dom.googleMapBtn.addEventListener('click', () => this.openMap('google'));
        this.dom.revealFileBtn.addEventListener('click', () => this.revealCurrentFilePath());
        this.dom.downloadFileBtn.addEventListener('click', () => this.downloadCurrentFile());
    }

    initializeFlatpickr() {
        const lang = this.currentLanguage;
        const translations = i18n[lang];
        this.flatpickrInstance = flatpickr(this.dom.dateFilter, {
            dateFormat: "Y-m-d",
            locale: this.currentLanguage === 'zh' ? 'zh' : 'default',
            placeholder: translations.selectDate,
            onChange: (selectedDates, dateStr, instance) => {
                this.filterAndRender();
            },
            onReady: (selectedDates, dateStr, instance) => {
                const cal = instance.calendarContainer;
                cal.classList.add('teslacam-flatpickr');
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

    handleResize() {
        this.dom.sidebar.style.transition = 'none';
        setTimeout(() => {
            this.dom.sidebar.style.transition = '';
        }, 50);
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

        const jsonFiles = files.filter(f => f.name === 'event.json');
        for (const jsonFile of jsonFiles) {
            const eventId = jsonFile.webkitRelativePath.substring(0, jsonFile.webkitRelativePath.lastIndexOf('/'));
            if (eventMap.has(eventId)) {
                try {
                    const eventData = JSON.parse(await jsonFile.text());
                    const eventObj = eventMap.get(eventId);
                    eventObj.city = eventData.city;
                    eventObj.eventTimestamp = eventData.timestamp;
                    eventObj.lat = eventData.est_lat;
                    eventObj.lon = eventData.est_lon;
                } catch (e) {
                    console.error(`Error parsing event.json for ${eventId}:`, e);
                }
            }
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

        if (this.dom.headerLocationDisplay) {
            if (event.city && event.lat && event.lon) {
                this.dom.headerLocationDisplay.innerHTML = `📍 <span class="city-text">${event.city}</span>`;
                this.dom.headerLocationDisplay.onclick = () => this.showMapModal(event.lat, event.lon);
                this.dom.headerLocationDisplay.style.display = 'block';
            } else {
                this.dom.headerLocationDisplay.innerHTML = '';
                this.dom.headerLocationDisplay.onclick = null;
                this.dom.headerLocationDisplay.style.display = 'none';
            }
        }

        this.dom.playerArea.classList.remove('empty');

        this.videoControls.setEventStartTime(event.startTime);
        
        if (!event.totalDuration || event.totalDuration <= 0) {
            await this.continuousPlayer.calculateEventDurations(event);
        }

        await this.continuousPlayer.loadEvent(event); 
        this.videoControls.setTotalDuration(this.continuousPlayer.getTotalDuration());
        this.videoControls.addEventMarkers(event);
        
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

    showInitialHelpMessage() {
        const lang = this.currentLanguage;
        const translations = i18n[lang];
        const helpHtml = `
            <div class="empty-state help-text">
                <ol>
                    <li>${translations.helpStep1}</li>
                    <li>${translations.helpStep2}</li>
                </ol>
                <p class="note">${translations.helpNote}</p>
            </div>
        `;
        this.videoListComponent.container.innerHTML = helpHtml;
    }

    toggleLanguage() {
        const newLang = this.currentLanguage === 'zh' ? 'en' : 'zh';
        this.setLanguage(newLang);
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        if (this.flatpickrInstance) {
            const isChinese = lang === 'zh';
            this.flatpickrInstance.set('locale', isChinese ? 'zh' : 'default');
            this.flatpickrInstance.redraw();
            this.dom.dateFilter.placeholder = i18n[lang].selectDate;
        }
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
        this.dom.mapModalTitle.textContent = translations.mapModalTitle;
        this.dom.gaodeMapBtn.textContent = translations.gaodeMap;
        this.dom.googleMapBtn.textContent = translations.googleMap;
        this.dom.revealFileBtn.title = translations.revealFile;
        this.dom.downloadFileBtn.title = translations.downloadFile;

        document.querySelector('.sidebar-header .header-title span').textContent = translations.headerTitle;
        document.querySelector('.filter-group label[for="dateFilter"]').textContent = translations.date;
        document.querySelector('.filter-group label[for="eventFilter"]').textContent = translations.eventType;
        document.querySelector('#eventFilter option[value=""]').textContent = translations.allTypes;
        document.querySelector('#eventFilter option[value="RecentClips"]').textContent = translations.recentClips;
        document.querySelector('#eventFilter option[value="SavedClips"]').textContent = translations.savedClips;
        document.querySelector('#eventFilter option[value="SentryClips"]').textContent = translations.sentryClips;
        document.querySelector('#selectFolderBtn').textContent = translations.selectFolder;

        if (this.allFiles.length === 0) {
            this.showInitialHelpMessage();
        } else {
            this.filterAndRender();
        }
        
        this.videoControls.updatePlayState(this.multiCameraPlayer.isPlaying);
        this.videoControls.updateRealTimeClock();
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

    revealCurrentFilePath() {
        if (this.multiCameraPlayer.isPlaying || !this.continuousPlayer.currentEvent) {
            return;
        }
    
        const currentSegmentIndex = this.continuousPlayer.currentSegmentIndex;
        const segment = this.continuousPlayer.currentEvent.segments[currentSegmentIndex];
        if (!segment) {
            alert("Could not determine file path.");
            return;
        }
    
        const activeCamera = this.multiCameraPlayer.activeCamera;
        const file = segment.files[activeCamera];
    
        if (file && file.webkitRelativePath) {
            const lang = this.currentLanguage;
            const translations = i18n[lang];
            alert(`${translations.filePathAlertTitle}:\n\n${file.webkitRelativePath}`);
        } else {
            alert("Could not determine file path for the active camera.");
        }
    }

    downloadCurrentFile() {
        if (this.multiCameraPlayer.isPlaying || !this.continuousPlayer.currentEvent) {
            return;
        }
    
        const currentSegmentIndex = this.continuousPlayer.currentSegmentIndex;
        const segment = this.continuousPlayer.currentEvent.segments[currentSegmentIndex];
        if (!segment) {
            return;
        }
    
        const activeCamera = this.multiCameraPlayer.activeCamera;
        const file = segment.files[activeCamera];
    
        if (file) {
            const a = document.createElement('a');
            const url = URL.createObjectURL(file);
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    showMapModal(lat, lon) {
        this.currentMapCoordinates = { lat, lon };
        this.dom.mapModal.style.display = 'flex';
        setTimeout(() => this.dom.mapModal.classList.add('show'), 10);
    }

    hideMapModal() {
        this.dom.mapModal.classList.remove('show');
        setTimeout(() => {
            this.dom.mapModal.style.display = 'none';
            this.currentMapCoordinates = null;
        }, 300);
    }

    openMap(type) {
        if (!this.currentMapCoordinates) return;
        const { lat, lon } = this.currentMapCoordinates;
        let url;
        if (type === 'gaode') {
            // Convert WGS-84 (GPS) to GCJ-02 (Gaode/AMap) for accuracy
            const gcj02 = wgs84togcj02(parseFloat(lon), parseFloat(lat));
            const gcj_lon = gcj02[0];
            const gcj_lat = gcj02[1];
            // Gaode URI API uses lon,lat order and GCJ-02 coordinates
            url = `https://uri.amap.com/marker?position=${gcj_lon},${gcj_lat}&name=事件位置`;
        } else { // google
            url = `https://www.google.com/maps?q=${lat},${lon}`;
        }
        window.open(url, '_blank');
        this.hideMapModal();
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