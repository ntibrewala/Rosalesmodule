package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func main() {
	LoadConfig()

	mux := http.NewServeMux()

	// Public — login
	mux.HandleFunc("/api/login", HandleLogin)

	// Protected — filters
	mux.HandleFunc("/api/filters/soldto",       JWTMiddleware(HandleFilterSoldTo))
	mux.HandleFunc("/api/filters/shipto",       JWTMiddleware(HandleFilterShipTo))
	mux.HandleFunc("/api/filters/groups",       JWTMiddleware(HandleFilterGroups))
	mux.HandleFunc("/api/filters/materials",    JWTMiddleware(HandleFilterMaterials))
	mux.HandleFunc("/api/filters/descriptions", JWTMiddleware(HandleFilterDescriptions))

	// Protected — sales data
	mux.HandleFunc("/api/sales", JWTMiddleware(HandleSales))
	mux.HandleFunc("/api/mou", JWTMiddleware(HandleMOU))

	// Protected — discount/interest
	mux.HandleFunc("/api/discount/payable", JWTMiddleware(HandleGetDiscountPayable))
	mux.HandleFunc("/api/discount/payable/post", JWTMiddleware(HandlePostDiscountPayable))
	mux.HandleFunc("/api/interest/posted", JWTMiddleware(HandleGetInterestPosted))
	mux.HandleFunc("/api/cash-discount", JWTMiddleware(HandleCashDiscount))
	mux.HandleFunc("/api/cash-discount/post", JWTMiddleware(HandlePostCashDiscount))

	// Protected — user preferences
	mux.HandleFunc("/api/prefs", JWTMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			HandleGetPrefs(w, r)
		} else if r.Method == http.MethodPost {
			HandleSavePrefs(w, r)
		} else {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Serve built React frontend from ../frontend/dist
	distPath := filepath.Join("..", "frontend", "dist")
	if _, err := os.Stat(distPath); err == nil {
		mux.HandleFunc("/", spaHandler(distPath))
		log.Printf("Serving React frontend from %s", distPath)
	} else {
		log.Printf("Warning: frontend dist not found at %s — run 'npm run build' in frontend/", distPath)
	}

	handler := corsMiddleware(mux)

	log.Println("TEC Sales App Server - V2 Date Fix (20231027) active!")
	addr := fmt.Sprintf(":%s", AppConfig.Port)
	log.Printf("TEC Sales Dashboard running on http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, handler))
}

// spaHandler serves static files and falls back to index.html for SPA routes.
func spaHandler(distPath string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Don't intercept /api routes
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}
		fpath := filepath.Join(distPath, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(fpath); err == nil && !info.IsDir() {
			// Serve the actual file (JS, CSS, assets)
			http.ServeFile(w, r, fpath)
			return
		}
		// Fallback to index.html for all other routes (React Router handles them)
		if _, err := fs.Stat(os.DirFS(distPath), "index.html"); err == nil {
			http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
			return
		}
		http.NotFound(w, r)
	}
}

// corsMiddleware adds CORS headers.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
