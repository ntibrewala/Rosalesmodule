import { useState, useCallback, useEffect } from 'react'
import Navbar from '../components/Navbar'
import FilterPanel from '../components/FilterPanel'
import DateFilter from '../components/DateFilter'
import SalesTable from '../components/SalesTable'
import MOUTable from '../components/MOUTable'
import MOUCompareTable from '../components/MOUCompareTable'
import DiscountPayable from './DiscountPayable'
import InterestPosted from './InterestPosted'
import CashDiscountTable from '../components/CashDiscountTable'
import { getSales, getMOU, getCashDiscount, getCashDiscountPosted } from '../api'

const PAGE_SIZE = 200

export default function Dashboard() {
  const [activeTab, setActiveTab]             = useState('sales')

  // Sales state
  const [customerFilters, setCustomerFilters] = useState({})
  const [dateFilters, setDateFilters]         = useState({})
  const [salesData, setSalesData]             = useState([])
  const [total, setTotal]                     = useState(0)
  const [offset, setOffset]                   = useState(0)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [fetched, setFetched]                 = useState(false)

  // MOU state
  const [mouData, setMouData]                 = useState([])
  const [mouColumns, setMouColumns]           = useState([])
  const [mouTotal, setMouTotal]               = useState(0)
  const [mouOffset, setMouOffset]             = useState(0)
  const [mouLoading, setMouLoading]           = useState(false)
  const [mouFetched, setMouFetched]           = useState(false)

  // Cash Discount state
  const [cashDiscData, setCashDiscData]       = useState([])
  const [cashDiscColumns, setCashDiscColumns] = useState([])
  const [cashDiscLoading, setCashDiscLoading] = useState(false)
  const [cashDiscPostedData, setCashDiscPostedData] = useState([])
  const [cashDiscPostedLoading, setCashDiscPostedLoading] = useState(false)

  const fetchSales = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setError('')
    try {
      const params = {
        ...customerFilters,
        ...dateFilters,
        limit: PAGE_SIZE,
        offset: newOffset,
      }
      const res = await getSales(params)
      setSalesData(res.data.data || [])
      setTotal(res.data.total || 0)
      setOffset(newOffset)
      setFetched(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch sales data')
    } finally {
      setLoading(false)
    }
  }, [customerFilters, dateFilters])

  const handlePageChange = useCallback(newOffset => {
    fetchSales(newOffset)
  }, [fetchSales])

  const fetchMOU = useCallback(async (newOffset = 0) => {
    setMouLoading(true)
    setError('')
    try {
      const params = {
        limit: 5000, 
        offset: newOffset,
      }
      const res = await getMOU(params)
      setMouData(res.data.data || [])
      setMouColumns(res.data.columns || [])
      setMouTotal(res.data.total || 0)
      setMouOffset(newOffset)
      setMouFetched(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch MOU data')
    } finally {
      setMouLoading(false)
    }
  }, [])

  const fetchCashDiscount = useCallback(async () => {
    setCashDiscLoading(true)
    setError('')
    try {
      const res = await getCashDiscount({ 
        startDate: dateFilters.start_date, 
        endDate: dateFilters.end_date 
      })
      setCashDiscData(res.data.data || [])
      setCashDiscColumns(res.data.columns || [])
    } catch (err) {
      setError("Failed to load Cash Discount data")
    } finally {
      setCashDiscLoading(false)
    }
  }, [dateFilters])

  const fetchCashDiscountPosted = useCallback(async () => {
    setCashDiscPostedLoading(true)
    setError('')
    try {
      const res = await getCashDiscountPosted({ 
        startDate: dateFilters.start_date, 
        endDate: dateFilters.end_date 
      })
      setCashDiscPostedData(res.data.data || [])
    } catch (err) {
      setError("Failed to load Cash Discount Posted data")
    } finally {
      setCashDiscPostedLoading(false)
    }
  }, [dateFilters])

  useEffect(() => {
    if ((activeTab === 'mou' || activeTab === 'mou_compare') && !mouFetched && !mouLoading) {
      fetchMOU(0)
    }
  }, [activeTab, mouFetched, mouLoading, fetchMOU])

  return (
    <div className="page-layout">
      <Navbar />
      <div className="page-content">
        {/* Page title & Tabs */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <h1>
              {activeTab === 'sales' && 'Sales Dashboard'}
              {activeTab === 'mou' && 'MOU Report'}
              {activeTab === 'mou_compare' && 'MOU Compare'}
              {activeTab === 'discount' && 'Interest Receivable'}
              {activeTab === 'posted' && 'Interest Posted'}
              {activeTab === 'cash_discount' && 'Cash Discount'}
              {activeTab === 'cash_discount_posted' && 'Cash Discount Posted'}
            </h1>
          </div>
          
          <div className="tabs" style={{ display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-card)', padding: '0.25rem', borderRadius: '0.5rem' }}>
             <button 
               className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('sales'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               Sales Dashboard
             </button>
             <button 
               className={`btn ${activeTab === 'mou' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('mou'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               MOU View
             </button>
             <button 
               className={`btn ${activeTab === 'mou_compare' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('mou_compare'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               MOU Compare
             </button>
             <button 
               className={`btn ${activeTab === 'discount' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('discount'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               Interest Receivable
             </button>
             <button 
               className={`btn ${activeTab === 'posted' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('posted'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               Interest Posted
             </button>
             <button 
               className={`btn ${activeTab === 'cash_discount' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('cash_discount'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               Cash Discount
             </button>
             <button 
               className={`btn ${activeTab === 'cash_discount_posted' ? 'btn-primary' : 'btn-ghost'}`} 
               onClick={() => { setActiveTab('cash_discount_posted'); setError(''); }}
               style={{ padding: '0.4rem 1rem' }}
             >
               Cash Discount Posted
             </button>
          </div>
        </div>

        {activeTab === 'discount' && <DiscountPayable />}
        {activeTab === 'posted' && <InterestPosted />}
        
        {activeTab === 'cash_discount' && (
          <>
            <DateFilter onChange={setDateFilters} />
            {error && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={fetchCashDiscount} disabled={cashDiscLoading}>
                {cashDiscLoading ? 'Loading...' : '🔍 Fetch Cash Discount'}
              </button>
            </div>
            <CashDiscountTable 
              data={cashDiscData} 
              columns={cashDiscColumns}
              loading={cashDiscLoading} 
              onRefresh={fetchCashDiscount}
            />
          </>
        )}

        {activeTab === 'cash_discount_posted' && (
          <>
            <DateFilter onChange={setDateFilters} />
            {error && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary" onClick={fetchCashDiscountPosted} disabled={cashDiscPostedLoading}>
                {cashDiscPostedLoading ? 'Loading...' : '🔍 Fetch Posted Records'}
              </button>
            </div>
            <CashDiscountTable 
              data={cashDiscPostedData} 
              loading={cashDiscPostedLoading}
              onRefresh={fetchCashDiscountPosted}
              readOnly={true}
            />
          </>
        )}

        {activeTab === 'sales' && (
          <>
            {/* Filter panels */}
            <FilterPanel onChange={setCustomerFilters} />
            <DateFilter onChange={setDateFilters} />

            {/* Fetch button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
              {error && (
                <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>⚠ {error}</span>
              )}
              <button
                id="fetch-sales-btn"
                className="btn btn-primary"
                onClick={() => fetchSales(0)}
                disabled={loading}
                style={{ padding: '0.6rem 1.6rem', fontSize: '0.9rem' }}
              >
                {loading
                  ? <><span className="spinner" style={{ width: '0.85rem', height: '0.85rem' }} /> Loading…</>
                  : '🔍 Fetch Sales'}
              </button>
            </div>

            {/* Results table */}
            {(fetched || loading) && (
              <SalesTable
                data={salesData}
                total={total}
                limit={PAGE_SIZE}
                offset={offset}
                onPageChange={handlePageChange}
                loading={loading}
              />
            )}

            {!fetched && !loading && (
              <div className="empty-state" style={{ paddingTop: '6rem' }}>
                <div className="icon">📊</div>
                <p>Set your filters above and click <strong>Fetch Sales</strong> to load data.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'mou' && (
          <>
            {error && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}

            {(mouFetched || mouLoading) && (
              <MOUTable
                data={mouData}
                columns={mouColumns}
                total={mouTotal}
                limit={5000}
                offset={mouOffset}
                loading={mouLoading}
                onRefresh={() => fetchMOU(0)}
              />
            )}

            {!mouFetched && !mouLoading && (
              <div className="empty-state" style={{ paddingTop: '6rem' }}>
                <div className="icon">📄</div>
                <p>Loading RAGHAV_LIVE.BHV_MOU_VIEW...</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'mou_compare' && (
          <>
            {error && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>⚠ {error}</span>
              </div>
            )}

            {(mouFetched || mouLoading) && (
              <MOUCompareTable
                data={mouData}
                loading={mouLoading}
                onRefresh={() => fetchMOU(0)}
              />
            )}

            {!mouFetched && !mouLoading && (
              <div className="empty-state" style={{ paddingTop: '6rem' }}>
                <div className="icon">📄</div>
                <p>Loading MOU Comparative Database...</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
