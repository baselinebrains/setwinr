// app.js - Fetch data from Google Sheets and populate tables

const dashboardUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1SqB34ONUqDxXRd6w8vc2VqpaumUypOxIuK-4sTQ6zCr6MHFP-2VsICOr5ILqzg/pub?gid=1265439786&single=true&output=csv';
const tipsUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR1SqB34ONUqDxXRd6w8vc2VqpaumUypOxIuK-4sTQ6zCr6MHFP-2VsICOr5ILqzg/pub?gid=1251556089&single=true&output=csv';

let tipsDataGlobal = []; // To store tips data for export and charts

async function fetchCSV(url) {
  const response = await fetch(url);
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, {header: false, skipEmptyLines: true});
  return parsed.data;
}

function createTableFromCSV(data) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Header row
  const headerRow = document.createElement('tr');
  data[0].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.setAttribute('aria-label', header);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Data rows
  data.slice(1).forEach(rowData => {
    if (rowData.every(cell => !cell)) return; // Skip empty rows
    const tr = document.createElement('tr');
    rowData.forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = cell;
      if (index === 0) { // Metric column
        const lowerCell = cell.toLowerCase();
        if (lowerCell === 'wins') {
          td.className = 'win';
        } else if (lowerCell === 'losses') {
          td.className = 'loss';
        } else if (lowerCell.includes('void')) {
          td.className = 'void';
        }
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
  // Sort by date ascending for cumulative profit
  tipsData.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  let cumulativeProfit = 0;
  const labels = [];
  const profits = [];

  tipsData.forEach(row => {
    const [date, , , odds, stake, outcome] = row;
    if (!outcome) return;
    const lowerOutcome = outcome.toLowerCase();
    let profit = 0;
    if (lowerOutcome === 'win') {
      profit = parseFloat(stake) * (parseFloat(odds) - 1);
    } else if (lowerOutcome === 'loss') {
      profit = -parseFloat(stake);
    } // void or pending = 0
    cumulativeProfit += profit;
    labels.push(date);
    profits.push(cumulativeProfit);
  });

  const ctx = document.getElementById('profitChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cumulative Profit',
        data: profits,
        borderColor: '#
