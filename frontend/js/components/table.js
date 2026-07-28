/**
 * Table Component - Sortable, filterable, paginated data table
 */

class DataTable {
    constructor(options = {}) {
        this.containerId = options.containerId || 'table-container';
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.pageSize = options.pageSize || 50;
        this.currentPage = 1;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.filters = {};
        this.onRowClick = options.onRowClick || null;
        this.onRowAction = options.onRowAction || null;
        this.loading = false;
        this.totalRecords = options.totalRecords || 0;
        
        this.render();
    }

    /**
     * Update data
     */
    setData(data, totalRecords = null) {
        this.data = data;
        if (totalRecords !== null) {
            this.totalRecords = totalRecords;
        }
        this.currentPage = 1;
        this.render();
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.loading = loading;
        this.render();
    }

    /**
     * Sort by column
     */
    sortBy(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }
        this.currentPage = 1;
        this.render();
    }

    /**
     * Filter by column value
     */
    filterBy(columnKey, value) {
        if (value) {
            this.filters[columnKey] = value;
        } else {
            delete this.filters[columnKey];
        }
        this.currentPage = 1;
        this.render();
    }

    /**
     * Go to page
     */
    goToPage(page) {
        this.currentPage = Math.max(1, page);
        this.render();
    }

    /**
     * Get paginated data
     */
    getPaginatedData() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        return this.data.slice(start, end);
    }

    /**
     * Get total pages
     */
    getTotalPages() {
        return Math.ceil((this.totalRecords || this.data.length) / this.pageSize);
    }

    /**
     * Render table
     */
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (this.loading) {
            container.innerHTML = this.renderLoading();
            return;
        }

        if (this.data.length === 0) {
            container.innerHTML = this.renderEmpty();
            return;
        }

        container.innerHTML = `
            <div class="table-wrapper">
                ${this.renderTable()}
                ${this.renderPagination()}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render table HTML
     */
    renderTable() {
        const paginatedData = this.getPaginatedData();

        let html = '<table class="data-table">';

        // Header
        html += '<thead><tr>';
        this.columns.forEach(column => {
            const sortClass = this.sortColumn === column.key 
                ? `sort-${this.sortDirection}` 
                : '';
            const sortIcon = this.sortColumn === column.key
                ? (this.sortDirection === 'asc' ? ' ▲' : ' ▼')
                : '';
            
            html += `<th class="${column.sortable ? 'sortable' : ''} ${sortClass}" 
                        data-column="${column.key}" 
                        style="width: ${column.width || 'auto'}">
                        ${column.label}${sortIcon}
                    </th>`;
        });
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        paginatedData.forEach((row, index) => {
            html += '<tr class="data-row" data-index="' + index + '">';
            this.columns.forEach(column => {
                let value = this.getNestedProperty(row, column.key);
                
                if (column.render) {
                    value = column.render(value, row);
                } else if (column.type === 'date') {
                    value = this.formatDate(value);
                } else if (column.type === 'number') {
                    value = this.formatNumber(value);
                } else if (column.type === 'percent') {
                    value = `${(value * 100).toFixed(1)}%`;
                }

                const cellClass = column.align ? `text-${column.align}` : '';
                html += `<td class="${cellClass}">${value || '-'}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';

        html += '</table>';
        return html;
    }

    /**
     * Render pagination controls
     */
    renderPagination() {
        const totalPages = this.getTotalPages();
        const startRecord = (this.currentPage - 1) * this.pageSize + 1;
        const endRecord = Math.min(this.currentPage * this.pageSize, this.totalRecords || this.data.length);
        const total = this.totalRecords || this.data.length;

        let html = '<div class="pagination">';
        html += `<div class="pagination-info">
                    Showing ${startRecord} to ${endRecord} of ${total} records
                 </div>`;

        html += '<div class="pagination-controls">';

        // Previous button
        html += `<button class="btn btn-small pagination-btn" 
                    data-page="${this.currentPage - 1}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                 </button>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                if (i > 1 && i < this.currentPage - 2) {
                    html += '<span class="pagination-ellipsis">...</span>';
                }
                html += `<button class="btn btn-small pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                            ${i}
                         </button>`;
                if (i === this.currentPage + 2 && i < totalPages - 1) {
                    html += '<span class="pagination-ellipsis">...</span>';
                }
            }
        }

        // Next button
        html += `<button class="btn btn-small pagination-btn" 
                    data-page="${this.currentPage + 1}" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next →
                 </button>`;

        html += '</div></div>';
        return html;
    }

    /**
     * Render loading skeleton
     */
    renderLoading() {
        let html = '<div class="table-loading"><div class="spinner"></div> Loading...</div>';
        return html;
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        return '<div class="table-empty">No records found</div>';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Sortable headers
        container.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const columnKey = header.dataset.column;
                this.sortBy(columnKey);
            });
        });

        // Pagination buttons
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page >= 1 && page <= this.getTotalPages()) {
                    this.goToPage(page);
                }
            });
        });

        // Row clicks
        if (this.onRowClick) {
            container.querySelectorAll('tbody tr').forEach((row, index) => {
                row.addEventListener('click', () => {
                    const data = this.getPaginatedData()[index];
                    this.onRowClick(data, index);
                });
            });
        }
    }

    /**
     * Helper: Get nested property from object
     */
    getNestedProperty(obj, key) {
        return key.split('.').reduce((acc, part) => acc?.[part], obj);
    }

    /**
     * Helper: Format date
     */
    formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    /**
     * Helper: Format number
     */
    formatNumber(value) {
        if (typeof value !== 'number') return value;
        return new Intl.NumberFormat('en-US').format(value);
    }
}

export { DataTable };
