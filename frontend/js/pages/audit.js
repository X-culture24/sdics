import { auditService } from '../api/audit.js';
import { formatDate } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initAuditPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Audit Logs</h1>
                <p class="text-muted">System activity and security audit trail</p>
            </div>

            <!-- Filters -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="userFilter" placeholder="Filter by user...">
                                </div>
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="actionFilter" placeholder="Filter by action...">
                                </div>
                                <div class="col-md-3">
                                    <input type="date" class="form-control" id="dateFilter">
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-primary w-100" id="filterBtn">
                                        <i class="bi bi-funnel"></i> Filter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Audit Logs Table -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Activity Log</h5>
                        </div>
                        <div class="card-body">
                            <div id="auditContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Resource</th>
                                            <th>IP Address</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="auditTableBody">
                                        <tr>
                                            <td colspan="6" class="text-center py-4">
                                                <div class="spinner-border text-primary spinner-border-sm" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div id="paginationContainer" class="d-flex justify-content-between align-items-center mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    let currentPage = 1;

    async function loadAuditLogs(page = 1, filters = {}) {
        try {
            const result = await auditService.list(page, 50, filters);
            renderAuditTable(result.data || []);
            renderPagination(result.meta || {}, page);
            currentPage = page;
        } catch (error) {
            document.getElementById('auditTableBody').innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">${getErrorMessage(error)}</td></tr>
            `;
        }
    }

    function renderAuditTable(data) {
        const tbody = document.getElementById('auditTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No audit logs found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(log => `
            <tr>
                <td><small>${formatDate(log.created_at)}</small></td>
                <td>${log.user?.email || 'System'}</td>
                <td><strong>${log.action}</strong></td>
                <td>${log.resource_type} (${log.resource_id})</td>
                <td><small>${log.ip_address || '-'}</small></td>
                <td>
                    <span class="badge ${log.status === 'success' ? 'bg-success' : 'bg-danger'}">
                        ${log.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(meta, page) {
        const container = document.getElementById('paginationContainer');
        if (!meta.total || meta.total <= 50) {
            container.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(meta.total / 50);
        let html = `<span class="text-muted">Page ${page} of ${totalPages}</span>`;
        html += '<div>';
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            html += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline-primary'} ms-2" onclick="window.goToPage(${i})">${i}</button>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    document.getElementById('filterBtn').addEventListener('click', () => {
        const filters = {
            user: document.getElementById('userFilter').value,
            action: document.getElementById('actionFilter').value,
            date: document.getElementById('dateFilter').value
        };
        loadAuditLogs(1, filters);
    });

    window.goToPage = (page) => {
        const filters = {
            user: document.getElementById('userFilter').value,
            action: document.getElementById('actionFilter').value,
            date: document.getElementById('dateFilter').value
        };
        loadAuditLogs(page, filters);
    };

    loadAuditLogs();
}
