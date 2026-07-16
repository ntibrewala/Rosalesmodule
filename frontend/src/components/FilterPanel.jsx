import { useState, useEffect } from 'react'
import { getFilters } from '../api'

const CUSTOMER_MODES = [
  { id: 'none',   label: 'All' },
  { id: 'soldto', label: 'Sold To' },
  { id: 'shipto', label: 'Ship To' },
  { id: 'group',  label: 'Group Name' },
]

export default function FilterPanel({ onChange }) {
  const [customerMode, setCustomerMode] = useState('none')
  const [customerValue, setCustomerValue] = useState('')
  const [materialMode, setMaterialMode] = useState('none')
  const [materialValue, setMaterialValue] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')

  const [soldToList, setSoldToList]         = useState([])
  const [shipToList, setShipToList]         = useState([])
  const [groupList, setGroupList]           = useState([])
  const [materialList, setMaterialList]     = useState([])
  const [descriptionList, setDescriptionList] = useState([])
  const [loadingDropdown, setLoadingDropdown] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoadingDropdown(true)
      try {
        const [s, h, g, m, d] = await Promise.all([
          getFilters('soldto'),
          getFilters('shipto'),
          getFilters('groups'),
          getFilters('materials'),
          getFilters('descriptions'),
        ])
        setSoldToList(s.data || [])
        setShipToList(h.data || [])
        setGroupList(g.data || [])
        setMaterialList(m.data || [])
        setDescriptionList(d.data || [])
      } catch (e) {
        console.error('Filter load error', e)
      } finally {
        setLoadingDropdown(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    onChange({
      filter_by:     customerMode === 'none' ? '' : customerMode,
      filter_value:  customerMode === 'none' ? '' : customerValue,
      material_type: materialMode === 'type' ? materialValue : '',
      material_desc: materialMode === 'desc' ? materialDesc : '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerMode, customerValue, materialMode, materialValue, materialDesc])

  const currentList = customerMode === 'soldto' ? soldToList
                    : customerMode === 'shipto'  ? shipToList
                    : groupList

  return (
    <div className="filter-panel">
      <div className="filter-section-title">
        Customer Filter
        {loadingDropdown && <span className="spinner" style={{ width: '0.6rem', height: '0.6rem', marginLeft: '0.5rem' }} />}
      </div>

      {/* Customer mode radio */}
      <div className="filter-row" style={{ marginBottom: '0.75rem' }}>
        <div className="filter-group">
          <span className="label">Filter By</span>
          <div className="radio-group">
            {CUSTOMER_MODES.map(m => (
              <label key={m.id} className={`radio-btn ${customerMode === m.id ? 'active' : ''}`} id={`radio-${m.id}`}>
                <input type="radio" name="customer_mode" value={m.id}
                  checked={customerMode === m.id}
                  onChange={() => { setCustomerMode(m.id); setCustomerValue('') }} />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        {/* Value dropdown — only when a mode other than 'none' is selected */}
        {customerMode !== 'none' && (
          <div className="filter-group" style={{ flex: 1, minWidth: '220px', maxWidth: '400px' }}>
            <span className="label">
              {customerMode === 'soldto' ? 'Select Sold To' : customerMode === 'shipto' ? 'Select Ship To' : 'Select Group'}
            </span>
            <select id="customer-value-select" className="select"
              value={customerValue} onChange={e => setCustomerValue(e.target.value)}>
              <option value="">— All —</option>
              {currentList.map((item, i) => (
                <option key={i} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="filter-divider" />

      {/* Material filter */}
      <div className="filter-section-title" style={{ marginTop: '0.1rem' }}>Material Filter</div>
      <div className="filter-row">
        <div className="filter-group">
          <span className="label">Filter By</span>
          <div className="radio-group">
            <label className={`radio-btn ${materialMode === 'none' ? 'active' : ''}`} id="radio-material-none">
              <input type="radio" name="material_mode" value="none"
                checked={materialMode === 'none'}
                onChange={() => { setMaterialMode('none'); setMaterialValue(''); setMaterialDesc('') }} />
              All
            </label>
            <label className={`radio-btn ${materialMode === 'type' ? 'active' : ''}`} id="radio-material-type">
              <input type="radio" name="material_mode" value="type"
                checked={materialMode === 'type'}
                onChange={() => { setMaterialMode('type'); setMaterialDesc('') }} />
              By Material Type
            </label>
            <label className={`radio-btn ${materialMode === 'desc' ? 'active' : ''}`} id="radio-material-desc">
              <input type="radio" name="material_mode" value="desc"
                checked={materialMode === 'desc'}
                onChange={() => { setMaterialMode('desc'); setMaterialValue('') }} />
              By Description
            </label>
          </div>
        </div>

        {materialMode === 'type' && (
          <div className="filter-group">
            <span className="label">Material Type</span>
            <select id="material-type-select" className="select" value={materialValue}
              onChange={e => setMaterialValue(e.target.value)} style={{ width: '180px' }}>
              <option value="">— Select —</option>
              {materialList.map((m, i) => (
                <option key={i} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
        {materialMode === 'desc' && (
          <div className="filter-group" style={{ flex: 1, minWidth: '250px', maxWidth: '500px' }}>
            <span className="label">Material Description</span>
            <select id="material-desc-select" className="select" value={materialDesc}
              onChange={e => setMaterialDesc(e.target.value)}>
              <option value="">— Select —</option>
              {descriptionList.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
