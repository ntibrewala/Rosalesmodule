package main

import (
        "encoding/json"
        "net/http"
        "os"
        "fmt"
        "time"
)

type SavePrefsRequest struct {
        TabName string   `json:"tabName"`
        Columns []string `json:"columns"`
        User    string   `json:"user"`
}

type PrefsResponse struct {
        Columns []string `json:"columns"`
}

func logDebug(format string, a ...interface{}) {
        msg := fmt.Sprintf("[%s] %s\n", time.Now().Format(time.RFC3339), fmt.Sprintf(format, a...))
        f, err := os.OpenFile("D:\\Documentsserver\\Bhavyatib\\raghav-salesmodule\\backend\\prefs_debug.txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
        if err == nil {
                f.WriteString(msg)
                f.Close()
        }
}

func HandleGetPrefs(w http.ResponseWriter, r *http.Request) {
        db, err := GetDB()
        if err != nil {
                http.Error(w, `{"error":"Database not connected"}`, http.StatusInternalServerError)
                return
        }

        user := r.URL.Query().Get("user")
        tabName := r.URL.Query().Get("tabName")

        if user == "" || tabName == "" {
                http.Error(w, `{"error":"Missing user or tabName parameter"}`, http.StatusBadRequest)
                return
        }

        rows, err := db.Query(`SELECT TO_VARCHAR("Columns") FROM "RAGHAV_LIVE"."TEC_USER_PREFS" WHERE "Username" = ? AND "TabName" = ?`, user, tabName)

        if err != nil {
                logDebug("GETPrefs: HANA error. ERROR: %v | User=%s Tab=%s", err, user, tabName)
                writeJSON(w, http.StatusOK, PrefsResponse{Columns: []string{}})
                return
        }
        defer rows.Close()

        var colsJSON string
        
        if rows.Next() {
                var b []byte
                if err := rows.Scan(&b); err != nil {
                        logDebug("GETPrefs: Scan natively failed: %v", err)
                } else {
                        colsJSON = string(b)
                }
        } else {
                logDebug("GETPrefs: No row found in HANA for User=%s Tab=%s", user, tabName)
        }

        var cols []string
        if colsJSON != "" {
                if umErr := json.Unmarshal([]byte(colsJSON), &cols); umErr != nil {
                    logDebug("GETPrefs: Unmarshal failed for JSON length %d: %v", len(colsJSON), umErr)
                }
        }
        
        logDebug("GETPrefs: Found colsJSON in HANA length=%d bytes. Parsed %d columns.", len(colsJSON), len(cols))

        writeJSON(w, http.StatusOK, PrefsResponse{Columns: cols})
}

func HandleSavePrefs(w http.ResponseWriter, r *http.Request) {
        db, err := GetDB()
        if err != nil {
                http.Error(w, `{"error":"Database not connected"}`, http.StatusInternalServerError)
                return
        }

        var req SavePrefsRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
                http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
                return
        }

        if req.User == "" || req.TabName == "" {
                http.Error(w, `{"error":"Missing user or tabName parameter in body"}`, http.StatusBadRequest)
                return
        }

        colsJSONB, err := json.Marshal(req.Columns)
        if err != nil {
                http.Error(w, `{"error":"Invalid columns payload"}`, http.StatusBadRequest)
                return
        }
        
        colsJSON := string(colsJSONB)

        logDebug("SAVEPROC: User=%s Tab=%s DataLength=%d Elements=%d", req.User, req.TabName, len(colsJSON), len(req.Columns))

        _, err = db.Exec(`UPSERT "RAGHAV_LIVE"."TEC_USER_PREFS" ("Username", "TabName", "Columns") VALUES (?, ?, ?) WITH PRIMARY KEY`, req.User, req.TabName, colsJSON)

        if err != nil {
                logDebug("SAVEPROC: FAILED HANA UPSERT: %v", err)
                http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
                return
        }

        writeJSON(w, http.StatusOK, map[string]string{"message": "Preferences saved to HANA"})
}
