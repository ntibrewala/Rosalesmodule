// File: discount.go
package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "time"
)

type PostDiscountPayload struct {
    BPCode        string  `json:"bpCode"`
    StartDate     string  `json:"startDate"` // YYYY-MM-DD
    EndDate       string  `json:"endDate"`
    TotalInterest float64 `json:"totalInterest"`
}

// GET handler – returns interest rows (same as existing interest endpoint)
func HandleGetDiscountPayable(w http.ResponseWriter, r *http.Request) {
    startDate := r.URL.Query().Get("startDate")
    endDate := r.URL.Query().Get("endDate")
    if startDate == "" || endDate == "" {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "startDate and endDate required (YYYY-MM-DD)"})
        return
    }
    // Parse string dates to time.Time objects to ensure driver handles tcDaydate conversion correctly
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

    db, err := GetDB()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "DB err: " + err.Error()})
        return
    }
    query := `
        SELECT a."BPCode", a."CardName", SUM(a."InterestAmount") AS "TotalInterest"
        FROM "RAGHAV_LIVE"."FN_INTEREST_CALC"(?, ?) a
        WHERE a."InterestAmount" > 0 AND NOT EXISTS (
            SELECT 1 FROM "RAGHAV_LIVE"."INTEREST_RECORDING" ir
            WHERE ir."CardCode" = a."BPCode"
              AND ir."PeriodStart" = ?
              AND ir."PeriodEnd" = ?
        )
        GROUP BY a."BPCode", a."CardName"
        ORDER BY a."CardName"`
    rows, err := db.Query(query, start, end, start, end)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Query err: " + err.Error()})
        return
    }
    defer rows.Close()
    type DiscountRecord struct {
        BPCode        string  `json:"bpCode"`
        CardName      string  `json:"cardName"`
        TotalInterest float64 `json:"totalInterest"`
    }
    var results []DiscountRecord
    for rows.Next() {
        var rec DiscountRecord
        var (
            bpCode, cardName nullStr
            total            NullFloat
        )
        if err := rows.Scan(&bpCode, &cardName, &total); err != nil {
            log.Println("Discount row scan err:", err)
            continue
        }
        rec.BPCode = bpCode.S
        rec.CardName = cardName.S
        rec.TotalInterest = total.V
        results = append(results, rec)
    }
    if results == nil {
        results = []DiscountRecord{}
    }
    writeJSON(w, http.StatusOK, map[string]interface{}{ "data": results })
}

// POST handler – inserts a single record per BP with overlap validation
func HandlePostDiscountPayable(w http.ResponseWriter, r *http.Request) {
    var payload PostDiscountPayload
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
        return
    }
    // Basic validation
    if payload.BPCode == "" || payload.StartDate == "" || payload.EndDate == "" || payload.TotalInterest <= 0 {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing fields or zero interest"})
        return
    }
    // Parse dates to ensure proper format
    _, err := time.Parse("2006-01-02", payload.StartDate)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid startDate format"})
        return
    }
    _, err = time.Parse("2006-01-02", payload.EndDate)
    if err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid endDate format"})
        return
    }
    db, err := GetDB()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "DB connection failed: " + err.Error()})
        return
    }
    // Overlap check
    overlapQuery := `
        SELECT 1 FROM "RAGHAV_LIVE"."INTEREST_RECORDING"
        WHERE "CardCode" = ?
          AND ? <= "PeriodEnd"
          AND ? >= "PeriodStart"`
    var exists int
    // Parse strings into time.Time for the driver
    st, _ := time.Parse("2006-01-02", payload.StartDate)
    et, _ := time.Parse("2006-01-02", payload.EndDate)
    err = db.QueryRow(overlapQuery, payload.BPCode, st, et).Scan(&exists)
    if err != sql.ErrNoRows && err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "overlap check failed: " + err.Error()})
        return
    }
    if err == nil { // overlap exists
        writeJSON(w, http.StatusConflict, map[string]string{"error": "An overlapping posting already exists for this BP"})
        return
    }
    // Insert record
    insertQuery := `
        INSERT INTO "RAGHAV_LIVE"."INTEREST_RECORDING"
        ("CardCode", "CardName", "PeriodStart", "PeriodEnd", "InterestAmount")
        VALUES (?, ?, ?, ?, ?)`
    var cardName string
    _ = db.QueryRow(`SELECT "CardName" FROM "RAGHAV_LIVE"."OCRD" WHERE "CardCode" = ?`, payload.BPCode).Scan(&cardName)
    _, err = db.Exec(insertQuery, payload.BPCode, cardName, st, et, payload.TotalInterest)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Insert failed: " + err.Error()})
        return
    }
    writeJSON(w, http.StatusOK, map[string]string{"message": "Interest posted successfully"})
}

// GET handler – fetches historical posted interest records 
func HandleGetInterestPosted(w http.ResponseWriter, r *http.Request) {
    db, err := GetDB()
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "DB connection failed: " + err.Error()})
        return
    }

    query := `
        SELECT "DocNum", "CardCode", "CardName", "PeriodStart", "PeriodEnd", "InterestAmount", "PostedFlag", "SyncStatus", "SAP_JE_Entry"
        FROM "RAGHAV_LIVE"."VW_INTEREST_POSTED"
        ORDER BY "CardCode", "PeriodStart", "PeriodEnd"`

    rows, err := db.Query(query)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Query failed: " + err.Error()})
        return
    }
    defer rows.Close()

    type PostedRecord struct {
        DocNum         int     `json:"docNum"`
        CardCode       string  `json:"cardCode"`
        CardName       string  `json:"cardName"`
        PeriodStart    string  `json:"periodStart"`
        PeriodEnd      string  `json:"periodEnd"`
        InterestAmount float64 `json:"interestAmount"`
        PostedFlag     string  `json:"postedFlag"`
        SyncStatus     string  `json:"syncStatus"`
        SAPJEEntry     int     `json:"sapJEEntry"`
    }

    var results []PostedRecord
    for rows.Next() {
        var rec PostedRecord
        var (
            docNum, sapJe       sql.NullInt64
            cardCode, cardName  nullStr
            periodStart, periodEnd nullTime
            amount              NullFloat
            postedFlag, syncStatus nullStr
        )
        if err := rows.Scan(&docNum, &cardCode, &cardName, &periodStart, &periodEnd, &amount, &postedFlag, &syncStatus, &sapJe); err != nil {
            log.Println("Posted row scan err:", err)
            continue
        }

        rec.DocNum = int(docNum.Int64)
        rec.CardCode = cardCode.S
        rec.CardName = cardName.S
        rec.PeriodStart = periodStart.S
        rec.PeriodEnd = periodEnd.S
        rec.InterestAmount = amount.V
        rec.PostedFlag = postedFlag.S
        rec.SyncStatus = syncStatus.S
        if sapJe.Valid {
            rec.SAPJEEntry = int(sapJe.Int64)
        }
        results = append(results, rec)
    }

    if results == nil {
        results = []PostedRecord{}
    }
    writeJSON(w, http.StatusOK, map[string]interface{}{"data": results})
}
