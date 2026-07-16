package main

import (
	"database/sql"
	"net/http"
)

// =============================================================================
// FILTERS — dropdown population endpoints
// =============================================================================

// HandleFilterSoldTo returns distinct SoldTo values for the dropdown.
// GET /api/filters/soldto
func HandleFilterSoldTo(w http.ResponseWriter, r *http.Request) {
	rows, err := queryColumn2(`SELECT DISTINCT "SoldToCode", "SoldTo" FROM "RAGHAV_LIVE"."TEC_SALE" ORDER BY "SoldTo"`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

// HandleFilterShipTo returns distinct ShipTo values.
// GET /api/filters/shipto
func HandleFilterShipTo(w http.ResponseWriter, r *http.Request) {
	rows, err := queryColumn2(`SELECT DISTINCT "ShipTo", "ShipTo_Name" FROM "RAGHAV_LIVE"."TEC_SALE" WHERE "ShipTo_Name" != '' ORDER BY "ShipTo_Name"`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

// HandleFilterGroups returns distinct GroupCompany values.
// GET /api/filters/groups
func HandleFilterGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := queryColumn2(`SELECT DISTINCT "Group_Company", "GroupCompany_Name" FROM "RAGHAV_LIVE"."TEC_SALE" WHERE "GroupCompany_Name" != '' ORDER BY "GroupCompany_Name"`)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

// HandleFilterMaterials returns distinct MaterialType values from the view.
// GET /api/filters/materials
func HandleFilterMaterials(w http.ResponseWriter, r *http.Request) {
	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	query := `SELECT DISTINCT "MaterialType" FROM "RAGHAV_LIVE"."TEC_SALES_DASHBOARD" WHERE "MaterialType" != '' ORDER BY "MaterialType"`
	dbRows, err := db.Query(query)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer dbRows.Close()

	var results []string
	for dbRows.Next() {
		var mat nullStr
		if err := dbRows.Scan(&mat); err == nil && mat.S != "" {
			results = append(results, mat.S)
		}
	}
	writeJSON(w, http.StatusOK, results)
}

// HandleFilterDescriptions returns distinct full Prod_Desc values.
// GET /api/filters/descriptions
func HandleFilterDescriptions(w http.ResponseWriter, r *http.Request) {
	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	query := `SELECT DISTINCT "Prod_Desc" FROM "RAGHAV_LIVE"."TEC_SALES_DASHBOARD" WHERE "Prod_Desc" IS NOT NULL AND "Prod_Desc" != '' ORDER BY "Prod_Desc"`
	dbRows, err := db.Query(query)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer dbRows.Close()

	var results []string
	for dbRows.Next() {
		var desc nullStr
		if err := dbRows.Scan(&desc); err == nil && desc.S != "" {
			results = append(results, desc.S)
		}
	}
	writeJSON(w, http.StatusOK, results)
}


// =============================================================================
// INTERNAL HELPERS
// =============================================================================

// KVPair represents a code+name pair for dropdowns.
type KVPair struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// queryColumn2 runs a query returning two columns and maps them to KVPair list.
func queryColumn2(query string) ([]KVPair, error) {
	db, err := GetDB()
	if err != nil {
		return nil, err
	}

	dbRows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer dbRows.Close()

	var results []KVPair
	for dbRows.Next() {
		var code, name sql.NullString
		if err := dbRows.Scan(&code, &name); err != nil {
			continue
		}
		results = append(results, KVPair{
			Code: nullStrVal(code),
			Name: nullStrVal(name),
		})
	}
	return results, dbRows.Err()
}

func nullStrVal(ns sql.NullString) string {
	if ns.Valid {
		return ns.String
	}
	return ""
}
