class WeatherMonitor {
    constructor() {
        this.currentDeviceId = '';
        this.autoRefreshInterval = null;
        this.isConnected = false;
        this.lastData = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadDeviceList();
        this.updateFooterTime();
    }

    initializeElements() {
        // 控制元素
        this.deviceSelector = document.getElementById('device-selector');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.autoRefreshBtn = document.getElementById('auto-refresh-btn');
        this.stopRefreshBtn = document.getElementById('stop-refresh-btn');
        this.debugBtn = document.getElementById('debug-btn');
        
        // 显示元素
        this.updateTimeElement = document.getElementById('update-time');
        this.connectionStatusElement = document.getElementById('connection-status');
        this.temperatureValue = document.getElementById('temperature-value');
        this.humidityValue = document.getElementById('humidity-value');
        this.temperatureTrend = document.getElementById('temperature-trend');
        this.humidityTrend = document.getElementById('humidity-trend');
        this.debugOutput = document.getElementById('debug-output');
        this.streamsList = document.getElementById('streams-list');
        this.footerTime = document.getElementById('footer-time');
    }

    bindEvents() {
        this.deviceSelector.addEventListener('change', (e) => {
            this.currentDeviceId = e.target.value;
            if (this.currentDeviceId) {
                this.fetchDeviceData();
            }
        });

        this.refreshBtn.addEventListener('click', () => {
            this.loadDeviceList();
            if (this.currentDeviceId) {
                this.fetchDeviceData();
            }
        });

        this.autoRefreshBtn.addEventListener('click', () => {
            this.startAutoRefresh();
        });

        this.stopRefreshBtn.addEventListener('click', () => {
            this.stopAutoRefresh();
        });

        this.debugBtn.addEventListener('click', () => {
            this.diagnoseConnection();
        });

        // 每10分钟自动刷新一次设备列表
        setInterval(() => {
            this.loadDeviceList();
        }, 10 * 60 * 1000);
    }

    async loadDeviceList() {
        try {
            this.debugLog('正在加载设备列表...');
            
            // 这里应该是从API获取设备列表的逻辑
            // 暂时使用模拟数据
            const mockDevices = [
                { id: 'device_001', name: '实验室温湿度传感器' },
                { id: 'device_002', name: '办公室环境监测' }
            ];
            
            this.populateDeviceSelector(mockDevices);
            this.debugLog('设备列表加载完成');
            
        } catch (error) {
            this.debugLog(`加载设备列表失败: ${error.message}`);
        }
    }

    populateDeviceSelector(devices) {
        // 保存当前选中的设备
        const currentSelection = this.deviceSelector.value;
        
        // 清空选项（保留第一个提示选项）
        while (this.deviceSelector.options.length > 1) {
            this.deviceSelector.remove(1);
        }
        
        // 添加设备选项
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            this.deviceSelector.appendChild(option);
        });
        
        // 恢复之前的选中状态
        if (currentSelection) {
            this.deviceSelector.value = currentSelection;
        }
    }

    async fetchDeviceData() {
        if (!this.currentDeviceId) {
            this.debugLog('请先选择设备');
            return;
        }

        try {
            this.setLoadingState(true);
            this.debugLog(`正在获取设备 ${this.currentDeviceId} 的数据...`);

            const response = await fetch(`/api/onenet-proxy?device_id=${this.currentDeviceId}&limit=20`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            if (result.success) {
                this.handleDataSuccess(result.data);
            } else {
                throw new Error(result.error || '未知错误');
            }

        } catch (error) {
            this.handleDataError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    handleDataSuccess(data) {
        this.isConnected = true;
        this.lastData = data;
        
        this.updateConnectionStatus();
        this.updateSensorDisplay(data);
        this.updateDataStreams(data);
        this.updateTimestamp();
        
        this.debugLog('数据获取成功 ✓');
    }

    handleDataError(error) {
        this.isConnected = false;
        this.updateConnectionStatus();
        
        this.debugLog(`数据获取失败: ${error.message}`);
        
        // 显示错误状态
        this.temperatureValue.textContent = '--';
        this.humidityValue.textContent = '--';
        this.temperatureValue.style.color = '#f56565';
        this.humidityValue.style.color = '#f56565';
        
        setTimeout(() => {
            this.temperatureValue.style.color = '';
            this.humidityValue.style.color = '';
        }, 2000);
    }

    updateSensorDisplay(data) {
        if (!data.data || !data.data.datastreams) {
            this.debugLog('数据格式错误: 缺少 datastreams');
            return;
        }

        const streams = data.data.datastreams;
        
        // 查找温度数据流
        const tempStream = streams.find(ds => ds.id === 'bat_tem');
        if (tempStream && tempStream.datapoints && tempStream.datapoints.length > 0) {
            const latestTemp = tempStream.datapoints[0].value;
            this.temperatureValue.textContent = latestTemp;
            this.updateTrend(this.temperatureTrend, tempStream.datapoints);
        } else {
            this.temperatureValue.textContent = '--';
            this.debugLog('未找到温度数据流 bat_tem');
        }

        // 查找湿度数据流
        const humStream = streams.find(ds => ds.id === 'Hum');
        if (humStream && humStream.datapoints && humStream.datapoints.length > 0) {
            const latestHum = humStream.datapoints[0].value;
            this.humidityValue.textContent = latestHum;
            this.updateTrend(this.humidityTrend, humStream.datapoints);
        } else {
            this.humidityValue.textContent = '--';
            this.debugLog('未找到湿度数据流 Hum');
        }
    }

    updateTrend(trendElement, datapoints) {
        if (datapoints.length < 2) {
            trendElement.textContent = '→ 持平';
            trendElement.style.color = '#a0aec0';
            return;
        }

        const currentValue = parseFloat(datapoints[0].value);
        const previousValue = parseFloat(datapoints[1].value);
        const difference = currentValue - previousValue;

        if (Math.abs(difference) < 0.1) {
            trendElement.textContent = '→ 持平';
            trendElement.style.color = '#a0aec0';
        } else if (difference > 0) {
            trendElement.textContent = `↗ +${difference.toFixed(1)}`;
            trendElement.style.color = '#f56565';
        } else {
            trendElement.textContent = `↘ ${difference.toFixed(1)}`;
            trendElement.style.color = '#48bb78';
        }
    }

    updateDataStreams(data) {
        if (!data.data || !data.data.datastreams) return;

        const streams = data.data.datastreams;
        this.streamsList.innerHTML = '';

        streams.forEach(stream => {
            const streamElement = document.createElement('div');
            streamElement.className = 'stream-item';
            
            let streamContent = `
                <div class="stream-header">📊 ${stream.id} (${stream.datapoints?.length || 0} 个数据点)</div>
            `;

            if (stream.datapoints && stream.datapoints.length > 0) {
                stream.datapoints.slice(0, 5).forEach((point, index) => {
                    const time = new Date(point.at).toLocaleString();
                    streamContent += `
                        <div class="data-point">
                            <span>${time}</span>
                            <span><strong>${point.value}</strong></span>
                        </div>
                    `;
                });
                
                if (stream.datapoints.length > 5) {
                    streamContent += `<div style="text-align: center; color: #718096;">... 还有 ${stream.datapoints.length - 5} 个数据点</div>`;
                }
            } else {
                streamContent += `<div style="color: #718096;">暂无数据</div>`;
            }

            streamElement.innerHTML = streamContent;
            this.streamsList.appendChild(streamElement);
        });
    }

    updateConnectionStatus() {
        if (this.isConnected) {
            this.connectionStatusElement.textContent = '🟢 已连接';
            this.connectionStatusElement.className = 'connection-status connected';
        } else {
            this.connectionStatusElement.textContent = '🔴 未连接';
            this.connectionStatusElement.className = 'connection-status disconnected';
        }
    }

    updateTimestamp() {
        const now = new Date();
        this.updateTimeElement.textContent = now.toLocaleString();
    }

    updateFooterTime() {
        const now = new Date();
        this.footerTime.textContent = now.toLocaleDateString();
        
        // 每天更新一次
        setInterval(() => {
            const newDate = new Date();
            this.footerTime.textContent = newDate.toLocaleDateString();
        }, 24 * 60 * 60 * 1000);
    }

    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            this.stopAutoRefresh();
        }

        if (!this.currentDeviceId) {
            this.debugLog('请先选择设备');
            return;
        }

        this.autoRefreshInterval = setInterval(() => {
            this.fetchDeviceData();
        }, 10000); // 10秒

        this.autoRefreshBtn.disabled = true;
        this.stopRefreshBtn.disabled = false;
        this.debugLog('已开启自动刷新 (10秒间隔)');
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        this.autoRefreshBtn.disabled = false;
        this.stopRefreshBtn.disabled = true;
        this.debugLog('已停止自动刷新');
    }

    setLoadingState(isLoading) {
        const elements = [this.refreshBtn, this.deviceSelector];
        
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

    async diagnoseConnection() {
        this.debugOutput.innerHTML = '=== 开始诊断连接问题 ===\n';
        
        try {
            this.debugLog('1. 测试环境变量配置...');
            const testResponse = await fetch('/api/test-connection');
            const testResult = await testResponse.json();
            
            this.debugLog(`   环境变量状态: ${testResult.environment.apiKeyExists ? '✓ 已配置' : '✗ 未配置'}`);
            this.debugLog(`   API Key长度: ${testResult.environment.apiKeyLength}`);
            
            if (this.currentDeviceId) {
                this.debugLog('2. 测试设备数据获取...');
                await this.fetchDeviceData();
            } else {
                this.debugLog('2. 跳过设备测试: 未选择设备');
            }
            
            this.debugLog('=== 诊断完成 ===');
        } catch (error) {
            this.debugLog(`诊断失败: ${error.message}`);
        }
    }

    debugLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        this