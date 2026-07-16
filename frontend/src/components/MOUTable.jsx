import { useState, useMemo, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

import { getUserPrefs, saveUserPrefs } from '../api'

export default function MOUTable({ data, columns, total, limit, offset, loading, onRefresh }) {
  // Extract all dynamic field keys from data
  const allFields = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map(c => ({ key: c, label: c }))
    }
    if (!data || data.length === 0) return []
    const keys = Object.keys(data[0])
    return keys.map(k => ({ key: k, label: k })) // Fallback if columns is missing
  }, [data, columns])

  // Track hidden columns
  const [hiddenCols, setHiddenCols] = useState({})
  const [initialApplyDone, setInitialApplyDone] = useState(false)

  // Fetch from HANA exactly once when component loads or allFields become available
  useEffect(() => {
    if (allFields.length === 0) return; // Wait for data to arrive before fetching prefs

    getUserPrefs('MOUTab').then(res => {
      
      if (res.data && res.data.columns && res.data.columns.length > 0) {
        const visibleSet = new Set(res.data.columns);
        const newHidden = {};
        allFields.forEach(f => {
          if (!visibleSet.has(f.key)) {
            newHidden[f.key] = true;
          }
        });
        setHiddenCols(newHidden);
      }
      // Extremely important: Wait until next event loop (after hiddenCols applies) to enable auto-save
      setTimeout(() => setInitialApplyDone(true), 100);
    }).catch((e) => {
      console.error(e)
      alert("FETCH ERROR: " + (e.message || "Unknown"))
      setInitialApplyDone(true)
    })
  }, [allFields.length])
  
  // Auto-Save has been intentionally removed by Antigravity to solve cache race conditions.

  const handleSavePrefs = async () => {
    try {
      const visibleKeys = allFields.filter(f => !hiddenCols[f.key]).map(f => f.key)
      await saveUserPrefs('MOUTab', visibleKeys)
      alert("MOU Column preferences saved to HANA!")
      setShowColMenu(false)
    } catch (e) {
      alert("Failed to save preferences.")
      console.error(e)
    }
  }
  
  const visibleFields = useMemo(() => {
    return allFields.filter(f => !hiddenCols[f.key])
  }, [allFields, hiddenCols])

  // Local sorting, and filtering
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' })
  const [colFilters, setColFilters] = useState({})
  const [fyFilter, setFyFilter] = useState('All')
  
  // Header Dropdown tracking
  const [activeMenu, setActiveMenu] = useState(null)
  const menuRef = useRef(null)
  
  // Column visibility menu
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef(null)

  // Derive unique FYYEAR options
  const fyColKey = useMemo(() => {
    if (!data || data.length === 0) return null;
    return Object.keys(data[0]).find(k => {
      const lower = k.toLowerCase().replace(/[^a-z0-y]/g, ''); // strip spaces, underscores
      return lower === 'fyyear' || lower === 'financialyear' || lower === 'fy';
    });
  }, [data]);

  const uniqueYears = useMemo(() => {
    if (!fyColKey) return [];
    const years = new Set();
    data.forEach(d => {
      const y = d[fyColKey];
      if (y !== null && y !== undefined && String(y).trim() !== '') {
        years.add(String(y).trim());
      }
    });
    return Array.from(years).sort();
  }, [data, fyColKey]);

  const processedData = useMemo(() => {
    let d = [...data]

    // 0. Financial Year filter
    if (fyFilter !== 'All' && fyColKey) {
      d = d.filter(row => {
        const y = row[fyColKey];
        return String(y).trim() === fyFilter;
      })
    }
    
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
  }, [data, colFilters, sortConfig, fyFilter])

  // Reset local column filters when the master server data changes
  useEffect(() => {
    setSortConfig({ key: null, dir: 'asc' })
    setColFilters({})
  }, [data])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null)
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setShowColMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsData = processedData.map(row => {
      const r = {}
      visibleFields.forEach(f => {
        let val = row[f.key]
        // Remove formatting problems or simply push raw values
        r[f.label] = val
      })
      return r
    })
    const ws = XLSX.utils.json_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, "MOU Records")
    XLSX.writeFile(wb, `MOU_Records_${Date.now()}.xlsx`)
  }

  // Format value beautifully
  const fmt = (key, val) => {
    if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>
    
    const lowerKey = String(key).toLowerCase()
    // Do not show commas for "year" fields
    if (lowerKey.includes('year')) {
      return String(val)
    }

    if (typeof val === 'number') return val.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    return String(val)
  }

  const toggleColumn = (key) => {
    setHiddenCols(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div>
      <div className="table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem' }}>MOU Records</h2>
            {data.length > 0 && (
              <span className="badge badge-blue">
                {processedData.length.toLocaleString()} rows {total > processedData.length ? `(of ${total.toLocaleString()})` : ''}
              </span>
            )}
            {loading && <span className="spinner" />}
            
            {uniqueYears.length > 0 && (
              <select 
                value={fyFilter} 
                onChange={e => setFyFilter(e.target.value)}
                style={{ 
                  marginLeft: '0.5rem', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #ccc)'
                }}
              >
                <option value="All">Financial Year: All</option>
                {uniqueYears.map(y => {
                   const intY = parseInt(y)
                   const displayValue = !isNaN(intY) ? `${y}-${intY + 1}` : y
                   return <option key={y} value={y}>{displayValue}</option>
                })}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', position: 'relative' }}>
            {onRefresh && (
               <button 
                 className="btn" 
                 onClick={onRefresh} 
                 disabled={loading}
                 style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ffffff', color: '#800000', border: '1px solid #ccc', fontWeight: 'bold' }}
               >
                 {loading ? '↻ ...' : '↻ Refresh MOU Data'}
               </button>
            )}

            <button 
              className="btn" 
              onClick={() => setShowColMenu(!showColMenu)} 
              style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #ccc', fontWeight: 'bold' }}
            >
               Columns 👁
            </button>

            {showColMenu && (
              <div ref={colMenuRef} className="col-menu" style={{ 
                right: 0, 
                left: 'auto', 
                minWidth: '220px', 
                maxHeight: '350px', 
                overflowY: 'auto', 
                top: 'calc(100% + 0.5rem)', 
                zIndex: 100, 
                backgroundColor: '#ffffff', 
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                padding: '0.5rem 0'
              }}>
                 <div style={{ padding: '0.5rem 1rem', paddingBottom: '0.25rem', fontWeight: 'bold', color: '#333', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Displayed Columns</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {Object.values(hiddenCols).some(v => v) && (
                        <span 
                          style={{ fontSize:'0.75rem', color: '#800000', cursor:'pointer', fontWeight: 'normal' }} 
                          onClick={() => setHiddenCols({})}
                        >
                          Reset
                        </span>
                      )}
                      <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} onClick={handleSavePrefs}>Save</button>
                    </div>
                 </div>
                 <div style={{ height:'1px', backgroundColor:'#f0f0f0', margin:'0.5rem 0' }} />
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.5rem' }}>
                   {allFields.map(f => (
                     <label key={f.key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.4rem 0.6rem', 
                        cursor: 'pointer', 
                        color: !hiddenCols[f.key] ? '#111' : '#888',
                        borderRadius: '0.4rem',
                        transition: 'background 0.2s',
                        fontSize: '0.85rem'
                     }}
                     onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                     onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                     >
                       <span style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: !hiddenCols[f.key] ? '500' : 'normal'}}>{f.label}</span>
                       <div className="toggle" style={{ transform: 'scale(0.8)', margin: 0 }}>
                         <input type="checkbox" checked={!hiddenCols[f.key]} onChange={() => toggleColumn(f.key)} />
                         <span className="slider" />
                       </div>
                     </label>
                   ))}
                 </div>
              </div>
            )}
            
            {data.length > 0 && (
              <button id="export-excel-btn" className="btn" style={{ backgroundColor: '#217346', color: 'white', padding: '0.4rem 0.8rem' }} onClick={exportExcel}>
                ⬇ Excel
              </button>
            )}
          </div>
        </div>

        {data.length === 0 && !loading ? (
           <div className="empty-state">
             <div className="icon">📭</div>
             <p>No records found.<br />Ensure data exists.</p>
           </div>
        ) : (
          <div className="table-scroll" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                   {visibleFields.map(f => (
                     <th key={f.key}>
                       <div className="th-content" onClick={() => setActiveMenu(activeMenu === f.key ? null : f.key)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span>
                            {f.label}
                            {sortConfig.key === f.key && (sortConfig.dir === 'asc' ? ' ↑' : ' ↓')}
                         </span>
                         <span style={{ opacity: colFilters[f.key] ? 1 : 0.3 }}>⋮</span>
                       </div>
                       
                       {activeMenu === f.key && (
                         <div ref={menuRef} className="col-menu" style={{ color: '#000' }}>
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
                  <tr key={i}>
                    {visibleFields.map(f => (
                      <td key={f.key}>{fmt(f.key, row[f.key])}</td>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={visibleFields.length} style={{ textAlign: 'center', padding: '2rem' }}>No rows matching column filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
