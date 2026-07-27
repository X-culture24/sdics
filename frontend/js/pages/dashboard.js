/**
 * Dashboard Page
 * Displays KPIs, charts, and performance data
 */

import { dashboardService } from '../api/dashboard.js';
import { formatNumber, formatPercentage, getPerformanceStatus } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

let charts = {};
// Chart.js is loaded from CDN in the HTML

export async function initDashboardPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-5">
                <h1 class="h2">Dashboard</h1>
                <p class="text-muted">Campaign Performance Overview</p>
            </div>

            <!-- KPI Cards -->
            <div class="row mb-4" id="kpiRow">
                <div class="col-12">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading KPIs...</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row mb-4">
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Registration Trend</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="trendChart" class="chart-canvas" style="max-height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Campaign Progress</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="gaugeChart" class="chart-canvas" style="max-height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- District Performance -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">District Performance</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="districtChart" class="chart-canvas" style="max-height: 350px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Performance Table -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Regional Performance</h5>
                        </div>
                        <div class="card-body">
                            <div id="performanceTableContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>District</th>
                                            <th>Adult Population</th>
                                            <th>Registered</th>
                                            <th>Unregistered</th>
                                            <th>Today's Target</th>
                                            <th>Progress</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="performanceTableBody">
                                        <tr>
                                            <td colspan="7" class="text-center py-4">
                                                <div class="spinner-border text-primary spinner-border-sm" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load data
    try {
        const [kpis, trend, district, table] = await Promise.all([
            dashboardService.getKPIs().catch(() => ({})),
            dashboardService.getRegistrationTrend(30).catch(() => []),
            dashboardService.getDistrictPerformance().catch(() => []),
            dashboardService.getPerformanceTable(3).catch(() => [])
        ]);

        renderKPIs(kpis);
        renderTrendChart(trend);
        renderGaugeChart(kpis);
        renderDistrictChart(district);
        renderPerformanceTable(table);
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-circle"></i> Error loading dashboard: ${getErrorMessage(error)}
            </div>
        `;
    }
}

function renderKPIs(data) {
    const row = document.getElementById('kpiRow');
    if (!data || typeof data !== 'object') {
        row.innerHTML = '<div class="col-12"><div class="alert alert-warning">No KPI data available</div></div>';
        return;
    }

    const kpiList = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ label: key, value }));

    const html = kpiList.slice(0, 5).map(kpi => `
        <div class="col-lg-2 col-md-4 col-sm-6 mb-3">
            <div class="kpi-card">
                <div class="kpi-label">${kpi.label}</div>
                <div class="kpi-value">${formatNumber(kpi.value)}</div>
                <div class="kpi-subtitle">${kpi.subtitle || ''}</div>
            </div>
        </div>
    `).join('');

    row.innerHTML = html;
}

function renderTrendChart(data) {
    const canvas = document.getElementById('trendChart');
    if (!canvas || !Array.isArray(data) || data.length === 0) return;

    // Destroy existing chart
    if (charts.trend) charts.trend.destroy();

    const labels = data.map(d => d.date || '').slice(-30);
    const registrations = data.map(d => d.count || d.registered || 0).slice(-30);

    charts.trend = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Registrations',
                data: registrations,
                borderColor: '#1e3a8a',
                backgroundColor: 'rgba(30, 58, 138, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
                y: { beginAtZero: true },
                x: {}
            }
        }
    });
}

function renderGaugeChart(kpis) {
    const canvas = document.getElementById('gaugeChart');
    if (!canvas) return;

    if (charts.gauge) charts.gauge.destroy();

    const progressKPI = Array.isArray(kpis) ? kpis.find(k => k.label?.toLowerCase().includes('progress')) : kpis.progress;
    const progress = progressKPI ? parseInt(progressKPI.value) : 0;

    charts.gauge = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Progress', 'Remaining'],
            datasets: [{
                data: [Math.min(progress, 100), Math.max(100 - progress, 0)],
                backgroundColor: [
                    progress >= 80 ? '#16a34a' :
                    progress >= 50 ? '#2563eb' :
                    progress >= 25 ? '#f59e0b' : '#dc2626',
                    '#e5e7eb'
                ],
                borderColor: ['white', 'white'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom' } }
        }
    });
}

function renderDistrictChart(data) {
    const canvas = document.getElementById('districtChart');
    if (!canvas || !Array.isArray(data) || data.length === 0) return;

    if (charts.district) charts.district.destroy();

    const labels = data.map(d => d.name || d.district || '').slice(0, 10);
    const registered = data.map(d => d.registered || 0).slice(0, 10);
    const unregistered = data.map(d => d.unregistered || 0).slice(0, 10);

    charts.district = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Registered',
                    data: registered,
                    backgroundColor: '#16a34a',
                    borderRadius: 4
                },
                {
                    label: 'Unregistered',
                    data: unregistered,
                    backgroundColor: '#2563eb',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
                x: { stacked: false },
                y: { beginAtZero: true }
            }
        }
    });
}

function renderPerformanceTable(data) {
    const tbody = document.getElementById('performanceTableBody');
    if (!Array.isArray(data) || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No data available</td></tr>';
        return;
    }

    tbody.innerHTML = data.slice(0, 20).map(row => {
        const progress = row.progress || 0;
        const status = getPerformanceStatus(progress);
        
        return `
            <tr>
                <td><strong>${row.name || row.district || '-'}</strong></td>
                <td>${formatNumber(row.adult_population || 0)}</td>
                <td><span class="badge bg-success">${formatNumber(row.registered || 0)}</span></td>
                <td><span class="badge bg-warning">${formatNumber(row.unregistered || 0)}</span></td>
                <td>${formatNumber(row.target || 0)}</td>
                <td>
                    <div class="progress" style="height: 20px; width: 100px;">
                        <div class="progress-bar" role="progressbar" style="width: ${Math.min(progress, 100)}%; background-color: ${
                            progress >= 80 ? '#16a34a' :
                            progress >= 50 ? '#2563eb' :
                            progress >= 25 ? '#f59e0b' : '#dc2626'
                        };" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small>${formatPercentage(progress, 0)}</small>
                </td>
                <td><span class="badge bg-secondary">${status.text}</span></td>
            </tr>
        `;
    }).join('');
}
