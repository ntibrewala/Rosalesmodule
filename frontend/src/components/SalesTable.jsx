import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

// Key fields shown in compact mode
const KEY_FIELDS = [
  { key: 'dcpNo',       label: 'DCP No' },
  { key: 'dcpDate',     label: 'DCP Date' },
  { key: 'orderNo',     label: 'Order No' },
  { key: 'orderDate',   label: 'Order Date' },
  { key: 'soldTo',      label: 'Sold To' },
  { key: 'shipToName',  label: 'Ship To' },
  { key: 'groupCompanyName', label: 'Group' },
  { key: 'materialType',label: 'Material' },
  { key: 'prodDesc',    label: 'Description' },
  { key: 'quantity',    label: 'Qty' },
  { key: 'unit',        label: 'Unit' },
  { key: 'amount',      label: 'Amount' },
  { key: 'tax',         label: 'Tax' },
  { key: 'totalAmt',    label: 'Total Amt' },
  { key: 'retailInvoice', label: 'Invoice' },
  { key: 'truckNo',     label: 'Truck No' },
  { key: 'ewayBillNo',  label: 'E-Way Bill' },
  { key: 'postFlag',    label: 'Status' },
]

// All fields
const ALL_FIELDS = [
  { key: 'srNo',              label: 'Sr No' },
  { key: 'createDate',        label: 'Create Date' },
  { key: 'dcpNo',             label: 'DCP No' },
  { key: 'dcpDate',           label: 'DCP Date' },
  { key: 'orderNo',           label: 'Order No' },
  { key: 'orderDate',         label: 'Order Date' },
  { key: 'soldToCode',        label: 'Sold To Code' },
  { key: 'soldTo',            label: 'Sold To' },
  { key: 'shipTo',            label: 'Ship To Code' },
  { key: 'shipToName',        label: 'Ship To Name' },
  { key: 'shipToCity',        label: 'City' },
  { key: 'groupCompany',      label: 'Group Code' },
  { key: 'groupCompanyName',  label: 'Group Name' },
  { key: 'product',           label: 'Product Code' },
  { key: 'prodDesc',          label: 'Product Desc' },
  { key: 'materialType',      label: 'Material Type' },
  { key: 'quantity',          label: 'Quantity' },
  { key: 'unit',              label: 'Unit' },
  { key: 'plant',             label: 'Plant' },
  { key: 'plantName',         label: 'Plant Name' },
  { key: 'amount',            label: 'Amount' },
  { key: 'tax',               label: 'Tax' },
  { key: 'totalAmt',          label: 'Total Amt' },
  { key: 'totalAmtPayable',   label: 'Total Payable' },
  { key: 'tdsAmount',         label: 'TDS' },
  { key: 'tcsAmount',         label: 'TCS' },
  { key: 'retailInvoice',     label: 'Retail Invoice' },
  { key: 'taxInvoiceNo',      label: 'Tax Invoice' },
  { key: 'gstInvoice',        label: 'GST Invoice' },
  { key: 'currency',          label: 'Currency' },
  { key: 'paymentMethod',     label: 'Pay Method' },
  { key: 'paymentMethodDesc', label: 'Pay Method Desc' },
  { key: 'paymentTerm',       label: 'Pay Term' },
  { key: 'lorryReceiptNo',    label: 'LR No' },
  { key: 'truckNo',           label: 'Truck No' },
  { key: 'transportName',     label: 'Transporter' },
  { key: 'ewayBillNo',        label: 'E-Way Bill' },
  { key: 'batchNo',           label: 'Batch No' },
  { key: 'centralTax',        label: 'CGST' },
  { key: 'stateTax',          label: 'SGST' },
  { key: 'integratedTax',     label: 'IGST' },
  { key: 'unionTerritoryGST', label: 'UTGST' },
  { key: 'productHsnCode',    label: 'HSN Code' },
  { key: 'plantGstNumber',    label: 'Plant GST' },
  { key: 'bpGstNumber',       label: 'BP GST' },
  { key: 'salesOffice',       label: 'Sales Office' },
  { key: 'payer',             label: 'Payer No' },
  { key: 'payerName',         label: 'Payer Name' },
  { key: 'billToNo',          label: 'Bill To No' },
  { key: 'billToName',        label: 'Bill To Name' },
  { key: 'freightPayMethod',  label: 'Freight Pay' },
  { key: 'freightPayMethodDesc', label: 'Freight Pay Desc' },
  { key: 'contractNo',        label: 'Contract No' },
  { key: 'boeNo',             label: 'BOE No' },
  { key: 'boeDate',           label: 'BOE Date' },
  { key: 'sorDate',           label: 'SOR Date' },
  { key: 'sorAmt',            label: 'SOR Amt' },
  { key: 'poNumber',          label: 'PO No' },
  { key: 'poDate',            label: 'PO Date' },
  { key: 'lcScrollNo',        label: 'LC Scroll' },
  { key: 'customerLcNo',      label: 'Customer LC' },
  { key: 'sourcePlant',       label: 'Source Plant' },
  { key: 'sourcePlantName',   label: 'Source Plant Name' },
  { key: 'freightInvoice',    label: 'Freight Invoice' },
  { key: 'freightAmt',        label: 'Freight Amt' },
  { key: 'customDuty',        label: 'Custom Duty' },
  { key: 'customAmount',      label: 'Custom Amt' },
  { key: 'sorGstNo',          label: 'SOR GST' },
  { key: 'distributionChannel', label: 'Dist Channel' },
  { key: 'division',          label: 'Division' },
  { key: 'postFlag',          label: 'Status' },
  { key: 'transId',           label: 'Trans ID' },
]

const fmt = (key, val) => {
  if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>
  if (['amount','tax','totalAmt','totalAmtPayable','tdsAmount','freightAmt','customAmount','sorAmt','quantity'].includes(key)) {
    const n = parseFloat(val)
    if (!isNaN(n)) return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  if (key === 'postFlag') {
    const map = { S: 'badge-green', E: 'badge-red', P: 'badge-yellow' }
    return <span className={`badge ${map[val] || 'badge-blue'}`}>{val}</span>
  }
  return String(val)
}

function exportExcel(data, fields) {
  const wb = XLSX.utils.book_new()
  
  // Format data specifically for Excel
  const wsData = data.map(row => {
    const r = {}
    fields.forEach(f => Object.assign(r, { [f.label]: row[f.key] }))
    return r
  })
  
  const ws = XLSX.utils.json_to_sheet(wsData)
  XLSX.utils.book_append_sheet(wb, ws, "Sales Records")
  XLSX.writeFile(wb, `TEC_Sales_Records_${Date.now()}.xlsx`)
}

export default function SalesTable({ data, total, limit, offset, onPageChange, loading }) {
  const [showAll, setShowAll] = useState(false)
  const fields = showAll ? ALL_FIELDS : KEY_FIELDS
  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  // Local sorting and filtering
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' })
  const [colFilters, setColFilters] = useState({})
  
  // Header Dropdown tracking
  const [activeMenu, setActiveMenu] = useState(null) // holds field 'key'
  const menuRef = useRef(null)

  // Derived filtered & sorted data
  const processedData = useMemo(() => {
    let d = [...data]
    
    // 1. Column Search
    Object.entries(colFilters).forEach(([colKey, searchStr]) => {
      if (!searchStr) return
      const lower = searchStr.toLowerCase()
      d = d.filter(row => String(row[colKey] || '').toLowerCase().includes(lower))
    })

    // 2. Sort
    if (sortConfig.key) {
      d.sort((a, b) => {
        const valA = a[sortConfig.key]
        const valB = b[sortConfig.key]
        if (valA === valB) return 0
        if (valA === null || valA === undefined || valA === '') return 1
        if (valB === null || valB === undefined || valB === '') return -1
        
        let res = 0
        if (typeof valA === 'number' && typeof valB === 'number') {
          res = valA - valB
        } else {
          res = String(valA).localeCompare(String(valB))
        }
        return sortConfig.dir === 'asc' ? res : -res
      })
    }
    return d
  }, [data, colFilters, sortConfig])

  // Reset local column filters when the master server data changes
  useEffect(() => {
    setSortConfig({ key: null, dir: 'asc' })
    setColFilters({})
  }, [data])

  // Click outside listener for menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null)
    }
    if (activeMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeMenu])

  const pageNums = useCallback(() => {
    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end   = Math.min(totalPages, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  // Summary stats (Run on filtered grid)
  const totalAmount  = processedData.reduce((s, r) => s + (r.amount  || 0), 0)
  const totalQty     = processedData.reduce((s, r) => s + (r.quantity || 0), 0)
  const totalPayable = processedData.reduce((s, r) => s + (r.totalAmtPayable || 0), 0)

  return (
    <div>
      {/* Stats */}
      {data.length > 0 && (
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Records (this list)</div>
            <div className="stat-value">{processedData.length.toLocaleString()}</div>
            <div className="stat-sub">of {total.toLocaleString()} Server records</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Quantity</div>
            <div className="stat-value">{totalQty.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div className="stat-sub">MT</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Amount</div>
            <div className="stat-value">₹{(totalAmount/1e7).toFixed(2)} Cr</div>
            <div className="stat-sub">{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Payable</div>
            <div className="stat-value">₹{(totalPayable/1e7).toFixed(2)} Cr</div>
            <div className="stat-sub">incl. TDS/TCS</div>
          </div>
        </div>
      )}

      <div className="table-container">
        {/* Header */}
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem' }}>Sales Records</h2>
            {total > 0 && <span className="badge badge-blue">{total.toLocaleString()} server rows</span>}
            {loading && <span className="spinner" />}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* All / Key fields toggle */}
            <div className="toggle-wrap" style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '0.4rem 0.8rem',
              borderRadius: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: showAll ? '500' : 'bold', color: showAll ? 'rgba(255,255,255,0.7)' : '#ffffff', transition: 'all 0.2s' }}>Key Fields</span>
              <label className="toggle" style={{ margin: 0 }}>
                <input type="checkbox" id="fields-toggle" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
                <span className="slider" />
              </label>
              <span style={{ fontSize: '0.85rem', fontWeight: showAll ? 'bold' : '500', color: showAll ? '#ffffff' : 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}>All Fields</span>
            </div>
            {data.length > 0 && (
              <button id="export-excel-btn" className="btn btn-secondary" style={{ backgroundColor: '#217346', color: 'white' }} onClick={() => exportExcel(processedData, fields)}>
                ⬇ Excel
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {data.length === 0 && !loading ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No records found.<br />Apply filters and click <strong>Fetch Sales</strong>.</p>
          </div>
        ) : (
          <div className="table-scroll" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {fields.map(f => (
                    <th key={f.key}>
                      <div className="th-content" onClick={() => setActiveMenu(activeMenu === f.key ? null : f.key)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                           {f.label} 
                           {sortConfig.key === f.key && (sortConfig.dir === 'asc' ? ' ↑' : ' ↓')}
                        </span>
                        <span style={{ opacity: colFilters[f.key] ? 1 : 0.3 }}>⋮</span>
                      </div>

                      {/* Filter/Sort Popover Menu */}
                      {activeMenu === f.key && (
                        <div ref={menuRef} className="col-menu">
                          <button onClick={(e) => { e.stopPropagation(); setSortConfig({ key: f.key, dir: 'asc' }); setActiveMenu(null) }}>↑ Sort Ascending</button>
                          <button onClick={(e) => { e.stopPropagation(); setSortConfig({ key: f.key, dir: 'desc' }); setActiveMenu(null) }}>↓ Sort Descending</button>
                          <button style={{ color: 'var(--primary)' }} onClick={(e) => { 
                            e.stopPropagation()
                            setSortConfig({ key: null, dir: 'asc' })
                            setColFilters(prev => ({...prev, [f.key]: ''}))
                            setActiveMenu(null) 
                          }}>✕ Clear Filter & Sort</button>
                          
                          <div className="col-menu-divider" />
                          <input 
                            type="text" 
                            className="col-menu-input" 
                            placeholder="Filter column..." 
                            value={colFilters[f.key] || ''}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setColFilters(p => ({...p, [f.key]: e.target.value}))}
                          />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processedData.length > 0 ? processedData.map((row, i) => (
                  <tr key={row.srNo ?? i}>
                    {fields.map(f => (
                      <td key={f.key}>{fmt(f.key, row[f.key])}</td>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={fields.length} style={{ textAlign:'center', padding: '2rem' }}>No rows matching column filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer pagination */}
        {total > 0 && (
          <div className="table-footer">
            <span>
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()} server records
            </span>
            <div className="pagination">
              <button className="page-btn" disabled={currentPage === 1}
                onClick={() => onPageChange(offset - limit)}>‹</button>
              {pageNums().map(p => (
                <button key={p} className={`page-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange((p - 1) * limit)}>{p}</button>
              ))}
              <button className="page-btn" disabled={currentPage >= totalPages}
                onClick={() => onPageChange(offset + limit)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
