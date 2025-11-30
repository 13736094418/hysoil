const fetch = require('node-fetch');

module.exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers: {
                ...headers,
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: '' 
        };
    }

    try {
        const API_KEY = process.env.ONENET_API_KEY;
        
        const testResult = {
            timestamp: new Date().toISOString(),
            status: 'OK',
            environment: {
                apiKeyExists: !!API_KEY,
                apiKeyLength: API_KEY ? API_KEY.length : 0,
                nodeEnv: process.env.NODE_ENV || '未设置'
            },
            request: {
                method: event.httpMethod,
                path: event.path
            }
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(testResult)
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};