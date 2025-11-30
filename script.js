class WeatherMonitor {
    constructor() {
        this.currentDeviceId = '';
        this.autoRefreshInterval = null;
        this.isConnected = false;
        this.lastData = null;
        this.logEntries = [];
        
        this.initializeElements();
        this.bindEvents();
        this.updateFooterTime();
        this.log('系统初始化完成');
    }

    initializeElements() {
        // 输入元素
        this.deviceIdInput = document.getElementById('device-id-input');
        
        // 按钮元素
        this.fetchDataBtn = document.getElementById('fetch-data-btn');
        this.autoRefreshBtn = document.getElementById('auto-refresh-btn');
        this.stopRefreshBtn = document.getElementById('stop-refresh-btn');
        this.testConnectionBtn = document.getElementById('test-connection-btn');
        this.clearLogBtn = document.getElementById('clear-log-btn');
        this.exportLogBtn = document.getElementById('export-log-btn');
        
        // 显示元素
        this.updateTimeElement = document.getElementById('update-time');
        this.connectionStatusElement = document.getElementById('connection-status');
        this.temperatureValue = document.getElementById('temperature-value');
        this.humidityValue = document.getElementById('humidity-value');
        this.temperatureTrend = document.getElementById('temperature-trend');
        this.humidityTrend = document.getElementById('humidity-trend');
        this.debugOutput = document.getElementById('debug-output');
        this.footerTime = document.getElementById('footer-time');
        
        // 数据流元素
        this.temperatureStream = document.getElementById('temperature-stream');
        this.humidityStream = document.getElementById('humidity-stream');
    }

    bindEvents() {
        // 按钮事件
        this.fetchDataBtn.addEventListener('click', () => {
            this.fetchDeviceData();
        });

        this.autoRefreshBtn.addEventListener('click', () => {
            this.startAutoRefresh();
        });

        this.stopRefreshBtn.addEventListener('click', () => {
            this.stopAutoRefresh();
        });

        this.testConnectionBtn.addEventListener('click', () => {
            this.testConnection();
        });

        this.clearLogBtn.addEventListener('click', () => {
            this.clearLog();
        });

        this.exportLogBtn.addEventListener('click', () => {
            this.exportLog();
        });

        // 输入框事件 - 回车键获取数据
        this.deviceIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.fetchDeviceData();
            }
        });

        // 页面可见性变化事件 - 重新获取数据
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentDeviceId) {
                this.fetchDeviceData();
            }
        });

        this.log('事件监听器绑定完成');
    }

    async fetchDeviceData() {
        this.currentDeviceId = this.deviceIdInput.value.trim();
        
        if (!this.currentDeviceId) {
            this.log('错误: 请输入设备ID', 'error');
            this.showNotification('请输入设备ID', 'error');
            return;
        }

        this.setLoadingState(true);
        this.updateConnectionStatus('connecting', '🟡 连接中...');
        this.log(`开始获取设备数据: ${this.currentDeviceId}`);

        try {
            const apiUrl = `/api/onenet-proxy?device_id=${this.currentDeviceId}`;
            this.log(`请求URL: ${apiUrl}`);
            
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (result.success) {
                this.handleDataSuccess(result);
                this.log('数据获取成功', 'success');
            } else {
                throw new Error(result.error || 'API返回失败');
            }

        } catch (error) {
            this.handleDataError(error);
            this.log(`数据获取失败: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    handleDataSuccess(result) {
        this.isConnected = true;
        this.lastData = result.data;
        
        this.updateConnectionStatus('connected', '🟢 已连接');
        this.updateSensorDisplay(result.data);
        this.updateDataStreams(result.data);
        this.updateTimestamp();
        
        this.showNotification('数据更新成功', 'success');
    }

    handleDataError(error) {
        this.isConnected = false;
        this.lastData = null;
        
        this.updateConnectionStatus('disconnected', '🔴 连接失败');
        
        // 重置显示
        this.temperatureValue.textContent = '--';
        this.humidityValue.textContent = '--';
        this.temperatureTrend.textContent = '--';
        this.humidityTrend.textContent = '--';
        
        this.updateDataStreams(null);
        
        this.showNotification(`获取失败: ${error.message}`, 'error');
    }

    updateSensorDisplay(data) {
        if (!data || !data.datastreams) {
            this.log('错误: 数据格式不正确', 'error');
            return;
        }

        // 更新温度显示
        const tempInfo = data.datastreams['bat_tem'];
        if (tempInfo && tempInfo.current_value !== null) {
            this.temperatureValue.textContent = tempInfo.current_value;
            this.temperatureValue.style.color = this.getTemperatureColor(tempInfo.current_value);
        } else {
            this.temperatureValue.textContent = '--';
            this.temperatureValue.style.color = '';
            this.log('警告: 未找到温度数据', 'warning');
        }

        // 更新湿度显示
        const humInfo = data.datastreams['Hum'];
        if (humInfo && humInfo.current_value !== null) {
            this.humidityValue.textContent = humInfo.current_value;
            this.humidityValue.style.color = this.getHumidityColor(humInfo.current_value);
        } else {
            this.humidityValue.textContent = '--';
            this.humidityValue.style.color = '';
            this.log('警告: 未找到湿度数据', 'warning');
        }
    }

    getTemperatureColor(temp) {
        if (temp < 10) return '#63b3ed'; // 蓝色 - 冷
        if (temp < 25) return '#68d391'; // 绿色 - 舒适
        if (temp < 30) return '#f6ad55'; // 橙色 - 温暖
        return '#fc8181'; // 红色 - 热
    }

    getHumidityColor(humidity) {
        if (humidity < 30) return '#f6ad55'; // 橙色 - 干燥
        if (humidity < 70) return '#68d391'; // 绿色 - 舒适
        return '#63b3ed'; // 蓝色 - 潮湿
    }

    updateDataStreams(data) {
        // 更新温度数据流信息
        this.updateStreamElement(this.temperatureStream, 'bat_tem', data);
        
        // 更新湿度数据流信息
        this.updateStreamElement(this.humidityStream, 'Hum', data);
    }

    updateStreamElement(element, streamId, data) {
        const streamInfo = data ? data.datastreams[streamId] : null;
        
        const valueEl = element.querySelector('.stream-value');
        const timeEl = element.querySelector('.stream-time');
        const countEl = element.querySelector('.stream-count');
        const statusEl = element.querySelector('.stream-status');
        
        if (streamInfo && streamInfo.current_value !== null) {
            valueEl.textContent = streamInfo.current_value;
            timeEl.textContent = streamInfo.latest_update ? 
                new Date(streamInfo.latest_update).toLocaleString() : '--';
            countEl.textContent = streamInfo.total_points;
            statusEl.textContent = '🟢 正常';
            statusEl.style.background = '#c6f6d5';
            statusEl.style.color = '#22543d';
        } else {
            valueEl.textContent = '--';
            timeEl.textContent = '--';
            countEl.textContent = '--';
            statusEl.textContent = '🔴 无数据';
            statusEl.style.background = '#fed7d7';
            statusEl.style.color = '#742a2a';
        }
    }

    updateConnectionStatus(status, text) {
        this.connectionStatusElement.textContent = text;
        this.connectionStatusElement.className = `connection-status ${status}`;
    }

    updateTimestamp() {
        const now = new Date();
        this.updateTimeElement.textContent = now.toLocaleString();
    }

    updateFooterTime() {
        const now = new Date();
        this.footerTime.textContent = now.toLocaleDateString();
    }

    startAutoRefresh() {
        if (!this.currentDeviceId) {
            this.showNotification('请先输入设备ID', 'warning');
            return;
        }

        if (this.autoRefreshInterval) {
            this.stopAutoRefresh();
        }

        this.autoRefreshInterval = setInterval(() => {
            this.fetchDeviceData();
        }, 30000); // 30秒

        this.autoRefreshBtn.disabled = true;
        this.stopRefreshBtn.disabled = false;
        
        this.log('已开启自动刷新 (30秒间隔)', 'success');
        this.showNotification('已开启自动刷新', 'success');
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        this.autoRefreshBtn.disabled = false;
        this.stopRefreshBtn.disabled = true;
        
        this.log('已停止自动刷新', 'warning');
        this.showNotification('已停止自动刷新', 'warning');
    }

    async testConnection() {
        this.log('开始连接测试...');
        
        try {
            const response = await fetch('/api/test-connection');
            const result = await response.json();
            
            this.log(`连接测试结果: ${result.status}`, 'success');
            this.log(`API Key状态: ${result.apiKeyExists ? '已配置' : '未配置'}`);
            
            this.showNotification('连接测试完成', 'success');
        } catch (error) {
            this.log(`连接测试失败: ${error.message}`, 'error');
            this.showNotification('连接测试失败', 'error');
        }
    }

    setLoadingState(isLoading) {
        const elements = [this.fetchDataBtn, this.deviceIdInput];
        
        elements.forEach(element => {
            if (isLoading) {
                element.classList.add('loading');
                element.disabled = true;
            } else {
                element.classList.remove('loading');
                element.disabled = false;
            }
        });
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.debugOutput.appendChild(logEntry);
        this.logEntries.push({ timestamp: new Date(), message, type });
        
        // 自动滚动到底部
        this.debugOutput.scrollTop = this.debugOutput.scrollHeight;
    }

    clearLog() {
        this.debugOutput.innerHTML = '<div class="log-entry">=== 日志已清空 ===</div>';
        this.logEntries = [];
        this.log('日志已清空');
    }

    exportLog() {
        const logText = this.logEntries.map(entry => 
            `[${entry.timestamp.toISOString()}] ${entry.type.toUpperCase()}: ${entry.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weather-monitor-log-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.log('日志已导出');
    }

    showNotification(message, type = 'info') {
        // 创建临时通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        if (type === 'success') {
            notification.style.background = '#48bb78';
        } else if (type === 'error') {
            notification.style.background = '#f56565';
        } else if (type === 'warning') {
            notification.style.background = '#ed8936';
        } else {
            notification.style.background = '#667eea';
        }
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .metric-card {
            animation: fadeIn 0.6s ease-out;
        }
        
        .stream-item {
            animation: fadeIn 0.4s ease-out;
        }
    `;
    document.head.appendChild(style);
    
    // 初始化应用
    window.weatherMonitor = new WeatherMonitor();
    
    // 添加示例设备ID（可选）
    const deviceInput = document.getElementById('device-id-input');
    if (deviceInput && deviceInput.value === '') {
        deviceInput.placeholder = '例如: 1234567890';
    }
    
    console.log('温湿度监控平台已启动');
});