import React, { useEffect, useState } from 'react';

const AdminDashboard: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success) setStatus(data.data);
        else setError('Failed to load status');
      })
      .catch((err) => setError(err.message));

    fetch('/api/admin/metrics')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success) setMetrics(data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {error && <div className="text-red-600">{error}</div>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Platform Status</h2>
        {status ? (
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(status, null, 2)}</pre>
        ) : (
          <div>Loading...</div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Metrics</h2>
        {metrics ? (
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(metrics, null, 2)}</pre>
        ) : (
          <div>Loading...</div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
