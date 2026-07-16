import { useState, useEffect } from 'react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function DateFilter({ onChange }) {
  const [dateMode, setDateMode] = useState('none')   // default = no date filter
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [month, setMonth] = useState('')             // empty = all months in year
  const [year, setYear] = useState('2026')

  useEffect(() => {
    if (dateMode === 'none') {
      // No date filter — send empty values
      onChange({ date_mode: '', start_date: '', end_date: '', month: '', year: '' })
    } else {
      onChange({ date_mode: dateMode, start_date: startDate, end_date: endDate, month, year })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateMode, startDate, endDate, month, year])

  return (
    <div className="filter-panel">
      <div className="filter-section-title">Date Filter</div>
      <div className="filter-row">
        {/* Mode toggle */}
        <div className="filter-group">
          <span className="label">Mode</span>
          <div className="radio-group">
            <label className={`radio-btn ${dateMode === 'none' ? 'active' : ''}`} id="radio-date-none">
              <input type="radio" name="date_mode" value="none"
                checked={dateMode === 'none'} onChange={() => setDateMode('none')} />
              All Time
            </label>
            <label className={`radio-btn ${dateMode === 'month' ? 'active' : ''}`} id="radio-date-month">
              <input type="radio" name="date_mode" value="month"
                checked={dateMode === 'month'} onChange={() => setDateMode('month')} />
              📆 Month / Year
            </label>
            <label className={`radio-btn ${dateMode === 'range' ? 'active' : ''}`} id="radio-date-range">
              <input type="radio" name="date_mode" value="range"
                checked={dateMode === 'range'} onChange={() => setDateMode('range')} />
              📅 Date Range
            </label>
          </div>
        </div>

        {/* Month + Year */}
        {dateMode === 'month' && (
          <>
            <div className="filter-group">
              <span className="label">Month (optional)</span>
              <select id="month-select" className="select" value={month}
                onChange={e => setMonth(e.target.value)} style={{ width: '155px' }}>
                <option value="">— All Months —</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <span className="label">Year</span>
              <input id="year-input" className="input" type="number" min="2020" max="2030"
                value={year} onChange={e => setYear(e.target.value)} style={{ width: '90px' }} />
            </div>
          </>
        )}

        {/* Date Range */}
        {dateMode === 'range' && (
          <>
            <div className="filter-group">
              <span className="label">Start Date</span>
              <input id="start-date" className="input" type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} style={{ width: '155px' }} />
            </div>
            <div className="filter-group">
              <span className="label">End Date</span>
              <input id="end-date" className="input" type="date" value={endDate}
                onChange={e => setEndDate(e.target.value)} style={{ width: '155px' }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
