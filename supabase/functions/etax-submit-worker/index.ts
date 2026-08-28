/**
 * supabase/functions/etax-submit-worker/index.ts
 *
 * e-Tax Submit Worker — polls etax_submissions (status='queued'),
 * generates Thai RD UBL 2.1 XML (T01 / InvoiceTypeCode 388),
 * POSTs to an ETDA-certified provider, then marks each submission
 * submitted or failed.
 *
 * Env vars required:
 *   SUPABASE_URL            — injected automatically by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — injected automatically
 *   ETAX_PROVIDER_URL       — ETDA-certified provider endpoint (e.g. PEAK, FlowAccount)
 *   ETAX_API_KEY            — provider API key
 *   ETAX_SELLER_TAX_ID      — 13-digit Thai tax-ID of the platform seller
 *   ETAX_SELLER_NAME        — Thai legal name of the platform seller
 *   CRON_SECRET             — shared secret for Supabase Scheduled Job auth
 *
 * Trigger: Supabase Scheduled Job every 5 minutes
 *   POST https://<project>.supabase.co/functions/v1/etax-submit-worker
 *   Authorization: Bearer <CRON_SECRET>
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_LIMIT = 10
const UBL_NAMESPACE = 'urn:etax:names:specification:ubl:schema:xsd:TaxInvoice-1'
const UBL_CAC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
const UBL_CBC = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
const UBL_EXT = 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EtaxSubmission {
  id: string
  org_id: string
  invoice_id: string
  document_type: 'T01' | 'T02' | 'T03' | 'T04'
  document_number: string
  document_date: string        // ISO date string
  net_amount: number
  vat_amount: number
  gross_amount: number
  vat_rate: number             // e.g. 0.07
  seller_tax_id: string
  buyer_tax_id: string | null
  buyer_name: string | null
  status: string
  attempt_count: number
  xml_payload: string | null
}

interface OrgSettings {
  name: string
  seller_tax_id: string
  seller_name: string
}

interface InvoiceDetail {
  invoice_number: string
  customer_name: string
  customer_tax_id: string | null
  due_date: string | null
  total_amount: number
  notes: string | null
}

interface ProviderResponse {
  success: boolean
  rd_ref_no?: string
  rd_response_code?: string
  error?: string
}

interface WorkerResult {
  processed: number
  submitted: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Escape special XML characters
 */
function xmlEscape(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format a number to 2 decimal places for XML amounts
 */
function fmt(n: number): string {
  return n.toFixed(2)
}

/**
 * Format ISO date string to YYYY-MM-DD (Thai RD uses BCE+543, but
 * international providers accept CE dates — use CE here)
 */
function fmtDate(d: string): string {
  return d.slice(0, 10)
}

/**
 * Map document_type to InvoiceTypeCode + profile name
 *  T01 = Full VAT Invoice → 388
 *  T02 = Abbreviated VAT Invoice → 388 (abbreviated)
 *  T03 = Credit Note → 381
 *  T04 = Debit Note → 383
 */
function getInvoiceTypeCode(docType: string): { code: string; name: string } {
  const map: Record<string, { code: string; name: string }> = {
    T01: { code: '388', name: 'T01' },
    T02: { code: '388', name: 'T02' },
    T03: { code: '381', name: 'T03' },
    T04: { code: '383', name: 'T04' },
  }
  return map[docType] ?? { code: '388', name: 'T01' }
}

// ─── XML Generator ───────────────────────────────────────────────────────────

/**
 * Build Thai RD UBL 2.1 TaxInvoice XML for a given submission.
 * Follows ETDA e-Tax Invoice & e-Receipt standard v3.0
 * https://www.rd.go.th/fileadmin/user_upload/lorchor/activity/2563/etax/UBL_schema.zip
 */
function buildUblXml(
  submission: EtaxSubmission,
  sellerTaxId: string,
  sellerName: string,
  invoice: InvoiceDetail,
): string {
  const now = new Date()
  const issueDate = fmtDate(submission.document_date)
  const issueTime = now.toISOString().slice(11, 19) // HH:MM:SS
  const { code: typeCode, name: typeName } = getInvoiceTypeCode(submission.document_type)

  const buyerTaxId = submission.buyer_tax_id ?? invoice.customer_tax_id ?? '0000000000000'
  const buyerName = xmlEscape(submission.buyer_name ?? invoice.customer_name ?? 'ไม่ระบุ')
  const sellerNameEscaped = xmlEscape(sellerName)
  const docNumber = xmlEscape(submission.document_number)

  const netAmt = fmt(submission.net_amount)
  const vatAmt = fmt(submission.vat_amount)
  const grossAmt = fmt(submission.gross_amount)
  const vatPct = fmt(submission.vat_rate * 100) // e.g. "7.00"

  return `<?xml version="1.0" encoding="UTF-8"?>
<TaxInvoice xmlns="${UBL_NAMESPACE}"
            xmlns:cac="${UBL_CAC}"
            xmlns:cbc="${UBL_CBC}"
            xmlns:ext="${UBL_EXT}">

  <!-- ── UBL Header ── -->
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:etax:names:specification:ubl:thailand:codelist:gc:TaxInvoiceCode:3.0</cbc:CustomizationID>
  <cbc:ProfileID>tax:invoice:type:${typeCode}</cbc:ProfileID>
  <cbc:ID>${docNumber}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${typeName}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>THB</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>THB</cbc:TaxCurrencyCode>

  <!-- ── Seller (Accounting Supplier Party) ── -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID schemeID="TXID">${xmlEscape(sellerTaxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${sellerNameEscaped}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- ── Buyer (Accounting Customer Party) ── -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID schemeID="TXID">${xmlEscape(buyerTaxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${buyerName}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- ── Tax Total ── -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="THB">${vatAmt}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="THB">${netAmt}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="THB">${vatAmt}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>VAT</cbc:ID>
        <cbc:Percent>${vatPct}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- ── Monetary Totals ── -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="THB">${netAmt}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="THB">${netAmt}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="THB">${grossAmt}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="THB">${grossAmt}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- ── Invoice Line (single consolidated line) ── -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="THB">${netAmt}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${xmlEscape(invoice.notes ?? 'สินค้า/บริการ')}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="THB">${netAmt}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

</TaxInvoice>`
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Atomically claim a batch of queued submissions by setting status='submitting'.
 * Returns the claimed rows.
 */
async function claimBatch(
  supabase: SupabaseClient,
  limit: number,
): Promise<EtaxSubmission[]> {
  // Use a CTE to atomically select + update
  const { data, error } = await supabase.rpc('_etax_claim_batch', { p_limit: limit })
  if (error) throw new Error(`claimBatch rpc error: ${error.message}`)
  return (data as EtaxSubmission[]) ?? []
}

/**
 * Fetch invoice details for enriching the XML payload
 */
async function fetchInvoiceDetail(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number, customer_name, customer_tax_id, due_date, total_amount, notes')
    .eq('id', invoiceId)
    .maybeSingle()
  if (error) return null
  return data as InvoiceDetail | null
}

/**
 * Mark a submission as submitted with the provider's reference number
 */
async function markSubmitted(
  supabase: SupabaseClient,
  id: string,
  rdRefNo: string,
  rdResponseCode: string,
  xmlPayload: string,
): Promise<void> {
  const { error } = await supabase.rpc('rpc_etax_mark_submitted', {
    p_submission_id: id,
    p_rd_ref_no: rdRefNo,
    p_rd_response_code: rdResponseCode,
    p_xml_payload: xmlPayload,
  })
  if (error) throw new Error(`markSubmitted error: ${error.message}`)
}

/**
 * Mark a submission as failed with error detail
 */
async function markFailed(
  supabase: SupabaseClient,
  id: string,
  errorDetail: string,
): Promise<void> {
  const { error } = await supabase.rpc('rpc_etax_mark_failed', {
    p_submission_id: id,
    p_error_detail: errorDetail,
  })
  if (error) console.error(`markFailed error: ${error.message}`)
}

// ─── Provider API ─────────────────────────────────────────────────────────────

/**
 * POST XML to the ETDA-certified provider.
 * Expects a JSON response with { ref_no, response_code, success }.
 * Most Thai providers (PEAK, InFlow, etc.) wrap the RD API response.
 */
async function submitToProvider(
  providerUrl: string,
  apiKey: string,
  xmlPayload: string,
  documentNumber: string,
  documentType: string,
): Promise<ProviderResponse> {
  const endpoint = `${providerUrl.replace(/\/$/, '')}/v1/submit`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'X-API-Key': apiKey,
      'X-Document-Number': documentNumber,
      'X-Document-Type': documentType,
      Accept: 'application/json',
    },
    body: xmlPayload,
    // 30-second timeout
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      success: false,
      error: `HTTP ${response.status}: ${body.slice(0, 300)}`,
    }
  }

  let json: Record<string, unknown>
  try {
    json = await response.json()
  } catch {
    return { success: false, error: 'Invalid JSON response from provider' }
  }

  if (json.success || json.status === 'success' || response.status === 200) {
    return {
      success: true,
      rd_ref_no: String(json.ref_no ?? json.rd_ref_no ?? json.reference_number ?? ''),
      rd_response_code: String(json.response_code ?? json.rd_response_code ?? '200'),
    }
  }

  return {
    success: false,
    error: String(json.error ?? json.message ?? json.error_description ?? 'Unknown provider error'),
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // ── Auth: validate CRON_SECRET ──
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (token !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // ── Env ──
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const providerUrl = Deno.env.get('ETAX_PROVIDER_URL') ?? ''
  const apiKey = Deno.env.get('ETAX_API_KEY') ?? ''
  const sellerTaxId = Deno.env.get('ETAX_SELLER_TAX_ID') ?? ''
  const sellerName = Deno.env.get('ETAX_SELLER_NAME') ?? 'Monolith Platform'

  if (!providerUrl || !apiKey || !sellerTaxId) {
    return new Response(
      JSON.stringify({
        error: 'Missing required env vars: ETAX_PROVIDER_URL, ETAX_API_KEY, ETAX_SELLER_TAX_ID',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const result: WorkerResult = { processed: 0, submitted: 0, failed: 0, errors: [] }

  // ── 1. Claim a batch atomically ──
  let batch: EtaxSubmission[]
  try {
    batch = await claimBatch(supabase, BATCH_LIMIT)
  } catch (err) {
    console.error('[etax-submit-worker] claimBatch failed:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to claim batch', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (batch.length === 0) {
    return new Response(
      JSON.stringify({ processed: 0, submitted: 0, failed: 0, message: 'No queued submissions' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  console.log(`[etax-submit-worker] Processing ${batch.length} submissions`)
  result.processed = batch.length

  // ── 2. Process each submission independently ──
  const promises = batch.map(async (submission) => {
    const logPrefix = `[etax-submit-worker][${submission.id}]`

    try {
      // 2a. Fetch invoice details for XML enrichment
      const invoice = await fetchInvoiceDetail(supabase, submission.invoice_id)
      const invoiceDetail: InvoiceDetail = invoice ?? {
        invoice_number: submission.document_number,
        customer_name: submission.buyer_name ?? 'ลูกค้า',
        customer_tax_id: submission.buyer_tax_id,
        due_date: null,
        total_amount: submission.gross_amount,
        notes: null,
      }

      // 2b. Generate UBL XML
      const xml = buildUblXml(submission, sellerTaxId, sellerName, invoiceDetail)
      console.log(`${logPrefix} XML generated (${xml.length} chars)`)

      // 2c. Submit to provider
      const providerResult = await submitToProvider(
        providerUrl,
        apiKey,
        xml,
        submission.document_number,
        submission.document_type,
      )

      if (providerResult.success) {
        // 2d. Mark submitted
        await markSubmitted(
          supabase,
          submission.id,
          providerResult.rd_ref_no ?? '',
          providerResult.rd_response_code ?? '200',
          xml,
        )
        console.log(`${logPrefix} ✅ Submitted — rd_ref_no: ${providerResult.rd_ref_no}`)
        result.submitted++
      } else {
        // 2e. Mark failed
        const errMsg = providerResult.error ?? 'Unknown error'
        await markFailed(supabase, submission.id, errMsg)
        console.error(`${logPrefix} ❌ Failed: ${errMsg}`)
        result.failed++
        result.errors.push({ id: submission.id, error: errMsg })
      }
    } catch (err) {
      // Per-submission isolation: failure here does NOT abort other submissions
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`${logPrefix} ❌ Unexpected error: ${errMsg}`)
      await markFailed(supabase, submission.id, errMsg).catch(() => {})
      result.failed++
      result.errors.push({ id: submission.id, error: errMsg })
    }
  })

  // Run all in parallel (per-submission isolation guaranteed by try/catch above)
  await Promise.allSettled(promises)

  console.log(
    `[etax-submit-worker] Done — processed: ${result.processed}, ` +
    `submitted: ${result.submitted}, failed: ${result.failed}`,
  )

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
