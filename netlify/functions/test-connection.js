module.exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            status: 'OK',
            apiKeyExists: !!process.env.ONENET_API_KEY,
            timestamp: new Date().toISOString()
        })
    };
};