import { reportsService } from '../api/reports.js';
import { getErrorMessage } from '../api/client.js';

export async function initReportsPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Reports & Exports</h1>
                <p class="text-muted">Generate and download reports</p>
            </div>

            <!-- Reports Grid -->
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Citizens Report</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">Export all citizens data with registration status</p>
                            <div class="mb-3">
                                <label for="citizensFormat" class="form-label">Format</label>
                                <select class="form-select" id="citizensFormat">
                                    <option value="csv">CSV</option>
                                    <option value="excel">Excel</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100" id="exportCitizensBtn">
                                <i class="bi bi-download"></i> Export Citizens
                            </button>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Performance Report</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">Registration progress by district and division</p>
                            <div class="mb-3">
                                <label for="performanceFormat" class="form-label">Format</label>
                                <select class="form-select" id="performanceFormat">
                                    <option value="csv">CSV</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100" id="exportPerformanceBtn">
                                <i class="bi bi-download"></i> Export Report
                            </button>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Campaign Statistics</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">Statistics for selected campaign</p>
                            <div class="mb-3">
                                <label for="campaignSelect" class="form-label">Campaign</label>
                                <select class="form-select" id="campaignSelect">
                                    <option value="">Select Campaign</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100" id="exportCampaignBtn">
                                <i class="bi bi-download"></i> Export Campaign Stats
                            </button>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Audit Log Report</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted mb-3">System activity and user actions</p>
                            <div class="mb-3">
                                <label for="auditFormat" class="form-label">Format</label>
                                <select class="form-select" id="auditFormat">
                                    <option value="csv">CSV</option>
                                    <option value="pdf">PDF</option>
                                </select>
                            </div>
                            <button class="btn btn-primary w-100" id="exportAuditBtn">
                                <i class="bi bi-download"></i> Export Audit Log
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Exports -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Recent Exports</h5>
                        </div>
                        <div class="card-body">
                            <div id="exportsContainer" class="table-responsive">
                                <table class="table table-sm mb-0">
                                    <thead>
                                        <tr>
                                            <th>Report</th>
                                            <th>Format</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="exportsTableBody">
                                        <tr>
                                            <td colspan="4" class="text-center text-muted py-3">No exports yet</td>
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

    async function loadCampaigns() {
        try {
            const result = await reportsService.getCampaigns();
            const select = document.getElementById('campaignSelect');
            (result.data || []).forEach(campaign => {
                const option = document.createElement('option');
                option.value = campaign.id;
                option.textContent = campaign.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading campaigns:', error);
        }
    }

    document.getElementById('exportCitizensBtn').addEventListener('click', async () => {
        try {
            const format = document.getElementById('citizensFormat').value;
            await reportsService.exportCitizens(format);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    document.getElementById('exportPerformanceBtn').addEventListener('click', async () => {
        try {
            const format = document.getElementById('performanceFormat').value;
            await reportsService.exportPerformance(format);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    document.getElementById('exportCampaignBtn').addEventListener('click', async () => {
        const campaignId = document.getElementById('campaignSelect').value;
        if (!campaignId) {
            alert('Please select a campaign');
            return;
        }
        try {
            await reportsService.exportCampaignStats(campaignId);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    document.getElementById('exportAuditBtn').addEventListener('click', async () => {
        try {
            const format = document.getElementById('auditFormat').value;
            await reportsService.exportAuditLog(format);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    loadCampaigns();
}
