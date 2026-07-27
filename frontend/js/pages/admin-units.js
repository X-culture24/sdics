import { adminUnitsService } from '../api/admin-units.js';
import { formatDate } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initAdminUnitsPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Administrative Units</h1>
                <p class="text-muted">Manage counties, districts, divisions, and locations</p>
            </div>

            <!-- Admin Units Tree -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">Hierarchy</h5>
                            <button class="btn btn-primary btn-sm" id="addUnitBtn">
                                <i class="bi bi-plus"></i> Add Unit
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="unitsContainer">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Unit Modal -->
        <div class="modal fade" id="unitModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="unitModalTitle">Add Unit</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="unitForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="unitName" class="form-label">Name</label>
                                <input type="text" class="form-control" id="unitName" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="unitType" class="form-label">Type</label>
                                <select class="form-select" id="unitType" name="type" required>
                                    <option value="">Select Type</option>
                                    <option value="county">County</option>
                                    <option value="district">District</option>
                                    <option value="division">Division</option>
                                    <option value="location">Location</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="unitParent" class="form-label">Parent Unit</label>
                                <select class="form-select" id="unitParent" name="parent_id">
                                    <option value="">Select Parent (if applicable)</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Unit</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('unitModal'));

    async function loadAdminUnits() {
        try {
            const result = await adminUnitsService.list(1, 1000);
            renderUnitTree(result.data || []);
            loadParentOptions(result.data || []);
        } catch (error) {
            document.getElementById('unitsContainer').innerHTML = `
                <div class="alert alert-danger">${getErrorMessage(error)}</div>
            `;
        }
    }

    function renderUnitTree(data) {
        const container = document.getElementById('unitsContainer');
        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-muted">No administrative units found</p>';
            return;
        }

        // Group by type for easy display
        const byType = {
            county: [],
            district: [],
            division: [],
            location: []
        };

        data.forEach(unit => {
            if (byType[unit.type]) {
                byType[unit.type].push(unit);
            }
        });

        let html = '';
        Object.keys(byType).forEach(type => {
            if (byType[type].length > 0) {
                html += `<div class="mb-4">`;
                html += `<h6 class="text-uppercase text-muted">${type}s</h6>`;
                html += `<div class="list-group">`;
                byType[type].forEach(unit => {
                    html += `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>${unit.name}</strong>
                                    <small class="d-block text-muted">Code: ${unit.code || '-'}</small>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="window.editUnit(${unit.id})">Edit</button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteUnit(${unit.id})">Delete</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
        });

        container.innerHTML = html || '<p class="text-muted">No administrative units found</p>';
    }

    function loadParentOptions(data) {
        const select = document.getElementById('unitParent');
        const options = select.querySelectorAll('option');
        
        // Keep the first option
        const firstOption = options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);

        // Add unit options
        (data || []).forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = `${unit.name} (${unit.type})`;
            select.appendChild(option);
        });
    }

    document.getElementById('addUnitBtn').addEventListener('click', () => {
        document.getElementById('unitForm').reset();
        document.getElementById('unitModalTitle').textContent = 'Add Unit';
        modal.show();
    });

    document.getElementById('unitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await adminUnitsService.create(data);
            modal.hide();
            loadAdminUnits();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    window.editUnit = async (id) => {
        try {
            const unit = await adminUnitsService.getById(id);
            document.getElementById('unitName').value = unit.name;
            document.getElementById('unitType').value = unit.type;
            document.getElementById('unitParent').value = unit.parent_id || '';
            document.getElementById('unitModalTitle').textContent = 'Edit Unit';
            modal.show();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    window.deleteUnit = async (id) => {
        if (confirm('Delete this administrative unit?')) {
            try {
                await adminUnitsService.delete(id);
                loadAdminUnits();
            } catch (error) {
                alert(getErrorMessage(error));
            }
        }
    };

    loadAdminUnits();
}
