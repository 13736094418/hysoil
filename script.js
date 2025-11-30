// OneNET平台配置 - 需要您修改为实际的值
const ONENET_CONFIG = {
    // 从OneNET控制台获取：产品ID、设备ID、API Key
    API_BASE_URL: 'http://api.heclouds.com',
    PRODUCT_ID: 'Xh8edeT6Gd',      // 替换为您的产品ID
    DEVICE_ID: 'hysoil',        // 替换为您的设备ID
    API_KEY: 'version=2018-10-31&res=products%2FXh8edeT6Gd%2Fdevices%2Fhysoil&et=1826875448&method=md5&sign=p5%2Fu6l07hsWh6hCRkjUX4A%3D%3D',            // 替换为您的API Key
    
    // 数据流名称（根据您的设备实际数据流名称修改）
    DATASTREAMS: {
        TEMPERATURE: 'bat_tem',     // 温度数据流名称
        HUMIDITY: 'Hum'            // 湿度数据流名称
    }
};

// DOM元素
const temperatureElement = document.getElementById('temperatureValue');
const humidityElement = document.getElementById('humidityValue');
const lastUpdateElement = document.getElementById('lastUpdate');
const tableBody = document.querySelector('#dataTable tbody');
const datastreamsContainer = document.getElementById('datastreams');
const deviceSelect = document.getElementById('deviceSelect');

// 1. 获取OneNET设备列表
async function fetchDeviceList() {
    try {
        const response = await fetch(`${ONENET_CONFIG.API_BASE_URL}/devices?product_id=${ONENET_CONFIG.PRODUCT_ID}`, {
            headers: {
                'api-key': ONENET_CONFIG.API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 清空设备列表
        deviceSelect.innerHTML = '<option value="">请选择设备</option>';
        
        // 填充设备列表
        data.data.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = `${device.title} (${device.id})`;
            deviceSelect.appendChild(option);
        });
        
        console.log('设备列表获取成功:', data);
    } catch (error) {
        console.error('获取设备列表失败:', error);
        alert('获取设备列表失败: ' + error.message);
    }
}

// 2. 获取设备最新数据
async function fetchLatestData(deviceId = ONENET_CONFIG.DEVICE_ID) {
    if (!deviceId) {
        alert('请先选择设备');
        return;
    }
    
    try {
        // 获取设备详情（包含最新数据）
        const response = await fetch(`${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}`, {
            headers: {
                'api-key': ONENET_CONFIG.API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const device = data.data;
        
        updateDeviceDisplay(device);
        
    } catch (error) {
        console.error('获取设备数据失败:', error);
        alert('获取设备数据失败: ' + error.message);
    }
}

// 3. 获取设备数据流详情
async function fetchDatastreams(deviceId = ONENET_CONFIG.DEVICE_ID) {
    if (!deviceId) return;
    
    try {
        const response = await fetch(`${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}/datastreams`, {
            headers: {
                'api-key': ONENET_CONFIG.API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        updateDatastreamsDisplay(data.data.datastreams);
        
    } catch (error) {
        console.error('获取数据流失败:', error);
    }
}

// 4. 获取数据点历史
async function fetchDataPoints(deviceId = ONENET_CONFIG.DEVICE_ID, datastreamId, limit = 20) {
    if (!deviceId || !datastreamId) return;
    
    try {
        const response = await fetch(
            `${ONENET_CONFIG.API_BASE_URL}/devices/${deviceId}/datapoints?datastream_id=${datastreamId}&limit=${limit}`, 
            {
                headers: {
                    'api-key': ONENET_CONFIG.API_KEY
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data;
        
    } catch (error) {
        console.error(`获取数据点失败 ${datastreamId}:`, error);
        return null;
    }
}

// 5. 更新设备数据显示
function updateDeviceDisplay(device) {
    // 更新设备状态信息
    const statusText = device.online ? 
        `<span class="status-connected">在线</span>` : 
        `<span class="status-disconnected">离线</span>`;
    
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
    lastUpdateElement.innerHTML = `设备: ${device.title} | 状态: ${statusText} | 更新时间: ${new Date().toLocaleString('zh-CN')}`;
}

// 6. 更新数据流显示
function updateDatastreamsDisplay(datastreams) {
    datastreamsContainer.innerHTML = '';
    
    datastreams.forEach(ds => {
        const datastreamElement = document.createElement('div');
        datastreamElement.className = 'datastream-item';
        datastreamElement.innerHTML = `
            <div class="datastream-name">${ds.id}</div>
            <div class="datastream-value">${ds.current_value !== undefined ? ds.current_value : '无数据'}</div>
            <div>更新时间: ${ds.update_at ? new Date(ds.update_at).toLocaleString('zh-CN') : '未知'}</div>
        `;
        datastreamsContainer.appendChild(datastreamElement);
    });
}

// 7. 更新历史数据表格
function updateHistoryTable(dataPoints, datastreamId) {
    if (!dataPoints || !dataPoints.datapoints) return;
    
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

// 8. 自动刷新数据
let refreshInterval;

function startAutoRefresh(interval = 10000) { // 默认10秒刷新一次
    stopAutoRefresh();
    refreshInterval = setInterval(() => {
        const deviceId = deviceSelect.value || ONENET_CONFIG.DEVICE_ID;
        if (deviceId) {
            fetchLatestData(deviceId);
            fetchDatastreams(deviceId);
        }
    }, interval);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// 9. 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 获取设备列表
    fetchDeviceList();
    
    // 如果有默认设备ID，直接加载数据
    if (ONENET_CONFIG.DEVICE_ID && ONENET_CONFIG.DEVICE_ID !== 'YOUR_DEVICE_ID') {
        fetchLatestData();
        fetchDatastreams();
        startAutoRefresh();
    }
    
    // 设备选择变化事件
    deviceSelect.addEventListener('change', function() {
        const deviceId = this.value;
        if (deviceId) {
            fetchLatestData(deviceId);
            fetchDatastreams(deviceId);
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
});

// 10. 提供手动测试函数
window.testOneNETConnection = async function() {
    console.log('测试OneNET连接...');
    await fetchDeviceList();
};