// 1. 初始化 Supabase 客户端
// 注意：将 YOUR_PROJECT_URL 和 YOUR_ANON_KEY 替换为第一步中你保存的真实值！
const supabaseUrl = 'https://zghzjlgnokvrvefbfipw.supabase.co'; // 例如：https://xyzabc.supabase.co
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnaHpqbGdub2t2cnZlZmJmaXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MDc0ODAsImV4cCI6MjA3OTQ4MzQ4MH0.Iqlj-t7DLAc1RxOmnB3JPaUzIWJFiAsbLckLFp8KGCc';    // 例如：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM 元素
const temperatureElement = document.getElementById('temperatureValue');
const humidityElement = document.getElementById('humidityValue');
const lastUpdateElement = document.getElementById('lastUpdate');
const tableBody = document.querySelector('#dataTable tbody');

// 2. 函数：获取最新的一条数据并更新页面
async function fetchLatestData() {
    // 从`sensor_data`表中查询，按创建时间倒序，取第一条（即最新的）
    const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('获取数据出错:', error);
    } else if (data && data.length > 0) {
        const latest = data[0];
        updateDisplay(latest);
    }
}

// 3. 函数：更新页面显示
function updateDisplay(record) {
    temperatureElement.textContent = record.temperature.toFixed(1); // 保留一位小数
    humidityElement.textContent = record.humidity.toFixed(1);
    
    const updateTime = new Date(record.created_at).toLocaleString('zh-CN');
    lastUpdateElement.textContent = updateTime;
}

// 4. 函数：获取历史记录列表
async function fetchHistory() {
    // 获取最新的10条记录，按时间倒序排列
    const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('获取历史记录出错:', error);
    } else {
        updateHistoryTable(data);
    }
}

// 5. 函数：更新历史记录表格
function updateHistoryTable(records) {
    // 清空现有表格内容
    tableBody.innerHTML = '';
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.textContent = new Date(record.created_at).toLocaleString('zh-CN');
        
        const deviceCell = document.createElement('td');
        deviceCell.textContent = record.device_id;
        
        const tempCell = document.createElement('td');
        tempCell.textContent = record.temperature.toFixed(1);
        
        const humidityCell = document.createElement('td');
        humidityCell.textContent = record.humidity.toFixed(1);
        
        row.appendChild(timeCell);
        row.appendChild(deviceCell);
        row.appendChild(tempCell);
        row.appendChild(humidityCell);
        
        tableBody.appendChild(row);
    });
}

// 6. 设置实时订阅（这是实现“同步”的魔法！）
// 当sensor_data表有新的INSERT操作时，会自动触发这个订阅
const subscription = supabase
    .channel('sensor-changes') // 频道名称，可以任意取
    .on(
        'postgres_changes',
        {
            event: 'INSERT', // 只监听“插入”事件
            schema: 'public',
            table: 'sensor_data'
        },
        (payload) => {
            // 当有新的数据插入时，这个回调函数会被执行
            console.log('收到新数据!', payload);
            // 立即更新最新数据显示
            updateDisplay(payload.new);
            // 重新获取一下历史记录列表（为了简单，也可以优化为只插入一行）
            fetchHistory();
        }
    )
    .subscribe();

// 7. 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 先获取一次最新数据和历史记录
    fetchLatestData();
    fetchHistory();
    
    // 可以设置一个定时器，每隔一段时间主动获取一次（作为实时订阅的备用方案）
    // setInterval(fetchLatestData, 30000); // 每30秒
});

// 8. 提供一个手动插入测试数据的函数（仅用于测试！）
// 你可以在浏览器控制台里运行 `window.insertTestData()` 来测试
window.insertTestData = async function() {
    const testData = {
        temperature: (Math.random() * 30 + 10).toFixed(1), // 10-40之间的随机数
        humidity: (Math.random() * 50 + 30).toFixed(1),    // 30-80之间的随机数
        device_id: 'test_device_01'
    };
    
    const { data, error } = await supabase
        .from('sensor_data')
        .insert([testData]);
        
    if (error) {
        console.error('插入测试数据失败:', error);
    } else {
        console.log('测试数据插入成功:', data);
    }
};