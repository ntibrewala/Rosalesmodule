package main

import (
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
