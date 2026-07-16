package main

import (
	"fmt"
	"math/big"
	"net/http"
	"strconv"
)

func HandleMOU(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	if limit <= 0 || limit > 5000 {
		limit = 5000 // default or max limit to load a chunk for local processing
	}

	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM "RAGHAV_LIVE"."BHV_MOU_VIEW"`
	var total int
	if err := db.QueryRow(countQuery).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "count error: " + err.Error()})
		return
	}

	// Data query
	dataQuery := fmt.Sprintf(`SELECT * FROM "RAGHAV_LIVE"."BHV_MOU_VIEW" LIMIT %d OFFSET %d`, limit, offset)
	rows, err := db.Query(dataQuery)
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

	var records []map[string]interface{}

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
			default:
				rec[colName] = v
			}
		}
		records = append(records, rec)
	}

	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if records == nil {
		records = []map[string]interface{}{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"columns": cols,
		"data":    records,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}
