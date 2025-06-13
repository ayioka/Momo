document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const totalTransactionsEl = document.getElementById('total-transactions');
    const totalVolumeEl = document.getElementById('total-volume');
    const successfulEl = document.getElementById('successful-transactions');
    const failedEl = document.getElementById('failed-transactions');
    const transactionsBody = document.getElementById('transactions-table-body');
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const processBtn = document.getElementById('process-btn');
    const timeFilter = document.getElementById('time-filter');
    
    // Chart instances
    let volumeChart = null;
    let typeChart = null;
    
    // Initialize charts and data
    initTypeFilter();
    loadSummaryData();
    loadChartData();
    loadRecentTransactions();
    
    // Event listeners
    searchInput.addEventListener('input', filterTransactions);
    typeFilter.addEventListener('change', filterTransactions);
    processBtn.addEventListener('click', processData);
    timeFilter.addEventListener('change', loadChartData);
    
    // Add event listeners to chart period buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadChartData();
        });
    });
    
    // Process XML data
    function processData() {
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        processBtn.disabled = true;
        
        fetch('/api/process', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    // Refresh all data after processing
                    loadSummaryData();
                    loadChartData();
                    loadRecentTransactions();
                } else {
                    alert('Error processing data');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error processing data');
            })
            .finally(() => {
                processBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Process Data';
                processBtn.disabled = false;
            });
    }
    
    // Load summary statistics
    function loadSummaryData() {
        fetch('/api/summary')
            .then(response => response.json())
            .then(data => {
                totalTransactionsEl.textContent = data.total_transactions.toLocaleString();
                totalVolumeEl.textContent = `RWF ${(data.total_volume || 0).toLocaleString()}`;
                successfulEl.textContent = data.successful.toLocaleString();
                failedEl.textContent = data.failed.toLocaleString();
                
                // Calculate success rate
                const successRate = data.total_transactions > 0 ? 
                    Math.round((data.successful / data.total_transactions) * 100) : 100;
                document.getElementById('success-rate').textContent = `${successRate}% success rate`;
                
                // Calculate failure rate
                const failureRate = data.total_transactions > 0 ? 
                    Math.round((data.failed / data.total_transactions) * 100) : 0;
                document.getElementById('failure-rate').textContent = `${failureRate}% failure rate`;
            })
            .catch(error => console.error('Error loading summary data:', error));
    }
    
    // Load chart data
    function loadChartData() {
        // Get selected period
        const selectedPeriod = document.querySelector('.chart-btn.active')?.dataset.period || 'daily';
        
        // Load volume chart data
        fetch('/api/chart/volume')
            .then(response => response.json())
            .then(data => {
                renderVolumeChart(data.labels, data.data, selectedPeriod);
            });
        
        // Load type chart data
        fetch('/api/chart/types')
            .then(response => response.json())
            .then(data => {
                renderTypeChart(data.labels, data.counts);
            });
    }
    
    // Render volume chart
    function renderVolumeChart(labels, data, period = 'daily') {
        const ctx = document.getElementById('volumeChart').getContext('2d');
        
        // Destroy existing chart if exists
        if (volumeChart) {
            volumeChart.destroy();
        }
        
        volumeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Transaction Volume (RWF)',
                    data: data,
                    borderColor: '#ff7f00',
                    backgroundColor: 'rgba(255, 127, 0, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    pointBackgroundColor: '#ff7f00',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1000000) {
                                    return 'RWF ' + (value / 1000000).toFixed(1) + 'M';
                                } else if (value >= 1000) {
                                    return 'RWF ' + (value / 1000).toFixed(0) + 'K';
                                }
                                return 'RWF ' + value;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'RWF ' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Render type chart
    function renderTypeChart(labels, counts) {
        const ctx = document.getElementById('typeChart').getContext('2d');
        
        // Destroy existing chart if exists
        if (typeChart) {
            typeChart.destroy();
        }
        
        // Map transaction types to friendly names
        const typeNames = {
            'incoming_money': 'Incoming Money',
            'payment_code_holder': 'Payments',
            'transfer_mobile': 'Transfers',
            'bank_deposit': 'Bank Deposits',
            'airtime_payment': 'Airtime',
            'cash_power': 'Cash Power',
            'third_party': 'Third Party',
            'agent_withdrawal': 'Withdrawals',
            'bank_transfer': 'Bank Transfers',
            'bundle_purchase': 'Bundles'
        };
        
        const formattedLabels = labels.map(label => typeNames[label] || label);
        
        typeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: formattedLabels,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#8AC926', '#1982C4',
                        '#6A4C93', '#F15BB5'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Load recent transactions
    function loadRecentTransactions() {
        fetch('/api/transactions?per_page=5')
            .then(response => response.json())
            .then(data => {
                renderTransactions(data.transactions);
            })
            .catch(error => console.error('Error loading transactions:', error));
    }
    
    // Render transactions in table
    function renderTransactions(transactions) {
        transactionsBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(transaction[4]);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Get icon and color based on transaction type
            const typeInfo = getTypeInfo(transaction[2]);
            
            row.innerHTML = `
                <td>${transaction[1]}</td>
                <td>
                    <div class="transaction-type">
                        <div class="type-icon" style="background-color: ${typeInfo.color}">
                            <i class="${typeInfo.icon}"></i>
                        </div>
                        <span>${typeInfo.name}</span>
                    </div>
                </td>
                <td class="transaction-amount">RWF ${parseInt(transaction[3]).toLocaleString()}</td>
                <td>${formattedDate}</td>
                <td>
                    <span class="transaction-status status-completed">Completed</span>
                </td>
            `;
            
            transactionsBody.appendChild(row);
        });
    }
    
    // Map transaction types to UI elements
    function getTypeInfo(type) {
        const types = {
            'incoming_money': { name: 'Incoming Money', icon: 'fas fa-download', color: '#2ecc71' },
            'payment_code_holder': { name: 'Payment', icon: 'fas fa-money-bill-wave', color: '#9b59b6' },
            'transfer_mobile': { name: 'Transfer', icon: 'fas fa-exchange-alt', color: '#3498db' },
            'bank_deposit': { name: 'Bank Deposit', icon: 'fas fa-building', color: '#16a085' },
            'airtime_payment': { name: 'Airtime', icon: 'fas fa-phone-alt', color: '#f39c12' },
            'cash_power': { name: 'Cash Power', icon: 'fas fa-bolt', color: '#d35400' },
            'third_party': { name: 'Third Party', icon: 'fas fa-user-friends', color: '#7f8c8d' },
            'agent_withdrawal': { name: 'Withdrawal', icon: 'fas fa-upload', color: '#e74c3c' },
            'bank_transfer': { name: 'Bank Transfer', icon: 'fas fa-university', color: '#2980b9' },
            'bundle_purchase': { name: 'Bundle', icon: 'fas fa-wifi', color: '#8e44ad' }
        };
        
        return types[type] || { name: type, icon: 'fas fa-question-circle', color: '#95a5a6' };
    }
    
    // Initialize type filter dropdown
    function initTypeFilter() {
        const types = {
            'all': 'All Types',
            'incoming_money': 'Incoming Money',
            'payment_code_holder': 'Payments',
            'transfer_mobile': 'Transfers',
            'bank_deposit': 'Bank Deposits',
            'airtime_payment': 'Airtime',
            'cash_power': 'Cash Power',
            'third_party': 'Third Party',
            'agent_withdrawal': 'Withdrawals',
            'bank_transfer': 'Bank Transfers',
            'bundle_purchase': 'Bundles'
        };
        
        for (const [value, text] of Object.entries(types)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            typeFilter.appendChild(option);
        }
    }
    
    // Filter transactions based on search and type
    function filterTransactions() {
        const searchTerm = searchInput.value.toLowerCase();
        const typeValue = typeFilter.value;
        
        fetch('/api/transactions?per_page=100')
            .then(response => response.json())
            .then(data => {
                let filtered = data.transactions;
                
                // Filter by type
                if (typeValue !== 'all') {
                    filtered = filtered.filter(t => t[2] === typeValue);
                }
                
                // Filter by search term
                if (searchTerm) {
                    filtered = filtered.filter(t => 
                        t[1].toLowerCase().includes(searchTerm) ||
                        t[6].toLowerCase().includes(searchTerm) || // raw_message
                        t[3].toString().includes(searchTerm)
                    );
                }
                
                renderTransactions(filtered.slice(0, 10));
            });
    }
});
