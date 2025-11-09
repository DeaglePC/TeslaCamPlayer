# 视频剪辑功能说明 / Video Clipping Feature Guide

## 中文说明

### 功能概述
TeslaCam Player 现在支持视频剪辑功能!您可以:
- ✂️ 在进度条上选择起始和结束位置
- 📹 选择要导出的摄像头(前/后/左/右)
- 🕐 导出的视频包含原始时间信息
- 🔗 自动处理跨多个文件的片段

### 使用步骤

#### 1. 进入剪辑模式
播放视频后,点击播放控制栏右侧的 **✂️ 剪刀图标**,进入剪辑模式。

#### 2. 选择时间范围
进入剪辑模式后,进度条上会出现两个**蓝色手柄**:
- **左侧手柄**: 剪辑起始位置
- **右侧手柄**: 剪辑结束位置

拖动这两个手柄到您想要的位置。选中的区域会以**蓝色半透明**显示。

#### 3. 打开导出对话框
选好时间范围后,再次点击 **✂️ 剪刀图标**,打开导出设置对话框。

#### 4. 配置导出选项
在对话框中,您可以:
- **选择摄像头**: 勾选要导出的摄像头(前/后/左/右)
  - 可以选择单个摄像头
  - 也可以同时选择多个摄像头,会分别导出
- **添加时间水印**: 勾选后在视频上叠加时间信息(开发中)
- **合成四宫格**: 将多个摄像头合成为一个四宫格视频(开发中)

#### 5. 开始导出
点击 **"开始导出"** 按钮:
- 系统会显示处理进度
- 处理完成后会自动下载文件
- 文件名格式: `TeslaCam_{摄像头}_{时间戳}.mp4`

### 当前功能状态

✅ **已实现**:
- 进度条上的时间范围选择
- 多摄像头同时导出
- 跨文件片段识别
- 自动计算时间戳
- **视频时间戳水印** - 实时显示视频拍摄时间
- **四宫格视频合成** - 将多个摄像头合成为一个视频

🚧 **开发中** (将在后续版本添加):
- 精确的秒级剪辑(使用 FFmpeg.wasm)
- 多片段自动拼接
- 自定义水印样式和位置

### 注意事项

1. **视频格式**: 导出的视频格式为 WebM (VP9 编码),兼容大多数现代浏览器和播放器
   - 如果需要 MP4 格式,可以使用格式转换工具

2. **时间戳功能**: 
   - 勾选"添加时间水印"后,视频左上角会显示实时时间
   - 时间格式: YYYY-MM-DD HH:mm:ss
   - 黑色半透明背景,白色文字

3. **四宫格布局**:
   - 前摄像头: 左上
   - 后摄像头: 右上  
   - 左摄像头: 左下
   - 右摄像头: 右下
   - 每个画面左上角显示摄像头标签
   - 整体时间戳显示在底部中央

4. **性能建议**: 
   - 选择较短的时间范围可以加快处理速度
   - 四宫格视频处理时间会比单摄像头长
   - 建议录制时长不超过2分钟以获得最佳性能

5. **文件大小**: 
   - 单摄像头: 约 5 Mbps 码率
   - 四宫格: 约 8 Mbps 码率
   - 实际大小取决于选中的时间长度

---

## English Guide

### Feature Overview
TeslaCam Player now supports video clipping! You can:
- ✂️ Select start and end positions on the progress bar
- 📹 Choose which cameras to export (front/back/left/right)
- 🕐 Exported videos include original timestamp information
- 🔗 Automatically handles clips spanning multiple files

### How to Use

#### 1. Enter Clip Mode
While playing a video, click the **✂️ scissors icon** on the right side of the playback controls to enter clip mode.

#### 2. Select Time Range
After entering clip mode, two **blue handles** will appear on the progress bar:
- **Left handle**: Clip start position
- **Right handle**: Clip end position

Drag these handles to your desired positions. The selected range will be highlighted in **semi-transparent blue**.

#### 3. Open Export Dialog
After selecting your time range, click the **✂️ scissors icon** again to open the export settings dialog.

#### 4. Configure Export Options
In the dialog, you can:
- **Select Cameras**: Check the cameras you want to export (front/back/left/right)
  - You can select a single camera
  - Or select multiple cameras to export separately
- **Add Timestamp Watermark**: Overlay time information on the video (in development)
- **Merge as Grid**: Combine multiple cameras into a single grid video (in development)

#### 5. Start Export
Click the **"Start Export"** button:
- The system will show processing progress
- Files will automatically download when complete
- Filename format: `TeslaCam_{camera}_{timestamp}.mp4`

### Current Feature Status

✅ **Implemented**:
- Time range selection on progress bar
- Multi-camera simultaneous export
- Cross-file segment recognition
- Automatic timestamp calculation
- **Video timestamp watermark** - Real-time display of recording time
- **Four-camera grid composition** - Merge multiple cameras into one video

🚧 **In Development** (coming in future releases):
- Precise second-level trimming (using FFmpeg.wasm)
- Multi-segment automatic concatenation
- Custom watermark style and position

### Notes

1. **Video Format**: Exported videos are in WebM format (VP9 codec), compatible with most modern browsers and players
   - If you need MP4 format, use a format converter tool

2. **Timestamp Feature**: 
   - When "Add Timestamp Watermark" is checked, real-time timestamp appears in top-left corner
   - Time format: YYYY-MM-DD HH:mm:ss
   - Black semi-transparent background with white text

3. **Grid Layout**:
   - Front camera: Top-left
   - Back camera: Top-right
   - Left camera: Bottom-left
   - Right camera: Bottom-right
   - Each view shows camera label in top-left corner
   - Overall timestamp displayed at bottom center

4. **Performance Tips**: 
   - Selecting shorter time ranges speeds up processing
   - Grid video processing takes longer than single camera
   - Recommended duration: under 2 minutes for optimal performance

5. **File Size**: 
   - Single camera: ~5 Mbps bitrate
   - Grid video: ~8 Mbps bitrate
   - Actual size depends on selected duration

---

## 技术实现 / Technical Implementation

### 架构 / Architecture
```
VideoClipProcessor (视频处理器)
├── initCanvas() - 初始化Canvas画布
├── getSegmentsForTimeRange() - 计算需要的片段
├── processClip() - 处理剪辑请求
├── processVideoWithTimestamp() - 单摄像头带时间戳处理
├── createGridVideoFromSegments() - 四宫格视频合成
└── drawTimestamp() - 绘制时间戳水印
```

### 技术方案 / Technical Approach

**Canvas API + MediaRecorder**
- 使用 Canvas 绘制视频帧
- 添加时间戳文字叠加
- MediaRecorder 实时录制 Canvas 流
- 输出 WebM 格式视频

**四宫格合成**
- 创建 2x2 网格布局
- 同步播放所有摄像头视频
- 每帧绘制到对应网格位置
- 添加摄像头标签和统一时间戳

### 未来改进 / Future Improvements
1. ~~集成 FFmpeg.wasm 实现精确剪辑~~ (使用 Canvas API 替代)
2. 支持 MP4 格式导出
3. 自定义水印样式、位置、大小
4. 添加进度条标记显示关键事件
5. 支持批量导出
6. 多片段自动拼接
