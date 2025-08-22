class TeslaCamViewer {
    constructor() {
        this.currentFiles = [];
        this.allFiles = [];
        this.currentTimeGroup = null;
        this.playlistGroups = []; // 连续播放的时间组列表
        this.currentPlaylistIndex = 0; // 当前播放的片段索引
        this.totalDuration = 0; // 总时长
        this.videos = {
            front: document.getElementById('frontVideo'),
            back: document.getElementById('backVideo'),
            left: document.getElementById('leftVideo'),
            right: document.getElementById('rightVideo')
        };
        this.isPlaying = false;
        this.isSyncing = false;
        this.isPlaylistMode = false; // 是否为连续播放模式
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
    initializeEventListeners() {
        // 文件夹选择
        document.getElementById('selectFolderBtn').addEventListener('click', () => {
            console.log('点击选择文件夹按钮');
            const folderInput = document.getElementById('folderInput');
            console.log('文件输入元素:', folderInput);
            folderInput.click();
        });

        document.getElementById('folderInput').addEventListener('change', (e) => {
            console.log('文件选择变化事件触发');
            console.log('选择的文件数量:', e.target.files.length);
            if (e.target.files.length > 0) {
                console.log('第一个文件:', e.target.files[0]);
                this.handleFolderSelection(e.target.files);
            } else {
                console.log('没有选择任何文件');
            }
        });

        // 视频控制
        document.getElementById('playAllBtn').addEventListener('click', () => {
            this.playAllVideos();
        });

        document.getElementById('pauseAllBtn').addEventListener('click', () => {
            this.pauseAllVideos();
        });

        // 进度条控制
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('input', (e) => {
            this.seekToPosition(e.target.value);
            // 拖动进度条时暂停视频，提供更好的用户体验
            this.pauseAllVideos();
        });
        
        // 添加进度条拖动结束后的事件
        progressBar.addEventListener('change', (e) => {
            // 如果之前是播放状态，则继续播放
            if (this.isPlaying) {
                this.playAllVideos();
            }
        });

        // 过滤器
        document.getElementById('dateFilter').addEventListener('change', () => {
            this.filterFiles();
        });

        document.getElementById('eventFilter').addEventListener('change', () => {
            this.filterFiles();
        });

        // 视频事件监听
        Object.values(this.videos).forEach(video => {
            video.addEventListener('loadedmetadata', () => this.updateVideoStatus());
            video.addEventListener('timeupdate', () => this.updateProgress());
            video.addEventListener('play', () => this.onVideoPlay(video));
            video.addEventListener('pause', () => this.onVideoPause(video));
            video.addEventListener('error', (e) => this.onVideoError(video, e));
            video.addEventListener('ended', () => this.onVideoEnded(video));
        });
    }

    handleFolderSelection(files) {
    handleFolderSelection(files) {
        console.log('开始处理文件夹选择');
        console.log('文件总数:', files.length);
        
        this.allFiles = Array.from(files);
        console.log('转换后的文件数组长度:', this.allFiles.length);
        
        // 显示前几个文件的信息用于调试
        this.allFiles.slice(0, 5).forEach((file, index) => {
            console.log(`文件 ${index + 1}:`, {
                name: file.name,
                path: file.webkitRelativePath,
                size: file.size,
                type: file.type
            });
        });
        
        if (this.allFiles.length === 0) {
            console.error('没有找到任何文件');
            alert('没有找到任何文件，请确保选择了正确的文件夹');
            return;
        }
        
        try {
            this.processFiles();
            this.updateCurrentPath();
            this.filterFiles();
            console.log('文件处理完成');
        } catch (error) {
            console.error('处理文件时出错:', error);
            alert('处理文件时出错: ' + error.message);
        }
    }

    updateCurrentPath() {
        const pathElement = document.getElementById('currentPath');
        if (this.allFiles.length > 0) {
            const firstFile = this.allFiles[0];
            const pathParts = firstFile.webkitRelativePath.split('/');
            pathElement.textContent = pathParts.slice(0, -2).join('/') || '根目录';
        }
    }

    processFiles() {
    processFiles() {
        // 处理特斯拉行车记录仪数据结构
        const eventGroups = {}; // 按事件分组
        const timeGroups = {};  // 按时间戳分组
        
        this.allFiles.forEach(file => {
            if (file.name.endsWith('.mp4')) {
                // 匹配特斯拉行车记录仪的文件名格式
                const match = file.name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
                if (match) {
                    const timestamp = match[1];
                    const eventType = this.getEventType(file.webkitRelativePath);
                    const pathParts = file.webkitRelativePath.split('/');
                    
                    // 确定事件ID - 对于SentryClips/SavedClips使用文件夹名，RecentClips使用日期
                    let eventId;
                    if (eventType === 'RecentClips') {
                        eventId = timestamp.split('_')[0]; // 使用日期作为事件ID
                    } else {
                        // SentryClips/SavedClips - 使用文件夹名作为事件ID
                        eventId = pathParts[pathParts.length - 2] || timestamp;
                    }
                    
                    // 创建时间组
                    if (!timeGroups[timestamp]) {
                        timeGroups[timestamp] = {
                            timestamp,
                            files: {},
                            path: file.webkitRelativePath,
                            eventType,
                            eventId
                        };
                    }
                    
                    // 根据文件名确定摄像头位置
                    if (file.name.includes('-front.mp4')) {
                        timeGroups[timestamp].files.front = file;
                    } else if (file.name.includes('-back.mp4')) {
                        timeGroups[timestamp].files.back = file;
                    } else if (file.name.includes('-left_repeater.mp4')) {
                        timeGroups[timestamp].files.left = file;
                    } else if (file.name.includes('-right_repeater.mp4')) {
                        timeGroups[timestamp].files.right = file;
                    }
                    
                    // 按事件分组（用于连续播放）
                    if (!eventGroups[eventId]) {
                        eventGroups[eventId] = {
                            eventId,
                            eventType,
                            segments: [],
                            startTime: null,
                            endTime: null
                        };
                    }
                    
                    // 将时间组添加到对应事件
                    if (!eventGroups[eventId].segments.find(s => s.timestamp === timestamp)) {
                        eventGroups[eventId].segments.push(timeGroups[timestamp]);
                    }
                }
            }
        });

        // 对每个事件的片段按时间排序
        Object.values(eventGroups).forEach(event => {
            event.segments.sort((a, b) => 
                this.parseTimestamp(a.timestamp) - this.parseTimestamp(b.timestamp)
            );
            
            if (event.segments.length > 0) {
                event.startTime = event.segments[0].timestamp;
                event.endTime = event.segments[event.segments.length - 1].timestamp;
            }
        });

        // 保存处理结果
        this.timeGroups = Object.values(timeGroups).sort((a, b) => 
            this.parseTimestamp(b.timestamp) - this.parseTimestamp(a.timestamp)
        );
        
        this.eventGroups = Object.values(eventGroups).sort((a, b) => 
            this.parseTimestamp(b.startTime) - this.parseTimestamp(a.startTime)
        );
        
        console.log('处理完成:', {
            timeGroups: this.timeGroups.length,
            eventGroups: this.eventGroups.length
        });
    }
    
    // 正确解析特斯拉时间戳格式
    parseTimestamp(timestamp) {
        try {
            console.log("原始时间戳:", timestamp);
            
            // 分离日期和时间部分
            const [datePart, timePart] = timestamp.split('_');
            console.log("日期部分:", datePart, "时间部分:", timePart);
            
            if (!datePart || !timePart) {
                console.error("时间戳格式错误");
                return new Date();
            }
            
            // 将时间部分的连字符替换为冒号
            const formattedTime = timePart.replace(/-/g, ':');
            console.log("格式化后的时间:", formattedTime);
            
            // 组合成标准格式
            const dateTimeString = `${datePart}T${formattedTime}`;
            console.log("完整日期时间字符串:", dateTimeString);
            
            const date = new Date(dateTimeString);
            console.log("解析后的日期对象:", date);
            
            if (isNaN(date.getTime())) {
                console.error("日期解析失败");
                return new Date();
            }
            
            return date;
        } catch (error) {
            console.error("日期解析错误:", error);
            return new Date();
        }
    }

    getEventType(path) {
        if (path.includes('RecentClips')) return 'RecentClips';
        if (path.includes('SavedClips')) return 'SavedClips';
        if (path.includes('SentryClips')) return 'SentryClips';
        return 'Unknown';
    }

    filterFiles() {
        const dateFilter = document.getElementById('dateFilter').value;
        const eventFilter = document.getElementById('eventFilter').value;

        let filteredGroups = this.timeGroups;

        if (dateFilter) {
            const filterDate = dateFilter.replace(/-/g, '-');
            filteredGroups = filteredGroups.filter(group => 
                group.timestamp.startsWith(filterDate)
            );
        }

        if (eventFilter) {
            filteredGroups = filteredGroups.filter(group => 
                group.eventType === eventFilter
            );
        }

        this.renderFileList(filteredGroups);
    }

    renderFileList(groups) {
    renderFileList(groups) {
        const fileList = document.getElementById('fileList');
        
        if (groups.length === 0) {
            fileList.innerHTML = '<div class="empty-state"><p>没有找到匹配的记录</p></div>';
            return;
        }

        // 按事件分组显示
        const eventMap = new Map();
        groups.forEach((group, index) => {
            const eventId = group.eventId || group.timestamp.split('_')[0];
            if (!eventMap.has(eventId)) {
                eventMap.set(eventId, []);
            }
            eventMap.get(eventId).push({...group, originalIndex: index});
        });

        let html = '';
        eventMap.forEach((segments, eventId) => {
            const firstSegment = segments[0];
            const lastSegment = segments[segments.length - 1];
            const totalDuration = segments.length;
            
            // 事件标题
            html += `
                <div class="event-group">
                    <div class="event-header">
                        <div class="event-title">
                            <span class="event-type">${this.getEventTypeLabel(firstSegment.eventType)}</span>
                            <span class="event-time-range">
                                ${this.formatDateTime(this.parseTimestamp(firstSegment.timestamp))}
                                ${segments.length > 1 ? ' - ' + this.formatDateTime(this.parseTimestamp(lastSegment.timestamp)) : ''}
                            </span>
                        </div>
                        <div class="event-stats">
                            ${segments.length} 个片段 | 约 ${totalDuration} 分钟
                        </div>
                        <div class="event-actions">
                            <button class="btn-small" onclick="viewer.playEventSequence('${eventId}')">播放整个事件</button>
                        </div>
                    </div>
                    <div class="event-segments">
            `;
            
            // 事件中的各个片段
            segments.forEach((group, segIndex) => {
                const date = this.parseTimestamp(group.timestamp);
                const fileCount = Object.keys(group.files).length;
                
                html += `
                    <div class="file-item segment-item" data-timestamp="${group.timestamp}" data-index="${group.originalIndex}">
                        <div class="file-item-header">
                            <div class="file-time">${this.formatDateTime(date)}</div>
                            <div class="segment-info">片段 ${segIndex + 1}/${segments.length}</div>
                        </div>
                        <div class="file-details">
                            摄像头: ${fileCount}/4 | 时长: ~1分钟
                        </div>
                        <div class="file-actions">
                            <button class="btn-small" onclick="viewer.selectTimeGroup('${group.timestamp}')">单独播放</button>
                            <button class="btn-small" onclick="viewer.startPlaylistFrom(${group.originalIndex})">从此开始连播</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        fileList.innerHTML = html;
        
        // 保存当前过滤后的组列表
        this.filteredGroups = groups;
    }

    getEventTypeLabel(type) {
        const labels = {
            'RecentClips': '最近片段',
            'SavedClips': '保存片段',
            'SentryClips': '哨兵模式',
            'Unknown': '未知'
        };
        return labels[type] || type;
    }

    formatDateTime(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return '日期处理中...';
        }
        
        try {
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (error) {
            console.error("日期格式化错误:", error);
            // 手动格式化日期，以防toLocaleString失败
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
        }
    }

    selectTimeGroup(timestamp) {
        // 更新选中状态
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-timestamp="${timestamp}"]`).classList.add('active');

        // 找到对应的时间组
        this.currentTimeGroup = this.timeGroups.find(group => group.timestamp === timestamp);
        
        if (this.currentTimeGroup) {
            this.isPlaylistMode = false;
            this.playlistGroups = [this.currentTimeGroup];
            this.currentPlaylistIndex = 0;
            this.totalDuration = 60; // 单个视频约1分钟
            this.loadVideos();
            this.updateVideoInfo();
        }
    }

    startPlaylistFrom(startIndex) {
    startPlaylistFrom(startIndex) {
        if (!this.filteredGroups || startIndex >= this.filteredGroups.length) return;
        
        // 设置连续播放模式
        this.isPlaylistMode = true;
        this.playlistGroups = this.filteredGroups.slice(startIndex);
        this.currentPlaylistIndex = 0;
        this.totalDuration = this.playlistGroups.length * 60; // 每个片段约1分钟
        
        // 更新选中状态
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 高亮连续播放的片段
        this.playlistGroups.forEach((group, index) => {
            const element = document.querySelector(`[data-timestamp="${group.timestamp}"]`);
            if (element) {
                element.classList.add(index === 0 ? 'active' : 'playlist');
            }
        });
        
        // 加载第一个视频
        this.currentTimeGroup = this.playlistGroups[0];
        this.loadVideos();
        this.updateVideoInfo();
    }

    playEventSequence(eventId) {
        // 找到对应的事件组
        const eventGroup = this.eventGroups.find(e => e.eventId === eventId);
        if (!eventGroup) return;
        
        // 设置连续播放模式
        this.isPlaylistMode = true;
        this.playlistGroups = eventGroup.segments;
        this.currentPlaylistIndex = 0;
        this.totalDuration = this.playlistGroups.length * 60;
        
        // 更新选中状态
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active', 'playlist');
        });
        
        // 高亮整个事件的片段
        this.playlistGroups.forEach((group, index) => {
            const element = document.querySelector(`[data-timestamp="${group.timestamp}"]`);
            if (element) {
                element.classList.add(index === 0 ? 'active' : 'playlist');
            }
        });
        
        // 加载第一个视频
        this.currentTimeGroup = this.playlistGroups[0];
        this.loadVideos();
        this.updateVideoInfo();
        
        console.log(`开始播放事件: ${eventId}, 包含 ${this.playlistGroups.length} 个片段`);
    }

    loadVideos() {
        if (!this.currentTimeGroup) return Promise.resolve();

        const positions = ['front', 'back', 'left', 'right'];
        const statusElements = {
            front: document.getElementById('frontStatus'),
            back: document.getElementById('backStatus'),
            left: document.getElementById('leftStatus'),
            right: document.getElementById('rightStatus')
        };

        const loadPromises = positions.map(position => {
            return new Promise((resolve) => {
                const video = this.videos[position];
                const statusEl = statusElements[position];
                const file = this.currentTimeGroup.files[position];

                if (file) {
                    const url = URL.createObjectURL(file);
                    video.src = url;
                    statusEl.textContent = '加载中...';
                    statusEl.className = 'video-status loading';
                    
                    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
                    video.addEventListener('error', () => resolve(), { once: true });
                } else {
                    video.src = '';
                    statusEl.textContent = '无文件';
                    statusEl.className = 'video-status error';
                    resolve();
                }
            });
        });

        // 启用控制按钮
        document.getElementById('playAllBtn').disabled = false;
        document.getElementById('pauseAllBtn').disabled = false;
        document.getElementById('progressBar').disabled = false;

        return Promise.all(loadPromises);
    }

    updateVideoInfo() {
        if (!this.currentTimeGroup) return;

        const date = this.parseTimestamp(this.currentTimeGroup.timestamp);
        
        if (!this.isPlaylistMode) {
            // 单个视频模式
            document.getElementById('currentTimeRange').textContent = this.formatDateTime(date);
            document.getElementById('eventType').textContent = this.getEventTypeLabel(this.currentTimeGroup.eventType);
            document.getElementById('fileCount').textContent = Object.keys(this.currentTimeGroup.files).length;
        } else {
            // 连续播放模式
            const firstDate = this.parseTimestamp(this.playlistGroups[0].timestamp);
            const lastDate = this.parseTimestamp(this.playlistGroups[this.playlistGroups.length - 1].timestamp);
            document.getElementById('currentTimeRange').textContent = 
                `${this.formatDateTime(firstDate)} - ${this.formatDateTime(lastDate)}`;
            document.getElementById('eventType').textContent = 
                `连续播放 (${this.currentPlaylistIndex + 1}/${this.playlistGroups.length})`;
            document.getElementById('fileCount').textContent = 
                `${this.playlistGroups.length} 个片段`;
        }
    }

    updateVideoStatus() {
        const statusElements = {
            front: document.getElementById('frontStatus'),
            back: document.getElementById('backStatus'),
            left: document.getElementById('leftStatus'),
            right: document.getElementById('rightStatus')
        };

        Object.keys(this.videos).forEach(position => {
            const video = this.videos[position];
            const statusEl = statusElements[position];

            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                statusEl.textContent = '就绪';
                statusEl.className = 'video-status ready';
            }
        });
    }

    playAllVideos() {
        if (!this.currentTimeGroup) return;

        this.isSyncing = true;
        const promises = Object.values(this.videos).map(video => {
            if (video.src) {
                return video.play().catch(e => console.warn('视频播放失败:', e));
            }
            return Promise.resolve();
        });

        Promise.all(promises).then(() => {
            this.isPlaying = true;
            this.syncVideos();
        });
    }

    pauseAllVideos() {
        Object.values(this.videos).forEach(video => {
            if (video.src) {
                video.pause();
            }
        });
        this.isPlaying = false;
    }

    syncVideos() {
        if (!this.isSyncing) return;

        const videos = Object.values(this.videos).filter(v => v.src);
        if (videos.length === 0) return;

        const masterVideo = videos[0];
        const masterTime = masterVideo.currentTime;

        videos.slice(1).forEach(video => {
            const timeDiff = Math.abs(video.currentTime - masterTime);
            if (timeDiff > 0.1) { // 如果时间差超过100ms，进行同步
                video.currentTime = masterTime;
            }
        });

        if (this.isPlaying) {
            setTimeout(() => this.syncVideos(), 1000); // 每秒同步一次
        }
    }

    seekToPosition(percentage) {
        if (!this.isPlaylistMode) {
            // 单个视频模式
            this.seekAllVideos(percentage);
        } else {
            // 连续播放模式
            this.seekPlaylist(percentage);
        }
    }

    seekAllVideos(percentage) {
        const videos = Object.values(this.videos).filter(v => v.src && v.duration);
        if (videos.length === 0) return;

        const seekTime = (percentage / 100) * videos[0].duration;
        videos.forEach(video => {
            video.currentTime = seekTime;
        });
        
        // 更新时间显示
        document.getElementById('currentTime').textContent = this.formatTime(seekTime);
    }

    seekPlaylist(percentage) {
        const totalSeconds = (percentage / 100) * this.totalDuration;
        const segmentDuration = 60; // 每个片段60秒
        const targetSegmentIndex = Math.floor(totalSeconds / segmentDuration);
        const segmentTime = totalSeconds % segmentDuration;
        
        if (targetSegmentIndex !== this.currentPlaylistIndex && targetSegmentIndex < this.playlistGroups.length) {
            // 需要切换到不同的片段
            this.currentPlaylistIndex = targetSegmentIndex;
            this.currentTimeGroup = this.playlistGroups[this.currentPlaylistIndex];
            this.loadVideos().then(() => {
                // 视频加载完成后跳转到指定时间
                setTimeout(() => {
                    Object.values(this.videos).forEach(video => {
                        if (video.src && video.duration) {
                            video.currentTime = segmentTime;
                        }
                    });
                }, 100);
            });
        } else {
            // 在当前片段内跳转
            Object.values(this.videos).forEach(video => {
                if (video.src && video.duration) {
                    video.currentTime = segmentTime;
                }
            });
        }
        
        // 更新时间显示
        document.getElementById('currentTime').textContent = this.formatTime(totalSeconds);
    }

    updateProgress() {
        const videos = Object.values(this.videos).filter(v => v.src && v.duration);
        if (videos.length === 0) return;

        const video = videos[0]; // 使用第一个视频作为进度参考
        
        if (!this.isPlaylistMode) {
            // 单个视频模式
            const progress = (video.currentTime / video.duration) * 100;
            document.getElementById('progressBar').value = progress;
            document.getElementById('currentTime').textContent = this.formatTime(video.currentTime);
            document.getElementById('duration').textContent = this.formatTime(video.duration);
        } else {
            // 连续播放模式
            const currentSegmentTime = video.currentTime;
            const totalElapsedTime = this.currentPlaylistIndex * 60 + currentSegmentTime;
            const progress = (totalElapsedTime / this.totalDuration) * 100;
            
            document.getElementById('progressBar').value = progress;
            document.getElementById('currentTime').textContent = this.formatTime(totalElapsedTime);
            document.getElementById('duration').textContent = this.formatTime(this.totalDuration);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    onVideoPlay(video) {
        // 当任一视频开始播放时，同步其他视频
        if (!this.isSyncing) {
            this.syncVideos();
        }
    }

    onVideoPause(video) {
        // 视频暂停处理
    }

    onVideoEnded(video) {
        // 当视频播放结束时，检查是否需要播放下一个片段
        if (this.isPlaylistMode && this.currentPlaylistIndex < this.playlistGroups.length - 1) {
            // 还有下一个片段，自动播放
            this.playNextSegment();
        }
    }

    playNextSegment() {
        if (!this.isPlaylistMode || this.currentPlaylistIndex >= this.playlistGroups.length - 1) {
            return;
        }

        this.currentPlaylistIndex++;
        this.currentTimeGroup = this.playlistGroups[this.currentPlaylistIndex];
        
        // 更新界面显示当前播放的片段
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
            item.classList.remove('playlist');
        });
        
        this.playlistGroups.forEach((group, index) => {
            const element = document.querySelector(`[data-timestamp="${group.timestamp}"]`);
            if (element) {
                if (index === this.currentPlaylistIndex) {
                    element.classList.add('active');
                } else if (index > this.currentPlaylistIndex) {
                    element.classList.add('playlist');
                }
            }
        });

        // 加载并播放下一个片段
        this.loadVideos().then(() => {
            this.updateVideoInfo();
            if (this.isPlaying) {
                setTimeout(() => {
                    this.playAllVideos();
                }, 100);
            }
        });
    }

    onVideoError(video, error) {
        console.error('视频加载错误:', error);
        const position = Object.keys(this.videos).find(key => this.videos[key] === video);
        if (position) {
            const statusEl = document.getElementById(`${position}Status`);
            statusEl.textContent = '加载失败';
            statusEl.className = 'video-status error';
        }
    }
}

// 初始化应用
let viewer;
document.addEventListener('DOMContentLoaded', () => {
    viewer = new TeslaCamViewer();
});

// 添加一些实用的键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        const playBtn = document.getElementById('playAllBtn');
        const pauseBtn = document.getElementById('pauseAllBtn');
        
        if (!playBtn.disabled) {
            if (document.querySelector('video:not([src=""])')) {
                const isAnyPlaying = Array.from(document.querySelectorAll('video')).some(v => !v.paused);
                if (isAnyPlaying) {
                    pauseBtn.click();
                } else {
                    playBtn.click();
                }
            }
        }
    }
});