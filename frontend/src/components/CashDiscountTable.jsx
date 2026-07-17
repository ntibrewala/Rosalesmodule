import React, { useState } from 'react'
import { postCashDiscount } from '../api'

const COLUMNS = [
  { key: 'SoldTo', label: 'SoldTo' },
  { key: 'DCP_No', label: 'DCP No' },
  { key: 'DCP_DATE', label: 'DCP Date', type: 'date' },
  { key: 'Prod_Desc', label: 'Prod Desc' },
  { key: 'Quantity', label: 'Quantity', type: 'number' },
  { key: 'Due_Date', label: 'Due Date', type: 'date' },
  { key: 'RectDate', label: 'Rect Date', type: 'date' },
  { key: 'CD', label: 'CD Rate', type: 'number' },
  { key: 'EPI', label: 'EPI Rate', type: 'number' },
  { key: 'EPI_Days', label: 'EPI Days', type: 'number' },
  { key: 'CD_Amount', label: 'CD Amount', type: 'number' },
  { key: 'EPI_Amount', label: 'EPI Amount', type: 'number' },
  { key: 'Balance', label: 'Balance', type: 'number' },
  { key: 'Net_Amount', label: 'Net Amount', type: 'number', bold: true },
  { key: 'Processed', label: 'Processed', align: 'center' }
]

export default function CashDiscountTable({ data, total, limit, offset, loading, onRefresh, readOnly }) {
  const [postingRows, setPostingRows] = useState({})
  const [hiddenRows, setHiddenRows] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: 'SoldTo', direction: 'asc' })
  const [filters, setFilters] = useState({})

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

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // 1. Remove posted and 0 CD rows permanently
  const unhiddenData = (data || []).filter(row => !hiddenRows[row.TransID || row.DCP_No])
  let visibleData = unhiddenData.filter(row => (row.CD_Amount || 0) !== 0)

  // 2. Filter based on inputs
  visibleData = visibleData.filter(row => {
    for (const key in filters) {
      if (filters[key]) {
        let rowValue = String(row[key] || '').toLowerCase()
        if (key === 'Processed') {
           const isProcessed = hiddenRows[row.TransID || row.DCP_No] ? "yes" : (row.Processed === 'Y' ? "yes" : "no")
           rowValue = isProcessed
        }
        if (!rowValue.includes(filters[key].toLowerCase())) {
          return false
        }
      }
    }
    return true
  })

  // 3. Sort
  visibleData = [...visibleData].sort((a, b) => {
    const aVal = a[sortConfig.key] || ''
    const bVal = b[sortConfig.key] || ''
    
    if (sortConfig.key === 'DCP_DATE' || sortConfig.key === 'Due_Date' || sortConfig.key === 'RectDate') {
       const dateA = new Date(aVal)
       const dateB = new Date(bVal)
       return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
    } else if (!isNaN(Number(aVal)) && !isNaN(Number(bVal)) && aVal !== '' && bVal !== '') {
       return sortConfig.direction === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
    } else {
       const strA = String(aVal).toLowerCase()
       const strB = String(bVal).toLowerCase()
       if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
       if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
       return 0
    }
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
          <button className="btn btn-ghost" onClick={onRefresh}>↻ Refresh</button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} style={{ minWidth: col.type === 'date' ? '120px' : 'auto', verticalAlign: 'top' }}>
                  <div 
                    onClick={() => handleSort(col.key)} 
                    style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: col.type === 'number' ? 'flex-end' : (col.align || 'flex-start') }}
                  >
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span style={{ marginLeft: '4px' }}>
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Filter..." 
                    onChange={e => handleFilterChange(col.key, e.target.value)} 
                    style={{ 
                      width: '100%', 
                      marginTop: '6px', 
                      padding: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'normal',
                      border: '1px solid #ccc',
                      borderRadius: '3px',
                      background: 'white',
                      color: 'black',
                      boxSizing: 'border-box'
                    }} 
                  />
                </th>
              ))}
              {!readOnly && <th style={{ verticalAlign: 'top' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, idx) => {
              const rowId = row.TransID || row.DCP_No
              const isPosting = postingRows[rowId]
              const isProcessed = hiddenRows[rowId] || row.Processed === 'Y'
              
              return (
                <tr key={idx}>
                  {COLUMNS.map(col => {
                    let cellValue = row[col.key]
                    if (col.key === 'Processed') {
                      cellValue = isProcessed ? "Yes" : "No"
                    } else if (col.type === 'date') {
                      cellValue = formatDate(cellValue)
                    } else if (col.type === 'number') {
                      cellValue = formatNumber(cellValue)
                    }

                    return (
                      <td 
                        key={col.key} 
                        style={{ 
                          textAlign: col.type === 'number' ? 'right' : (col.align || 'left'),
                          fontWeight: col.bold ? 'bold' : 'normal'
                        }}
                      >
                        {cellValue}
                      </td>
                    )
                  })}
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
