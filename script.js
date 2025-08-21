class TeslaCamViewer {
    constructor() {
        this.currentFiles = [];
        this.allFiles = [];
        this.currentTimeGroup = null;
        this.videos = {
            front: document.getElementById('frontVideo'),
            back: document.getElementById('backVideo'),
            left: document.getElementById('leftVideo'),
            right: document.getElementById('rightVideo')
        };
        this.isPlaying = false;
        this.isSyncing = false;
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 文件夹选择
        document.getElementById('selectFolderBtn').addEventListener('click', () => {
            document.getElementById('folderInput').click();
        });

        document.getElementById('folderInput').addEventListener('change', (e) => {
            this.handleFolderSelection(e.target.files);
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
            this.seekAllVideos(e.target.value);
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
        });
    }

    handleFolderSelection(files) {
        this.allFiles = Array.from(files);
        this.processFiles();
        this.updateCurrentPath();
        this.filterFiles();
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
        // 按时间戳分组文件
        const timeGroups = {};
        
        this.allFiles.forEach(file => {
            if (file.name.endsWith('.mp4')) {
                // 匹配特斯拉行车记录仪的文件名格式 (例如: 2024-06-20_09-56-50-back.mp4)
                const match = file.name.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
                if (match) {
                    const timestamp = match[1];
                    if (!timeGroups[timestamp]) {
                        timeGroups[timestamp] = {
                            timestamp,
                            files: {},
                            path: file.webkitRelativePath,
                            eventType: this.getEventType(file.webkitRelativePath)
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
                }
            }
        });

        this.timeGroups = Object.values(timeGroups).sort((a, b) => 
            this.parseTimestamp(b.timestamp) - this.parseTimestamp(a.timestamp)
        );
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
        const fileList = document.getElementById('fileList');
        
        if (groups.length === 0) {
            fileList.innerHTML = '<div class="empty-state"><p>没有找到匹配的记录</p></div>';
            return;
        }

        fileList.innerHTML = groups.map(group => {
            const date = this.parseTimestamp(group.timestamp);
            const fileCount = Object.keys(group.files).length;
            
            return `
                <div class="file-item" data-timestamp="${group.timestamp}">
                    <div class="file-item-header">
                        <div class="file-time">${this.formatDateTime(date)}</div>
                        <div class="file-type">${this.getEventTypeLabel(group.eventType)}</div>
                    </div>
                    <div class="file-details">
                        摄像头: ${fileCount}/4 | 时长: ~1分钟
                    </div>
                </div>
            `;
        }).join('');

        // 添加点击事件
        fileList.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectTimeGroup(item.dataset.timestamp);
            });
        });
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
            this.loadVideos();
            this.updateVideoInfo();
        }
    }

    loadVideos() {
        if (!this.currentTimeGroup) return;

        const positions = ['front', 'back', 'left', 'right'];
        const statusElements = {
            front: document.getElementById('frontStatus'),
            back: document.getElementById('backStatus'),
            left: document.getElementById('leftStatus'),
            right: document.getElementById('rightStatus')
        };

        positions.forEach(position => {
            const video = this.videos[position];
            const statusEl = statusElements[position];
            const file = this.currentTimeGroup.files[position];

            if (file) {
                const url = URL.createObjectURL(file);
                video.src = url;
                statusEl.textContent = '加载中...';
                statusEl.className = 'video-status loading';
            } else {
                video.src = '';
                statusEl.textContent = '无文件';
                statusEl.className = 'video-status error';
            }
        });

        // 启用控制按钮
        document.getElementById('playAllBtn').disabled = false;
        document.getElementById('pauseAllBtn').disabled = false;
        document.getElementById('progressBar').disabled = false;
    }

    updateVideoInfo() {
        if (!this.currentTimeGroup) return;

        const date = this.parseTimestamp(this.currentTimeGroup.timestamp);
        document.getElementById('currentTimeRange').textContent = this.formatDateTime(date);
        document.getElementById('eventType').textContent = this.getEventTypeLabel(this.currentTimeGroup.eventType);
        document.getElementById('fileCount').textContent = Object.keys(this.currentTimeGroup.files).length;
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

    updateProgress() {
        const videos = Object.values(this.videos).filter(v => v.src && v.duration);
        if (videos.length === 0) return;

        const video = videos[0]; // 使用第一个视频作为进度参考
        const progress = (video.currentTime / video.duration) * 100;
        
        document.getElementById('progressBar').value = progress;
        document.getElementById('currentTime').textContent = this.formatTime(video.currentTime);
        document.getElementById('duration').textContent = this.formatTime(video.duration);
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
document.addEventListener('DOMContentLoaded', () => {
    new TeslaCamViewer();
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