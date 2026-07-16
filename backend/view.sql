-- =============================================================================
-- TEC_SALES_DASHBOARD View
-- Schema: RAGHAV_LIVE
-- Run this once in SAP HANA Studio / HANA Cockpit as SYSTEM
-- This view is READ-ONLY and exposes a computed MaterialType column
-- derived from the first word of Prod_Desc (e.g. PP, HDPE, LDPE, LLDPE, PPCP)
-- =============================================================================

CREATE OR REPLACE VIEW "RAGHAV_LIVE"."TEC_SALES_DASHBOARD" AS
SELECT
  "SrNo",
  "CreateDate",
  "DCP_No",
  "DCP_DATE",
  "Order_No",
  "Order_Date",
  "SoldToCode",
  "SoldTo",
  "ShipTo",
  "ShipTo_Name",
  "ShipTo_City",
  "Group_Company",
  "GroupCompany_Name",
  "Product",
  "Prod_Desc",
  -- MaterialType = first word of Prod_Desc before the space
  -- e.g. "PP H110MA" -> "PP", "HDPE F46003" -> "HDPE", "LLDPE JF19010" -> "LLDPE"
  CASE
    WHEN LOCATE("Prod_Desc", ' ') > 0
    THEN LEFT("Prod_Desc", LOCATE("Prod_Desc", ' ') - 1)
    ELSE "Prod_Desc"
  END AS "MaterialType",
  "Quantity",
  "Unit",
  "Plant",
  "Plant_Name",
  "Amount",
  "Tax",
  "TotalAmt",
  "TotalAmount_Payable",
  "TDS_Amount",
  "TCS_Amount",
  "Retail_Invoice",
  "TaxInvoiceNo",
  "GST_Invoice",
  "Currency",
  "Payment_Method",
  "PaymentMeth_Desc",
  "Payment_Term",
  "LorryReceipt_No",
  "Truck_No",
  "Transport_Name",
  "EwayBill_No",
  "Batch_No",
  "Central_Tax",
  "State_Tax",
  "Integrated_Tax",
  "UnionTeritory_GST",
  "ProductHSN_Code",
  "PlantGST_Number",
  "BPGST_Number",
  "Sales_Office",
  "Payer",
  "Payer_Name",
  "BillTo_No",
  "BillTo_Name",
  "FreightPay_Method",
  "FreightPayMethod_Desc",
  "Contract_No",
  "BOE_No",
  "BOE_Date",
  "CheckDigit_No",
  "SOR_Date",
  "SOR_Amt",
  "PO_Number",
  "PO_Date",
  "LCScrollNo",
  "CustomerLC_No",
  "Source_Plant",
  "SourcePlant_Name",
  "Freight_Invoice",
  "Freight_Amt",
  "Custom_Duty",
  "Custom_Amount",
  "SORGSTNo",
  "Distribution_Channel",
  "Division",
  "PostFLAG",
  "TransID"
FROM "RAGHAV_LIVE"."TEC_SALE";
