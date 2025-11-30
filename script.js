// OneNET平台配置 - 请修改为您的实际信息
const ONENET_CONFIG = {
    API_BASE_URL: 'https://api.heclouds.com',
    PRODUCT_ID: 'Xh8edeT6Gd',      // 替换为真实值
    DEVICE_ID: 'hysoil',        // 替换为真实值  
    API_KEY: 'version=2018-10-31&res=products%2FXh8edeT6Gd%2Fdevices%2Fhysoil&et=1826875448&method=md5&sign=p5%2Fu6l07hsWh6hCRkjUX4A%3D%3D',            // 替换为真实值
    DATASTREAMS: {
        TEMPERATURE: 'bat_tem',         // 修改为您的温度数据流名称
        HUMIDITY: 'Hum'                 // 修改为您的湿度数据流名称
    }
};

// 全局变量
let refreshInterval;

// 诊断函数 - 在网页上显示结果
window.runDiagnosis = async function() {
    const output = document.getElementById('debug-output');
    output.innerHTML = '=== 开始诊断连接问题 ===\n';
    
    try {
        // 测试1: 检查配置
        output.innerHTML += '1. 检查配置...\n';
        output.innerHTML += `   产品ID: ${ONENET_CONFIG.PRODUCT_ID}\n`;
        output.innerHTML += `   API Key长度: ${ONENET_CONFIG.API_KEY.length}\n`;
        output.innerHTML += `   温度数据流: ${ONENET_CONFIG.DATASTREAMS.TEMPERATURE}\n`;
        output.innerHTML += `   湿度数据流: ${ONENET_CONFIG.DATASTREAMS.HUMIDITY}\n`;
        
        // 测试2: 测试网络
        output.innerHTML += '2. 测试网络连接...\n';
        const testNet = await fetch('https://httpbin.org/get');
        output.innerHTML += '   ✓ 网络连接正常\n';
        
        // 测试3: 测试OneNET API
        output.innerHTML += '3. 测试OneNET API连接...\n';
        const url = `https://api.heclouds.com/devices?product_id=${ONENET_CONFIG.PRODUCT_ID}`;
        output.innerHTML += `   请求URL: ${url}\n`;
        
        const response = await fetch(url, {
            headers: { 'api-key': ONENET_CONFIG.API_KEY }
        });
        
        output.innerHTML += `   响应状态: ${response.status} ${response.statusText}\n`;
        
        if (response.ok) {
            const data = await response.json();
            output.innerHTML += '   ✓ API请求成功！\n';
            output.innerHTML += `   错误码: ${data.errno}\n`;
            output.innerHTML += `   错误信息: ${data.error}\n`;
            
            if (data.data && data.data.devices) {
                output.innerHTML += `   找到设备数量: ${data.data.devices.length}\n`;
                data.data.devices.forEach((device, index) => {
                    output.innerHTML += `     设备${index + 1}: ${device.title} (${device.id})\n`;
                });
            }
        } else {
            const errorText = await response.text();
            output.innerHTML += `   ✗ API错误: ${errorText}\n`;
        }
        
    } catch (error) {
        output.innerHTML += `   ✗ 错误详情: ${error.message}\n`;
        output.innerHTML += `   错误类型: ${error.name}\n`;
    }
    
    output.innerHTML += '=== 诊断完成 ===\n';
};

// 1. 获取设备列表
async function fetchDeviceList() {
    console.log('开始获取设备列表...');
    
    const deviceSelect = document.getElementById('deviceSelect');
    if (!deviceSelect) {
        console.error('错误: 未找到设备选择元素');
        return;
    }
    
    try {
        deviceSelect.classList.add('loading');
        
        const response = await fetch(
            `${ONENET_CONFIG.API_BASE_URL}/devices?product_id=${ONENET_CONFIG.PRODUCT_ID}`, 
            {
                headers: {
                    'api-key': ONENET_CONFIG.API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP错误! 状态: ${response.status}, 详情: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API响应数据:', data);
        
        // 清空设备列表
        deviceSelect.innerHTML = '<option value="">请选择设备</option>';
        
        if (data.errno === 0 && data.data && data.data.devices) {
            data.data.devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = `${device.title} (${device.id})`;
                if (device.id === ONENET_CONFIG.DEVICE_ID) {
                    option.selected = true;
                }
                deviceSelect.appendChild(option);
            });
            console.log(`成功获取 ${data.data.devices.length} 个设备`);
            
            // 如果有默认设备，自动选择
            if (ONENET_CONFIG.DEVICE_ID && ONENET_CONFIG.DEVICE_ID !== 'YOUR_DEVICE_ID') {
                deviceSelect.value = ONENET_CONFIG.DEVICE_ID;
                fetchLatestData(ONENET_CONFIG.DEVICE_ID);
                fetchDatastreams(ONENET_CONFIG.DEVICE_ID);
            }
        } else {
            console.warn('设备数据格式异常:', data);
            alert(`API返回异常: ${data.error}`);
        }
        
    } catch (error) {
        console.error('获取设备列表失败:', error);
        alert('获取设备列表失败: ' + error.message);
    } finally {
        deviceSelect.classList.remove('loading');
    }
}

// 2. 获取设备最新数据
async function fetchLatestData(deviceId = ONENET_CONFIG.DEVICE_ID) {
    if (!deviceId || deviceId === 'YOUR_DEVICE_ID') {
        console.log('未选择有效设备，跳过数据获取');
        return;
    }
    
    try {
        console.log(`获取设备 ${deviceId} 的最新数据...`);
        
        const response = await fetch(`${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}`, {
            headers: {
                'api-key': ONENET_CONFIG.API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.errno === 0) {
            updateDeviceDisplay(data.data);
        } else {
            throw new Error(`API错误: ${data.error}`);
        }
        
    } catch (error) {
        console.error('获取设备数据失败:', error);
    }
}

// 3. 获取设备数据流详情
async function fetchDatastreams(deviceId = ONENET_CONFIG.DEVICE_ID) {
    if (!deviceId || deviceId === 'YOUR_DEVICE_ID') return;
    
    try {
        const response = await fetch(`${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}/datastreams`, {
            headers: {
                'api-key': ONENET_CONFIG.API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.errno === 0) {
                updateDatastreamsDisplay(data.data.datastreams);
            }
        }
    } catch (error) {
        console.error('获取数据流失败:', error);
    }
}

// 4. 获取数据点历史
async function fetchDataPoints(deviceId = ONENET_CONFIG.DEVICE_ID, datastreamId, limit = 10) {
    if (!deviceId || !datastreamId) return;
    
    try {
        const response = await fetch(
            `${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}/datapoints?datastream_id=${datastreamId}&limit=${limit}`, 
            {
                headers: {
                    'api-key': ONENET_CONFIG.API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            return data.data;
        }
    } catch (error) {
        console.error(`获取数据点失败 ${datastreamId}:`, error);
    }
    return null;
}

// 5. 更新设备数据显示
function updateDeviceDisplay(device) {
    const temperatureElement = document.getElementById('temperatureValue');
    const humidityElement = document.getElementById('humidityValue');
    const lastUpdateElement = document.getElementById('lastUpdate');
    
    if (!temperatureElement || !humidityElement || !lastUpdateElement) {
        console.error('错误: 未找到显示元素');
        return;
    }
    
    // 查找温度和湿度数据
    let temperature = '--';
    let humidity = '--';
    
    if (device.datastreams) {
        device.datastreams.forEach(ds => {
            if (ds.id === ONENET_CONFIG.DATASTREAMS.TEMPERATURE && ds.current_value !== undefined) {
                temperature = parseFloat(ds.current_value).toFixed(1);
            }
            if (ds.id === ONENET_CONFIG.DATASTREAMS.HUMIDITY && ds.current_value !== undefined) {
                humidity = parseFloat(ds.current_value).toFixed(1);
            }
        });
    }
    
    // 更新显示
    temperatureElement.textContent = temperature;
    humidityElement.textContent = humidity;
    
    const statusText = device.online ? 
        `<span class="status-connected">在线</span>` : 
        `<span class="status-disconnected">离线</span>`;
    
    lastUpdateElement.innerHTML = `设备: ${device.title} | 状态: ${statusText} | 更新时间: ${new Date().toLocaleString('zh-CN')}`;
}

// 6. 更新数据流显示
function updateDatastreamsDisplay(datastreams) {
    const datastreamsContainer = document.getElementById('datastreams');
    if (!datastreamsContainer) return;
    
    datastreamsContainer.innerHTML = '';
    
    // 清空历史表格
    const tableBody = document.querySelector('#dataTable tbody');
    if (tableBody) tableBody.innerHTML = '';
    
    datastreams.forEach(ds => {
        const datastreamElement = document.createElement('div');
        datastreamElement.className = 'datastream-item';
        datastreamElement.innerHTML = `
            <div>
                <span class="datastream-name">${ds.id}</span>
                <div class="datastream-time">更新时间: ${ds.update_at ? new Date(ds.update_at).toLocaleString('zh-CN') : '未知'}</div>
            </div>
            <div class="datastream-value">${ds.current_value !== undefined ? ds.current_value : '无数据'}</div>
        `;
        datastreamsContainer.appendChild(datastreamElement);
        
        // 为温度和湿度数据流获取历史数据
        if (ds.id === ONENET_CONFIG.DATASTREAMS.TEMPERATURE || ds.id === ONENET_CONFIG.DATASTREAMS.HUMIDITY) {
            fetchDataPoints(ONENET_CONFIG.DEVICE_ID, ds.id).then(dataPoints => {
                if (dataPoints && dataPoints.datapoints) {
                    updateHistoryTable(dataPoints, ds.id);
                }
            });
        }
    });
}

// 7. 更新历史数据表格
function updateHistoryTable(dataPoints, datastreamId) {
    if (!dataPoints || !dataPoints.datapoints) return;
    
    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) return;
    
    dataPoints.datapoints.forEach(dp => {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.textContent = new Date(dp.at).toLocaleString('zh-CN');
        
        const streamCell = document.createElement('td');
        streamCell.textContent = datastreamId;
        
        const valueCell = document.createElement('td');
        valueCell.textContent = dp.value;
        
        row.appendChild(timeCell);
        row.appendChild(streamCell);
        row.appendChild(valueCell);
        
        tableBody.appendChild(row);
    });
}

// 8. 自动刷新功能
window.startAutoRefresh = function(interval = 10000) {
    stopAutoRefresh();
    console.log(`开始自动刷新，间隔: ${interval}ms`);
    refreshInterval = setInterval(() => {
        const deviceSelect = document.getElementById('deviceSelect');
        if (deviceSelect && deviceSelect.value) {
            fetchLatestData(deviceSelect.value);
            fetchDatastreams(deviceSelect.value);
        }
    }, interval);
    alert(`已开启自动刷新，间隔: ${interval/1000}秒`);
}

window.stopAutoRefresh = function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        console.log('停止自动刷新');
        alert('已停止自动刷新');
    }
}

// 9. 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 页面初始化开始 ===');
    console.log('温度数据流名称:', ONENET_CONFIG.DATASTREAMS.TEMPERATURE);
    console.log('湿度数据流名称:', ONENET_CONFIG.DATASTREAMS.HUMIDITY);
    
    // 安全地添加事件监听器
    const deviceSelect = document.getElementById('deviceSelect');
    if (deviceSelect) {
        deviceSelect.addEventListener('change', function() {
            console.log('设备选择变化:', this.value);
            const deviceId = this.value;
            if (deviceId) {
                fetchLatestData(deviceId);
                fetchDatastreams(deviceId);
                startAutoRefresh(10000);
            } else {
                stopAutoRefresh();
            }
        });
    }
    
    // 初始化数据
    if (ONENET_CONFIG.PRODUCT_ID && ONENET_CONFIG.PRODUCT_ID !== 'YOUR_PRODUCT_ID') {
        fetchDeviceList();
    }
    
    console.log('=== 页面初始化完成 ===');
});

// 10. 手动测试函数
window.testConnection = function() {
    console.log('=== 手动测试连接 ===');
    console.log('当前配置:', ONENET_CONFIG);
    fetchDeviceList();
};