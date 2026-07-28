/**
 * Dashboard Page - Executive dashboard with KPIs, charts, and real-time updates
 */

import client from '../api/client.js';
import { getWebSocketService } from '../services/websocket.js';
import { getNotificationManager } from '../components/notifications.js';
import * as dateTimeUtils from '../utils/datetime.js';

class DashboardPage {
    constructor() {
        this.data = {};
        this.charts = {};
        this.wsService = getWebSocketService();
        this.notifications = getNotificationManager();
        this.kpiUpdateInterval = null;
    }

    async render(container) {
        container.innerHTML = this.getTemplate();
        
        try {
            // Load all data in parallel
            await Promise.all([
                this.loadKPIData(),
                this.loadChartData(),
                this.loadPerformanceTable()
            ]);

            // Subscribe to WebSocket updates
            this.subscribeToUpdates();
        } catch (error) {
            console.error('Dashboard error:', error);
            this.notifications.error('Failed to load dashboard data');
        }
    }

    getTemplate() {
        return `
            <div class="dashboard-page">
                <!-- KPI Grid -->
                <div class="grid grid-4 mb-3" id="kpiGrid">
                    ${Array(5).fill(0).map(() => '<div class="card loading-skeleton" style="height: 150px;"></div>').join('')}
                </div>

                <!-- Charts Row -->
                <div class="grid grid-2 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">District Performance</h3>
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="districtChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Registration Trend</h3>
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="trendChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Progress Indicators -->
                <div class="grid grid-3 mb-3">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Overall Progress</h3>
                        </div>
                        <div class="card-body">
                            <div class="progress" style="height: 20px; margin: 20px 0;">
                                <div class="progress-bar" id="overallProgressBar" style="width: 0%; transition: width 0.5s ease;"></div>
                            </div>
                            <div class="text-center" id="overallProgressText">0%</div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">District Progress</h3>
                        </div>
                        <div class="card-body">
                            <div id="districtProgress"></div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Location Progress</h3>
                        </div>
                        <div class="card-body">
                            <div id="locationProgress"></div>
                        </div>
                    </div>
                </div>

                <!-- Performance Table -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Regional Performance</h3>
                    </div>
                    <div class="card-body">
                        <div id="performanceTable"></div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadKPIData() {
        try {
            const response = await client.get('/dashboard/kpis');
            const kpis = response.data.data;
            this.data.kpis = kpis;
            this.renderKPICards(kpis);
        } catch (error) {
            console.error('Failed to load KPI data:', error);
            throw error;
        }
    }

    renderKPICards(kpis) {
        const kpiGrid = document.getElementById('kpiGrid');
        if (!kpiGrid) return;

        const cards = [
            { label: 'National IDs Not Registered', value: kpis.remaining_ids || 0, key: 'remaining_ids', icon: '📋' },
            { label: 'Registered Voters', value: kpis.registered_count || 0, key: 'registered_count', icon: '✅' },
            { label: "Today's Target", value: kpis.todays_target || 0, key: 'todays_target', icon: '🎯' },
            { label: "Today's Progress", value: kpis.todays_progress || 0, key: 'todays_progress', icon: '📊' },
            { label: 'Overall Progress', value: `${Math.round((kpis.overall_progress || 0) * 100)}%`, key: 'overall_progress', icon: '📈' }
        ];

        kpiGrid.innerHTML = cards.map(card => `
            <div class="kpi-card" data-key="${card.key}">
                <div class="kpi-label">${card.label}</div>
                <div class="kpi-value" id="kpi-${card.key}">
                    ${typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                </div>
                <div class="kpi-subtext">Real-time data</div>
            </div>
        `).join('');
    }

    async loadChartData() {
        try {
            const [districtRes, trendRes] = await Promise.all([
                client.get('/dashboard/district-performance'),
                client.get('/dashboard/registration-trend')
            ]);

            this.data.districtPerformance = districtRes.data.data;
            this.data.registrationTrend = trendRes.data.data;

            this.renderCharts();
        } catch (error) {
            console.error('Failed to load chart data:', error);
            throw error;
        }
    }

    renderCharts() {
        this.renderDistrictChart();
        this.renderTrendChart();
    }

    renderDistrictChart() {
        const data = this.data.districtPerformance || [];
        const ctx = document.getElementById('districtChart');
        if (!ctx) return;

        if (this.charts.district) {
            this.charts.district.destroy();
        }

        this.charts.district = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.name || d.district_name),
                datasets: [
                    {
                        label: 'Registered',
                        data: data.map(d => d.registered_count || d.registered),
                        backgroundColor: '#0066cc'
                    },
                    {
                        label: 'Remaining NIDs',
                        data: data.map(d => d.remaining_count || d.remaining),
                        backgroundColor: '#f9a825'
                    },
                    {
                        label: "Today's Target",
                        data: data.map(d => d.todays_target || 0),
                        backgroundColor: '#dc3545'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: true, stacked: false }
                }
            }
        });
    }

    renderTrendChart() {
        const data = this.data.registrationTrend || [];
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [
                    {
                        label: 'Daily Registrations',
                        data: data.map(d => d.daily_registered || 0),
                        borderColor: '#0066cc',
                        backgroundColor: 'rgba(0, 102, 204, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4
                    },
                    {
                        label: 'Expected Progress',
                        data: data.map(d => d.expected_progress || 0),
                        borderColor: '#f9a825',
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    async loadPerformanceTable() {
        try {
            const response = await client.get('/dashboard/performance-table?page=1&page_size=20');
            const tableData = response.data.data;
            this.data.performanceTable = tableData;
            this.renderPerformanceTable(tableData);
        } catch (error) {
            console.error('Failed to load performance table:', error);
            throw error;
        }
    }

    renderPerformanceTable(data) {
        const container = document.getElementById('performanceTable');
        if (!container || !data || data.length === 0) return;

        let html = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>District</th>
                            <th>Division</th>
                            <th>Location</th>
                            <th>Adult Population</th>
                            <th>Registered</th>
                            <th>Remaining IDs</th>
                            <th>Today's Target</th>
                            <th>Progress %</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(row => {
            const progress = row.progress_percent || 0;
            const progressClass = progress < 25 ? 'danger' : progress < 50 ? 'below-target' : progress < 80 ? 'on-track' : 'exceeding';
            
            html += `
                <tr>
                    <td>${row.district_name || '-'}</td>
                    <td>${row.division_name || '-'}</td>
                    <td>${row.location_name || '-'}</td>
                    <td>${(row.adult_population || 0).toLocaleString()}</td>
                    <td>${(row.registered_count || 0).toLocaleString()}</td>
                    <td>${(row.remaining_count || 0).toLocaleString()}</td>
                    <td>${(row.todays_target || 0).toLocaleString()}</td>
                    <td>
                        <div class="progress-bar-container">
                            <div class="progress">
                                <div class="progress-bar ${progressClass}" style="width: ${progress}%; transition: width 0.3s ease;"></div>
                            </div>
                            <span>${progress.toFixed(1)}%</span>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    subscribeToUpdates() {
        // Subscribe to KPI updates
        this.wsService.subscribe('kpi_update', (data) => {
            this.data.kpis = { ...this.data.kpis, ...data };
            this.updateKPIDisplay(data);
        });

        // Subscribe to registration updates
        this.wsService.subscribe('registration_update', (data) => {
            this.notifications.success(`${data.count || 1} new registration(s) recorded`);
            this.loadKPIData();
            this.loadChartData();
            this.loadPerformanceTable();
        });

        // Subscribe to performance updates
        this.wsService.subscribe('performance_update', (data) => {
            this.loadChartData();
            this.loadPerformanceTable();
        });
    }

    updateKPIDisplay(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            const element = document.getElementById(`kpi-${key}`);
            if (element) {
                const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                element.textContent = displayValue;
                
                // Animate update
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }

    destroy() {
        // Cleanup chart instances
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        // Unsubscribe from WebSocket events
        this.wsService.unsubscribe('kpi_update', () => {});
        this.wsService.unsubscribe('registration_update', () => {});
        this.wsService.unsubscribe('performance_update', () => {});
    }
}

export { DashboardPage };
