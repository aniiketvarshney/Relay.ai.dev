// app/dashboard/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AuditDashboard() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/audit/logs')
      .then(res => res.json())
      .then(data => setLogs(data.logs || []));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🔍 Relay Audit Dashboard</h1>
      <p>Security logs for your AI agents</p>
      
      <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Agent</th>
            <th>Tool</th>
            <th>Status</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: any, i) => (
            <tr key={i}>
              <td>{log.timestamp}</td>
              <td>{log.agentId}</td>
              <td>{log.toolName}</td>
              <td>{log.status}</td>
              <td>{log.riskScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}