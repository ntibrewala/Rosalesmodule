package main

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"time"
)

func HandleCashDiscount(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	startDate := q.Get("startDate")
	endDate := q.Get("endDate")
	
	if startDate == "" || endDate == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "startDate and endDate required (YYYY-MM-DD)"})
		return
	}

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid startDate format"})
		return
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid endDate format"})
		return
	}

	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if limit <= 0 || limit > 5000 {
		limit = 5000 
	}

	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	query := `CALL "RAGHAV_LIVE"."TEC_CD"(?, ?)`
	rows, err := db.Query(query, start, end)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query error: " + err.Error()})
		return
	}
	defer rows.Close()

	cols, err := rows.Columns()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "columns error: " + err.Error()})
		return
	}

	var allRecords []map[string]interface{}

	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan error: " + err.Error()})
			return
		}

		rec := make(map[string]interface{})
		for i, colName := range cols {
			val := columns[i]
			if val == nil {
				rec[colName] = nil
				continue
			}

			// Handle go-hdb dynamic types explicitly to support JSON serialization
			switch v := val.(type) {
			case []byte:
				rec[colName] = string(v)
			case *big.Rat:
				f, _ := v.Float64()
				rec[colName] = f
			case time.Time:
				rec[colName] = v.Format("2006-01-02")
			default:
				rec[colName] = v
			}
		}
		allRecords = append(allRecords, rec)
	}

	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if allRecords == nil {
		allRecords = []map[string]interface{}{}
	}

	total := len(allRecords)
	
	startIdx := offset
	if startIdx > total {
		startIdx = total
	}
	endIdx := startIdx + limit
	if endIdx > total {
		endIdx = total
	}
	
	paginatedRecords := allRecords[startIdx:endIdx]

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"columns": cols,
		"data":    paginatedRecords,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

type CashDiscountPostRequest struct {
	TransID    int         `json:"TransID"`
	SoldToCode string      `json:"SoldToCode"`
	SoldTo     string      `json:"SoldTo"`
	DCP_No     interface{} `json:"DCP_No"`
	DCP_DATE   string      `json:"DCP_DATE"`
	Prod_Desc  string      `json:"Prod_Desc"`
	Quantity   interface{} `json:"Quantity"`
	Due_Date   string      `json:"Due_Date"`
	RectDate   string      `json:"RectDate"`
	CD         interface{} `json:"CD"`
	EPI        interface{} `json:"EPI"`
	EPI_Days   int         `json:"EPI_Days"`
	CD_Amount  interface{} `json:"CD_Amount"`
	EPI_Amount interface{} `json:"EPI_Amount"`
	Balance    interface{} `json:"Balance"`
	Net_Amount interface{} `json:"Net_Amount"`
}

func parseInterfaceFloat(v interface{}) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	default:
		return 0
	}
}

func HandlePostCashDiscount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed"})
		return
	}

	var req CashDiscountPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body: " + err.Error()})
		return
	}

	var dcpNoStr string
	switch v := req.DCP_No.(type) {
	case string:
		dcpNoStr = v
	case float64:
		dcpNoStr = fmt.Sprintf("%.0f", v)
	case int:
		dcpNoStr = strconv.Itoa(v)
	}

	qty := parseInterfaceFloat(req.Quantity)
	cdRate := parseInterfaceFloat(req.CD)
	epiRate := parseInterfaceFloat(req.EPI)
	cdAmt := parseInterfaceFloat(req.CD_Amount)
	epiAmt := parseInterfaceFloat(req.EPI_Amount)
	balAmt := parseInterfaceFloat(req.Balance)
	netAmt := parseInterfaceFloat(req.Net_Amount)

	parseDate := func(d string) time.Time {
		if d == "" {
			return time.Time{}
		}
		t, _ := time.Parse("2006-01-02 15:04:05.000000000", d)
		if t.IsZero() {
			t, _ = time.Parse(time.RFC3339, d)
		}
		if t.IsZero() {
			t, _ = time.Parse("2006-01-02", d)
		}
		if t.IsZero() {
			// Jan 02, 2006
			t, _ = time.Parse("02 Jan 2006", d)
		}
		if t.IsZero() {
			t, _ = time.Parse("02-Jan-06", d)
		}
		return t
	}

	dcpDate := parseDate(req.DCP_DATE)
	dueDate := parseDate(req.Due_Date)
	rectDate := parseDate(req.RectDate)

	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "db connection error: " + err.Error()})
		return
	}

	query := `CALL "RAGHAV_LIVE"."POST_CASH_DISCOUNT"(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err = db.Exec(query, req.TransID, req.SoldToCode, req.SoldTo, dcpNoStr, dcpDate, req.Prod_Desc, qty, dueDate, rectDate, cdRate, epiRate, req.EPI_Days, cdAmt, epiAmt, balAmt, netAmt)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query execution error: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "success"})
}
