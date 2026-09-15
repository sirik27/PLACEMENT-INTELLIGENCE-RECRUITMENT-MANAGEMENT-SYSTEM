/**
 * Export utilities for TPO and Recruiters to export student exam evaluation results.
 * Supports CSV/Excel format download and formatted printable PDF reports.
 */

// 1. Export results to CSV / Excel readable file
export function exportResultsToCSV(results, driveName = 'Drive_Evaluation_Results') {
  if (!results || results.length === 0) {
    alert('No evaluation results available to export.');
    return;
  }

  const headers = ['Roll Number', 'Student Name', 'Department', 'Exam Type', 'Score (%)', 'Status', 'Date Completed'];
  const rows = results.map(r => [
    `"${r.rollNo || 'N/A'}"`,
    `"${r.name || 'Student'}"`,
    `"${r.department || 'CSE'}"`,
    `"${r.examType || 'Assessment'}"`,
    `"${r.score || 0}%"`,
    `"${r.status || (r.score >= 60 ? 'PASSED' : 'FAILED')}"`,
    `"${r.date ? new Date(r.date).toLocaleDateString() : new Date().toLocaleDateString()}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${driveName.replace(/\s+/g, '_')}_Results_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Export results to formatted Printable PDF / Document
export function exportResultsToPDF(results, driveName = 'Drive_Evaluation_Results') {
  if (!results || results.length === 0) {
    alert('No evaluation results available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups to print PDF report.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${driveName} — Official Evaluation Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #111827; }
          h1 { color: #4f46e5; margin-bottom: 4px; }
          p { color: #6b7280; font-size: 14px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
          th { background: #f3f4f6; color: #374151; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .status-passed { color: #059669; font-weight: bold; }
          .status-failed { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>PlaceSmart Enterprise — Exam Evaluation Report</h1>
        <p>Drive: <strong>${driveName}</strong> • Generated on ${new Date().toLocaleString()}</p>

        <table>
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Exam Type</th>
              <th>Score (%)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => {
              const isPass = (r.score || 0) >= 60;
              return `
                <tr>
                  <td><strong>${r.rollNo || 'N/A'}</strong></td>
                  <td>${r.name || 'Student'}</td>
                  <td>${r.department || 'CSE'}</td>
                  <td>${r.examType || 'Assessment'}</td>
                  <td><strong>${r.score || 0}%</strong></td>
                  <td class="${isPass ? 'status-passed' : 'status-failed'}">${r.status || (isPass ? 'PASSED' : 'FAILED')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          VBIT Placement Intelligence & Recruitment Management System • Official Registrar & TPO Copy
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
