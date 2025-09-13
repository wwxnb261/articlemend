/**
 * 本地代理服务器 - 解决跨域问题
 * 使用方法：
 * 1. 安装Node.js
 * 2. 在命令行中运行：npm install express cors axios
 * 3. 运行此文件：node proxy-server.js
 * 4. 修改app.js中的REQUEST_URL为'http://localhost:3000/api/correct'
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3000;

// 启用CORS
app.use(cors());

// 解析JSON和表单数据
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static('.'));

// 使用multer处理multipart/form-data请求
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const FormData = require('form-data');

// 代理API请求
app.post('/api/correct', upload.none(), async (req, res) => {
  try {
    console.log('收到代理请求，参数:', Object.keys(req.body));
    
    // 创建新的FormData对象
    const formData = new FormData();
    
    // 将请求中的所有字段添加到FormData
    for (const key in req.body) {
      formData.append(key, req.body[key]);
    }
    
    // 转发请求到有道智云API
    const response = await axios.post(
      'https://openapi.youdao.com/v2/correct_writing_image',
      formData,
      {
        headers: {
          ...formData.getHeaders()
        }
      }
    );
    
    // 返回API响应
    res.json(response.data);
  } catch (error) {
    console.error('代理请求失败:', error.message);
    res.status(500).json({
      error: '代理请求失败',
      message: error.message
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
  console.log(`API代理地址: http://localhost:${PORT}/api/correct`);
  console.log('请修改app.js中的REQUEST_URL为上述地址');
});