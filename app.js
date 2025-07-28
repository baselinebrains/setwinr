// app.js - Fetch data from GitHub-hosted CSV files with debugging and safeguards

const dashboardUrl = 'https://raw.githubusercontent.com/baselinebrains/setwinr/main/dashboard.csv';
const tipsUrl = 'https://raw.githubusercontent.com/baselinebrains/setwinr/main/tips.csv';

let tipsDataGlobal = []; // To store tips data for export and charts

async function fetchCSV(url) {
  console.log(`Attempting to fetch: ${url}`);
  const response = await fetch(url);
  console.log(`Response status: ${response.status}`);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const csvText = await response.text();
  console.log(`Fetched text length: ${csvText.length}`);
  if (csvText.trim().length === 0) throw new Error('CSV file is empty');
  const parsed = Papa.parse(csvText, {header: false, skipEmptyLines: true});
  if (parsed.errors.length > 0) {
    console.error('CSV parsing errors:', parsed.errors);
    throw new Error('CSV parsing error: ' + parsed.errors[0].message);
  }
  console.log('Parsed data rows:', parsed.data.length);
  return parsed.data;
}

function createTableFromCSV(data) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headerRow = document.createElement('tr');
  data[0].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.setAttribute('aria-label', header);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  data.slice(1).forEach(rowData => {
    if (rowData.every(cell => !cell)) return;
    const tr = document.createElement('tr');
    rowData.forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = cell || ''; // Handle undefined cells
      if (index === 0) {
        const lowerCell = (cell || '').toLowerCase();
        if (lowerCell === 'wins') td.className = 'win';
        else if (lowerCell === 'losses') td.className = 'loss';
        else if (lowerCell.includes('void')) td.className = 'void';
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}

function createProfitChart(tipsData) {
  tipsData.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  let cumulativeProfit = 0;
  const labels = [];
  const profits = [];

  tipsData.forEach(row => {
    const [date, , , odds, stake, outcome] = row;
    if (!outcome) return;
    const lowerOutcome = outcome.toLowerCase();
    let profit = 0;
    if (lowerOutcome === 'win') profit = parseFloat(stake) * (parseFloat(odds) - 1);
    else if (lowerOutcome === 'loss') profit = -parseFloat(stake);
    cumulativeProfit += profit;
    labels.push(date);
    profits.push(cumulativeProfit);
  });

  const ctx = document.getElementById('profitChart');
  if (ctx) {
    new Chart(ctx.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cumulative Profit',
          data: profits,
          borderColor: '#FFD700',
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          borderWidth: 2
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

async function loadData() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'block';

  try {
    console.log('Starting data load process...');
    const dashboardData = await fetchCSV(dashboardUrl);
    console.log('Dashboard data loaded, rows:', dashboardData.length);
    const dashboardTable = createTableFromCSV(dashboardData);
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (dashboardContainer) dashboardContainer.appendChild(dashboardTable);

    const tipsData = await fetchCSV(tipsUrl);
    console.log('Tips data loaded, rows:', tipsData.length);
    tipsDataGlobal = tipsData;

    const sortedTips = tipsData.slice(1).sort((a, b) => new Date(b[0]) - new Date(a[0]));
    const tipsTbody = document.querySelector('.dataTable tbody');
    if (tipsTbody) {
      tipsTbody.innerHTML = '';
      sortedTips.forEach(row => {
        if (!row.join('').trim()) return;
        const [date, tournament, tip, odds, stake, outcome] = row;
        const lowerOutcome = outcome ? outcome.toLowerCase() : '';
        let outcomeClass = '';
        if (lowerOutcome === 'win') outcomeClass = 'win';
        else if (lowerOutcome === 'loss') outcomeClass = 'loss';
        else if (lowerOutcome.includes('void')) outcomeClass = 'void';
        else if (lowerOutcome.includes('pending')) outcomeClass = 'pending';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${date || ''}</td>
          <td>${tournament || ''}</td>
          <td>${tip || ''}</td>
          <td>${odds || ''}</td>
          <td>${stake || ''}</td>
          <td class="${outcomeClass}">${outcome || ''}</td>
        `;
        tipsTbody.appendChild(tr);
      });

      $('#tipsTable').DataTable({
        paging: true,
        pageLength: 20,
        searching: true,
        ordering: true,
        responsive: true,
        order: []
      });
    }

    createProfitChart(tipsData.slice(1));
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) lastUpdated.textContent = `Last Updated: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}`;
  } catch (error) {
    console.error('Data loading failed:', error);
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) lastUpdated.textContent = 'Error: Data not loaded. Check CSV files or format.';
  } finally {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
}

// Export functionality
document.addEventListener('DOMContentLoaded', () => {
  const exportCsv = document.getElementById('exportCsv');
  if (exportCsv) {
    exportCsv.addEventListener('click', function() {
      const csv = Papa.unparse(tipsDataGlobal);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'tips_log.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
});
