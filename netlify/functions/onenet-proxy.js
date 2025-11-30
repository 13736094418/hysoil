const fetch = require('node-fetch');

module.exports.handler = async (event, context) => {
    // 处理 CORS 预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, api-key',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: ''
        };
    }

    try {
        // 从环境变量获取 API Key
        const API_KEY = process.env.ONENET_API_KEY;
        
        if (!API_KEY) {
            console.error('ONENET_API_KEY 环境变量未设置');
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: '服务器配置错误: ONENET_API_KEY 未设置'
                })
            };
        }

        // 获取查询参数
        const { 
            device_id, 
            datastream_id = 'bat_tem,Hum', 
            limit = 20
        } = event.queryStringParameters || {};
        
        if (!device_id) {
            return {
                statusCode: 400,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: '缺少必要参数: device_id',
                    usage: '请提供设备ID，例如: /api/onenet-proxy?device_id=你的设备ID'
                })
            };
        }

        // 构建请求URL
        const url = `https://api.heclouds.com/devices/${device_id}/datapoints?datastream_id=${datastream_id}&limit=${limit}`;

        console.log('请求OneNET URL:', url);
        console.log('使用API Key长度:', API_KEY.length);

        // 发送请求到 OneNET
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OneNET API 错误:', response.status, errorText);
            
            let errorMessage = `OneNET API 错误: ${response.status}`;
            if (response.status === 401) {
                errorMessage = '认证失败: API Key无效或过期';
            } else if (response.status === 404) {
                errorMessage = '设备未找到: 请检查设备ID是否正确';
            } else if (response.status === 400) {
                errorMessage = '请求参数错误: 请检查设备ID和数据流名称';
            }
            
            return {
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: errorMessage,
                    details: errorText
                })
            };
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
                message: '数据获取成功',
                data: data
            })
        };

    } catch (error) {
        console.error('代理函数执行错误:', error.message);
        
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