import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'

export default function MOUCompareTable({ data, loading, onRefresh }) {
  const fyColKey = useMemo(() => {
    if (!data || data.length === 0) return null;
    return Object.keys(data[0]).find(k => {
      const lower = k.toLowerCase().replace(/[^a-z0-y]/g, '');
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
    return Array.from(years).sort(); // chronological
  }, [data, fyColKey]);

  const lastYear = uniqueYears.length > 0 ? uniqueYears[uniqueYears.length - 1] : null;
  const prevYear = uniqueYears.length > 1 ? uniqueYears[uniqueYears.length - 2] : null;

  const { processedData, totals } = useMemo(() => {
    if (!data || data.length === 0) return { processedData: [], totals: {} };

    const map = new Map();
    
    data.forEach(row => {
      const cust = row.GroupName || 'Unknown';
      const mat = row.MaterialType || 'Unknown';
      const key = `${cust}___${mat}`;

      if (!map.has(key)) {
        map.set(key, { Customer: cust, MaterialType: mat, MOUs: {} });
      }
      
      const group = map.get(key);
      const year = row[fyColKey];
      if (year) {
        const qty = parseFloat(row.MOUQty) || 0;
        group.MOUs[year] = (group.MOUs[year] || 0) + qty;
      }
    });

    const arr = Array.from(map.values());

    // Sorting mathematically: MaterialType -> Customer
    arr.sort((a, b) => {
      const matCmp = a.MaterialType.localeCompare(b.MaterialType);
      if (matCmp !== 0) return matCmp;
      return a.Customer.localeCompare(b.Customer);
    });

    const flatData = [];
    const colTotals = { totalDiff: 0 };
    uniqueYears.forEach(y => colTotals[y] = 0);

    let currentMat = null;
    let matSubtotals = null;

    const pushSubtotal = (matName) => {
       if (matSubtotals) {
           const subRow = {
               isSubtotal: true,
               Customer: `SUBTOTAL (${matName})`,
               MaterialType: matName,
               Diff: matSubtotals.totalDiff
           };
           uniqueYears.forEach(y => subRow[y] = matSubtotals[y]);
           flatData.push(subRow);
       }
    };

    arr.forEach(g => {
      if (g.MaterialType !== currentMat) {
         if (currentMat !== null) {
             pushSubtotal(currentMat);
         }
         currentMat = g.MaterialType;
         matSubtotals = { totalDiff: 0 };
         uniqueYears.forEach(y => matSubtotals[y] = 0);
      }

      const row = {
        Customer: g.Customer,
        MaterialType: g.MaterialType
      };
      
      uniqueYears.forEach(y => {
        const val = g.MOUs[y] !== undefined ? g.MOUs[y] : null;
        row[y] = val;
        if (val) {
           colTotals[y] += val;
           matSubtotals[y] += val;
        }
      });

      let diffVal = null;
      if (lastYear && prevYear) {
         const v1 = g.MOUs[lastYear] || 0;
         const v2 = g.MOUs[prevYear] || 0;
         if (g.MOUs[lastYear] !== undefined || g.MOUs[prevYear] !== undefined) {
             diffVal = v1 - v2;
         }
      }
      row.Diff = diffVal;
      if (diffVal) {
          colTotals.totalDiff += diffVal;
          matSubtotals.totalDiff += diffVal;
      }

      flatData.push(row);
    });

    // Push the final subtotal
    if (currentMat !== null) {
       pushSubtotal(currentMat);
    }

    return { processedData: flatData, totals: colTotals };
  }, [data, uniqueYears, fyColKey, lastYear, prevYear]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = processedData.map(row => {
      const r = {
        "Customer": row.Customer,
        "Material Type": row.MaterialType
      };
      uniqueYears.forEach(y => r[y] = row[y] !== null ? row[y] : '');
      if (lastYear && prevYear) {
         r[`Diff (${lastYear}-${prevYear})`] = row.Diff !== null ? row.Diff : '';
      }
      return r;
    });

    // Add totals row physically
    const totalsRow = {
      "Customer": "GRAND TOTAL",
      "Material Type": ""
    };
    uniqueYears.forEach(y => totalsRow[y] = totals[y] || 0);
    if (lastYear && prevYear) {
       totalsRow[`Diff (${lastYear}-${prevYear})`] = totals.totalDiff || 0;
    }
    wsData.push(totalsRow);

    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "MOU Compare");
    XLSX.writeFile(wb, `MOU_Comparative_${Date.now()}.xlsx`);
  }

  const fmt = (val) => {
    if (val === null || val === undefined || val === '') return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    if (typeof val === 'number') return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return String(val);
  }

  return (
    <div>
      <div className="table-container">
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '0.95rem' }}>MOU Comparative Slab</h2>
            {processedData.length > 0 && (
              <span className="badge badge-blue">
                {processedData.filter(r => !r.isSubtotal).length.toLocaleString()} Customers
              </span>
            )}
            {loading && <span className="spinner" />}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onRefresh && (
               <button 
                 className="btn" 
                 onClick={onRefresh} 
                 disabled={loading}
                 style={{ padding: '0.4rem 0.8rem', backgroundColor: '#ffffff', color: '#800000', border: '1px solid #ccc', fontWeight: 'bold' }}
               >
                 {loading ? '↻ ...' : '↻ Refresh Data'}
               </button>
            )}
            {processedData.length > 0 && (
              <button className="btn" style={{ backgroundColor: '#217346', color: 'white', padding: '0.4rem 0.8rem' }} onClick={exportExcel}>
                ⬇ Excel
              </button>
            )}
          </div>
        </div>

        {processedData.length === 0 && !loading ? (
           <div className="empty-state">
             <div className="icon">📭</div>
             <p>No comparative data found.</p>
           </div>
        ) : (
          <div className="table-scroll" style={{ maxHeight: '62vh', overflowY: 'auto' }}>
            <table className="data-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr>
                   <th><div className="th-content">Material Type</div></th>
                   <th><div className="th-content">Customer</div></th>
                   {uniqueYears.map(y => (
                     <th key={y}><div className="th-content" style={{ justifyContent: 'flex-end' }}>{y}</div></th>
                   ))}
                   {lastYear && prevYear && (
                     <th style={{ backgroundColor: '#1dffe415' }}>
                       <div className="th-content" style={{ justifyContent: 'flex-end', color: '#0056b3' }}>
                         Diff ({lastYear} - {prevYear})
                       </div>
                     </th>
                   )}
                </tr>
              </thead>
              <tbody>
                {processedData.map((row, i) => (
                  <tr key={i} style={row.isSubtotal ? { backgroundColor: '#f0f5fa', borderTop: '1px solid #c2dbe0' } : {}}>
                    <td style={{ borderRight: '1px solid #f0f0f0', fontWeight: row.isSubtotal ? 'bold' : 'normal', color: row.isSubtotal ? '#0056b3' : 'inherit' }}>
                       {row.isSubtotal ? '' : row.MaterialType}
                    </td>
                    <td style={{ fontWeight: row.isSubtotal ? 'bold' : 500, borderRight: '1px solid #f0f0f0', color: row.isSubtotal ? '#0056b3' : 'inherit' }}>
                       {row.Customer}
                    </td>
                    {uniqueYears.map(y => (
                      <td key={y} style={{ textAlign: 'right', fontWeight: row.isSubtotal ? 'bold' : 'normal' }}>{fmt(row[y])}</td>
                    ))}
                    {lastYear && prevYear && (
                      <td style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: row.isSubtotal ? 'transparent' : '#1dffe408' }}>
                         {row.Diff > 0 ? <span style={{ color: 'green' }}>+{fmt(row.Diff)}</span> : (row.Diff < 0 ? <span style={{ color: 'red' }}>{fmt(row.Diff)}</span> : fmt(row.Diff))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 2 }}>
                <tr style={{ backgroundColor: '#e2e8f0', borderTop: '2px solid #94a3b8' }}>
                   <td style={{ fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}></td>
                   <td style={{ fontWeight: 'bold', color: '#334155' }}>GRAND TOTAL</td>
                   {uniqueYears.map(y => (
                      <td key={y} style={{ textAlign: 'right', fontWeight: 'bold', color: '#334155' }}>{fmt(totals[y])}</td>
                   ))}
                   {lastYear && prevYear && (
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0056b3' }}>{fmt(totals.totalDiff)}</td>
                   )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
