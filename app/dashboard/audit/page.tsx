// app/dashboard/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';

type AuditLog = {
  timestamp: string;
  agentId: string;
  toolName: string;
  status: string;
  riskScore: number;
};

export default function AuditDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 Relay Audit Dashboard</h1>
      <p>Real-time security logs for your AI agents</p>

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <table border={1} cellPadding={10} style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th>Time</th>
              <th>Agent ID</th>
              <th>Tool</th>
              <th>Status</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>
                  No logs yet. Make some tool calls!
                </td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={i}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.agentId}</td>
                  <td>{log.toolName}</td>
                  <td>{log.status}</td>
                  <td>{log.riskScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}