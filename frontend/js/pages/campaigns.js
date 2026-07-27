import { campaignsService } from '../api/campaigns.js';
import { formatNumber, formatDate } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initCampaignsPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Campaigns</h1>
                <p class="text-muted">Manage voter registration campaigns</p>
            </div>

            <!-- Campaigns List -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">Active Campaigns</h5>
                            <button class="btn btn-primary btn-sm" id="addCampaignBtn">
                                <i class="bi bi-plus"></i> New Campaign
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="campaignsContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Campaign Name</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Status</th>
                                            <th>Registrations</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="campaignsTableBody">
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
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Campaign Modal -->
        <div class="modal fade" id="campaignModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="campaignModalTitle">New Campaign</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="campaignForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="campaignName" class="form-label">Campaign Name</label>
                                <input type="text" class="form-control" id="campaignName" name="name" required>
                            </div>
                            <div class="mb-3">
                                <label for="startDate" class="form-label">Start Date</label>
                                <input type="date" class="form-control" id="startDate" name="start_date" required>
                            </div>
                            <div class="mb-3">
                                <label for="endDate" class="form-label">End Date</label>
                                <input type="date" class="form-control" id="endDate" name="end_date" required>
                            </div>
                            <div class="mb-3">
                                <label for="campaignStatus" class="form-label">Status</label>
                                <select class="form-select" id="campaignStatus" name="status">
                                    <option value="planned">Planned</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Campaign</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('campaignModal'));

    async function loadCampaigns() {
        try {
            const result = await campaignsService.list(1, 50);
            renderCampaignsTable(result.data || []);
        } catch (error) {
            document.getElementById('campaignsTableBody').innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">${getErrorMessage(error)}</td></tr>
            `;
        }
    }

    function renderCampaignsTable(data) {
        const tbody = document.getElementById('campaignsTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No campaigns found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(campaign => `
            <tr>
                <td><strong>${campaign.name}</strong></td>
                <td>${formatDate(campaign.start_date)}</td>
                <td>${formatDate(campaign.end_date)}</td>
                <td>
                    <span class="badge ${
                        campaign.status === 'active' ? 'bg-success' :
                        campaign.status === 'completed' ? 'bg-info' :
                        'bg-secondary'
                    }">
                        ${campaign.status}
                    </span>
                </td>
                <td>${formatNumber(campaign.registrations_count || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.editCampaign(${campaign.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteCampaign(${campaign.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('addCampaignBtn').addEventListener('click', () => {
        document.getElementById('campaignForm').reset();
        document.getElementById('campaignModalTitle').textContent = 'New Campaign';
        modal.show();
    });

    document.getElementById('campaignForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await campaignsService.create(data);
            modal.hide();
            loadCampaigns();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    window.editCampaign = async (id) => {
        try {
            const campaign = await campaignsService.getById(id);
            document.getElementById('campaignName').value = campaign.name;
            document.getElementById('startDate').value = campaign.start_date;
            document.getElementById('endDate').value = campaign.end_date;
            document.getElementById('campaignStatus').value = campaign.status;
            document.getElementById('campaignModalTitle').textContent = 'Edit Campaign';
            modal.show();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    window.deleteCampaign = async (id) => {
        if (confirm('Delete this campaign?')) {
            try {
                await campaignsService.delete(id);
                loadCampaigns();
            } catch (error) {
                alert(getErrorMessage(error));
            }
        }
    };

    loadCampaigns();
}
