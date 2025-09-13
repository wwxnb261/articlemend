// 全局变量
let capturedImage = null;
let uploadedImage = null;
let timer = null;
let remainingTime = 0;

// API配置信息
const API_URL = 'https://openapi.youdao.com/v2/correct_writing_image';
// 请在实际使用时填写您的应用ID和密钥
const APP_KEY = '1ae292ef39471601';
const APP_SECRET = 'k3wCpLujOOGx8nrTJEPiVPhQMO20HiQS';

// 创建本地代理服务器以解决跨域问题
// 方法一：使用jsonp方式调用API（适用于支持jsonp的API）
// 方法二：在本地创建一个简单的Node.js代理服务器
// 方法三：直接在前端使用FormData并设置请求模式为no-cors（可能限制响应处理）

// 默认直接请求API，如果遇到跨域问题，请使用本地代理服务器
// 本地代理服务器地址（运行 npm start 后可用）
const PROXY_URL = 'http://localhost:3000/api/correct';
// 当前使用的请求URL，默认直接请求API
let REQUEST_URL = API_URL;

// 切换API请求模式（直接请求/代理请求）
function toggleRequestMode() {
    const toggleBtn = document.getElementById('toggleModeBtn');
    
    if (REQUEST_URL === API_URL) {
        REQUEST_URL = PROXY_URL;
        alert('已切换到本地代理模式，请确保已启动代理服务器（npm start）');
        toggleBtn.textContent = '切换到直接请求模式';
        toggleBtn.classList.replace('btn-warning', 'btn-info');
    } else {
        REQUEST_URL = API_URL;
        alert('已切换到直接请求模式，可能会遇到跨域问题');
        toggleBtn.textContent = '切换到代理模式';
        toggleBtn.classList.replace('btn-info', 'btn-warning');
    }
    console.log('当前请求URL:', REQUEST_URL);
}

// DOM 元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化模式切换
    initModeSwitch();
    
    // 初始化相机功能
    initCameraFunctions();
    
    // 初始化文件上传
    initFileUpload();
    
    // 初始化提交按钮
    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    
    // 初始化批改版本联动
    document.getElementById('correctionVersion').addEventListener('change', function() {
        const needEssayReport = document.getElementById('needEssayReport');
        needEssayReport.disabled = this.value !== 'advanced';
        if (this.value !== 'advanced') {
            needEssayReport.checked = false;
        }
    });
});

// 初始化写作模式切换
function initModeSwitch() {
    const freeWriting = document.getElementById('freeWriting');
    const timedWriting = document.getElementById('timedWriting');
    const timerContainer = document.getElementById('timerContainer');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const timerDisplay = document.getElementById('timerDisplay');
    
    // 模式切换事件
    freeWriting.addEventListener('change', function() {
        if (this.checked) {
            timerContainer.classList.add('d-none');
            stopTimer();
        }
    });
    
    timedWriting.addEventListener('change', function() {
        if (this.checked) {
            timerContainer.classList.remove('d-none');
        }
    });
    
    // 开始计时按钮
    startTimerBtn.addEventListener('click', function() {
        const minutes = parseInt(document.getElementById('timerInput').value, 10);
        if (isNaN(minutes) || minutes <= 0 || minutes > 120) {
            alert('请输入1-120之间的有效时间！');
            return;
        }
        
        remainingTime = minutes * 60;
        updateTimerDisplay();
        timerDisplay.classList.remove('d-none');
        startTimer();
        this.disabled = true;
        document.getElementById('timerInput').disabled = true;
    });
}

// 开始计时器
function startTimer() {
    if (timer) {
        clearInterval(timer);
    }
    
    timer = setInterval(function() {
        remainingTime--;
        updateTimerDisplay();
        
        if (remainingTime <= 0) {
            stopTimer();
            alert('时间到！请提交您的作文。');
        }
    }, 1000);
}

// 停止计时器
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    document.getElementById('timerDisplay').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 初始化相机功能
function initCameraFunctions() {
    const startCameraBtn = document.getElementById('startCameraBtn');
    const takePictureBtn = document.getElementById('takePictureBtn');
    const cameraPreview = document.getElementById('cameraPreview');
    const pictureCanvas = document.getElementById('pictureCanvas');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const capturedImageElement = document.getElementById('capturedImage');
    const capturedImageContainer = document.getElementById('capturedImageContainer');
    
    let stream = null;
    
    // 打开相机
    startCameraBtn.addEventListener('click', async function() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraPreview.srcObject = stream;
            cameraPreview.classList.remove('d-none');
            cameraPlaceholder.classList.add('d-none');
            takePictureBtn.classList.remove('d-none');
            startCameraBtn.textContent = '关闭相机';
            startCameraBtn.classList.replace('btn-primary', 'btn-danger');
            
            // 切换按钮功能为关闭相机
            startCameraBtn.removeEventListener('click', arguments.callee);
            startCameraBtn.addEventListener('click', function() {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                cameraPreview.classList.add('d-none');
                cameraPlaceholder.classList.remove('d-none');
                takePictureBtn.classList.add('d-none');
                startCameraBtn.textContent = '打开相机';
                startCameraBtn.classList.replace('btn-danger', 'btn-primary');
                
                // 恢复按钮功能为打开相机
                startCameraBtn.removeEventListener('click', arguments.callee);
                initCameraFunctions();
            });
        } catch (err) {
            console.error('无法访问相机: ', err);
            alert('无法访问相机，请确保您已授予相机访问权限。');
        }
    });
    
    // 拍照
    takePictureBtn.addEventListener('click', function() {
        if (!stream) return;
        
        const context = pictureCanvas.getContext('2d');
        pictureCanvas.width = cameraPreview.videoWidth;
        pictureCanvas.height = cameraPreview.videoHeight;
        context.drawImage(cameraPreview, 0, 0, pictureCanvas.width, pictureCanvas.height);
        
        // 获取图片数据
        capturedImage = pictureCanvas.toDataURL('image/jpeg');
        capturedImageElement.src = capturedImage;
        capturedImageContainer.classList.remove('d-none');
        
        // 关闭相机
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraPreview.classList.add('d-none');
        cameraPlaceholder.classList.remove('d-none');
        takePictureBtn.classList.add('d-none');
        startCameraBtn.textContent = '重新拍照';
        startCameraBtn.classList.replace('btn-danger', 'btn-primary');
    });
}

// 初始化文件上传
function initFileUpload() {
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImageElement = document.getElementById('uploadedImage');
    const uploadedImageContainer = document.getElementById('uploadedImageContainer');
    
    imageUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                uploadedImage = e.target.result;
                uploadedImageElement.src = uploadedImage;
                uploadedImageContainer.classList.remove('d-none');
            };
            
            reader.readAsDataURL(file);
        }
    });
}

// 处理提交
async function handleSubmit() {
    // 获取当前选中的输入方式
    const activeTab = document.querySelector('.nav-link.active').id;
    let essayContent = '';
    let imageData = null;
    
    // 根据不同的输入方式获取内容
    if (activeTab === 'text-tab') {
        essayContent = document.getElementById('essayContent').value.trim();
        if (!essayContent) {
            alert('请输入作文内容！');
            return;
        }
    } else if (activeTab === 'camera-tab') {
        if (!capturedImage) {
            alert('请先拍照！');
            return;
        }
        imageData = capturedImage; // 保留完整的base64图片数据
    } else if (activeTab === 'file-tab') {
        if (!uploadedImage) {
            alert('请先上传图片！');
            return;
        }
        imageData = uploadedImage; // 保留完整的base64图片数据
    }
    
    // 获取批改设置
    const grade = document.getElementById('gradeSelect').value;
    const title = document.getElementById('essayTitle').value;
    const correctVersion = document.getElementById('correctionVersion').value;
    const isNeedSynonyms = document.getElementById('needSynonyms').checked;
    const isNeedEssayReport = document.getElementById('needEssayReport').checked;
    
    // 显示结果容器和加载指示器
    const resultContainer = document.getElementById('resultContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultContent = document.getElementById('resultContent');
    
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultContent.classList.add('d-none');
    
    try {
        // 准备请求数据
        const data = new FormData();
        
        // 添加通用参数
        data.append('grade', grade);
        data.append('title', title);
        data.append('isNeedSynonyms', isNeedSynonyms);
        data.append('correctVersion', correctVersion);
        data.append('isNeedEssayReport', isNeedEssayReport);
        
        // 根据输入方式添加不同的内容参数
        if (activeTab === 'text-tab') {
            // 文本输入模式，调用文本API
            alert('文本输入模式暂未实现，请使用图片模式！');
            loadingIndicator.classList.add('d-none');
            resultContainer.classList.add('d-none');
            return;
        } else {
            // 图片模式，添加图片数据
            // 从base64字符串中提取实际的图片数据（移除前缀）
            const base64Data = imageData.split(',')[1];
            data.append('q', base64Data);
        }
        
        // 检查API密钥是否已设置
         if (!APP_KEY || !APP_SECRET) {
             throw new Error('请先在app.js文件中设置您的应用ID和密钥');
         }
         
         // 添加API认证参数
         const salt = generateUUID();
         const curtime = Math.round(new Date().getTime() / 1000);
         const q = data.get('q') || '';
         const sign = await sha256(APP_KEY + truncate(q) + salt + curtime + APP_SECRET);
         
         data.append('appKey', APP_KEY);
         data.append('salt', salt);
         data.append('curtime', curtime);
         data.append('signType', 'v3');
         data.append('sign', sign);
         
         // 尝试使用no-cors模式解决跨域问题
          const response = await axios.post(REQUEST_URL, data, {
              headers: {
                  'Content-Type': 'multipart/form-data'
              },
              // 注意：no-cors模式会限制响应处理，可能无法读取响应内容
              // mode: 'no-cors' // axios不直接支持mode选项，这里使用fetch API的方式
          });
        
        const result = response.data;
        
        // 处理并显示结果
        displayResult(result);
    } catch (error) {
        console.error('API请求失败:', error);
        resultContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>请求失败</h4>
                <p>${error.message || '未知错误'}</p>
                <p>请检查网络连接和API配置后重试。</p>
            </div>
        `;
        loadingIndicator.classList.add('d-none');
        resultContent.classList.remove('d-none');
    }
}



// 处理输入文本，如果超过20个字符，则截取前10个和后10个，中间用长度代替
function truncate(text) {
    if (!text) return '';
    const len = text.length;
    if (len <= 20) return text;
    return text.substring(0, 10) + len + text.substring(len - 10);
}

// 生成UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// SHA256 哈希函数
async function sha256(message) {
    // 使用 SubtleCrypto API 计算 SHA-256 哈希
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 显示批改结果
function displayResult(result) {
    const resultContent = document.getElementById('resultContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // 检查API返回是否有错误
    if (result.errorCode !== '0') {
        resultContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>API返回错误</h4>
                <p>错误码: ${result.errorCode}</p>
                <p>请检查API配置和参数后重试。</p>
            </div>
        `;
        loadingIndicator.classList.add('d-none');
        resultContent.classList.remove('d-none');
        return;
    }
    
    // 获取结果数据
    const data = result.Result;
    
    // 构建结果HTML
    let html = `
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="score-display">${data.totalScore}</div>
                        <div class="score-label">总分 (满分${data.fullScore})</div>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div class="evaluation-box">
                    <h4>总体评价</h4>
                    <p class="mb-0">${data.totalEvaluation}</p>
                    <p>${data.essayAdvice || ''}</p>
                </div>
                <div class="row">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.grammarScore.toFixed(1)}</div>
                                <div class="score-label">语法得分</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.wordScore.toFixed(1)}</div>
                                <div class="score-label">词汇得分</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div class="score-display">${data.majorScore.structureScore.toFixed(1)}</div>
                                <div class="score-label">结构得分</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">作文内容</h5>
            </div>
            <div class="card-body">
                <p>${data.rawEssay.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">详细批改</h5>
            </div>
            <div class="card-body">
    `;
    
    // 添加每个句子的批改结果
    data.essayFeedback.sentsFeedback.forEach((sent, index) => {
        html += `<div class="correction-item">`;
        
        // 显示原句
        html += `<p><strong>原句 ${index + 1}:</strong> ${sent.rawSent}</p>`;
        
        // 如果有错误，显示错误信息和修改建议
        if (sent.errorPosInfos && sent.errorPosInfos.length > 0) {
            html += `<p><strong>修改建议:</strong></p>`;
            html += `<ul>`;
            sent.errorPosInfos.forEach(error => {
                html += `
                    <li>
                        <span class="error-highlight">${error.orgChunk}</span> → 
                        <span class="correction-suggestion">${error.correctChunk}</span>
                        <p>${error.errBaseInfo}</p>
                    </li>
                `;
            });
            html += `</ul>`;
        }
        
        // 如果有同义词推荐
        if (sent.synInfo && sent.synInfo.length > 0) {
            html += `<p><strong>同义词推荐:</strong></p>`;
            html += `<ul>`;
            sent.synInfo.forEach(syn => {
                const originalWord = syn.source[0].word;
                html += `<li><span class="error-highlight">${originalWord}</span> 可替换为: `;
                
                syn.target.forEach((target, i) => {
                    const word = target[0].word;
                    html += `<span class="correction-suggestion">${word}</span>`;
                    if (i < syn.target.length - 1) html += ', ';
                });
                
                html += `</li>`;
            });
            html += `</ul>`;
        }
        
        // 如果没有错误和同义词推荐，显示正确信息
        if ((!sent.errorPosInfos || sent.errorPosInfos.length === 0) && 
            (!sent.synInfo || sent.synInfo.length === 0)) {
            html += `<p><span class="text-success">✓ 该句没有语法错误</span></p>`;
        }
        
        html += `</div>`;
    });
    
    html += `
            </div>
        </div>
    `;
    
    // 显示结果
    resultContent.innerHTML = html;
    loadingIndicator.classList.add('d-none');
    resultContent.classList.remove('d-none');
    
    // 滚动到结果区域
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}