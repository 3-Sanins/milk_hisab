// Wait for DOM and Firebase
document.addEventListener('DOMContentLoaded', function() {
  const monthSelector = document.getElementById('monthSelector');
  const loadDataBtn = document.getElementById('loadDataBtn');
  const tableSection = document.getElementById('tableSection');
  const tableBody = document.getElementById('tableBody');
  const monthTitle = document.getElementById('monthTitle');
  const totalSection = document.getElementById('totalSection');
  const noDataMsg = document.getElementById('noDataMsg');

  // Default: Current month set karo
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
  monthSelector.value = `${currentYear}-${currentMonth}`;

  // Months array for display (Hindi/English)
  const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

  // Function to load data for selected month
  function loadMonthData() {
    const selectedMonth = monthSelector.value; // e.g., "2024-05"
    if (!selectedMonth) {
      alert('Month select karo!');
      return;
    }

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDateObj = new Date(year, parseInt(month), 0);
const endDate = `${year}-${month}-${String(endDateObj.getDate()).padStart(2, '0')}`;

    monthTitle.innerHTML = `${monthNames[parseInt(month) - 1]} ${year} का Data`;

    // Fetch all entries from Firebase
    db.ref('milk-entries').once('value').then((snapshot) => {
      const allData = snapshot.val() || {};
      const monthEntries = [];

      // Filter entries for this month
      Object.values(allData).forEach(entry => {
        const entryDate = entry.date;
        if (entryDate >= startDate && entryDate <= endDate) {
          monthEntries.push(entry);
        }
      });

      // Sort: Date ascending, then shift (morning first)
      monthEntries.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.shift === 'morning' && b.shift === 'evening' ? -1 : 1;
      });

      // Display Table
      if (monthEntries.length > 0) {
        tableBody.innerHTML = '';
        let totalAmount = 0;

        monthEntries.forEach(entry => {
          const row = document.createElement('tr');
          const dateObj = new Date(entry.date);
          const formattedDate = dateObj.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const shiftText = entry.shift === 'morning' ? 'Subah' : 'Shaam';
          const amount = parseFloat(entry.amount).toFixed(2);

          row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${shiftText}</td>
                        <td>₹ ${amount}</td>
                    `;
          tableBody.appendChild(row);

          totalAmount += parseFloat(entry.amount);
        });

        // Total
        totalSection.innerHTML = `<strong>Total Money for ${monthNames[parseInt(month) - 1]} ${year}: ₹ ${totalAmount.toFixed(2)}</strong>`;
        tableSection.style.display = 'block';
        noDataMsg.style.display = 'none';
      } else {
        tableSection.style.display = 'none';
        noDataMsg.style.display = 'block';
        noDataMsg.innerHTML = `<p>${monthNames[parseInt(month) - 1]} ${year} में कोई entries नहीं हैं।</p>`;
      }
    }).catch((error) => {
      console.error('Error fetching data:', error);
      alert('Data load error: ' + error.message);
    });
  }

  // Events
  loadDataBtn.addEventListener('click', loadMonthData);
  monthSelector.addEventListener('change', loadMonthData); // Auto-load on change

  // Initial load for current month
  loadMonthData();
});
