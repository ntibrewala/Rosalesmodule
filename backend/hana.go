package main

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	_ "github.com/SAP/go-hdb/driver"
)

// =============================================================================
// SHARED HANA CONNECTION POOL
// =============================================================================

var (
	hanaDB   *sql.DB
	hanaOnce sync.Once
)

// GetDB returns the shared singleton HANA connection pool using AppConfig.HanaDSN.
func GetDB() (*sql.DB, error) {
	var initErr error
	hanaOnce.Do(func() {
		db, err := sql.Open("hdb", AppConfig.HanaDSN)
		if err != nil {
			initErr = fmt.Errorf("HANA open error: %w", err)
			return
		}
		if err = db.Ping(); err != nil {
			initErr = fmt.Errorf("HANA ping error: %w", err)
			return
		}
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(3)
		db.SetConnMaxLifetime(10 * time.Minute)
		hanaDB = db
	})
	if initErr != nil {
		hanaOnce = sync.Once{} // reset so next call retries
		return nil, initErr
	}
	if hanaDB == nil {
		return nil, fmt.Errorf("HANA DB pool not initialized")
	}
	return hanaDB, nil
}


