import { usersService } from '../api/users.js';
import { formatDate } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initUsersPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Users Management</h1>
                <p class="text-muted">Manage system users and roles</p>
            </div>

            <!-- Users List -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">System Users</h5>
                            <button class="btn btn-primary btn-sm" id="addUserBtn">
                                <i class="bi bi-plus"></i> Add User
                            </button>
                        </div>
                        <div class="card-body">
                            <div id="usersContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Full Name</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Last Login</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="usersTableBody">
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

        <!-- Add/Edit User Modal -->
        <div class="modal fade" id="userModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="userModalTitle">Add User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="userForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="userEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="userEmail" name="email" required>
                            </div>
                            <div class="mb-3">
                                <label for="userName" class="form-label">Full Name</label>
                                <input type="text" class="form-control" id="userName" name="full_name" required>
                            </div>
                            <div class="mb-3">
                                <label for="userRole" class="form-label">Role</label>
                                <select class="form-select" id="userRole" name="role_id" required>
                                    <option value="">Select Role</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="userPassword" class="form-label">Password</label>
                                <input type="password" class="form-control" id="userPassword" name="password" required>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save User</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('userModal'));

    async function loadUsers() {
        try {
            const result = await usersService.list(1, 50);
            renderUsersTable(result.data || []);
        } catch (error) {
            document.getElementById('usersTableBody').innerHTML = `
                <tr><td colspan="6" class="text-center text-danger">${getErrorMessage(error)}</td></tr>
            `;
        }
    }

    async function loadRoles() {
        try {
            const result = await usersService.getRoles();
            const select = document.getElementById('userRole');
            (result.data || []).forEach(role => {
                const option = document.createElement('option');
                option.value = role.id;
                option.textContent = role.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading roles:', error);
        }
    }

    function renderUsersTable(data) {
        const tbody = document.getElementById('usersTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(user => `
            <tr>
                <td><strong>${user.email}</strong></td>
                <td>${user.full_name || '-'}</td>
                <td>${user.role?.name || '-'}</td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.toggleUserStatus(${user.id}, ${user.is_active})">
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.resetUserPassword(${user.id})">Reset Pass</button>
                </td>
            </tr>
        `).join('');
    }

    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('userForm').reset();
        document.getElementById('userModalTitle').textContent = 'Add User';
        modal.show();
    });

    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await usersService.create(data);
            modal.hide();
            loadUsers();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    });

    window.toggleUserStatus = async (id, currentStatus) => {
        try {
            await usersService.toggleStatus(id);
            loadUsers();
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    window.resetUserPassword = async (id) => {
        if (confirm('Send password reset email to this user?')) {
            try {
                await usersService.resetPassword(id);
                alert('Password reset email sent');
            } catch (error) {
                alert(getErrorMessage(error));
            }
        }
    };

    loadRoles();
    loadUsers();
}
