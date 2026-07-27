import { citizensService } from '../api/citizens.js';
import { formatNumber } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initCitizensPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Citizens Management</h1>
                <p class="text-muted">Manage and register voters</p>
            </div>

            <!-- Search & Filter -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by National ID, name, or phone...">
                                </div>
                                <div class="col-md-3">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="registered">Registered</option>
                                        <option value="unregistered">Unregistered</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-primary w-100" id="addCitizenBtn">
                                        <i class="bi bi-plus"></i> Add Citizen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Citizens Table -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <div id="citizensTableContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>National ID</th>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Location</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="citizensTableBody">
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

        <!-- Add/Edit Citizen Modal -->
        <div class="modal fade" id="citizenModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="citizenModalTitle">Add Citizen</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="citizenForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="nidInput" class="form-label">National ID</label>
                                <input type="text" class="form-control" id="nidInput" name="national_id" required>
                            </div>
                            <div class="mb-3">
                                <label for="nameInput" class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="nameInput" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="phoneInput" class="form-label">Phone Number</label>
                                <input type="tel" class="form-control" id="phoneInput" name="phone">
                            </div>
                            <div class="mb-3">
                                <label for="emailInput" class="form-label">Email</label>
                                <input type="email" class="form-control" id="emailInput" name="email">
                            </div>
                            <div class="mb-3">
                                <label for="locationInput" class="form-label">Location</label>
                                <input type="text" class="form-control" id="locationInput" name="location">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Citizen</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    let currentPage = 1;
    const modal = new bootstrap.Modal(document.getElementById('citizenModal'));

    // Load and render citizens
    async function loadCitizens(page = 1, search = '', status = '') {
        try {
            const result = await citizensService.list(page, 10, { search, status });
            renderCitizensTable(result.data || []);
            renderPagination(result.meta || {}, page);
            currentPage = page;
        } catch (error) {
            document.getElementById('citizensTableBody').innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">${getErrorMessage(error)}</td></tr>
            `;
        }
    }

    function renderCitizensTable(data) {
        const tbody = document.getElementById('citizensTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No citizens found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(citizen => `
            <tr>
                <td><strong>${citizen.national_id}</strong></td>
                <td>${citizen.name}</td>
                <td>${citizen.phone || '-'}</td>
                <td>${citizen.location || '-'}</td>
                <td>
                    <span class="badge ${citizen.registration_status === 'registered' ? 'bg-success' : 'bg-warning'}">
                        ${citizen.registration_status === 'registered' ? 'Registered' : 'Unregistered'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.editCitizen(${citizen.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-success" onclick="window.registerCitizen(${citizen.id})">Register</button>
                </td>
            </tr>
        `).join('');
    }

    function renderPagination(meta, currentPage) {
        const container = document.getElementById('paginationContainer');
        if (!meta.total || meta.total <= 10) {
            container.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(meta.total / 10);
        let html = `<span class="text-muted">Page ${currentPage} of ${totalPages}</span>`;
        html += '<div>';
        
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'} ms-2" onclick="window.goToPage(${i})">${i}</button>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    // Event listeners
    document.getElementById('addCitizenBtn').addEventListener('click', () => {
        document.getElementById('citizenForm').reset();
        document.getElementById('citizenModalTitle').textContent = 'Add Citizen';
        modal.show();
    });

    document.getElementById('citizenForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await citizensService.create(data);
            modal.hide();
            loadCitizens(1);
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        loadCitizens(1, e.target.value, document.getElementById('statusFilter').value);
    });

    document.getElementById('statusFilter').addEventListener('change', (e) => {
        loadCitizens(1, document.getElementById('searchInput').value, e.target.value);
    });

    // Global functions for inline onclick handlers
    window.editCitizen = async (id) => {
        try {
            const citizen = await citizensService.getById(id);
            document.getElementById('nidInput').value = citizen.national_id;
            document.getElementById('nameInput').value = citizen.name;
            document.getElementById('phoneInput').value = citizen.phone || '';
            document.getElementById('emailInput').value = citizen.email || '';
            document.getElementById('locationInput').value = citizen.location || '';
            document.getElementById('citizenModalTitle').textContent = 'Edit Citizen';
            modal.show();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    window.registerCitizen = async (id) => {
        if (confirm('Register this citizen for the current campaign?')) {
            try {
                await citizensService.register(id);
                loadCitizens(currentPage);
            } catch (error) {
                alert(getErrorMessage(error));
            }
        }
    };

    window.goToPage = (page) => {
        loadCitizens(page, document.getElementById('searchInput').value, document.getElementById('statusFilter').value);
    };

    // Initial load
    loadCitizens();
}
