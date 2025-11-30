const fetch = require('node-fetch');

exports.handler = async (event) => {
  // 处理 CORS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // 从环境变量获取 API Key
    const API_KEY = process.env.ONENET_API_KEY;
    
    if (!API_KEY) {
      throw new Error('ONENET_API_KEY 环境变量未设置');
    }

    // 获取查询参数
    const { 
      device_id, 
      datastream_id = 'bat_tem,Hum', 
      limit = 50 
    } = event.queryStringParameters || {};
    
    if (!device_id) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          success: false, 
          error: '缺少 device_id 参数' 
        })
      };
    }

    // 构建请求URL
    const url = `https://api.heclouds.com/devices/${device_id}/datapoints?datastream_id=${datastream_id}&limit=${limit}`;

    console.log('请求URL:', url);
    console.log('使用API Key长度:', API_KEY.length);

    // 发送请求到 OneNET
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OneNET API 错误:', response.status, errorText);
      throw new Error(`OneNET API 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('获取数据成功，数据流数量:', data.data?.datastreams?.length || 0);

    // 返回成功响应
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: data
      })
    };

  } catch (error) {
    console.error('代理函数错误:', error.message);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        type: error.name
      })
    };
  }
};