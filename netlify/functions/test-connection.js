const fetch = require('node-fetch');

module.exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type'
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
        
        // 基础环境检查
        const testResult = {
            timestamp: new Date().toISOString(),
            environment: {
                apiKeyExists: !!API_KEY,
                apiKeyLength: API_KEY ? API_KEY.length : 0,
                nodeEnv: process.env.NODE_ENV || '未设置',
                nodeVersion: process.version,
                functionRegion: process.env.AWS_REGION || '未知'
            },
            request: {
                method: event.httpMethod,
                path: event.path,
                queryParams: event.queryStringParameters || {},
                userAgent: event.headers['user-agent'] || '未知'
            },
            tests: {}
        };

        // 测试1: 环境变量配置
        testResult.tests.environmentVariables = {
            passed: !!API_KEY && API_KEY.length > 10,
            message: API_KEY ? `API Key配置正常 (长度: ${API_KEY.length})` : 'API Key未配置'
        };

        // 测试2: OneNET API 基础连接
        try {
            const versionResponse = await fetch('https://api.heclouds.com/version', {
                timeout: 10000
            });
            
            testResult.tests.apiConnectivity = {
                passed: versionResponse.ok,
                status: versionResponse.status,
                statusText: versionResponse.statusText,
                message: versionResponse.ok ? 'OneNET API 连接正常' : `连接失败: ${versionResponse.status}`
            };
        } catch (error) {
            testResult.tests.apiConnectivity = {
                passed: false,
                error: error.message,
                message: `网络连接失败: ${error.message}`
            };
        }

        // 测试3: 如果有设备ID，测试具体设备连接
        if (event.queryStringParameters && event.queryStringParameters.device_id) {
            const deviceId = event.queryStringParameters.device_id;
            try {
                const deviceResponse = await fetch(`https://api.heclouds.com/devices/${deviceId}`, {
                    method: 'GET',
                    headers: {
                        'api-key': API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });

                testResult.tests.deviceAccess = {
                    passed: deviceResponse.ok,
                    status: deviceResponse.status,
                    deviceId: deviceId,
                    message: deviceResponse.ok ? '设备访问正常' : `设备访问失败: ${deviceResponse.status}`
                };

                if (!deviceResponse.ok) {
                    const errorText = await deviceResponse.text();
                    testResult.tests.deviceAccess.errorDetails = errorText;
                }
            } catch (error) {
                testResult.tests.deviceAccess = {
                    passed: false,
                    error: error.message,
                    deviceId: deviceId,
                    message: `设备访问错误: ${error.message}`
                };
            }
        } else {
            testResult.tests.deviceAccess = {
                passed: null,
                message: '未提供设备ID，跳过设备测试'
            };
        }

        // 计算总体测试结果
        const passedTests = Object.values(testResult.tests).filter(test => test.passed === true).length;
        const totalTests = Object.values(testResult.tests).filter(test => test.passed !== null).length;
        
        testResult.summary = {
            totalTests: totalTests,
            passedTests: passedTests,
            successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
            overallStatus: passedTests === totalTests ? 'PASS' : 'FAIL',
            recommendations: []
        };

        // 生成建议
        if (!testResult.tests.environmentVariables.passed) {
            testResult.summary.recommendations.push('检查 Netlify 环境变量 ONENET_API_KEY 配置');
        }
        if (!testResult.tests.apiConnectivity.passed) {
            testResult.summary.recommendations.push('检查网络连接和 OneNET API 状态');
        }
        if (testResult.tests.deviceAccess.passed === false) {
            testResult.summary.recommendations.push('验证设备ID是否正确，检查API Key权限');
        }

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify(testResult, null, 2)
        };
    } catch (error) {
        const errorResult = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                type: error.name,
                stack: error.stack
            },
            environment: {
                apiKeyExists: !!process.env.ONENET_API_KEY,
                apiKeyLength: process.env.ONENET_API_KEY ? process.env.ONENET_API_KEY.length : 0
            }
        };

        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify(errorResult, null, 2)
        };
    }
};