import React from 'react'

export default function CashDiscountTable({ data, columns, total, limit, offset, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="table-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto 1rem' }} />
        <p>Loading Cash Discount data...</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>No Cash Discount records found for this period.</p>
      </div>
    )
  }

  // Format numbers to 2 decimal places if applicable
  const formatCell = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    }
    return val
  }

  return (
    <div className="table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Cash Discount Data</h3>
        <button className="btn btn-ghost" onClick={onRefresh}>↻ Refresh</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx}>{formatCell(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} records</span>
      </div>
    </div>
  )
}
