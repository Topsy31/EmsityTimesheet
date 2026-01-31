// Emsity Timesheet - Renderer Process

const app = {
  data: null,
  currentClient: null,
  currentMonth: null, // Format: 'YYYY-MM'
  editingActivities: [],

  // Initialize the app
  async init() {
    try {
      this.data = await window.api.loadData();
      this.currentMonth = this.getCurrentMonth();
      this.renderClients();
      this.populateMonthSelector();
      document.getElementById('settings-mileage-rate').value = this.data.settings?.mileageRate || 0.45;
    } catch (error) {
      this.toast('Error loading data: ' + error.message, 'error');
      console.error(error);
    }
  },

  // Get current month as YYYY-MM
  getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  // Format month for display
  formatMonth(yearMonth) {
    const [year, month] = yearMonth.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  },

  // Save data to file
  async saveData() {
    try {
      await window.api.saveData(this.data);
    } catch (error) {
      this.toast('Error saving data: ' + error.message, 'error');
      console.error(error);
    }
  },

  // Show toast notification
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // ========== View Navigation ==========

  showClients() {
    document.getElementById('view-clients').classList.remove('hidden');
    document.getElementById('view-timesheet').classList.add('hidden');
    document.getElementById('view-settings').classList.add('hidden');
    document.getElementById('view-import').classList.add('hidden');
    this.currentClient = null;
    this.renderClients();
  },

  showTimesheet(clientId) {
    this.currentClient = this.data.clients.find(c => c.id === clientId);
    if (!this.currentClient) return;

    document.getElementById('view-clients').classList.add('hidden');
    document.getElementById('view-timesheet').classList.remove('hidden');
    document.getElementById('view-settings').classList.add('hidden');
    document.getElementById('view-import').classList.add('hidden');

    document.getElementById('timesheet-client-name').textContent = this.currentClient.name;
    this.renderEntries();
    this.renderSummary();
  },

  showSettings() {
    document.getElementById('view-clients').classList.add('hidden');
    document.getElementById('view-timesheet').classList.add('hidden');
    document.getElementById('view-settings').classList.remove('hidden');
    document.getElementById('view-import').classList.add('hidden');
  },

  showImport() {
    document.getElementById('view-clients').classList.add('hidden');
    document.getElementById('view-timesheet').classList.add('hidden');
    document.getElementById('view-settings').classList.add('hidden');
    document.getElementById('view-import').classList.remove('hidden');
    this.loadExcelFiles();
  },

  showTab(tabName) {
    // Remove active from all tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

    // Hide both tab contents
    document.getElementById('tab-entries').classList.add('hidden');
    document.getElementById('tab-summary').classList.add('hidden');

    if (tabName === 'entries') {
      document.querySelectorAll('.tab')[0].classList.add('active');
      document.getElementById('tab-entries').classList.remove('hidden');
    } else {
      document.querySelectorAll('.tab')[1].classList.add('active');
      document.getElementById('tab-summary').classList.remove('hidden');
      this.renderSummary();
    }
  },

  // ========== Client Management ==========

  renderClients() {
    const grid = document.getElementById('client-grid');

    if (!this.data.clients.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">No clients yet. Add your first client to get started.</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.data.clients.map(client => {
      const monthHours = this.getClientMonthHours(client.id, this.currentMonth);
      const monthValue = monthHours * client.rate;

      return `
        <div class="client-card" onclick="app.showTimesheet('${client.id}')">
          <div class="client-card-name">${client.name}</div>
          <div class="client-card-rate">£${client.rate.toFixed(2)}/hour</div>
          <div class="client-card-vat">${client.vatApplicable ? 'VAT applicable' : 'No VAT'}</div>
          <div class="client-card-hours">
            ${this.formatMonth(this.currentMonth)}: ${monthHours}h = £${monthValue.toFixed(2)}
          </div>
          <button class="btn btn-small btn-secondary mt-4" onclick="event.stopPropagation(); app.editClient('${client.id}')">Edit</button>
        </div>
      `;
    }).join('');
  },

  getClientMonthHours(clientId, yearMonth) {
    return this.data.entries
      .filter(e => e.clientId === clientId && e.date.startsWith(yearMonth))
      .reduce((sum, e) => sum + (e.hours || 0) + (e.travelHours || 0), 0);
  },

  showAddClient() {
    document.getElementById('client-modal-title').textContent = 'New Client';
    document.getElementById('client-id').value = '';
    document.getElementById('client-name').value = '';
    document.getElementById('client-rate').value = '';
    document.getElementById('client-vat').value = 'false';
    this.editingActivities = ['Consulting'];
    this.renderActivities();
    document.getElementById('modal-client').classList.remove('hidden');
  },

  editClient(clientId) {
    const client = this.data.clients.find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('client-modal-title').textContent = 'Edit Client';
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-rate').value = client.rate;
    document.getElementById('client-vat').value = client.vatApplicable ? 'true' : 'false';
    this.editingActivities = [...client.activities];
    this.renderActivities();
    document.getElementById('modal-client').classList.remove('hidden');
  },

  renderActivities() {
    const container = document.getElementById('client-activities');
    container.innerHTML = this.editingActivities.map((activity, index) => `
      <span class="activity-tag">
        ${activity}
        <button onclick="app.removeActivity(${index})">&times;</button>
      </span>
    `).join('');
  },

  addActivity() {
    const input = document.getElementById('new-activity');
    const value = input.value.trim();
    if (value && !this.editingActivities.includes(value)) {
      this.editingActivities.push(value);
      this.renderActivities();
      input.value = '';
    }
  },

  removeActivity(index) {
    this.editingActivities.splice(index, 1);
    this.renderActivities();
  },

  async saveClient() {
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value.trim();
    const rate = parseFloat(document.getElementById('client-rate').value);
    const vatApplicable = document.getElementById('client-vat').value === 'true';

    if (!name) {
      this.toast('Please enter a client name', 'error');
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      this.toast('Please enter a valid hourly rate', 'error');
      return;
    }
    if (!this.editingActivities.length) {
      this.toast('Please add at least one activity', 'error');
      return;
    }

    if (id) {
      // Update existing
      const client = this.data.clients.find(c => c.id === id);
      if (client) {
        client.name = name;
        client.rate = rate;
        client.vatApplicable = vatApplicable;
        client.activities = [...this.editingActivities];
      }
    } else {
      // Create new
      this.data.clients.push({
        id: this.generateId(),
        name,
        rate,
        vatApplicable,
        activities: [...this.editingActivities]
      });
    }

    await this.saveData();
    this.closeClientModal();
    this.renderClients();
    this.toast('Client saved', 'success');
  },

  closeClientModal() {
    document.getElementById('modal-client').classList.add('hidden');
  },

  // ========== Entry Management ==========

  populateMonthSelector() {
    const selector = document.getElementById('month-selector');
    const months = [];
    const now = new Date();

    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ value, label: this.formatMonth(value) });
    }

    selector.innerHTML = months.map(m =>
      `<option value="${m.value}" ${m.value === this.currentMonth ? 'selected' : ''}>${m.label}</option>`
    ).join('');
  },

  changeMonth() {
    this.currentMonth = document.getElementById('month-selector').value;
    this.renderEntries();
    this.renderSummary();
    this.renderClients(); // Update client cards too
  },

  renderEntries() {
    const list = document.getElementById('entry-list');
    const entries = this.data.entries
      .filter(e => e.clientId === this.currentClient.id && e.date.startsWith(this.currentMonth))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (!entries.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">No entries for ${this.formatMonth(this.currentMonth)}</div>
        </div>
      `;
      this.updateTotalFooter();
      return;
    }

    // Group by date
    const grouped = {};
    entries.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    });

    list.innerHTML = Object.keys(grouped).sort().reverse().map(date => {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

      return `
        <div class="date-group">
          <div class="date-header">${dateStr}</div>
          ${grouped[date].map(e => this.renderEntryItem(e)).join('')}
        </div>
      `;
    }).join('');

    this.updateTotalFooter();
  },

  renderEntryItem(entry) {
    const hasExtras = (entry.travelHours > 0) || (entry.expenseValue > 0) || (entry.miles > 0);
    return `
      <div class="entry-item">
        <span class="entry-activity">${entry.activity}</span>
        <span class="entry-hours">${entry.hours}h</span>
        <span class="entry-notes">${entry.notes || ''}</span>
        ${hasExtras ? '<span class="entry-extras">+$</span>' : ''}
        <div class="entry-actions">
          <button class="btn btn-small btn-secondary btn-icon" onclick="app.editEntry('${entry.id}')">✏️</button>
          <button class="btn btn-small btn-danger btn-icon" onclick="app.deleteEntry('${entry.id}')">🗑️</button>
        </div>
      </div>
    `;
  },

  updateTotalFooter() {
    const entries = this.data.entries.filter(
      e => e.clientId === this.currentClient.id && e.date.startsWith(this.currentMonth)
    );

    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0) + (e.travelHours || 0), 0);
    const totalValue = totalHours * this.currentClient.rate;

    document.getElementById('month-total-label').textContent = `${this.formatMonth(this.currentMonth)} Total:`;
    document.getElementById('month-total-value').textContent = `${totalHours}h = £${totalValue.toFixed(2)}`;
  },

  showAddEntry() {
    document.getElementById('entry-modal-title').textContent = 'New Entry';
    document.getElementById('entry-id').value = '';
    document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('entry-hours').value = '';
    document.getElementById('entry-notes').value = '';
    document.getElementById('entry-travel-hours').value = '';
    document.getElementById('entry-miles').value = '';
    document.getElementById('entry-expense').value = '';
    document.getElementById('entry-extras').classList.add('hidden');
    document.getElementById('extras-toggle-text').textContent = '+ Add travel/expenses';

    // Populate activities
    const select = document.getElementById('entry-activity');
    select.innerHTML = this.currentClient.activities.map(a =>
      `<option value="${a}">${a}</option>`
    ).join('');

    document.getElementById('modal-entry').classList.remove('hidden');
  },

  editEntry(entryId) {
    const entry = this.data.entries.find(e => e.id === entryId);
    if (!entry) return;

    document.getElementById('entry-modal-title').textContent = 'Edit Entry';
    document.getElementById('entry-id').value = entry.id;
    document.getElementById('entry-date').value = entry.date;
    document.getElementById('entry-hours').value = entry.hours;
    document.getElementById('entry-notes').value = entry.notes || '';
    document.getElementById('entry-travel-hours').value = entry.travelHours || '';
    document.getElementById('entry-miles').value = entry.miles || '';
    document.getElementById('entry-expense').value = entry.expenseValue || '';

    // Populate activities
    const select = document.getElementById('entry-activity');
    select.innerHTML = this.currentClient.activities.map(a =>
      `<option value="${a}" ${a === entry.activity ? 'selected' : ''}>${a}</option>`
    ).join('');

    // Show extras if any exist
    const hasExtras = (entry.travelHours > 0) || (entry.expenseValue > 0) || (entry.miles > 0);
    if (hasExtras) {
      document.getElementById('entry-extras').classList.remove('hidden');
      document.getElementById('extras-toggle-text').textContent = '− Hide travel/expenses';
    } else {
      document.getElementById('entry-extras').classList.add('hidden');
      document.getElementById('extras-toggle-text').textContent = '+ Add travel/expenses';
    }

    this.updateMileageValue();
    document.getElementById('modal-entry').classList.remove('hidden');
  },

  toggleExtras() {
    const extras = document.getElementById('entry-extras');
    const toggle = document.getElementById('extras-toggle-text');

    if (extras.classList.contains('hidden')) {
      extras.classList.remove('hidden');
      toggle.textContent = '− Hide travel/expenses';
    } else {
      extras.classList.add('hidden');
      toggle.textContent = '+ Add travel/expenses';
    }
  },

  updateMileageValue() {
    const miles = parseFloat(document.getElementById('entry-miles').value) || 0;
    const rate = this.data.settings?.mileageRate || 0.45;
    document.getElementById('mileage-value').textContent = `= £${(miles * rate).toFixed(2)}`;
  },

  async saveEntry() {
    const id = document.getElementById('entry-id').value;
    const date = document.getElementById('entry-date').value;
    const hours = parseFloat(document.getElementById('entry-hours').value);
    const activity = document.getElementById('entry-activity').value;
    const notes = document.getElementById('entry-notes').value.trim();
    const travelHours = parseFloat(document.getElementById('entry-travel-hours').value) || 0;
    const miles = parseInt(document.getElementById('entry-miles').value) || 0;
    const expenseValue = parseFloat(document.getElementById('entry-expense').value) || 0;

    if (!date) {
      this.toast('Please select a date', 'error');
      return;
    }
    if (isNaN(hours) || hours <= 0) {
      this.toast('Please enter valid hours', 'error');
      return;
    }

    const entryData = {
      clientId: this.currentClient.id,
      date,
      hours,
      activity,
      notes,
      travelHours,
      miles,
      expenseValue
    };

    if (id) {
      // Update existing
      const index = this.data.entries.findIndex(e => e.id === id);
      if (index >= 0) {
        this.data.entries[index] = { ...this.data.entries[index], ...entryData };
      }
    } else {
      // Create new
      this.data.entries.push({
        id: this.generateId(),
        ...entryData
      });
    }

    await this.saveData();
    this.closeEntryModal();
    this.renderEntries();
    this.toast('Entry saved', 'success');
  },

  async deleteEntry(entryId) {
    if (!confirm('Delete this entry?')) return;

    this.data.entries = this.data.entries.filter(e => e.id !== entryId);
    await this.saveData();
    this.renderEntries();
    this.toast('Entry deleted', 'success');
  },

  closeEntryModal() {
    document.getElementById('modal-entry').classList.add('hidden');
  },

  // ========== Summary & Export ==========

  renderSummary() {
    const entries = this.data.entries.filter(
      e => e.clientId === this.currentClient.id && e.date.startsWith(this.currentMonth)
    );

    const workingHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const travelHours = entries.reduce((sum, e) => sum + (e.travelHours || 0), 0);
    const expenses = entries.reduce((sum, e) => sum + (e.expenseValue || 0), 0);
    const miles = entries.reduce((sum, e) => sum + (e.miles || 0), 0);
    const mileageRate = this.data.settings?.mileageRate || 0.45;
    const mileageValue = miles * mileageRate;

    const rate = this.currentClient.rate;
    const workingValue = workingHours * rate;
    const travelValue = travelHours * rate;
    const subtotal = workingValue + travelValue + expenses + mileageValue;
    const vat = this.currentClient.vatApplicable ? subtotal * 0.2 : 0;
    const total = subtotal + vat;

    const tbody = document.getElementById('summary-body');
    tbody.innerHTML = `
      <tr>
        <td>Working Time (${workingHours}h × £${rate.toFixed(2)})</td>
        <td class="amount">${workingHours}h</td>
        <td class="amount">£${workingValue.toFixed(2)}</td>
      </tr>
      ${travelHours > 0 ? `
      <tr>
        <td>Travel Time (${travelHours}h × £${rate.toFixed(2)})</td>
        <td class="amount">${travelHours}h</td>
        <td class="amount">£${travelValue.toFixed(2)}</td>
      </tr>
      ` : ''}
      ${expenses > 0 ? `
      <tr>
        <td>Expenses</td>
        <td class="amount">—</td>
        <td class="amount">£${expenses.toFixed(2)}</td>
      </tr>
      ` : ''}
      ${miles > 0 ? `
      <tr>
        <td>Mileage (${miles} miles × £${mileageRate.toFixed(2)})</td>
        <td class="amount">—</td>
        <td class="amount">£${mileageValue.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>Subtotal</td>
        <td class="amount">${workingHours + travelHours}h</td>
        <td class="amount">£${subtotal.toFixed(2)}</td>
      </tr>
      ${this.currentClient.vatApplicable ? `
      <tr>
        <td>VAT (20%)</td>
        <td class="amount">—</td>
        <td class="amount">£${vat.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td><strong>Total (inc VAT)</strong></td>
        <td class="amount">—</td>
        <td class="amount"><strong>£${total.toFixed(2)}</strong></td>
      </tr>
      ` : ''}
    `;
  },

  async exportCSV() {
    const entries = this.data.entries
      .filter(e => e.clientId === this.currentClient.id && e.date.startsWith(this.currentMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    const headers = ['Date', 'Activity', 'Hours', 'Travel Hours', 'Notes', 'Expense', 'Miles'];
    const rows = entries.map(e => [
      e.date,
      e.activity,
      e.hours,
      e.travelHours || 0,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      e.expenseValue || 0,
      e.miles || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `${this.currentClient.name} - ${this.formatMonth(this.currentMonth)}.csv`;

    try {
      const result = await window.api.exportCSV(filename, csv);
      this.toast(`Exported to ${filename}`, 'success');
    } catch (error) {
      this.toast('Export failed: ' + error.message, 'error');
    }
  },

  async exportPDF() {
    // Dynamic import of jsPDF
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

    const doc = new jsPDF();
    const entries = this.data.entries
      .filter(e => e.clientId === this.currentClient.id && e.date.startsWith(this.currentMonth))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('Emsity Timesheet', 20, 20);

    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text(`${this.currentClient.name} - ${this.formatMonth(this.currentMonth)}`, 20, 30);

    // Summary
    const workingHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const travelHours = entries.reduce((sum, e) => sum + (e.travelHours || 0), 0);
    const expenses = entries.reduce((sum, e) => sum + (e.expenseValue || 0), 0);
    const miles = entries.reduce((sum, e) => sum + (e.miles || 0), 0);
    const mileageValue = miles * (this.data.settings?.mileageRate || 0.45);
    const rate = this.currentClient.rate;
    const subtotal = (workingHours + travelHours) * rate + expenses + mileageValue;
    const vat = this.currentClient.vatApplicable ? subtotal * 0.2 : 0;
    const total = subtotal + vat;

    let y = 45;
    doc.setFontSize(12);
    doc.text(`Working Hours: ${workingHours}h × £${rate.toFixed(2)} = £${(workingHours * rate).toFixed(2)}`, 20, y);
    y += 8;

    if (travelHours > 0) {
      doc.text(`Travel Hours: ${travelHours}h × £${rate.toFixed(2)} = £${(travelHours * rate).toFixed(2)}`, 20, y);
      y += 8;
    }
    if (expenses > 0) {
      doc.text(`Expenses: £${expenses.toFixed(2)}`, 20, y);
      y += 8;
    }
    if (miles > 0) {
      doc.text(`Mileage: ${miles} miles = £${mileageValue.toFixed(2)}`, 20, y);
      y += 8;
    }

    y += 4;
    doc.setFontSize(14);
    doc.text(`Subtotal: £${subtotal.toFixed(2)}`, 20, y);

    if (this.currentClient.vatApplicable) {
      y += 8;
      doc.text(`VAT (20%): £${vat.toFixed(2)}`, 20, y);
      y += 8;
      doc.setFontSize(16);
      doc.text(`Total: £${total.toFixed(2)}`, 20, y);
    }

    const filename = `${this.currentClient.name} - ${this.formatMonth(this.currentMonth)}.pdf`;

    try {
      const pdfData = doc.output('arraybuffer');
      await window.api.exportPDF(filename, Array.from(new Uint8Array(pdfData)));
      this.toast(`Exported to ${filename}`, 'success');
    } catch (error) {
      this.toast('Export failed: ' + error.message, 'error');
    }
  },

  // ========== Settings ==========

  async saveMileageRate() {
    const rate = parseFloat(document.getElementById('settings-mileage-rate').value);
    if (!isNaN(rate) && rate >= 0) {
      this.data.settings = this.data.settings || {};
      this.data.settings.mileageRate = rate;
      await this.saveData();
      this.toast('Mileage rate saved', 'success');
    }
  },

  // ========== Import ==========

  async loadExcelFiles() {
    try {
      const files = await window.api.getExcelFiles();
      const container = document.getElementById('import-file-list');

      if (!files.length) {
        container.innerHTML = '<p style="color: var(--text-light);">No Excel files found in the data folder.</p>';
        return;
      }

      container.innerHTML = files.map(f => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--grey-bg);">
          <span>${f}</span>
          <button class="btn btn-small btn-primary" onclick="app.importExcelFile('${f}')">Import</button>
        </div>
      `).join('');
    } catch (error) {
      this.toast('Error loading files: ' + error.message, 'error');
    }
  },

  async importExcelFile(filename) {
    this.toast('Import feature coming soon...', 'info');
    // TODO: Implement Excel import using xlsx library
  },

  // ========== Utilities ==========

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => app.init());
