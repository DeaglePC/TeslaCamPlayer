class VideoListComponent {
    constructor(elementId, eventHandler) {
        this.container = document.getElementById(elementId);
        this.eventHandler = eventHandler;
        if (!this.container) {
            throw new Error(`Element with id "${elementId}" not found.`);
        }
    }

    render(events) {
        this.container.innerHTML = '';
        if (!events || events.length === 0) {
            this.container.innerHTML = '<div class="empty-state"><p>没有找到匹配的记录</p></div>';
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
        durationDiv.textContent = `${event.segments.length} 分钟`;
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
        return { 'RecentClips': '最近片段', 'SavedClips': '保存片段', 'SentryClips': '哨兵模式' }[type] || '未知';
    }

    parseTimestamp(timestamp) {
        const [datePart, timePart] = timestamp.split('_');
        return new Date(`${datePart}T${timePart.replace(/-/g, ':')}`);
    }
}

class MultiCameraPlayer {
    constructor() {
        this.players = {
            main: document.getElementById('main-player'),
            back: document.getElementById('back-player'),
            left: document.getElementById('left-player'),
            right: document.getElementById('right-player')
        };
        
        this.currentUrls = {
            main: null,
            back: null,
            left: null,
            right: null
        };
        
        this.activeCamera = 'front';
        this.isPlaying = false;
        this.isSeeking = false;
    }

    async loadSegmentForAllCameras(segment, activeCamera) {
        this.cleanup();

        const cameraMap = {
            'front': 'main',
            'back': 'back',
            'left': 'left',
            'right': 'right'
        };

        // 加载主摄像头视频
        const mainCameraType = activeCamera;
        const mainFile = segment.files[mainCameraType];
        if (mainFile) {
            this.currentUrls.main = URL.createObjectURL(mainFile);
            this.players.main.src = this.currentUrls.main;
        }

        // 加载其他摄像头视频
        const otherCameras = ['back', 'left', 'right'];
        for (const camera of otherCameras) {
            if (camera === activeCamera) continue;
            
            const file = segment.files[camera];
            const playerKey = cameraMap[camera];
            
            if (file && this.players[playerKey]) {
                this.currentUrls[playerKey] = URL.createObjectURL(file);
                this.players[playerKey].src = this.currentUrls[playerKey];
                
                // 标记摄像头视图状态
                const cameraView = document.querySelector(`[data-camera="${camera}"]`);
                if (cameraView) {
                    cameraView.classList.remove('error');
                    cameraView.classList.add('syncing');
                }
            } else {
                // 没有对应摄像头的视频文件
                const cameraView = document.querySelector(`[data-camera="${camera}"]`);
                if (cameraView) {
                    cameraView.classList.remove('syncing');
                    cameraView.classList.add('error');
                }
            }
        }

        // 等待所有视频加载完成
        await this.waitForAllVideosLoaded();
    }

    async waitForAllVideosLoaded() {
        const loadPromises = [];
        
        Object.values(this.players).forEach(player => {
            if (player.src) {
                loadPromises.push(new Promise((resolve) => {
                    if (player.readyState >= 2) {
                        resolve();
                    } else {
                        player.addEventListener('loadeddata', resolve, { once: true });
                        player.addEventListener('error', resolve, { once: true });
                    }
                }));
            }
        });

        await Promise.all(loadPromises);
        
        // 移除同步状态
        document.querySelectorAll('.camera-view.syncing').forEach(view => {
            view.classList.remove('syncing');
        });
    }

    async syncAllPlayers() {
        if (this.isSeeking) return;
        
        const mainPlayer = this.players.main;
        const currentTime = mainPlayer.currentTime;
        
        // 同步其他播放器的时间
        Object.keys(this.players).forEach(key => {
            if (key !== 'main' && this.players[key].src) {
                const player = this.players[key];
                if (Math.abs(player.currentTime - currentTime) > 0.1) {
                    player.currentTime = currentTime;
                }
            }
        });
    }

    async playAll() {
        this.isPlaying = true;
        const playPromises = [];
        
        Object.values(this.players).forEach(player => {
            if (player.src) {
                playPromises.push(player.play().catch(e => console.warn('播放失败:', e)));
            }
        });
        
        await Promise.all(playPromises);
    }

    pauseAll() {
        this.isPlaying = false;
        Object.values(this.players).forEach(player => {
            if (player.src) {
                player.pause();
            }
        });
    }

    seekAll(time) {
        this.isSeeking = true;
        Object.values(this.players).forEach(player => {
            if (player.src) {
                player.currentTime = time;
            }
        });
        setTimeout(() => {
            this.isSeeking = false;
        }, 100);
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
        const mainPlayer = this.multiCameraPlayer.players.main;
        
        mainPlayer.addEventListener('ended', () => {
            if (!this.isTransitioning) {
                this.playNextSegment();
            }
        });

        mainPlayer.addEventListener('timeupdate', () => {
            this.multiCameraPlayer.syncAllPlayers();
        });
    }

    async calculateEventDurations(event) {
        if (!event.segments || event.segments.length === 0) {
            event.totalDuration = 0;
            event.segmentDurations = [];
            event.segmentStartTimes = [];
            return;
        }

        const getVideoDuration = (file) => {
            return new Promise((resolve) => {
                if (!file) {
                    resolve(60); // Default if file is missing
                    return;
                }
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
                    resolve(duration);
                };
                video.onerror = () => {
                    console.warn(`Could not read duration for ${file.name}, defaulting to 60s.`);
                    cleanup();
                    resolve(60); // Fallback
                };
                video.src = url;
            });
        };

        const segmentCount = event.segments.length;
        const durations = new Array(segmentCount).fill(60);

        // Optimized: Only calculate the actual duration for the last segment
        if (segmentCount > 0) {
            const lastSegment = event.segments[segmentCount - 1];
            const representativeFile = lastSegment.files.front || lastSegment.files.back || lastSegment.files.left || lastSegment.files.right;
            durations[segmentCount - 1] = await getVideoDuration(representativeFile);
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

    async loadEvent(event, activeCamera) {
        this.currentEvent = event;
        this.currentSegmentIndex = 0;
        
        // Use pre-calculated durations from the event object
        this.segmentDurations = event.segmentDurations || [];
        this.segmentStartTimes = event.segmentStartTimes || [];
        this.totalDuration = event.totalDuration || 0;

        // 加载第一个片段
        await this.loadSegment(0, activeCamera);
    }

    async loadSegment(index, activeCamera) {
        if (!this.currentEvent || index < 0 || index >= this.currentEvent.segments.length) {
            return;
        }

        this.currentSegmentIndex = index;
        const segment = this.currentEvent.segments[index];
        
        await this.multiCameraPlayer.loadSegmentForAllCameras(segment, activeCamera);
    }

    async playNextSegment() {
        if (this.currentSegmentIndex < this.currentEvent.segments.length - 1) {
            this.isTransitioning = true;
            const wasPlaying = this.multiCameraPlayer.isPlaying;
            
            await this.loadSegment(this.currentSegmentIndex + 1, this.multiCameraPlayer.activeCamera);
            
            if (wasPlaying) {
                await this.multiCameraPlayer.playAll();
            }
            
            this.isTransitioning = false;
        } else {
            console.log("所有片段播放完毕");
        }
    }

    getCurrentTime() {
        if (!this.currentEvent) return 0;
        
        const segmentStartTime = this.segmentStartTimes[this.currentSegmentIndex] || 0;
        const segmentCurrentTime = this.multiCameraPlayer.players.main.currentTime || 0;
        
        return segmentStartTime + segmentCurrentTime;
    }

    seekToTime(targetTime) {
        if (!this.currentEvent) return Promise.resolve();

        // 找到目标时间所在的片段
        let targetSegmentIndex = 0;
        for (let i = 0; i < this.segmentStartTimes.length; i++) {
            if (targetTime >= this.segmentStartTimes[i]) {
                targetSegmentIndex = i;
            } else {
                break;
            }
        }

        const segmentStartTime = this.segmentStartTimes[targetSegmentIndex];
        const segmentTime = targetTime - segmentStartTime;

        // 如果需要切换片段
        if (targetSegmentIndex !== this.currentSegmentIndex) {
            return this.loadSegment(targetSegmentIndex, this.multiCameraPlayer.activeCamera).then(() => {
                this.multiCameraPlayer.seekAll(segmentTime);
            });
        } else {
            this.multiCameraPlayer.seekAll(segmentTime);
            return Promise.resolve();
        }
    }

    getTotalDuration() {
        return this.totalDuration;
    }

    getCurrentSegmentInfo() {
        if (!this.currentEvent) return null;
        
        return {
            current: this.currentSegmentIndex + 1,
            total: this.currentEvent.segments.length,
            segmentTime: this.multiCameraPlayer.players.main.currentTime || 0,
            totalTime: this.getCurrentTime()
        };
    }
}

class ModernVideoControls {
    constructor(continuousPlayer) {
        this.continuousPlayer = continuousPlayer;
        this.multiCameraPlayer = continuousPlayer.multiCameraPlayer;
        this.player = this.multiCameraPlayer.players.main;
        this.container = document.querySelector('.player-container');
        this.isPlaying = false;
        this.isMuted = false;
        this.isFullscreen = false;
        this.controlsTimeout = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.overlay = document.getElementById('videoControlsOverlay');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.playPauseIcon = document.getElementById('playPauseIcon');
        this.skipBackwardBtn = document.getElementById('skipBackwardBtn');
        this.skipForwardBtn = document.getElementById('skipForwardBtn');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeIcon = document.getElementById('volumeIcon');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressPlayed = document.getElementById('progressPlayed');
        this.progressHandle = document.getElementById('progressHandle');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoSubtitle = document.getElementById('videoSubtitle');
        this.videoTimeDisplay = document.getElementById('videoTimeDisplay');
        this.timePreview = document.getElementById('timePreview');
    }

    bindEvents() {
        // 播放/暂停按钮
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // 跳转按钮
        this.skipBackwardBtn.addEventListener('click', () => this.skipTime(-15));
        this.skipForwardBtn.addEventListener('click', () => this.skipTime(15));
        
        // 音量按钮
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        
        // 全屏按钮
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // 进度条交互
        this.progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
        this.progressContainer.addEventListener('mousemove', (e) => this.showTimePreview(e));
        this.progressContainer.addEventListener('mouseleave', () => this.hideTimePreview());
        
        // 视频事件监听
        this.player.addEventListener('loadedmetadata', () => this.updateDuration());
        this.player.addEventListener('timeupdate', () => this.updateProgress());
        this.player.addEventListener('play', () => this.updatePlayState(true));
        this.player.addEventListener('pause', () => this.updatePlayState(false));
        this.player.addEventListener('volumechange', () => this.updateVolumeState());
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 鼠标移动显示/隐藏控制栏
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('mouseleave', () => this.hideControls());
        
        // 全屏状态变化
        document.addEventListener('fullscreenchange', () => this.updateFullscreenState());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenState());
        
        // 点击视频区域播放/暂停
        this.player.addEventListener('click', () => this.togglePlayPause());
    }

    async togglePlayPause() {
        if (this.player.paused) {
            await this.multiCameraPlayer.playAll();
        } else {
            this.multiCameraPlayer.pauseAll();
        }
    }

    skipTime(seconds) {
        const currentTime = this.continuousPlayer.getCurrentTime();
        const newTime = Math.max(0, Math.min(this.continuousPlayer.getTotalDuration(), currentTime + seconds));
        this.continuousPlayer.seekToTime(newTime);
    }

    toggleMute() {
        this.player.muted = !this.player.muted;
        // 同步其他播放器的静音状态
        Object.values(this.multiCameraPlayer.players).forEach(player => {
            player.muted = this.player.muted;
        });
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            if (this.container.requestFullscreen) {
                this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) {
                this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) {
                this.container.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    async seekToPosition(e) {
        const wasPlaying = this.multiCameraPlayer.isPlaying;
        if (wasPlaying) {
            this.multiCameraPlayer.pauseAll();
        }

        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const totalDuration = this.continuousPlayer.getTotalDuration();
        const targetTime = Math.min(pos * totalDuration, totalDuration > 0.1 ? totalDuration - 0.1 : 0);
        
        await this.continuousPlayer.seekToTime(targetTime);
        
        if (wasPlaying) {
            await this.multiCameraPlayer.playAll();
        }
    }

    showTimePreview(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        const pos = Math.max(0, Math.min(1, mouseX / rect.width));
        const time = pos * this.continuousPlayer.getTotalDuration();
        
        this.timePreview.style.left = `${pos * 100}%`;
        this.timePreview.querySelector('.time-preview-time').textContent = this.formatTime(time);
        this.timePreview.classList.add('show');

        // 更新进度条上的点以跟随鼠标
        this.progressHandle.style.left = `${pos * 100}%`;
    }

    hideTimePreview() {
        this.timePreview.classList.remove('show');
        // 鼠标离开时，将点重置回实际播放位置
        this.updateProgress();
    }

    updateDuration() {
        this.updateTimeDisplay();
    }

    updateProgress() {
        const currentTime = this.continuousPlayer.getCurrentTime();
        const totalDuration = this.continuousPlayer.getTotalDuration();
        
        if (totalDuration > 0) {
            const progress = (currentTime / totalDuration) * 100;
            this.progressPlayed.style.width = `${progress}%`;
            this.progressHandle.style.left = `${progress}%`;
        }
        
        this.updateTimeDisplay();
    }

    updatePlayState(playing) {
        this.isPlaying = playing;
        if (playing) {
            this.playPauseIcon.src = 'assets/CodeBubbyAssets/60_499/2.svg';
            this.playPauseIcon.alt = '暂停';
        } else {
            this.playPauseIcon.src = 'assets/CodeBubbyAssets/60_499/10.svg';
            this.playPauseIcon.alt = '播放';
        }
    }

    updateVolumeState() {
        this.isMuted = this.player.muted;
        if (this.isMuted) {
            this.volumeIcon.src = 'assets/CodeBubbyAssets/60_499/13.svg';
            this.volumeIcon.alt = '静音';
        } else {
            this.volumeIcon.src = 'assets/CodeBubbyAssets/60_499/5.svg';
            this.volumeIcon.alt = '音量';
        }
    }

    updateFullscreenState() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        this.container.classList.toggle('fullscreen', this.isFullscreen);
    }

    updateTimeDisplay() {
        const current = this.formatTime(this.continuousPlayer.getCurrentTime());
        const total = this.formatTime(this.continuousPlayer.getTotalDuration());
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
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.hideControls();
            }
        }, 3000);
    }

    hideControls() {
        this.overlay.classList.remove('show');
        clearTimeout(this.controlsTimeout);
    }

    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.skipTime(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.skipTime(10);
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'KeyF':
                e.preventDefault();
                this.toggleFullscreen();
                break;
        }
    }

    updateVideoInfo(title, subtitle) {
        this.videoTitle.textContent = title;
        this.videoSubtitle.textContent = subtitle;
    }
}

class TeslaCamViewer {
    constructor() {
        this.allFiles = [];
        this.eventGroups = [];
        this.currentEvent = null;
        this.activeCamera = 'front';

        this.dom = {
            folderInput: document.getElementById('folderInput'),
            selectFolderBtn: document.getElementById('selectFolderBtn'),
            dateFilter: document.getElementById('dateFilter'),
            eventFilter: document.getElementById('eventFilter'),
            currentPath: document.getElementById('currentPath'),
            videoInfo: {
                time: document.getElementById('info-event-time'),
                type: document.getElementById('info-event-type'),
                segment: document.getElementById('info-segment'),
                currentSegment: document.getElementById('info-current-segment'),
            },
            cameraButtons: document.querySelectorAll('.btn-camera'),
            sidebar: document.querySelector('.sidebar'),
            toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
        };

        this.videoListComponent = new VideoListComponent('fileList', (eventId) => this.playEvent(eventId));
        
        // 初始化多摄像头播放器
        this.multiCameraPlayer = new MultiCameraPlayer();
        
        // 初始化连续播放器
        this.continuousPlayer = new ContinuousVideoPlayer(this.multiCameraPlayer);
        
        // 初始化现代视频控制界面
        this.videoControls = new ModernVideoControls(this.continuousPlayer);

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.dom.selectFolderBtn.addEventListener('click', () => this.dom.folderInput.click());
        this.dom.folderInput.addEventListener('change', (e) => this.handleFolderSelection(e.target.files));
        this.dom.dateFilter.addEventListener('change', () => this.filterAndRender());
        this.dom.eventFilter.addEventListener('change', () => this.filterAndRender());

        this.dom.cameraButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchCamera(btn.dataset.camera));
        });

        this.dom.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        this.dom.sidebarOverlay.addEventListener('click', () => this.toggleSidebar());

        // 定期更新视频信息
        setInterval(() => {
            this.updateVideoInfo();
        }, 1000);
    }

    async handleFolderSelection(files) {
        this.allFiles = Array.from(files);
        if (this.allFiles.length === 0) {
            alert('没有找到任何文件，请确保选择了正确的文件夹');
            return;
        }
        try {
            this.eventGroups = await this.processFiles(this.allFiles);
            this.updateCurrentPath();
            this.filterAndRender();
        } catch (error) {
            console.error('处理文件时出错:', error);
            alert('处理文件时出错: ' + error.message);
        }
    }

    async processFiles(files) {
        const eventMap = new Map();
        const videoFiles = files.filter(f => f.name.endsWith('.mp4') && f.webkitRelativePath.includes('TeslaCam/'));

        for (const file of videoFiles) {
            const eventType = this.getEventType(file.webkitRelativePath);
            if (eventType === 'Unknown') continue;

            const timestampMatch = file.name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})-\d{2}/);
            if (!timestampMatch) continue;
            
            const minuteTimestamp = timestampMatch[1];
            
            const pathParts = file.webkitRelativePath.split('/');
            const eventId = pathParts.slice(0, -1).join('/'); 

            if (!eventMap.has(eventId)) {
                eventMap.set(eventId, {
                    eventId,
                    eventType,
                    segments: new Map(),
                    thumbFile: null,
                    startTime: null,
                });
            }

            const event = eventMap.get(eventId);
            if (!event.segments.has(minuteTimestamp)) {
                event.segments.set(minuteTimestamp, {
                    timestamp: minuteTimestamp,
                    files: {},
                });
            }

            const segment = event.segments.get(minuteTimestamp);
            const cameraType = this.getCameraType(file.name);
            if (cameraType) {
                segment.files[cameraType] = file;
            }
        }
        
        const thumbFiles = files.filter(f => f.name === 'thumb.png');
        for(const thumb of thumbFiles) {
            const thumbDir = thumb.webkitRelativePath.substring(0, thumb.webkitRelativePath.lastIndexOf('/'));
            if (eventMap.has(thumbDir)) {
                 eventMap.get(thumbDir).thumbFile = thumb;
            }
        }

        const processedEvents = Array.from(eventMap.values()).map(event => {
            event.segments = Array.from(event.segments.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            if (event.segments.length > 0) {
                event.startTime = event.segments[0].timestamp;
            }
            return event;
        }).filter(event => event.segments.length > 0);

        return processedEvents.sort((a, b) => b.startTime.localeCompare(a.startTime));
    }

    filterAndRender() {
        const dateFilter = this.dom.dateFilter.value;
        const eventFilter = this.dom.eventFilter.value;
        const filteredEvents = this.eventGroups.filter(event => {
            if (!event.startTime) return false;
            const dateMatch = !dateFilter || event.startTime.startsWith(dateFilter);
            const typeMatch = !eventFilter || event.eventType === eventFilter;
            return dateMatch && typeMatch;
        });
        this.videoListComponent.render(filteredEvents);
    }

    async playEvent(eventId) {
        const event = this.eventGroups.find(e => e.eventId === eventId);
        if (!event || event.segments.length === 0) return;
        
        this.currentEvent = event;
        this.activeCamera = 'front';
        this.multiCameraPlayer.activeCamera = 'front';

        // Calculate durations only if they haven't been calculated before.
        if (typeof event.totalDuration === 'undefined') {
            await this.continuousPlayer.calculateEventDurations(event);
        }
        
        // 加载整个事件进行连续播放
        await this.continuousPlayer.loadEvent(event, this.activeCamera);
        await this.multiCameraPlayer.playAll();
        
        // 更新视频控制界面信息
        const startTime = this.videoListComponent.parseTimestamp(event.startTime);
        const title = `${this.videoListComponent.getEventTypeLabel(event.eventType)} - 连续播放`;
        const subtitle = startTime.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        this.videoControls.updateVideoInfo(title, subtitle);
        
        // 更新UI状态
        document.querySelectorAll('.video-card').forEach(item => {
            item.classList.remove('active');
            if(item.dataset.eventId === eventId) {
                item.classList.add('active');
            }
        });
        this.dom.cameraButtons.forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.camera === 'front') {
                btn.classList.add('active');
            }
        });
        
        this.updateVideoInfo();
    }

    toggleSidebar() {
        this.dom.sidebar.classList.toggle('collapsed');
        const isCollapsed = this.dom.sidebar.classList.contains('collapsed');
        this.dom.toggleSidebarBtn.classList.toggle('collapsed', isCollapsed);
        this.dom.toggleSidebarBtn.title = isCollapsed ? '展开侧边栏' : '收起侧边栏';

        if (window.innerWidth <= 768) {
            this.dom.sidebarOverlay.classList.toggle('active', !isCollapsed);
        }
    }

    async switchCamera(camera) {
        if (camera === this.activeCamera || !this.currentEvent) return;
    
        const wasPlaying = this.multiCameraPlayer.isPlaying;
        const segmentInfo = this.continuousPlayer.getCurrentSegmentInfo();
        if (!segmentInfo) return;
    
        const currentTimeInSegment = segmentInfo.segmentTime;
    
        this.activeCamera = camera;
        this.multiCameraPlayer.activeCamera = camera;
    
        this.dom.cameraButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.camera === camera) {
                btn.classList.add('active');
            }
        });
    
        // 重新加载当前片段，并设置新的主摄像头
        const currentSegment = this.currentEvent.segments[this.continuousPlayer.currentSegmentIndex];
        await this.multiCameraPlayer.loadSegmentForAllCameras(currentSegment, this.activeCamera);
    
        // 恢复播放位置和状态
        this.multiCameraPlayer.seekAll(currentTimeInSegment);
        if (wasPlaying) {
            await this.multiCameraPlayer.playAll();
        }
    
        // 更新视频标题
        const startTime = this.videoListComponent.parseTimestamp(this.currentEvent.startTime);
        const title = `${this.videoListComponent.getEventTypeLabel(this.currentEvent.eventType)} - ${camera.toUpperCase()}`;
        const subtitle = startTime.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    
        this.videoControls.updateVideoInfo(title, subtitle);
    }

    updateVideoInfo() {
        if (!this.currentEvent) {
            this.dom.videoInfo.time.textContent = '--';
            this.dom.videoInfo.type.textContent = '--';
            this.dom.videoInfo.segment.textContent = '--';
            this.dom.videoInfo.currentSegment.textContent = '--';
            return;
        }

        const event = this.currentEvent;
        const startTime = this.videoListComponent.parseTimestamp(event.startTime);
        const segmentInfo = this.continuousPlayer.getCurrentSegmentInfo();
        
        this.dom.videoInfo.time.textContent = startTime.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
        this.dom.videoInfo.type.textContent = this.videoListComponent.getEventTypeLabel(event.eventType);
        this.dom.videoInfo.segment.textContent = `${event.segments.length} 个片段`;
        
        if (segmentInfo) {
            this.dom.videoInfo.currentSegment.textContent = `第 ${segmentInfo.current} 个片段`;
        }
    }

    updateCurrentPath() {
        if (this.allFiles.length > 0) {
            const firstFile = this.allFiles[0];
            const pathParts = firstFile.webkitRelativePath.split('/');
            const teslaCamIndex = pathParts.indexOf('TeslaCam');
            if (teslaCamIndex > 0) {
                this.dom.currentPath.textContent = pathParts.slice(0, teslaCamIndex).join('/');
            } else {
                this.dom.currentPath.textContent = '根目录';
            }
        }
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

    // 清理资源
    destroy() {
        this.multiCameraPlayer.cleanup();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.viewer = new TeslaCamViewer();
        
        // 页面卸载时清理资源
        window.addEventListener('beforeunload', () => {
            if (window.viewer) {
                window.viewer.destroy();
            }
        });
        
        console.log('特斯拉行车记录仪播放器初始化成功');
    } catch (error) {
        console.error("播放器初始化失败:", error);
        alert("播放器初始化失败，请检查控制台获取更多信息。");
    }
});
