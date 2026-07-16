import React, { useState, useEffect } from "react";
import { getInterestPosted } from "../api";
import Toast from "../components/Toast";

const InterestPosted = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp = await getInterestPosted();
      setData(resp.data.data || []);
    } catch (e) {
      Toast.error(e.response?.data?.error || "Failed to load posted historical data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="interest-posted-tab-content">
      {/* Fetch button panel */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={fetchData}
          disabled={loading}
          style={{ padding: '0.6rem 1.6rem', fontSize: '0.9rem' }}
        >
          {loading ? 'Refeshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', marginTop: '1rem' }}>Loading HANA View...</p>}
      
      {!loading && data.length === 0 && (
        <div className="empty-state" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <div className="icon">📄</div>
          <p>No historical interest posts found.</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="table-container" style={{ marginTop: '1rem', overflowX: 'auto', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
          <table className="sales-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>BP Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Customer Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Period Start</th>
                <th style={{ padding: '0.75rem 1rem' }}>Period End</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Interest Amount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>SAP JE #</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.docNum} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.6rem 1rem' }}>#{row.docNum}</td>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: '500' }}>{row.cardCode}</td>
                  <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>{row.cardName}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>{row.periodStart}</td>
                  <td style={{ padding: '0.6rem 1rem' }}>{row.periodEnd}</td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 'bold' }}>{row.interestAmount.toFixed(2)}</td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: row.sapJEEntry ? 'var(--primary)' : 'inherit' }}>
                    {row.sapJEEntry ? row.sapJEEntry : '-'}
                  </td>
                  <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                    {row.syncStatus === 'S' && <span style={{ color: 'green', fontWeight: 'bold' }}>SUCCESS</span>}
                    {row.syncStatus === 'P' && <span style={{ color: 'orange', fontWeight: 'bold' }}>PENDING</span>}
                    {row.syncStatus === 'E' && <span style={{ color: 'red', fontWeight: 'bold' }}>ERROR</span>}
                    {row.syncStatus === 'F' && <span style={{ color: 'darkred', fontWeight: 'bold' }}>FAILED</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InterestPosted;
