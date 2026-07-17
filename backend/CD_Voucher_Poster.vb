Imports System
Imports System.Data
Imports System.IO
Imports System.Net
Imports System.Net.Http
Imports System.Net.Http.Headers
Imports System.Text
Imports System.Threading.Tasks
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Linq
Imports Sap.Data.Hana ' Ensure you have SAP HANA Data Provider installed

Module CD_Voucher_Poster

    ' --- HANA Database Configuration ---
    Private Const HANA_CONN_STRING As String = "Server=10.10.0.113:30015;UserID=SYSTEM;Password=B1sap#2025;Current Schema=TEST_RAGHAV_08062026"
    Private Const HANA_SCHEMA As String = "RAGHAV_LIVE"
    
    ' --- SAP Service Layer Configuration ---
    Private Const SL_URL As String = "https://10.10.0.113:50000/b1s/v1"
    Private Const SL_COMPANY As String = "TEST_RAGHAV_08062026"
    Private Const SL_USER As String = "manager"
    Private Const SL_PASS As String = "bppl@123"

    ' --- Business Logic Configuration ---
    Private Const ATTACHMENT_FOLDER As String = "D:\SAP\Attachments2\Raghav_live"
    Private Const GL_ACCOUNT As String = "410004"
    Private Const SAC_ENTRY As Integer = -433
    Private Const TAX_CGST As String = "CG+SG@18"
    Private Const TAX_IGST As String = "IGST@18%"
    Private Const COMP_STATE As String = "36"

    Private b1SessionCookie As String = ""
    Private routeIdCookie As String = ""
    Private httpClient As HttpClient

    Sub Main()
        Try
            InitializeHttpClient()
            LoginSL().Wait()
            ProcessVouchers().Wait()
        Catch ex As Exception
            Console.WriteLine("Critical Error: " & ex.Message)
        Finally
            LogoutSL().Wait()
        End Try
        
        Console.WriteLine("Press any key to exit...")
        Console.ReadKey()
    End Sub

    Private Sub InitializeHttpClient()
        ' Bypass SSL Certificate Validation
        Dim handler As New HttpClientHandler()
        handler.ServerCertificateCustomValidationCallback = Function(sender, cert, chain, sslPolicyErrors) True
        handler.UseCookies = False ' Disable automatic cookies so we can inject them manually

        ' Disable 100-Continue (Critical for SAP Service Layer)
        ServicePointManager.Expect100Continue = False

        httpClient = New HttpClient(handler)
        httpClient.Timeout = TimeSpan.FromMinutes(2)
    End Sub

    Private Async Function LoginSL() As Task
        Dim loginPayload As New JObject(
            New JProperty("CompanyDB", SL_COMPANY),
            New JProperty("UserName", SL_USER),
            New JProperty("Password", SL_PASS)
        )

        Dim content As New StringContent(loginPayload.ToString(), Encoding.UTF8, "application/json")
        
        Dim request As New HttpRequestMessage(HttpMethod.Post, SL_URL & "/Login")
        request.Content = content

        Dim response As HttpResponseMessage = Await httpClient.SendAsync(request)
        Dim respText As String = Await response.Content.ReadAsStringAsync()

        If Not response.IsSuccessStatusCode Then
            Throw New Exception("Service Layer Login Failed: " & respText)
        End If

        ' Extract Session Cookies manually
        Dim setCookieHeaders As IEnumerable(Of String) = Nothing
        If response.Headers.TryGetValues("Set-Cookie", setCookieHeaders) Then
            For Each cookieStr In setCookieHeaders
                If cookieStr.StartsWith("B1SESSION=") Then
                    b1SessionCookie = cookieStr.Split(";"c)(0)
                ElseIf cookieStr.StartsWith("ROUTEID=") Then
                    routeIdCookie = cookieStr.Split(";"c)(0)
                End If
            Next
        End If

        Console.WriteLine("Login Successful. Session acquired.")
    End Function

    Private Async Function LogoutSL() As Task
        If String.IsNullOrEmpty(b1SessionCookie) Then Return

        Dim request As New HttpRequestMessage(HttpMethod.Post, SL_URL & "/Logout")
        request.Headers.Add("Cookie", $"{b1SessionCookie}; {routeIdCookie}")
        Await httpClient.SendAsync(request)
    End Function

    Private Async Function ProcessVouchers() As Task
        If Not Directory.Exists(ATTACHMENT_FOLDER) Then
            Directory.CreateDirectory(ATTACHMENT_FOLDER)
        End If

        Using conn As New HanaConnection(HANA_CONN_STRING)
            conn.Open()

            ' Fetch Unprocessed Rows
            Dim fetchCmd As New HanaCommand($"SELECT * FROM ""{HANA_SCHEMA}"".""CASH_DISCOUNT"" WHERE ""Processed"" = 'N' AND ""CD_Amount"" != 0", conn)
            Dim dt As New DataTable()
            Using da As New HanaDataAdapter(fetchCmd)
                da.Fill(dt)
            End Using

            If dt.Rows.Count = 0 Then
                Console.WriteLine("No unprocessed rows found.")
                Return
            End If

            Console.WriteLine($"Found {dt.Rows.Count} rows to process.")

            For Each row As DataRow In dt.Rows
                Dim transId As Integer = Convert.ToInt32(row("TransID"))
                Dim dcpNo As String = row("DCP_No").ToString()
                Dim soldToCode As String = row("SoldToCode").ToString()
                Dim dcpDateStr As String = If(IsDBNull(row("DCP_DATE")), "NODATE", Convert.ToDateTime(row("DCP_DATE")).ToString("yyyyMMdd"))
                Dim rectDateStr As String = If(IsDBNull(row("RectDate")), DateTime.Now.ToString("yyyy-MM-dd"), Convert.ToDateTime(row("RectDate")).ToString("yyyy-MM-dd"))
                Dim netAmount As Double = Convert.ToDouble(row("Net_Amount"))

                Console.WriteLine(vbCrLf & $"Processing DCP_No: {dcpNo} for Customer: {soldToCode}")

                Try
                    ' 1. Generate CSV Attachment Locally
                    Dim fileName As String = $"CD_{dcpNo}_{dcpDateStr}.csv"
                    Dim filePath As String = Path.Combine(ATTACHMENT_FOLDER, fileName)
                    GenerateCSV(filePath, dt, row)
                    Console.WriteLine($"CSV file generated at: {filePath}")

                    ' 2. Determine Tax Code
                    Dim custState As String = GetCustomerState(conn, soldToCode)
                    If String.IsNullOrEmpty(custState) Then
                        Throw New Exception($"Customer state is missing in SAP for '{soldToCode}'. Cannot determine Tax Code.")
                    End If

                    Dim taxCode As String = TAX_IGST
                    If custState = COMP_STATE OrElse custState = "TS" Then
                        taxCode = TAX_CGST
                    End If
                    Console.WriteLine($"State is {custState}. Using Tax Code: {taxCode}")

                    ' 3. Upload Attachment to Service Layer
                    Dim attachmentEntry As Integer? = Await UploadAttachmentAsync(filePath)

                    ' 4. Post AR Invoice
                    Dim docNum As Integer = Await PostARInvoiceAsync(soldToCode, dcpNo, row("Prod_Desc").ToString(), row("Quantity").ToString(), netAmount, taxCode, attachmentEntry)
                    Console.WriteLine($"SUCCESS: AR Invoice created! DocNum: {docNum}")

                    ' 5. Update Success in DB
                    UpdateDatabaseRow(conn, transId, "Y", docNum.ToString(), "")

                Catch ex As Exception
                    Console.WriteLine($"FAILED processing {dcpNo}: {ex.Message}")
                    ' Update Error in DB
                    UpdateDatabaseRow(conn, transId, "N", "", ex.Message.Replace("'", "''"))
                End Try
            Next
        End Using
    End Function

    Private Sub GenerateCSV(filePath As String, dt As DataTable, row As DataRow)
        Using writer As New StreamWriter(filePath)
            ' Header
            writer.WriteLine("TransID,SoldToCode,SoldTo,DCP_No,DCP_DATE,Prod_Desc,Quantity,CD_Amount,EPI_Amount,Net_Amount")
            ' Row
            Dim line As String = $"{row("TransID")},{row("SoldToCode")},{row("SoldTo").ToString().Replace(",", " ")},{row("DCP_No")},{row("DCP_DATE")},{row("Prod_Desc").ToString().Replace(",", " ")},{row("Quantity")},{row("CD_Amount")},{row("EPI_Amount")},{row("Net_Amount")}"
            writer.WriteLine(line)
        End Using
    End Sub

    Private Function GetCustomerState(conn As HanaConnection, soldToCode As String) As String
        Dim query As String = $"SELECT IFNULL(T1.""State"", T0.""State1"") FROM ""{SL_COMPANY}"".""OCRD"" T0 LEFT JOIN ""{SL_COMPANY}"".""CRD1"" T1 ON T0.""CardCode"" = T1.""CardCode"" AND T1.""AdresType"" = 'B' WHERE T0.""CardCode"" = '{soldToCode}' LIMIT 1"
        Using cmd As New HanaCommand(query, conn)
            Dim result = cmd.ExecuteScalar()
            If result IsNot Nothing AndAlso Not IsDBNull(result) Then
                Return result.ToString()
            End If
        End Using
        Return Nothing
    End Function

    Private Async Function UploadAttachmentAsync(filePath As String) As Task(Of Integer?)
        Console.WriteLine("--- Uploading Attachment to SAP ---")
        Using form As New MultipartFormDataContent()
            Dim fileBytes As Byte() = File.ReadAllBytes(filePath)
            Dim fileContent As New ByteArrayContent(fileBytes)
            fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/csv")
            form.Add(fileContent, "file", Path.GetFileName(filePath))

            Dim request As New HttpRequestMessage(HttpMethod.Post, SL_URL & "/Attachments2")
            request.Headers.Add("Cookie", $"{b1SessionCookie}; {routeIdCookie}")
            request.Content = form

            Dim response As HttpResponseMessage = Await httpClient.SendAsync(request)
            Dim respText As String = Await response.Content.ReadAsStringAsync()

            If response.IsSuccessStatusCode Then
                Dim jsonResponse As JObject = JObject.Parse(respText)
                Dim absEntry As Integer = jsonResponse("AbsoluteEntry").Value(Of Integer)()
                Console.WriteLine($"SUCCESS: Attachment uploaded. AbsoluteEntry: {absEntry}")
                Return absEntry
            Else
                Console.WriteLine($"FAILED to upload attachment: {respText}")
                Return Nothing
            End If
        End Using
    End Function

    Private Async Function PostARInvoiceAsync(soldTo As String, dcpNo As String, prodDesc As String, qty As String, netAmount As Double, taxCode As String, attachmentEntry As Integer?) As Task(Of Integer)
        Dim docLines As New JArray()
        Dim line As New JObject(
            New JProperty("AccountCode", GL_ACCOUNT),
            New JProperty("SACEntry", SAC_ENTRY),
            New JProperty("TaxCode", taxCode),
            New JProperty("LocationCode", 1),
            New JProperty("LineTotal", netAmount),
            New JProperty("ItemDescription", $"CD Reversal for {prodDesc} (Qty: {qty})")
        )
        docLines.Add(line)

        Dim payload As New JObject(
            New JProperty("DocType", "dDocument_Service"),
            New JProperty("CardCode", soldTo),
            New JProperty("DocDate", DateTime.Now.ToString("yyyy-MM-dd")),
            New JProperty("Comments", $"Auto-generated CD Reversal for DCP {dcpNo}"),
            New JProperty("DocumentLines", docLines)
        )

        If attachmentEntry.HasValue Then
            payload.Add("AttachmentEntry", attachmentEntry.Value)
        End If

        Dim content As New StringContent(payload.ToString(), Encoding.UTF8, "application/json")
        ' Important: SAP Service layer rejects charset=utf-8 in Content-Type
        content.Headers.ContentType.CharSet = "" 

        Dim request As New HttpRequestMessage(HttpMethod.Post, SL_URL & "/Invoices")
        request.Headers.Add("Cookie", $"{b1SessionCookie}; {routeIdCookie}")
        request.Content = content

        Dim response As HttpResponseMessage = Await httpClient.SendAsync(request)
        Dim respText As String = Await response.Content.ReadAsStringAsync()

        If response.IsSuccessStatusCode Then
            Dim jsonResponse As JObject = JObject.Parse(respText)
            Return jsonResponse("DocNum").Value(Of Integer)()
        Else
            Dim errMsg As String = respText
            Try
                Dim errJson As JObject = JObject.Parse(respText)
                errMsg = errJson("error")("message")("value").ToString()
            Catch
            End Try
            Throw New Exception(errMsg)
        End If
    End Function

    Private Sub UpdateDatabaseRow(conn As HanaConnection, transId As Integer, processed As String, docNum As String, errorMsg As String)
        Dim query As String
        If processed = "Y" Then
            query = $"UPDATE ""{HANA_SCHEMA}"".""CASH_DISCOUNT"" SET ""Processed"" = 'Y', ""Document_Number"" = '{docNum}', ""Error_Message"" = '' WHERE ""TransID"" = {transId}"
        Else
            query = $"UPDATE ""{HANA_SCHEMA}"".""CASH_DISCOUNT"" SET ""Error_Message"" = '{errorMsg}' WHERE ""TransID"" = {transId}"
        End If

        Using cmd As New HanaCommand(query, conn)
            cmd.ExecuteNonQuery()
        End Using
    End Sub

End Module
