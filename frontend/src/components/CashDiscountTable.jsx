import React, { useState } from 'react'
import { postCashDiscount } from '../api'

export default function CashDiscountTable({ data, total, limit, offset, loading, onRefresh }) {
  const [postingRows, setPostingRows] = useState({})

  const handlePost = async (row) => {
    const rowId = row.TransID || row.DCP_No
    setPostingRows(prev => ({ ...prev, [rowId]: true }))
    try {
      await postCashDiscount({
        TransID: row.TransID || 0,
        SoldToCode: row.SoldToCode || '',
        SoldTo: row.SoldTo || '',
        DCP_No: row.DCP_No || '',
        DCP_DATE: row.DCP_DATE || '',
        Prod_Desc: row.Prod_Desc || '',
        Quantity: row.Quantity || 0,
        Due_Date: row.Due_Date || '',
        RectDate: row.RectDate || '',
        CD: row.CD || 0,
        EPI: row.EPI || 0,
        EPI_Days: row.EPI_Days || 0,
        CD_Amount: row.CD_Amount || 0,
        EPI_Amount: row.EPI_Amount || 0,
        Balance: row.Balance || 0,
        Net_Amount: row.Net_Amount || 0
      })
      alert(`Successfully posted for ${row.SoldTo}`)
    } catch (err) {
      alert(`Failed to post: ${err.response?.data?.error || err.message}`)
    } finally {
      setPostingRows(prev => ({ ...prev, [rowId]: false }))
    }
  }
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
  const formatCell = (key, val) => {
    if (val === null || val === undefined) return ''
    
    // Check if it's a date column
    if (['DCP_DATE', 'Due_Date', 'RectDate'].includes(key)) {
      if (!val) return ''
      try {
        const d = new Date(val)
        if (!isNaN(d)) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        }
      } catch (e) {
        return val
      }
    }

    if (typeof val === 'number') {
      return val.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    }
    return val
  }

  const displayCols = [
    { key: 'SoldTo', label: 'Customer Name' },
    { key: 'DCP_No', label: 'DCPI Number' },
    { key: 'DCP_DATE', label: 'Date' },
    { key: 'Prod_Desc', label: 'Product Desc' },
    { key: 'Quantity', label: 'Quantity' },
    { key: 'Due_Date', label: 'Due Date' },
    { key: 'RectDate', label: 'Rect Date' },
    { key: 'CD', label: 'CD Rate' },
    { key: 'EPI', label: 'EPI Rate' },
    { key: 'EPI_Days', label: 'EPI Days' },
    { key: 'CD_Amount', label: 'CD Amount' },
    { key: 'EPI_Amount', label: 'EPI Amount' },
    { key: 'Balance', label: 'Balance' },
    { key: 'Net_Amount', label: 'Net Amount' }
  ]

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
              {displayCols.map((col, idx) => (
                <th key={idx}>{col.label}</th>
              ))}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => {
              const rowId = row.TransID || row.DCP_No
              return (
                <tr key={rowIdx}>
                  {displayCols.map((col, colIdx) => (
                    <td key={colIdx}>{formatCell(col.key, row[col.key])}</td>
                  ))}
                  <td>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handlePost(row)}
                      disabled={postingRows[rowId]}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      {postingRows[rowId] ? 'Posting...' : 'Post'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} records</span>
      </div>
    </div>
  )
}
