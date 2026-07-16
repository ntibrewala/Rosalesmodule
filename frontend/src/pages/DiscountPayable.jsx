// File: DiscountPayable.jsx
import React, { useState, useEffect } from "react";
import { getDiscountPayable, postDiscountPayable } from "../api";
import DateFilter from "../components/DateFilter";
import Toast from "../components/Toast";

const DiscountPayable = () => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const resp = await getDiscountPayable(start, end);
      setData(resp.data.data || []);
    } catch (e) {
      Toast.error(e.response?.data?.error || "Failed to load data");
    }
    setLoading(false);
  };

  const handlePost = async (bp) => {
    const payload = {
      bpCode: bp.bpCode,
      startDate: start,
      endDate: end,
      totalInterest: bp.totalInterest,
    };
    try {
      await postDiscountPayable(payload);
      Toast.success(`Interest posted for ${bp.bpCode}`);
    } catch (e) {
      const msg = e.response?.data?.error || "Post failed";
      Toast.error(msg);
    }
  };

  const handleDateChange = (filters) => {
    // DateFilter returns { start_date, end_date, ... }
    setStart(filters.start_date || "");
    setEnd(filters.end_date || "");
  };

  useEffect(() => {
    fetchData();
  }, [start, end]);

  return (
    <div className="discount-payable-tab-content">
      <DateFilter onChange={handleDateChange} />
      {loading && <p style={{ textAlign: 'center', marginTop: '1rem' }}>Loading...</p>}
      
      {!loading && data.length === 0 && start && end && (
        <div className="empty-state" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <div className="icon">💳</div>
          <p>No interest records found for the selected period.</p>
        </div>
      )}

      {data.length > 0 && (
        <table className="discount-table" style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>BP Code</th>
            <th>Customer Name</th>
            <th>Total Interest</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.bpCode}>
              <td>{row.bpCode}</td>
              <td>{row.cardName}</td>
              <td>{row.totalInterest.toFixed(2)}</td>
              <td>
                <button onClick={() => handlePost(row)} className="post-btn">
                  Post
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
};

export default DiscountPayable;
