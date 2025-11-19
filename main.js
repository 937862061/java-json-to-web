// 数据展示工具主要逻辑
class DataVisualizer {
    constructor() {
        this.currentData = [];
        this.currentHeaders = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.filteredData = [];
        this.fieldMapping = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initAnimations();
        this.loadExampleData();
    }

    bindEvents() {
        // 主要按钮事件
        document.getElementById('parseBtn').addEventListener('click', () => this.parseData());
        document.getElementById('exampleBtn').addEventListener('click', () => this.loadExampleData());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('exportCSVBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportExcelBtn').addEventListener('click', () => this.exportToExcel());
        
        // 搜索功能
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // 分页功能
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));
        
        // 输入框实时验证
        document.getElementById('javaInput').addEventListener('input', () => this.validateJavaInput());
        document.getElementById('jsonInput').addEventListener('input', () => this.validateJsonInput());
    }

    initAnimations() {
        // 页面加载动画
        anime({
            targets: '.animate-fade-in',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 800,
            delay: anime.stagger(200),
            easing: 'easeOutQuart'
        });

        anime({
            targets: '.animate-slide-in',
            opacity: [0, 1],
            translateX: [-30, 0],
            duration: 1000,
            delay: anime.stagger(300),
            easing: 'easeOutQuart'
        });
    }

    validateJavaInput() {
        const javaInput = document.getElementById('javaInput').value.trim();
        const statusElement = document.getElementById('javaStatus');
        
        if (!javaInput) {
            this.updateStatus(statusElement, 'waiting', '等待输入Java类代码');
            return false;
        }
        
        if (this.extractJavaFields(javaInput).length > 0) {
            this.updateStatus(statusElement, 'success', `找到 ${this.extractJavaFields(javaInput).length} 个字段`);
            return true;
        } else {
            this.updateStatus(statusElement, 'warning', '未找到有效的字段定义');
            return false;
        }
    }

    validateJsonInput() {
        const jsonInput = document.getElementById('jsonInput').value.trim();
        const statusElement = document.getElementById('jsonStatus');
        
        if (!jsonInput) {
            this.updateStatus(statusElement, 'waiting', '等待输入JSON数据');
            return false;
        }
        
        try {
            const data = JSON.parse(jsonInput);
            if (Array.isArray(data)) {
                this.updateStatus(statusElement, 'success', `包含 ${data.length} 条记录`);
                return true;
            } else {
                this.updateStatus(statusElement, 'warning', 'JSON数据应为数组格式');
                return false;
            }
        } catch (e) {
            this.updateStatus(statusElement, 'error', 'JSON格式错误');
            return false;
        }
    }

    updateStatus(element, type, message) {
        const indicator = element.previousElementSibling.querySelector('.status-indicator');
        
        // 移除所有状态类
        indicator.classList.remove('status-success', 'status-warning', 'status-error');
        
        // 添加新状态类
        if (type === 'success') {
            indicator.classList.add('status-success');
        } else if (type === 'warning') {
            indicator.classList.add('status-warning');
        } else if (type === 'error') {
            indicator.classList.add('status-error');
        }
        
        element.textContent = message;
    }

    extractJavaFields(javaCode) {
        const fields = [];
        
        // 匹配带注释的字段定义
        const commentPattern = /\/\*\*[\s\S]*?\*\/[\s\S]*?private\s+(\w+)\s+(\w+);/g;
        let match;
        
        while ((match = commentPattern.exec(javaCode)) !== null) {
            const commentBlock = match[0];
            const fieldName = match[2];
            
            // 提取注释内容
            const commentLines = commentBlock.match(/\*\s*([^*\n]+)/g) || [];
            let comment = commentLines
                .map(line => line.replace(/^\*\s*/, '').trim())
                .filter(line => line && !line.startsWith('@'))
                .join(' ')
                .trim();
            
            // 移除括号及括号内的内容
            comment = comment.replace(/[\(\（][^\)\）]*[\)\）]/g, '').trim();
            
            // 去除末尾的斜杠
            comment = comment.replace(/[\/\\]+$/, '').trim();
            
            if (comment) {
                fields.push({
                    name: fieldName,
                    comment: comment,
                    type: match[1]
                });
            }
        }
        
        // 如果没有找到带注释的字段，尝试匹配简单字段定义
        if (fields.length === 0) {
            const simpleFieldPattern = /private\s+(\w+)\s+(\w+);/g;
            while ((match = simpleFieldPattern.exec(javaCode)) !== null) {
                fields.push({
                    name: match[2],
                    comment: match[2], // 使用字段名作为注释
                    type: match[1]
                });
            }
        }
        
        return fields;
    }

    parseData() {
        const javaInput = document.getElementById('javaInput').value.trim();
        const jsonInput = document.getElementById('jsonInput').value.trim();
        
        if (!javaInput || !jsonInput) {
            this.showError('请填写Java类代码和JSON数据');
            return;
        }
        
        this.showLoading(true);
        
        setTimeout(() => {
            try {
                // 提取Java字段
                const javaFields = this.extractJavaFields(javaInput);
                if (javaFields.length === 0) {
                    throw new Error('未找到有效的Java字段定义');
                }
                
                // 解析JSON数据
                const jsonData = JSON.parse(jsonInput);
                if (!Array.isArray(jsonData)) {
                    throw new Error('JSON数据必须是数组格式');
                }
                
                // 创建字段映射
                this.fieldMapping = {};
                javaFields.forEach(field => {
                    this.fieldMapping[field.name] = field.comment;
                });
                
                // 设置表头
                this.currentHeaders = javaFields.map(field => ({
                    key: field.name,
                    label: field.comment || field.name
                }));
                
                // 设置数据
                this.currentData = jsonData;
                this.filteredData = [...this.currentData];
                this.currentPage = 1;
                
                // 显示字段映射
                this.showFieldMapping();
                
                // 显示数据表格
                this.renderTable();
                
                // 更新统计信息
                this.updateStatistics();
                
                this.showLoading(false);
                
                // 成功动画
                anime({
                    targets: '#tableContainer',
                    opacity: [0, 1],
                    scale: [0.9, 1],
                    duration: 600,
                    easing: 'easeOutQuart'
                });
                
            } catch (error) {
                this.showLoading(false);
                this.showError(error.message);
            }
        }, 500);
    }

    showFieldMapping() {
        const mappingContainer = document.getElementById('fieldMapping');
        const mappingList = document.getElementById('mappingList');
        
        mappingList.innerHTML = '';
        
        Object.entries(this.fieldMapping).forEach(([field, comment]) => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 bg-gray-50 rounded text-sm';
            item.innerHTML = `
                <span class="font-mono text-blue-600">${field}</span>
                <span class="text-gray-600">${comment}</span>
            `;
            mappingList.appendChild(item);
        });
        
        mappingContainer.classList.remove('hidden');
        
        anime({
            targets: mappingContainer,
            opacity: [0, 1],
            height: [0, 'auto'],
            duration: 400,
            easing: 'easeOutQuart'
        });
    }

    renderTable() {
        const tableContainer = document.getElementById('tableContainer');
        const emptyState = document.getElementById('emptyState');
        const errorState = document.getElementById('errorState');
        const dataTable = document.getElementById('dataTable');
        const statistics = document.getElementById('statistics');
        
        // 隐藏状态界面
        emptyState.classList.add('hidden');
        errorState.classList.add('hidden');
        
        // 显示表格和统计
        tableContainer.classList.remove('hidden');
        statistics.classList.remove('hidden');
        
        // 计算合适的列宽度
        const baseWidth = Math.max(120, Math.min(180, Math.floor(1000 / (this.currentHeaders.length + 1))));
        
        // 生成表头
        const thead = dataTable.querySelector('thead');
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-3 text-center font-medium text-gray-700 bg-gray-50 border-b" style="width: 60px; min-width: 60px;">#</th>
                ${this.currentHeaders.map(header => `
                    <th class="px-4 py-3 text-left font-medium text-gray-700 bg-gray-50 border-b cursor-pointer hover:bg-gray-100" 
                        onclick="dataVisualizer.sortBy('${header.key}')" 
                        style="min-width: ${baseWidth}px; max-width: ${baseWidth + 40}px;">
                        <div class="flex items-start justify-between">
                            <span class="flex-1">${header.label}</span>
                            <span class="ml-2 text-gray-400 text-xs mt-1">↕</span>
                        </div>
                    </th>
                `).join('')}
            </tr>
        `;
        
        // 生成分页数据
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        // 生成表格内容
        const tbody = dataTable.querySelector('tbody');
        tbody.innerHTML = pageData.map((row, index) => `
            <tr class="hover:bg-gray-50 border-b">
                <td class="px-4 py-3 text-gray-600 text-center" style="width: 60px;">${startIndex + index + 1}</td>
                ${this.currentHeaders.map(header => `
                    <td class="px-4 py-3 text-gray-800" style="min-width: ${baseWidth}px; max-width: ${baseWidth + 40}px;">
                        ${this.formatCellValue(row[header.key])}
                    </td>
                `).join('')}
            </tr>
        `).join('');
        
        // 更新分页
        this.updatePagination();
    }

    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '<span class="text-gray-400 italic">null</span>';
        }
        
        if (typeof value === 'boolean') {
            return value ? 
                '<span class="text-green-600 font-medium">true</span>' : 
                '<span class="text-red-600 font-medium">false</span>';
        }
        
        if (typeof value === 'number') {
            return `<span class="text-blue-600 font-mono">${value}</span>`;
        }
        
        if (typeof value === 'string') {
            // 高亮搜索匹配
            const searchTerm = document.getElementById('searchInput').value.trim();
            if (searchTerm && value.toLowerCase().includes(searchTerm.toLowerCase())) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                return `<span class="font-mono">${value.replace(regex, '<span class="highlight-match">$1</span>')}</span>`;
            }
            return `<span class="font-mono">${value}</span>`;
        }
        
        return `<span class="font-mono">${JSON.stringify(value)}</span>`;
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        
        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }
        
        pagination.classList.remove('hidden');
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
        
        document.getElementById('pageStart').textContent = startIndex + 1;
        document.getElementById('pageEnd').textContent = endIndex;
        document.getElementById('totalCount').textContent = this.filteredData.length;
        document.getElementById('currentPage').textContent = this.currentPage;
        
        // 更新按钮状态
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
            
            // 滚动到表格顶部
            document.querySelector('.table-container').scrollTop = 0;
        }
    }

    sortBy(field) {
        const isNumeric = this.filteredData.every(row => 
            row[field] === null || row[field] === undefined || 
            typeof row[field] === 'number'
        );
        
        this.filteredData.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (aVal === null || aVal === undefined) aVal = isNumeric ? -Infinity : '';
            if (bVal === null || bVal === undefined) bVal = isNumeric ? -Infinity : '';
            
            if (isNumeric) {
                return Number(aVal) - Number(bVal);
            } else {
                return String(aVal).localeCompare(String(bVal));
            }
        });
        
        this.currentPage = 1;
        this.renderTable();
    }

    handleSearch(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredData = [...this.currentData];
        } else {
            this.filteredData = this.currentData.filter(row => {
                return Object.values(row).some(value => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(searchTerm.toLowerCase());
                });
            });
        }
        
        this.currentPage = 1;
        this.renderTable();
        this.updateStatistics();
    }

    updateStatistics() {
        const totalRecords = this.filteredData.length;
        const totalFields = this.currentHeaders.length;
        
        // 计算空值数量
        let emptyValues = 0;
        this.filteredData.forEach(row => {
            Object.values(row).forEach(value => {
                if (value === null || value === undefined || value === '') {
                    emptyValues++;
                }
            });
        });
        
        // 计算唯一值数量（基于第一个字段）
        const firstField = this.currentHeaders[0]?.key;
        const uniqueValues = firstField ? 
            new Set(this.filteredData.map(row => row[firstField]).filter(v => v !== null && v !== undefined)).size : 0;
        
        document.getElementById('totalRecords').textContent = totalRecords;
        document.getElementById('totalFields').textContent = totalFields;
        document.getElementById('emptyValues').textContent = emptyValues;
        document.getElementById('uniqueValues').textContent = uniqueValues;
        
        // 统计卡片动画
        anime({
            targets: '#statistics .bg-blue-50, #statistics .bg-green-50, #statistics .bg-yellow-50, #statistics .bg-purple-50',
            scale: [0.8, 1],
            opacity: [0, 1],
            duration: 600,
            delay: anime.stagger(100),
            easing: 'easeOutQuart'
        });
    }

    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert('没有数据可以导出');
            return;
        }
        
        const headers = this.currentHeaders.map(h => h.label).join(',');
        const rows = this.filteredData.map(row => {
            return this.currentHeaders.map(header => {
                const value = row[header.key];
                if (value === null || value === undefined) return '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });
        
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `data_export_${new Date().getTime()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    exportToExcel() {
        if (this.filteredData.length === 0) {
            alert('没有数据可以导出');
            return;
        }
        
        try {
            // 创建工作簿
            const workbook = XLSX.utils.book_new();
            
            // 准备表头
            const headers = this.currentHeaders.map(h => h.label);
            
            // 准备数据
            const data = this.filteredData.map(row => {
                return this.currentHeaders.map(header => {
                    const value = row[header.key];
                    if (value === null || value === undefined) return '';
                    return value;
                });
            });
            
            // 合并表头和数据
            const excelData = [headers, ...data];
            
            // 创建工作表
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            
            // 设置列宽
            const colWidths = this.currentHeaders.map(header => ({
                width: Math.max(header.label.length * 2, 15)
            }));
            worksheet['!cols'] = colWidths;
            
            // 添加工作表到工作簿
            XLSX.utils.book_append_sheet(workbook, worksheet, '数据表');
            
            // 导出Excel文件
            const fileName = `data_export_${new Date().getTime()}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
        } catch (error) {
            console.error('Excel导出失败:', error);
            alert('Excel导出失败，请检查数据格式');
        }
    }

    loadExampleData() {
        // 示例Java类
        const exampleJava = `/**
 * 用户实体类
 */
public class User {
    /**
     * 用户ID
     */
    private Long userId;
    
    /**
     * 用户名
     */
    private String username;
    
    /**
     * 邮箱地址
     */
    private String email;
    
    /**
     * 年龄
     */
    private Integer age;
    
    /**
     * 是否激活
     */
    private Boolean active;
    
    /**
     * 创建时间
     */
    private Date createTime;
}`;

        // 示例JSON数据
        const exampleJson = `[
    {
        "userId": 1,
        "username": "张三",
        "email": "zhangsan@example.com",
        "age": 28,
        "active": true,
        "createTime": "2024-01-15 10:30:00"
    },
    {
        "userId": 2,
        "username": "李四",
        "email": "lisi@example.com",
        "age": 35,
        "active": false,
        "createTime": "2024-01-16 14:20:00"
    },
    {
        "userId": 3,
        "username": "王五",
        "email": "wangwu@example.com",
        "age": null,
        "active": true,
        "createTime": "2024-01-17 09:15:00"
    },
    {
        "userId": 4,
        "username": "赵六",
        "email": "zhaoliu@example.com",
        "age": 42,
        "active": true,
        "createTime": null
    },
    {
        "userId": 5,
        "username": "孙七",
        "email": "sunqi@example.com",
        "age": 31,
        "active": false,
        "createTime": "2024-01-19 16:45:00"
    },
    {
        "userId": 6,
        "username": "周八",
        "email": "zhouba@example.com",
        "age": 29,
        "active": true,
        "createTime": "2024-01-20 11:30:00"
    },
    {
        "userId": 7,
        "username": "吴九",
        "email": "wujiu@example.com",
        "age": 38,
        "active": null,
        "createTime": "2024-01-21 13:20:00"
    },
    {
        "userId": 8,
        "username": "郑十",
        "email": "zhengshi@example.com",
        "age": 26,
        "active": true,
        "createTime": "2024-01-22 15:10:00"
    },
    {
        "userId": 9,
        "username": "钱十一",
        "email": "qianshiyi@example.com",
        "age": 33,
        "active": false,
        "createTime": "2024-01-23 08:50:00"
    },
    {
        "userId": 10,
        "username": "孙十二",
        "email": "sunshier@example.com",
        "age": 27,
        "active": true,
        "createTime": "2024-01-24 12:00:00"
    }
]`;

        document.getElementById('javaInput').value = exampleJava;
        document.getElementById('jsonInput').value = exampleJson;
        
        // 验证输入
        this.validateJavaInput();
        this.validateJsonInput();
        
        // 自动解析
        setTimeout(() => {
            this.parseData();
        }, 500);
    }

    clearAll() {
        document.getElementById('javaInput').value = '';
        document.getElementById('jsonInput').value = '';
        document.getElementById('searchInput').value = '';
        
        // 重置状态
        this.updateStatus(document.getElementById('javaStatus'), 'waiting', '等待输入Java类代码');
        this.updateStatus(document.getElementById('jsonStatus'), 'waiting', '等待输入JSON数据');
        
        // 隐藏所有输出区域
        document.getElementById('fieldMapping').classList.add('hidden');
        document.getElementById('tableContainer').classList.add('hidden');
        document.getElementById('statistics').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');
        
        // 显示空状态
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('errorState').classList.add('hidden');
        
        // 重置数据
        this.currentData = [];
        this.filteredData = [];
        this.currentHeaders = [];
        this.fieldMapping = {};
        this.currentPage = 1;
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    showError(message) {
        const errorState = document.getElementById('errorState');
        const errorMessage = document.getElementById('errorMessage');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('tableContainer');
        const statistics = document.getElementById('statistics');
        
        emptyState.classList.add('hidden');
        tableContainer.classList.add('hidden');
        statistics.classList.add('hidden');
        
        errorMessage.textContent = message;
        errorState.classList.remove('hidden');
        
        anime({
            targets: errorState,
            opacity: [0, 1],
            scale: [0.9, 1],
            duration: 400,
            easing: 'easeOutQuart'
        });
    }
}

// 初始化应用
let dataVisualizer;
document.addEventListener('DOMContentLoaded', () => {
    dataVisualizer = new DataVisualizer();
});

// 全局函数供HTML调用
window.dataVisualizer = dataVisualizer;