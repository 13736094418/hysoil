exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const API_KEY = process.env.ONENET_API_KEY;
    
    const testResult = {
      environment: {
        apiKeyExists: !!API_KEY,
        apiKeyLength: API_KEY ? API_KEY.length : 0,
        nodeEnv: process.env.NODE_ENV || '未设置'
      },
      request: {
        method: event.httpMethod,
        queryParams: event.queryStringParameters
      }
    };

    // 测试 OneNET 基础连接
    const response = await fetch('https://api.heclouds.com/version', {
      timeout: 5000
    });

    testResult.connection = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
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
        type: error.name,
        environment: {
          apiKeyExists: !!process.env.ONENET_API_KEY,
          apiKeyLength: process.env.ONENET_API_KEY ? process.env.ONENET_API_KEY.length : 0
        }
      })
    };
  }
};