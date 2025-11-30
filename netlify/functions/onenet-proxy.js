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
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'ONENET_API_KEY 未设置'
                })
            };
        }

        // 获取查询参数
        const { device_id } = event.queryStringParameters || {};
        
        if (!device_id) {
            return {
                statusCode: 400,
                headers: { 
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    success: false, 
                    error: '缺少设备ID参数'
                })
            };
        }

        // 构建请求URL
        const url = `https://api.heclouds.com/devices/${device_id}/datapoints?datastream_id=bat_tem,Hum&limit=10`;

        // 发送请求到 OneNET
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: false,
                    error: `OneNET API错误: ${response.status}`,
                    details: errorText
                })
            };
        }

        const data = await response.json();

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
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};