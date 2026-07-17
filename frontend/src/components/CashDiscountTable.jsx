import React, { useState } from 'react'
import { postCashDiscount } from '../api'

export default function CashDiscountTable({ data, total, limit, offset, loading, onRefresh, readOnly }) {
  const [postingRows, setPostingRows] = useState({})
  const [hiddenRows, setHiddenRows] = useState({})
  const [showZeroCD, setShowZeroCD] = useState(false)

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
        New_Due_Date: row.New_Due_Date || '',
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
      setHiddenRows(prev => ({ ...prev, [rowId]: true }))
    } catch (err) {
      alert(`Failed to post: ${err.response?.data?.error || err.message}`)
    } finally {
      setPostingRows(prev => ({ ...prev, [rowId]: false }))
    }
  }

  const unhiddenData = (data || []).filter(row => !hiddenRows[row.TransID || row.DCP_No])
  let visibleData = showZeroCD ? unhiddenData : unhiddenData.filter(row => (row.CD_Amount || 0) !== 0)

  visibleData = [...visibleData].sort((a, b) => {
    const nameA = (a.SoldTo || '').toLowerCase()
    const nameB = (b.SoldTo || '').toLowerCase()
    if (nameA < nameB) return -1
    if (nameA > nameB) return 1
    const dateA = new Date(a.DCP_DATE || 0)
    const dateB = new Date(b.DCP_DATE || 0)
    return dateA - dateB
  })

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

  const formatNumber = (val) => {
    if (val === null || val === undefined) return '0.00'
    return Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  }

  const formatDate = (val) => {
    if (!val) return ''
    const d = new Date(val)
    return !isNaN(d) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : val
  }

  return (
    <div className="table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Cash Discount Data</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!readOnly && (
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={showZeroCD} 
                onChange={(e) => setShowZeroCD(e.target.checked)} 
                style={{ marginRight: '0.5rem' }}
              />
              Show 0 CD Records
            </label>
          )}
          <button className="btn btn-ghost" onClick={onRefresh}>↻ Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>SoldTo</th>
              <th>DCP No</th>
              <th>DCP Date</th>
              <th>Prod Desc</th>
              <th>Quantity</th>
              <th>Due Date</th>
              <th>Rect Date</th>
              <th>CD Rate</th>
              <th>EPI Rate</th>
              <th>EPI Days</th>
              <th>CD Amount</th>
              <th>EPI Amount</th>
              <th>Balance</th>
              <th>Net Amount</th>
              <th>Processed</th>
              {!readOnly && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, idx) => {
              const rowId = row.TransID || row.DCP_No
              const isPosting = postingRows[rowId]
              const isProcessed = hiddenRows[rowId]
              
              return (
                <tr key={idx}>
                  <td>{row.SoldTo}</td>
                  <td>{row.DCP_No}</td>
                  <td>{formatDate(row.DCP_DATE)}</td>
                  <td>{row.Prod_Desc}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.Quantity)}</td>
                  <td>{formatDate(row.Due_Date)}</td>
                  <td>{formatDate(row.RectDate)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.CD)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.EPI)}</td>
                  <td style={{ textAlign: 'right' }}>{row.EPI_Days}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.CD_Amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.EPI_Amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(row.Balance)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatNumber(row.Net_Amount)}</td>
                  <td style={{ textAlign: 'center' }}>{isProcessed ? "Yes" : (row.Processed === 'Y' ? "Yes" : "No")}</td>
                  {!readOnly && (
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => handlePost(row)}
                      disabled={isPosting || isProcessed || (row.CD_Amount || 0) === 0}
                    >
                      {isPosting ? 'Posting...' : 'Post'}
                    </button>
                  </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <span>Showing {(offset || 0) + 1} to {Math.min((offset || 0) + (limit || visibleData.length), total !== undefined ? total : visibleData.length)} of {total !== undefined ? total : visibleData.length} records</span>
      </div>
    </div>
  )
}
