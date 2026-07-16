package main

import (
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// =============================================================================
// NullFloat — custom scanner that handles HANA *big.Rat DECIMAL columns
// =============================================================================

type NullFloat struct{ V float64 }

func (n *NullFloat) Scan(src interface{}) error {
	if src == nil {
		n.V = 0
		return nil
	}
	switch v := src.(type) {
	case *big.Rat:
		f, _ := v.Float64()
		n.V = f
	case float64:
		n.V = v
	case float32:
		n.V = float64(v)
	case int64:
		n.V = float64(v)
	case []byte:
		f, err := strconv.ParseFloat(string(v), 64)
		if err != nil {
			return err
		}
		n.V = f
	case string:
		f, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return err
		}
		n.V = f
	default:
		return fmt.Errorf("NullFloat: unsupported type %T", src)
	}
	return nil
}

// =============================================================================
// SALES QUERY — GET /api/sales
// =============================================================================

type SaleRecord struct {
	SrNo                int     `json:"srNo"`
	CreateDate          string  `json:"createDate"`
	DCPNo               int     `json:"dcpNo"`
	DCPDate             string  `json:"dcpDate"`
	OrderNo             string  `json:"orderNo"`
	OrderDate           string  `json:"orderDate"`
	SoldToCode          string  `json:"soldToCode"`
	SoldTo              string  `json:"soldTo"`
	ShipTo              string  `json:"shipTo"`
	ShipToName          string  `json:"shipToName"`
	ShipToCity          string  `json:"shipToCity"`
	GroupCompany        string  `json:"groupCompany"`
	GroupCompanyName    string  `json:"groupCompanyName"`
	Product             string  `json:"product"`
	ProdDesc            string  `json:"prodDesc"`
	MaterialType        string  `json:"materialType"`
	Quantity            float64 `json:"quantity"`
	Unit                string  `json:"unit"`
	Plant               string  `json:"plant"`
	PlantName           string  `json:"plantName"`
	Amount              float64 `json:"amount"`
	Tax                 float64 `json:"tax"`
	TotalAmt            float64 `json:"totalAmt"`
	TotalAmtPayable     float64 `json:"totalAmtPayable"`
	TDSAmount           float64 `json:"tdsAmount"`
	TCSAmount           string  `json:"tcsAmount"`
	RetailInvoice       string  `json:"retailInvoice"`
	TaxInvoiceNo        string  `json:"taxInvoiceNo"`
	GSTInvoice          string  `json:"gstInvoice"`
	Currency            string  `json:"currency"`
	PaymentMethod       string  `json:"paymentMethod"`
	PaymentMethodDesc   string  `json:"paymentMethodDesc"`
	PaymentTerm         string  `json:"paymentTerm"`
	LorryReceiptNo      string  `json:"lorryReceiptNo"`
	TruckNo             string  `json:"truckNo"`
	TransportName       string  `json:"transportName"`
	EwayBillNo          string  `json:"ewayBillNo"`
	BatchNo             string  `json:"batchNo"`
	CentralTax          string  `json:"centralTax"`
	StateTax            string  `json:"stateTax"`
	IntegratedTax       string  `json:"integratedTax"`
	UnionTerritoryGST   string  `json:"unionTerritoryGST"`
	ProductHSNCode      string  `json:"productHsnCode"`
	PlantGSTNumber      string  `json:"plantGstNumber"`
	BPGSTNumber         string  `json:"bpGstNumber"`
	SalesOffice         string  `json:"salesOffice"`
	Payer               int     `json:"payer"`
	PayerName           string  `json:"payerName"`
	BillToNo            string  `json:"billToNo"`
	BillToName          string  `json:"billToName"`
	FreightPayMethod    string  `json:"freightPayMethod"`
	FreightPayMethDesc  string  `json:"freightPayMethodDesc"`
	ContractNo          int     `json:"contractNo"`
	BOENo               string  `json:"boeNo"`
	BOEDate             string  `json:"boeDate"`
	CheckDigitNo        string  `json:"checkDigitNo"`
	SORDate             string  `json:"sorDate"`
	SORAmt              float64 `json:"sorAmt"`
	PONumber            int     `json:"poNumber"`
	PODate              string  `json:"poDate"`
	LCScrollNo          string  `json:"lcScrollNo"`
	CustomerLCNo        string  `json:"customerLcNo"`
	SourcePlant         string  `json:"sourcePlant"`
	SourcePlantName     string  `json:"sourcePlantName"`
	FreightInvoice      string  `json:"freightInvoice"`
	FreightAmt          float64 `json:"freightAmt"`
	CustomDuty          string  `json:"customDuty"`
	CustomAmount        float64 `json:"customAmount"`
	SORGSTNo            string  `json:"sorGstNo"`
	DistributionChannel string  `json:"distributionChannel"`
	Division            string  `json:"division"`
	PostFLAG            string  `json:"postFlag"`
	TransID             int     `json:"transId"`
}

type SalesResponse struct {
	Data   []SaleRecord `json:"data"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

func HandleSales(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	filterBy     := q.Get("filter_by")
	filterValue  := q.Get("filter_value")
	materialType := q.Get("material_type")
	dateMode     := q.Get("date_mode")
	startDate    := q.Get("start_date")
	endDate      := q.Get("end_date")
	month        := q.Get("month")
	year         := q.Get("year")
	limit, _     := strconv.Atoi(q.Get("limit"))
	offset, _    := strconv.Atoi(q.Get("offset"))

	if limit <= 0 || limit > 1000 {
		limit = 200
	}

	var conditions []string
	var args []interface{}

	// Customer filter — optional (empty filterValue = no customer filter)
	if filterValue != "" {
		switch filterBy {
		case "soldto":
			conditions = append(conditions, `"SoldTo" = ?`)
			args = append(args, filterValue)
		case "shipto":
			conditions = append(conditions, `"ShipTo_Name" = ?`)
			args = append(args, filterValue)
		case "group":
			conditions = append(conditions, `"GroupCompany_Name" = ?`)
			args = append(args, filterValue)
		}
	}

	// Material filter — type (first word) or full description
	materialDesc := q.Get("material_desc")
	if materialType != "" {
		conditions = append(conditions, `"MaterialType" = ?`)
		args = append(args, materialType)
	} else if materialDesc != "" {
		conditions = append(conditions, `"Prod_Desc" = ?`)
		args = append(args, materialDesc)
	}

	// Date filter — pass strings and use HANA's TO_DATE to avoid driver type conversion errors
	switch dateMode {
	case "range":
		if startDate != "" && endDate != "" {
			st := strings.ReplaceAll(startDate, "-", "")
			et := strings.ReplaceAll(endDate, "-", "")
			conditions = append(conditions, `CAST("DCP_DATE" AS DATE) >= TO_DATE(?, 'YYYYMMDD') AND CAST("DCP_DATE" AS DATE) <= TO_DATE(?, 'YYYYMMDD')`)
			args = append(args, st, et)
		}
	case "month":
		if year != "" {
			y, _ := strconv.Atoi(year)
			if month != "" {
				m, _ := strconv.Atoi(month)
				first := fmt.Sprintf("%04d%02d01", y, m)
				t := time.Date(y, time.Month(m+1), 0, 0, 0, 0, 0, time.UTC)
				last := t.Format("20060102")
				
				conditions = append(conditions, `CAST("DCP_DATE" AS DATE) >= TO_DATE(?, 'YYYYMMDD') AND CAST("DCP_DATE" AS DATE) <= TO_DATE(?, 'YYYYMMDD')`)
				args = append(args, first, last)
			} else {
				// Year only — no month selected
				first := fmt.Sprintf("%04d0101", y)
				last := fmt.Sprintf("%04d1231", y)
				conditions = append(conditions, `CAST("DCP_DATE" AS DATE) >= TO_DATE(?, 'YYYYMMDD') AND CAST("DCP_DATE" AS DATE) <= TO_DATE(?, 'YYYYMMDD')`)
				args = append(args, first, last)
			}
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	db, err := GetDB()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM "RAGHAV_LIVE"."TEC_SALES_DASHBOARD" %s`, whereClause)
	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "count error: " + err.Error()})
		return
	}

	// Data query
	dataQuery := fmt.Sprintf(`
		SELECT
			"SrNo", "CreateDate", "DCP_No", "DCP_DATE",
			"Order_No", "Order_Date",
			"SoldToCode", "SoldTo",
			"ShipTo", "ShipTo_Name", "ShipTo_City",
			"Group_Company", "GroupCompany_Name",
			"Product", "Prod_Desc", "MaterialType",
			"Quantity", "Unit",
			"Plant", "Plant_Name",
			"Amount", "Tax", "TotalAmt", "TotalAmount_Payable",
			"TDS_Amount", "TCS_Amount",
			"Retail_Invoice", "TaxInvoiceNo", "GST_Invoice",
			"Currency",
			"Payment_Method", "PaymentMeth_Desc", "Payment_Term",
			"LorryReceipt_No", "Truck_No", "Transport_Name",
			"EwayBill_No", "Batch_No",
			"Central_Tax", "State_Tax", "Integrated_Tax", "UnionTeritory_GST",
			"ProductHSN_Code", "PlantGST_Number", "BPGST_Number",
			"Sales_Office", "Payer", "Payer_Name",
			"BillTo_No", "BillTo_Name",
			"FreightPay_Method", "FreightPayMethod_Desc",
			"Contract_No", "BOE_No", "BOE_Date", "CheckDigit_No",
			"SOR_Date", "SOR_Amt", "PO_Number", "PO_Date",
			"LCScrollNo", "CustomerLC_No",
			"Source_Plant", "SourcePlant_Name",
			"Freight_Invoice", "Freight_Amt",
			"Custom_Duty", "Custom_Amount",
			"SORGSTNo", "Distribution_Channel", "Division",
			"PostFLAG", "TransID"
		FROM "RAGHAV_LIVE"."TEC_SALES_DASHBOARD"
		%s
		LIMIT %d OFFSET %d`,
		whereClause, limit, offset,
	)

	rows, err := db.Query(dataQuery, args...)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query error: " + err.Error()})
		return
	}
	defer rows.Close()

	var records []SaleRecord
	for rows.Next() {
		var rec SaleRecord
		var (
			createDate, dcpDate, orderDate                   nullTime
			qty, amt, tax, totalAmt, totalPayable, tds       NullFloat
			sorAmt, freightAmt, customAmt                    NullFloat
			// All string columns that can be NULL in HANA
			orderNo, soldToCode, soldTo                      nullStr
			shipTo, shipToName, shipToCity                   nullStr
			groupCompany, groupCompanyName                   nullStr
			product, prodDesc, materialType                  nullStr
			unit, plant, plantName                           nullStr
			tcsAmt, retailInvoice, taxInvoiceNo, gstInvoice  nullStr
			currency                                          nullStr
			paymentMethod, paymentMethodDesc, paymentTerm    nullStr
			lorryReceiptNo, truckNo, transportName           nullStr
			ewayBillNo, batchNo                              nullStr
			centralTax, stateTax, integratedTax, utGST       nullStr
			productHSN, plantGST, bpGST                     nullStr
			salesOffice, payerName                           nullStr
			billToNo, billToName                             nullStr
			freightPayMethod, freightPayMethDesc             nullStr
			boeNo, boeDate, checkDigitNo                     nullStr
			sorDate, poDate                                  nullStr
			lcScrollNo, customerLCNo                         nullStr
			sourcePlant, sourcePlantName                     nullStr
			freightInvoice, customDuty                       nullStr
			sorGSTNo, distChannel, division, postFlag        nullStr
		)
		err := rows.Scan(
			&rec.SrNo, &createDate, &rec.DCPNo, &dcpDate,
			&orderNo, &orderDate,
			&soldToCode, &soldTo,
			&shipTo, &shipToName, &shipToCity,
			&groupCompany, &groupCompanyName,
			&product, &prodDesc, &materialType,
			&qty, &unit,
			&plant, &plantName,
			&amt, &tax, &totalAmt, &totalPayable,
			&tds, &tcsAmt,
			&retailInvoice, &taxInvoiceNo, &gstInvoice,
			&currency,
			&paymentMethod, &paymentMethodDesc, &paymentTerm,
			&lorryReceiptNo, &truckNo, &transportName,
			&ewayBillNo, &batchNo,
			&centralTax, &stateTax, &integratedTax, &utGST,
			&productHSN, &plantGST, &bpGST,
			&salesOffice, &rec.Payer, &payerName,
			&billToNo, &billToName,
			&freightPayMethod, &freightPayMethDesc,
			&rec.ContractNo, &boeNo, &boeDate, &checkDigitNo,
			&sorDate, &sorAmt, &rec.PONumber, &poDate,
			&lcScrollNo, &customerLCNo,
			&sourcePlant, &sourcePlantName,
			&freightInvoice, &freightAmt,
			&customDuty, &customAmt,
			&sorGSTNo, &distChannel, &division,
			&postFlag, &rec.TransID,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan error: " + err.Error()})
			return
		}
		rec.CreateDate          = createDate.S
		rec.DCPDate             = dcpDate.S
		rec.OrderNo             = orderNo.S
		rec.OrderDate           = orderDate.S
		rec.SoldToCode          = soldToCode.S
		rec.SoldTo              = soldTo.S
		rec.ShipTo              = shipTo.S
		rec.ShipToName          = shipToName.S
		rec.ShipToCity          = shipToCity.S
		rec.GroupCompany        = groupCompany.S
		rec.GroupCompanyName    = groupCompanyName.S
		rec.Product             = product.S
		rec.ProdDesc            = prodDesc.S
		rec.MaterialType        = materialType.S
		rec.Unit                = unit.S
		rec.Plant               = plant.S
		rec.PlantName           = plantName.S
		rec.TCSAmount           = tcsAmt.S
		rec.RetailInvoice       = retailInvoice.S
		rec.TaxInvoiceNo        = taxInvoiceNo.S
		rec.GSTInvoice          = gstInvoice.S
		rec.Currency            = currency.S
		rec.PaymentMethod       = paymentMethod.S
		rec.PaymentMethodDesc   = paymentMethodDesc.S
		rec.PaymentTerm         = paymentTerm.S
		rec.LorryReceiptNo      = lorryReceiptNo.S
		rec.TruckNo             = truckNo.S
		rec.TransportName       = transportName.S
		rec.EwayBillNo          = ewayBillNo.S
		rec.BatchNo             = batchNo.S
		rec.CentralTax          = centralTax.S
		rec.StateTax            = stateTax.S
		rec.IntegratedTax       = integratedTax.S
		rec.UnionTerritoryGST   = utGST.S
		rec.ProductHSNCode      = productHSN.S
		rec.PlantGSTNumber      = plantGST.S
		rec.BPGSTNumber         = bpGST.S
		rec.SalesOffice         = salesOffice.S
		rec.PayerName           = payerName.S
		rec.BillToNo            = billToNo.S
		rec.BillToName          = billToName.S
		rec.FreightPayMethod    = freightPayMethod.S
		rec.FreightPayMethDesc  = freightPayMethDesc.S
		rec.BOENo               = boeNo.S
		rec.BOEDate             = boeDate.S
		rec.CheckDigitNo        = checkDigitNo.S
		rec.SORDate             = sorDate.S
		rec.PODate              = poDate.S
		rec.LCScrollNo          = lcScrollNo.S
		rec.CustomerLCNo        = customerLCNo.S
		rec.SourcePlant         = sourcePlant.S
		rec.SourcePlantName     = sourcePlantName.S
		rec.FreightInvoice      = freightInvoice.S
		rec.CustomDuty          = customDuty.S
		rec.SORGSTNo            = sorGSTNo.S
		rec.DistributionChannel = distChannel.S
		rec.Division            = division.S
		rec.PostFLAG            = postFlag.S
		rec.Quantity            = qty.V
		rec.Amount              = amt.V
		rec.Tax                 = tax.V
		rec.TotalAmt            = totalAmt.V
		rec.TotalAmtPayable     = totalPayable.V
		rec.TDSAmount           = tds.V
		rec.SORAmt              = sorAmt.V
		rec.FreightAmt          = freightAmt.V
		rec.CustomAmount        = customAmt.V
		records = append(records, rec)
	}
	if err := rows.Err(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if records == nil {
		records = []SaleRecord{}
	}
	writeJSON(w, http.StatusOK, SalesResponse{Data: records, Total: total, Limit: limit, Offset: offset})
}

// ── Lightweight nullable helpers ──────────────────────────────────────────────

type nullTime struct{ S string }

func (n *nullTime) Scan(src interface{}) error {
	if src == nil {
		n.S = ""
		return nil
	}
	if t, ok := src.(time.Time); ok {
		n.S = t.Format("02/01/06")
	}
	return nil
}

type nullStr struct{ S string }

func (n *nullStr) Scan(src interface{}) error {
	if src == nil {
		n.S = ""
		return nil
	}
	switch v := src.(type) {
	case string:
		n.S = v
	case []byte:
		n.S = string(v)
	}
	return nil
}
