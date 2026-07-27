import { importsService } from '../api/imports.js';
import { formatDate, formatNumber } from '../utils/formatter.js';
import { getErrorMessage } from '../api/client.js';

export async function initImportsPage() {
    const container = document.getElementById('pageContainer');

    container.innerHTML = `
        <div class="container-fluid">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <h1 class="h2">Data Imports</h1>
                <p class="text-muted">Upload and manage citizen data imports</p>
            </div>

            <!-- Upload Section -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Upload Citizens File</h5>
                        </div>
                        <div class="card-body">
                            <div id="dropZone" class="border-2 border-dashed p-5 text-center" style="border-radius: 8px; cursor: pointer; transition: background 0.3s;">
                                <i class="bi bi-cloud-upload" style="font-size: 2rem; color: #1e3a8a;"></i>
                                <p class="mt-3 mb-2">Drag and drop your Excel file here</p>
                                <p class="text-muted small">or click to browse</p>
                                <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                            </div>
                            <div id="uploadProgress" style="display: none; margin-top: 20px;">
                                <div class="progress">
                                    <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                                </div>
                                <small id="progressText" class="text-muted">Uploading...</small>
                            </div>
                            <button class="btn btn-primary w-100 mt-3" id="uploadBtn">Upload File</button>
                        </div>
                    </div>
                </div>

                <!-- Available Datasets -->
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Available Datasets</h5>
                        </div>
                        <div class="card-body">
                            <div id="datasetsContainer">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Import History -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Import History</h5>
                        </div>
                        <div class="card-body">
                            <div id="importsContainer" class="table-responsive">
                                <table class="table table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>File Name</th>
                                            <th>Imported Date</th>
                                            <th>Records</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="importsTableBody">
                                        <tr>
                                            <td colspan="5" class="text-center py-4">
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

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = '#f0f9ff';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = 'transparent';
        fileInput.files = e.dataTransfer.files;
    });

    dropZone.addEventListener('click', () => fileInput.click());

    uploadBtn.addEventListener('click', async () => {
        if (!fileInput.files[0]) {
            alert('Please select a file');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            document.getElementById('uploadProgress').style.display = 'block';
            const result = await importsService.uploadFile(file);
            alert('File uploaded successfully');
            fileInput.value = '';
            document.getElementById('uploadProgress').style.display = 'none';
            loadImports();
        } catch (error) {
            alert(getErrorMessage(error));
            document.getElementById('uploadProgress').style.display = 'none';
        }
    });

    async function loadImports() {
        try {
            const result = await importsService.list(1, 20);
            renderImportsTable(result.data || []);
        } catch (error) {
            document.getElementById('importsTableBody').innerHTML = `
                <tr><td colspan="5" class="text-center text-danger">${getErrorMessage(error)}</td></tr>
            `;
        }
    }

    async function loadDatasets() {
        try {
            const result = await importsService.getDatasets();
            const container = document.getElementById('datasetsContainer');
            const datasets = result.data || [];

            if (datasets.length === 0) {
                container.innerHTML = '<p class="text-muted">No datasets available</p>';
                return;
            }

            container.innerHTML = datasets.map(dataset => `
                <button class="btn btn-outline-primary w-100 mb-2" onclick="window.importDataset('${dataset}')">
                    <i class="bi bi-download"></i> ${dataset}
                </button>
            `).join('');
        } catch (error) {
            console.error('Error loading datasets:', error);
        }
    }

    function renderImportsTable(data) {
        const tbody = document.getElementById('importsTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No imports found</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(importJob => `
            <tr>
                <td><strong>${importJob.filename}</strong></td>
                <td>${formatDate(importJob.created_at)}</td>
                <td>${formatNumber(importJob.total_records || 0)}</td>
                <td>
                    <span class="badge ${
                        importJob.status === 'completed' ? 'bg-success' :
                        importJob.status === 'failed' ? 'bg-danger' :
                        'bg-warning'
                    }">
                        ${importJob.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="window.viewImportDetails(${importJob.id})">View</button>
                </td>
            </tr>
        `).join('');
    }

    window.importDataset = async (datasetName) => {
        if (confirm(`Import ${datasetName}?`)) {
            try {
                await importsService.importFromDataset(datasetName);
                alert('Import started successfully');
                loadImports();
            } catch (error) {
                alert(getErrorMessage(error));
            }
        }
    };

    window.viewImportDetails = async (id) => {
        try {
            const importJob = await importsService.getById(id);
            alert(JSON.stringify(importJob, null, 2));
        } catch (error) {
            alert(getErrorMessage(error));
        }
    };

    loadDatasets();
    loadImports();
}
