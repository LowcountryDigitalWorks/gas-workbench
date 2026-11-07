// Standalone synthetic browser QA, without a test-browser dependency or customer data.
// Uses the Chrome DevTools Protocol available in the hosted Linux CI image.
// Fail closed when Chrome or a real keyboard/focus transition cannot be proven.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { readFile, writeFile, mkdtemp, mkdir, readdir, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const root = resolve('dist')
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)))
    if (!file.startsWith(root + sep)) {
      res.writeHead(403).end()
      return
    }
    const bytes = await readFile(file)
    res.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(bytes)
  } catch {
    res.writeHead(404).end('Not found')
  }
})
const waitFor = async (predicate, name, timeoutMs = 12000) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await predicate()
    if (value) return value
    await sleep(50)
  }
  throw new Error('Timed out: ' + name)
}
function findChrome() {
  const candidates = [process.env.CHROME_BIN, 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean)
  for (const binary of candidates) {
    const result = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 4000 })
    if (result.status === 0) return { binary, version: result.stdout.trim() }
  }
  throw new Error('No local Chrome/Chromium binary; browser QA cannot be asserted')
}
async function keyboardProof(cdp, url, width, filterName, entryName, activationKey) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url })
  await waitFor(async () => await cdp.evaluate('document.querySelectorAll("button.nav-item").length') === 9, 'nine navigation buttons')
  async function active() {
    return cdp.evaluate('(() => { const el = document.activeElement; return { text: el?.textContent?.trim().slice(0, 140) || "", classes: String(el?.className || ""), pressed: el?.getAttribute("aria-pressed") }; })()')
  }
  async function tabTo(className, textPart) {
    for (let n = 0; n < 45; n++) {
      await cdp.key('Tab')
      const state = await active()
      if (state.classes.split(/\s+/).includes(className) && state.text.includes(textPart)) return
    }
    throw new Error('Keyboard Tab could not reach ' + className + ' / ' + textPart)
  }
  await tabTo('nav-item', 'Sites / Portfolio')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".portfolio-view"))'), 'Portfolio view')
  await tabTo('portfolio-filter', filterName)
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('(() => { const e = [...document.querySelectorAll(".portfolio-filter")].find(e => e.textContent.includes(' + JSON.stringify(filterName) + ')); return e?.getAttribute("aria-pressed") === "true"; })()'), 'active factual filter')
  await tabTo('portfolio-engagement', entryName)
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".portfolio-detail-actions button"))'), 'selected detail')
  if (filterName === 'No current run') {
    assert.equal(await cdp.evaluate('document.querySelector(".portfolio-detail")?.textContent.includes("No accepted current run")'), true)
  }
  await tabTo('portfolio-filter', 'Clear selection')
  await cdp.key(activationKey)
  await waitFor(() => cdp.evaluate('(() => { const row = document.querySelector(".portfolio-engagement"); return row && document.activeElement === row && row.getAttribute("aria-pressed") === "false"; })()'), 'focus returned to deselected row')
  const state = await cdp.evaluate('(() => { const row = document.querySelector(".portfolio-engagement"); const filter = [...document.querySelectorAll(".portfolio-filters button")].find(e => e.textContent.includes(' + JSON.stringify(filterName) + ')); const style = getComputedStyle(row); return { rowFocused: document.activeElement === row, rowPressed: row.getAttribute("aria-pressed"), filterPressed: filter?.getAttribute("aria-pressed"), neutralState: document.querySelector(".portfolio-detail")?.textContent.includes("Select an engagement"), exactTenantHidden: !document.querySelector(".portfolio-detail")?.textContent.includes("tenant-"), clearHidden: !document.querySelector(".portfolio-detail-actions"), viewport: window.innerWidth, layoutWidth: document.documentElement.clientWidth, outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) }; })()')
  assert.equal(state.rowFocused, true)
  assert.equal(state.rowPressed, 'false')
  assert.equal(state.filterPressed, 'true')
  assert.equal(state.neutralState, true)
  assert.equal(state.exactTenantHidden, true)
  assert.equal(state.clearHidden, true)
  assert.equal(state.viewport, width)
  assert.ok(state.layoutWidth >= width - 20 && state.layoutWidth <= width, 'narrow layout must preserve usable viewport width')
  assert.notEqual(state.outlineStyle, 'none')
  assert.ok(state.outlineWidth >= 3, 'keyboard focus outline must be >= 3px')
  console.log(JSON.stringify({ scenario: filterName, activationKey, ...state }))
}
async function attentionChoiceProof(cdp, url) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: url + '?qa=attention' })
  await waitFor(() => cdp.evaluate('location.search === "?qa=attention" && document.querySelectorAll(".fixture-picker button").length === 5'), 'Home fixture controls')
  async function tabTo(selector, label) {
    for (let n = 0; n < 100; n++) {
      await cdp.key('Tab')
      const match = await cdp.evaluate('(() => { const e = document.activeElement; return e?.matches(' + JSON.stringify(selector) + ') && e?.textContent.includes(' + JSON.stringify(label) + '); })()')
      if (match) return
    }
    throw new Error('Keyboard focus could not reach ' + selector + ' / ' + label)
  }
  // Use the existing *real checked* two-item technical fixture rather than a
  // test-only mock, proving Home never relies on navigation order as priority.
  await tabTo('.fixture-picker button', 'Technical review')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector(".home-view h2")?.textContent.includes("2 items for human review")'), 'Home with two unranked Attention items')
  await tabTo('.home-actions button', 'Review Attention')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelectorAll(".attention-list .source-row").length === 2'), 'two-item Attention list')
  const unselected = await cdp.evaluate('(() => ({ prompt: document.querySelector(".attention-view")?.textContent.includes("Nothing is selected automatically"), count: document.querySelectorAll(".attention-list .source-row").length, selected: !!document.querySelector(".attention-list [aria-pressed=true]"), details: !!document.querySelector(".attention-detail"), draftAction: !!document.querySelector(".attention-detail button.primary") }))()')
  assert.deepEqual(unselected, { prompt: true, count: 2, selected: false, details: false, draftAction: false })
  await tabTo('.attention-list .source-row', 'attention:discovery:services')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".attention-detail button.primary"))'), 'deliberate selection of second Attention item')
  const selected = await cdp.evaluate('(() => ({ selectedId: document.querySelector(".attention-list [aria-pressed=true] code")?.textContent, exactEvidence: document.querySelector(".attention-detail")?.textContent.includes("synthetic:discovery:services"), draftAction: !!document.querySelector(".attention-detail button.primary") }))()')
  assert.deepEqual(selected, { selectedId: 'attention:discovery:services', exactEvidence: true, draftAction: true })
  // Re-entering from Home must discard the prior local selection.
  await tabTo('.nav-item', 'Home')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".home-view"))'), 'Home reentry')
  await tabTo('.home-actions button', 'Review Attention')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelectorAll(".attention-list .source-row").length === 2'), 'two-item Attention reentry')
  assert.equal(await cdp.evaluate('!document.querySelector(".attention-detail") && !document.querySelector(".attention-list [aria-pressed=true]") && document.querySelector(".attention-view").textContent.includes("Nothing is selected automatically")'), true)
  console.log('ATTENTION_HOME_CHOICE_PASS: two-item keyboard Home navigation does not preselect; deliberate second-item choice and reentry proven')

  // Exact evidence-linked navigation is intentionally different: selecting an
  // explicit accepted reference must select that very Attention ID and no other.
  await tabTo('.nav-item', 'Evidence')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".source-inspector"))'), 'checked Evidence inspector')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".linked-context button"))'), 'explicit evidence-linked Attention action')
  await tabTo('.linked-context button', 'Open linked Attention')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".attention-detail"))'), 'selected linked Attention context')
  const linked = await cdp.evaluate('(() => ({ selectedId: document.querySelector(".attention-list [aria-pressed=true] code")?.textContent, exactEvidence: document.querySelector(".attention-detail")?.textContent.includes("synthetic:evidence-diff:page-title"), secondStillUnselected: document.querySelectorAll(".attention-list [aria-pressed=true]").length === 1, draftAction: !!document.querySelector(".attention-detail button.primary") }))()')
  assert.deepEqual(linked, { selectedId: 'attention:evidence-diff:page-title', exactEvidence: true, secondStillUnselected: true, draftAction: true })
  console.log('ATTENTION_LINKED_EVIDENCE_PASS: explicit Evidence-to-Attention navigation binds only exact referenced item')
}

async function workspaceJourneyProof(cdp, url) {
  async function runAtWidth(width) {
    const expectedWorkspace = 'workspace:synthetic-human-review-001'
    const expectedAttention = 'attention:page-focus:services'
    const expectedEvidence = 'synthetic:page-focus:services'
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
    await cdp.send('Page.navigate', { url: url + '?qa=workspace-journey&width=' + width })
    await waitFor(() => cdp.evaluate('document.querySelectorAll(".fixture-picker button").length === 5'), 'workspace journey shell at ' + width)
    assert.equal(await cdp.evaluate('document.activeElement?.tagName'), 'BODY', 'initial render must not steal keyboard focus')

    async function tabTo(selector, textPart = '') {
      for (let index = 0; index < 140; index += 1) {
        await cdp.key('Tab')
        const match = await cdp.evaluate('(() => { const e = document.activeElement; return e?.matches(' + JSON.stringify(selector) + ') && e?.textContent.includes(' + JSON.stringify(textPart) + '); })()')
        if (match) return
      }
      throw new Error('Keyboard Tab could not reach ' + selector + ' / ' + textPart + ' at ' + width)
    }
    async function pressNav(label) {
      await tabTo('.nav-item', label)
      const focus = await cdp.evaluate('(() => { const s = getComputedStyle(document.activeElement); return { tag: document.activeElement?.tagName, outline: s.outlineStyle, width: parseFloat(s.outlineWidth), viewport: document.documentElement.clientWidth }; })()')
      assert.equal(focus.tag, 'BUTTON')
      assert.notEqual(focus.outline, 'none', 'navigation focus must remain visible')
      assert.ok(focus.width >= 3, 'navigation focus outline must be at least 3px')
      if (width === 375) assert.ok(focus.viewport >= width - 20 && focus.viewport <= width, 'narrow layout must fit the viewport')
      await cdp.key('Enter')
      await new Promise((resolve) => setTimeout(resolve, 100))
      console.log('NAV_FOCUS_DIAGNOSTIC: ' + JSON.stringify(await cdp.evaluate('(() => ({ activeTag: document.activeElement?.tagName, activeClass: document.activeElement?.className, activeText: document.activeElement?.textContent?.trim().slice(0, 80), currentNav: document.querySelector(".nav-item[aria-current=page]")?.textContent?.trim().slice(0, 80), heading: document.querySelector("main h1")?.textContent?.trim(), breadcrumb: document.querySelector("main .breadcrumb")?.textContent?.trim() }))()')))
      await waitFor(() => cdp.evaluate('document.activeElement?.tagName === "H1"'), 'focus moves to ' + label + ' heading')
    }
    async function assertWorkspace(expected) {
      await tabTo('.header-context', 'Snapshot details')
      await cdp.key('Enter')
      await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === true'), 'snapshot details dialog')
      assert.equal(await cdp.evaluate('document.querySelector("dialog")?.textContent.includes(' + JSON.stringify(expected) + ')'), true, 'exact workspace identity')
      const closeArmed = await cdp.evaluate('(() => { const element = document.querySelector("dialog"); if (!element) return false; element.dataset.qaCloseSeen = "false"; element.addEventListener("close", () => { element.dataset.qaCloseSeen = "true" }, { once: true }); return true; })()')
      assert.equal(closeArmed, true, 'dialog close event must be observed before proceeding')
      await cdp.key('Escape')
      await waitFor(() => cdp.evaluate('(() => { const element = document.querySelector("dialog"); return element?.open === false && element.dataset.qaCloseSeen === "true" && document.activeElement === document.querySelector(".header-context") })()'), 'snapshot details close event and focus returned to its opener')
    }

    await tabTo('.fixture-picker button', 'Human review')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() === "Human review" && Boolean(document.querySelector(".snapshot-status"))'), 'explicit Human review workspace')
    await assertWorkspace(expectedWorkspace)

    // Prove the same case through exact evidence, its linked unranked Attention
    // item, and a deliberately edited local draft using keyboard input only.
    await pressNav('Evidence')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".source-inspector"))'), 'Evidence inspector')
    await tabTo('.source-row', 'Page Focus')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".linked-context button"))'), 'exact linked Attention action')
    assert.equal(await cdp.evaluate('document.querySelector(".exact-evidence")?.textContent.includes(' + JSON.stringify(expectedEvidence) + ')'), true)
    await tabTo('.linked-context button', 'Open linked Attention')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".attention-detail"))'), 'linked Attention detail')
    assert.equal(await cdp.evaluate('document.querySelector(".attention-list [aria-pressed=true] code")?.textContent'), expectedAttention)
    assert.equal(await cdp.evaluate('document.querySelector(".attention-detail")?.textContent.includes(' + JSON.stringify(expectedEvidence) + ')'), true)
    await assertWorkspace(expectedWorkspace)
    await tabTo('.attention-detail button.primary', 'Prepare decision draft')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".decision-view textarea"))'), 'local human draft')
    assert.equal(await cdp.evaluate('document.querySelector(".draft-context")?.textContent.includes(' + JSON.stringify(expectedAttention) + ')'), true)
    assert.equal(await cdp.evaluate('document.querySelector(".draft-context")?.textContent.includes(' + JSON.stringify(expectedEvidence) + ')'), true)
    await tabTo('.decision-view textarea', '')
    await cdp.send('Input.insertText', { text: 'Synthetic same-workspace journey draft; not recorded.' })
    const rationale = 'Synthetic same-workspace journey draft; not recorded.'
    assert.equal(await cdp.evaluate('document.querySelector(".decision-view textarea")?.value'), rationale)

    await assertWorkspace(expectedWorkspace)
    await pressNav('Measure / Outcomes')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".measurement-view .measurement-card"))'), 'measurement on selected workspace')
    assert.equal(await cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim()'), 'Human review')
    await assertWorkspace(expectedWorkspace)

    await pressNav('Reports')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".report-view .report-paper"))'), 'focused report on selected workspace')
    const reportState = await cdp.evaluate('(() => ({ report: document.querySelector(".report-paper h3")?.textContent, controls: document.querySelectorAll(".report-controls button").length, fixture: document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() }))()')
    assert.equal(reportState.report, 'Harbor Demo — Focused Evidence Report')
    assert.equal(reportState.controls, 2)
    assert.equal(reportState.fixture, 'Human review')
    await assertWorkspace(expectedWorkspace)

    await pressNav('Decision')
    assert.equal(await cdp.evaluate('document.querySelector(".decision-view textarea")?.value'), rationale, 'draft must survive same-workspace navigation')
    await assertWorkspace(expectedWorkspace)

    // An explicit case change must discard all prior-case state. Incompatible
    // feature views stay unavailable and expose no stale report actions/content.
    await tabTo('.fixture-picker button', 'Technical review')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() === "Technical review" && Boolean(document.querySelector(".snapshot-status"))'), 'explicit workspace change')
    await assertWorkspace('workspace:technical-demo')
    assert.equal(await cdp.evaluate('!document.querySelector(".attention-list [aria-pressed=true]") && !document.querySelector(".decision-view textarea")'), true)
    await pressNav('Measure / Outcomes')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".measurement-view .error-state[role=alert]"))'), 'mismatched measurement state')
    assert.equal(await cdp.evaluate('!document.querySelector(".measurement-card")'), true)
    await pressNav('Reports')
    await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".report-view .error-state[role=alert]"))'), 'mismatched report state')
    assert.equal(await cdp.evaluate('!document.querySelector(".report-paper") && !document.querySelector(".report-controls")'), true)
    await assertWorkspace('workspace:technical-demo')

    await tabTo('.fixture-picker button', 'Human review')
    await cdp.key('Enter')
    await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() === "Human review" && Boolean(document.querySelector(".snapshot-status"))'), 'return to Human review case')
    await pressNav('Decision')
    const clearedDraft = await cdp.evaluate('(() => { const view = document.querySelector(".decision-view"); return { noSelection: view?.textContent.includes("There is no selected review context"), rationale: view?.querySelector("textarea")?.value ?? null, oldAttention: view?.textContent.includes(' + JSON.stringify(expectedAttention) + ') }; })()')
    assert.deepEqual(clearedDraft, { noSelection: true, rationale: null, oldAttention: false })
    await assertWorkspace(expectedWorkspace)
    console.log('WORKSPACE_JOURNEY_BROWSER_PASS: keyboard journey, exact case identity, ephemeral draft retention, explicit-case teardown, and focus at ' + width + 'px')
  }
  await runAtWidth(1280)
  await runAtWidth(375)
}

async function reportBrowserProof(cdp, url, tempProfile) {
  // Only checked public-safe fixtures on the local built application. No remote traffic.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: url + '?qa=report' })
  await waitFor(() => cdp.evaluate('document.querySelectorAll("button.nav-item").length === 9'), 'Report test shell')
  await cdp.evaluate('([...document.querySelectorAll(".fixture-picker button")].find(e => e.textContent.trim() === "Human review")).click()')
  await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() === "Human review" && Boolean(document.querySelector(".snapshot-status"))'), 'explicit report-compatible workspace')
  async function tabTo(selector, textPart = '') {
    for (let index = 0; index < 130; index += 1) {
      await cdp.key('Tab')
      const match = await cdp.evaluate('(() => { const e = document.activeElement; return e?.matches(' + JSON.stringify(selector) + ') && e?.textContent.includes(' + JSON.stringify(textPart) + '); })()')
      if (match) return
    }
    throw new Error('Could not tab to report control ' + selector + ' / ' + textPart)
  }
  await tabTo('.nav-item', 'Reports')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".report-view select"))'), 'Reports view')
  await tabTo('.report-heading select')
  await cdp.key('End')
  await waitFor(() => cdp.evaluate('document.querySelector(".report-heading select")?.value === "internal-appendix"'), 'Internal appendix case selection')
  await waitFor(() => cdp.evaluate('document.querySelector(".report-paper h3")?.textContent.includes("Internal Appendix") && Boolean(document.querySelector(".report-internal")) && Boolean(document.querySelector(".report-controls"))'), 'Checked internal appendix report')
  assert.equal(await cdp.evaluate('document.querySelector(".report-controls")?.textContent.includes("includes internal appendix")'), true)
  // Make the source content genuinely printable. A collapsed <details> makes a
  // false-positive print-isolation test even when print CSS loses its safeguard.
  await tabTo('.report-internal summary', 'Internal appendix')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector("details.report-internal")?.open === true'), 'expanded internal appendix')
  const visiblePrivate = await cdp.evaluate('(() => { const e = document.querySelector("details.report-internal"); const t = e?.innerText ?? ""; return { expanded: e?.open === true, summary: e?.querySelector("summary")?.textContent.includes("Internal appendix"), workspace: t.includes("workspace:synthetic-report-internal-001"), service: t.includes("service-brief:synthetic-human-review"), attention: t.includes("attention:page-focus:services"), provenance: t.includes("Internal provenance only") }; })()')
  assert.deepEqual(visiblePrivate, { expanded: true, summary: true, workspace: true, service: true, attention: true, provenance: true }, 'Source appendix must be expanded and verifiably populated before print')

  // Inspect actual printed PDF text, not only DOM/CSS. The ephemeral CI
  // job supplies Poppler when absent; fail closed if extraction is unavailable.
  const pdftotext = spawnSync('pdftotext', ['-v'], { encoding: 'utf8', timeout: 4000 })
  assert.equal(pdftotext.status, 0, 'PDF text extraction tool required to establish actual print isolation')
  async function actualPrintText(filename) {
    const pdf = await cdp.send('Page.printToPDF', { printBackground: true })
    assert.ok(typeof pdf.data === 'string' && pdf.data.length > 500, 'Chrome must return PDF bytes')
    const pdfFile = join(tempProfile, filename)
    const pdfBytes = Buffer.from(pdf.data, 'base64')
    assert.equal(pdfBytes.subarray(0, 5).toString('ascii'), '%PDF-')
    await writeFile(pdfFile, pdfBytes)
    const extracted = spawnSync('pdftotext', ['-layout', '-nopgbrk', '-enc', 'UTF-8', pdfFile, '-'], { encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024 })
    assert.equal(extracted.status, 0, 'Actual PDF text must be parseable')
    return extracted.stdout
  }

  // Mutation control: simulate losing only the print CSS exclusion, without
  // altering report data or app code. The expanded appendix MUST then appear
  // in a real Chrome PDF; otherwise our leak detector is not trustworthy.
  const injected = await cdp.evaluate('(() => { const s = document.createElement("style"); s.id = "qa-print-leak-control"; s.textContent = "@media print { .report-internal { display: block !important; } }"; document.head.appendChild(s); return Boolean(document.getElementById(s.id)); })()')
  assert.equal(injected, true, 'Print CSS mutation control must be installed')
  const leakedPrint = (await actualPrintText('negative-control-report.pdf')).replace(/\s+/g, '')
  assert.ok(leakedPrint.includes('Internalprovenanceonly'), 'Negative-control PDF must reveal the expanded internal-only notice')
  assert.ok(leakedPrint.includes('Internalappendix·notcustomernarrative'), 'Negative-control PDF must reveal the internal appendix summary')
  const restored = await cdp.evaluate('(() => { document.getElementById("qa-print-leak-control")?.remove(); return !document.getElementById("qa-print-leak-control"); })()')
  assert.equal(restored, true, 'Print CSS mutation control must be removed')
  console.log('REPORT_PDF_LEAK_CONTROL_PASS: removing the print exclusion makes expanded internal content visible in real PDF')

  // With the exact same appendix still expanded and guard restored, actual
  // customer-safe print MUST exclude the whole internal section, summary too.
  assert.equal(await cdp.evaluate('document.querySelector("details.report-internal")?.open'), true)
  const body = await actualPrintText('customer-safe-print.pdf')
  const readablePdf = body.replace(/\s+/g, ' ')
  if (!readablePdf.includes('Customer Report with Internal Appendix')) {
    console.log('REPORT_PDF_TEXT_DIAGNOSTIC:', JSON.stringify({ characters: body.length, prefix: body.slice(0, 1100) }))
  }
  assert.ok(readablePdf.includes('Customer Report with Internal Appendix'), 'PDF must contain customer-facing report title')
  assert.ok(readablePdf.includes('Executive summary'), 'PDF must contain the report body')
  for (const forbidden of [
    'workspace:synthetic-report-internal-001',
    'service-brief:synthetic-human-review',
    'attention:page-focus:services',
    'Internal provenance only',
    'Internal appendix · not customer narrative',
  ]) {
    assert.ok(!body.replace(/\s+/g, '').includes(forbidden.replace(/\s+/g, '')), 'Private appendix token leaked into actual printed PDF: ' + forbidden)
  }
  console.log('REPORT_PDF_ISOLATION_PASS: expanded source, mutation-sensitive printed PDF includes customer content and excludes internal summary and appendix markers')
  // The actual UI print control must activate window.print; PDF content is
  // checked separately through Chrome's own print-to-PDF capability above.
  await cdp.evaluate('window.__gasPrintInvocations = 0; window.print = () => { window.__gasPrintInvocations += 1 }')
  await tabTo('.report-controls button', 'Print customer-safe body')
  await cdp.key('Enter')
  assert.equal(await cdp.evaluate('window.__gasPrintInvocations'), 1, 'Print button must invoke the browser print action')

  // Check a completed browser download on disk. A synthetic button click or
  // mere object URL existence is insufficient proof that the file was saved.
  const downloads = join(tempProfile, 'downloads')
  await mkdir(downloads, { recursive: true })
  await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
  async function download(expectedTitle, expectedId, shouldIncludeAppendix) {
    await tabTo('.report-controls button', 'Download supplied JSON')
    await cdp.key('Enter')
    const file = await waitFor(async () => {
      const files = await readdir(downloads)
      if (files.some(x => x.endsWith('.crdownload'))) return null
      const matches = files.filter(x => x.endsWith('.json'))
      return matches.length > 0 ? matches[0] : null
    }, 'completed JSON file download')
    const content = JSON.parse(await readFile(join(downloads, file), 'utf8'))
    assert.equal(content.title, expectedTitle)
    assert.equal(content.id, expectedId, 'Export must preserve the exact checked report identity')
    assert.equal(file, expectedId.replace(':', '-') + '.json', 'Download filename must match the selected exact report ID')
    assert.equal(content.context.siteId, 'site:harbor-demo')
    if (shouldIncludeAppendix) {
      assert.equal(content.internalAppendix?.workspaceId, 'workspace:synthetic-report-internal-001')
      assert.equal(content.internalAppendix?.serviceBriefId, 'service-brief:synthetic-human-review')
      assert.deepEqual(content.internalAppendix?.selectedAttentionIds, ['attention:page-focus:services'])
    } else {
      assert.equal(Object.hasOwn(content, 'internalAppendix'), false)
    }
    await rm(join(downloads, file))
    return { reportId: content.id, name: file }
  }
  const internal = await download(
    'Harbor Demo — Customer Report with Internal Appendix',
    'customer-report:f20a22722c2976a255d7266a3035187be3bedcf62bc647a02d769d18fbe2770f',
    true,
  )
  await cdp.key('ShiftTab')
  assert.equal(await cdp.evaluate('document.activeElement === document.querySelector(".report-heading select")'), true)
  await cdp.key('Home')
  await waitFor(() => cdp.evaluate('document.querySelector(".report-heading select")?.value === "quiet-report"'), 'Quiet report case selection')
  await waitFor(() => cdp.evaluate('document.querySelector(".report-paper h3")?.textContent.includes("Evidence Readiness Brief") && !document.querySelector(".report-internal") && Boolean(document.querySelector(".report-controls"))'), 'Checked quiet report and appendix absence')
  assert.equal(await cdp.evaluate('document.querySelector(".report-controls")?.textContent.includes("includes internal appendix")'), false)
  const quiet = await download(
    'Harbor Demo — Evidence Readiness Brief',
    'customer-report:4595eb83e38b461bcf92a4f3423e87148d99d06defb47f8282e4aec936b4f815',
    false,
  )
  assert.notEqual(quiet.reportId, internal.reportId, 'Case switch must not export the prior report')
  console.log('REPORT_BROWSER_EXPORT_PASS: actual completed Chrome JSON downloads matched both case identities and internal appendix boundary')
}


async function reportUnavailableBrowserProof(cdp, url) {
  // Force the real report-shell import to remain pending and then fail in Chrome.
  // This proves the rendered UI cannot retain stale export actions across case
  // changes, rather than inferring the safety property from SSR-only tests.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: url + '?qa=report-unavailable' })
  await waitFor(() => cdp.evaluate('document.querySelectorAll("button.nav-item").length === 9'), 'report unavailable test shell')
  await cdp.evaluate('([...document.querySelectorAll(".fixture-picker button")].find(e => e.textContent.trim() === "Human review")).click()')
  await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent.trim() === "Human review" && Boolean(document.querySelector(".snapshot-status"))'), 'explicit unavailable-report workspace')
  async function tabTo(selector, label = '') {
    for (let attempt = 0; attempt < 130; attempt += 1) {
      await cdp.key('Tab')
      if (await cdp.evaluate('(() => { const el = document.activeElement; return el?.matches(' + JSON.stringify(selector) + ') && el?.textContent.includes(' + JSON.stringify(label) + '); })()')) return
    }
    throw new Error('Keyboard could not reach unavailable-report control ' + selector + ' / ' + label)
  }
  await tabTo('.nav-item', 'Reports')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".report-controls"))'), 'ready report before guarded case change')

  let pausedRequest
  const detach = cdp.on('Fetch.requestPaused', params => {
    if (params.request?.url.includes('report-internal')) pausedRequest = params
  })
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*report-internal*', requestStage: 'Request' }] })
  try {
    await tabTo('.report-heading select')
    await cdp.key('End')
    const paused = await waitFor(() => pausedRequest, 'real report-internal fixture import paused by Chrome')
    assert.ok(paused.request.url.startsWith(url), 'Intercept only synthetic loopback report fixture')
    const pending = await waitFor(() => cdp.evaluate('(() => { const status = document.querySelector(".report-view .error-state[role=status]"); return status?.textContent.includes("Checking report projection") && !document.querySelector(".report-controls") && !document.querySelector(".report-paper") && !document.querySelector(".report-internal"); })()'), 'pending report without exports or stale content')
    assert.equal(pending, true)
    await cdp.send('Fetch.failRequest', { requestId: paused.requestId, errorReason: 'Failed' })
    const errored = await waitFor(() => cdp.evaluate('(() => { const alert = document.querySelector(".report-view .error-state[role=alert]"); return alert?.textContent.includes("Reports unavailable") && !document.querySelector(".report-controls") && !document.querySelector(".report-paper") && !document.querySelector(".report-internal"); })()'), 'rejected report without exports or stale content')
    assert.equal(errored, true)
    console.log('REPORT_BROWSER_UNAVAILABLE_PASS: actual Chrome pending import and rejected import expose no report body, internal appendix, print or download')
  } finally {
    await cdp.send('Fetch.disable')
    detach()
  }
}

async function snapshotDialogProof(cdp, url) {
  // All snapshots are checked, public-safe fixtures loaded by the existing
  // application. No CDP-side product state or source claims are fabricated.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Page.navigate', { url: url + '?qa=snapshot-dialog' })
  await waitFor(() => cdp.evaluate('document.querySelectorAll(".fixture-picker button").length === 5 && document.querySelector(".header-context")?.disabled === false && Boolean(document.querySelector(".snapshot-status"))'), 'quiet checked snapshot')
  async function tabTo(selector, textPart = '') {
    for (let attempt = 0; attempt < 130; attempt += 1) {
      await cdp.key('Tab')
      const matches = await cdp.evaluate('(() => { const node = document.activeElement; return Boolean(node?.matches(' + JSON.stringify(selector) + ') && node?.textContent.includes(' + JSON.stringify(textPart) + ')); })()')
      if (matches) return
    }
    throw new Error('Could not keyboard-focus ' + selector + ' (' + textPart + ')')
  }
  const opener = '.header-context'
  await tabTo(opener, 'Snapshot details')
  assert.equal(await cdp.evaluate('document.activeElement === document.querySelector(".header-context")'), true)
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === true'), 'Snapshot details modal opening')
  const initial = await cdp.evaluate('(() => { const d = document.querySelector("dialog"); const heading = d?.querySelector("#snapshot-dialog-title"); return { modal: d?.matches(":modal") === true, label: d?.getAttribute("aria-labelledby"), title: heading?.textContent, workspace: d?.textContent.includes("workspace:synthetic-quiet-001"), limitedAbsent: !d?.textContent.includes("workspace:synthetic-limited-001"), focusInside: d?.contains(document.activeElement), initialFocus: document.activeElement?.getAttribute("aria-label") }; })()')
  assert.deepEqual(initial, { modal: true, label: 'snapshot-dialog-title', title: 'Snapshot details & limits', workspace: true, limitedAbsent: true, focusInside: true, initialFocus: 'Close snapshot details' }, 'Native dialog must be modal, labelled, exact-snapshot bound, and keyboard focused')
  // The native dialog has one close control. Wrapping in either direction must
  // retain focus on that control, never on a covered page or the body.
  await cdp.key('Tab')
  assert.equal(await cdp.evaluate('document.activeElement === document.querySelector("dialog .dialog-heading button") && document.querySelector("dialog").contains(document.activeElement)'), true)
  await cdp.key('ShiftTab')
  assert.equal(await cdp.evaluate('document.activeElement === document.querySelector("dialog .dialog-heading button") && document.querySelector("dialog").contains(document.activeElement)'), true)
  // Narrow-screen reflow is a presentation check, not a screen-reader claim.
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: false })
  const narrow = await cdp.evaluate('(() => { const d = document.querySelector("dialog"); const r = d.getBoundingClientRect(); return { width: innerWidth, x: r.x, right: r.right, dialogOpen: d.open, focusInside: d.contains(document.activeElement) }; })()')
  assert.equal(narrow.width, 320)
  assert.ok(narrow.x >= -1 && narrow.right <= narrow.width + 1, 'Snapshot dialog must remain inside 320px viewport')
  assert.equal(narrow.dialogOpen && narrow.focusInside, true)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 840, deviceScaleFactor: 1, mobile: false })
  await cdp.key('Escape')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === false && document.activeElement === document.querySelector(".header-context")'), 'Escape closes and restores opener focus')
  // Reopen, use the real close button, and assert the same focus restoration.
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === true && document.activeElement?.matches("dialog .dialog-heading button")'), 'modal keyboard reentry')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === false && document.activeElement === document.querySelector(".header-context")'), 'close button returns to exact opener')

  // Change the scenario through the public keyboard UI and reopen. The modal
  // must show ONLY the current checked source, not a stale prior workspace.
  await tabTo('.fixture-picker button', 'Limited evidence')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector(".fixture-picker button[aria-pressed=true]")?.textContent === "Limited evidence" && document.querySelector(".snapshot-status")?.textContent.includes("Limited evidence") && document.querySelector(".header-context")?.disabled === false'), 'limited checked snapshot')
  await tabTo(opener, 'Snapshot details')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === true'), 'limited snapshot modal')
  const changed = await cdp.evaluate('(() => { const d = document.querySelector("dialog"); return { limited: d.textContent.includes("workspace:synthetic-limited-001"), quietAbsent: !d.textContent.includes("workspace:synthetic-quiet-001"), currentRevision: d.textContent.includes("scope-revision:limited-001"), oldRevisionAbsent: !d.textContent.includes("scope-revision:quiet-001"), focusInside: d.contains(document.activeElement) }; })()')
  assert.deepEqual(changed, { limited: true, quietAbsent: true, currentRevision: true, oldRevisionAbsent: true, focusInside: true }, 'Reopened modal must be bound only to the selected current checked workspace')
  await cdp.key('Escape')
  await waitFor(() => cdp.evaluate('document.querySelector("dialog")?.open === false && document.activeElement === document.querySelector(".header-context")'), 'limited Escape focus return')

  // Portfolio is a different internal surface and must not expose workspace
  // snapshot details through an enabled modal opener.
  await tabTo('.nav-item', 'Sites / Portfolio')
  await cdp.key('Enter')
  await waitFor(() => cdp.evaluate('Boolean(document.querySelector(".portfolio-view")) && document.querySelector(".header-context")?.disabled === true'), 'Portfolio snapshot modal disabled')
  assert.equal(await cdp.evaluate('document.querySelector("dialog")?.open === false && document.querySelector(".skip-link")?.getAttribute("href") === "#main-content"'), true)
  console.log('SNAPSHOT_DIALOG_BROWSER_PASS: 375px/320px modal label, keyboard trap, Escape/close focus return, exact fixture rebind, and Portfolio disable')
}

class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.seq = 0
    this.pending = new Map()
    this.events = new Map()
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id === undefined) {
        for (const listener of this.events.get(message.method) ?? []) listener(message.params)
        return
      }
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)))
      else pending.resolve(message.result)
    })
  }
  on(method, listener) {
    const listeners = this.events.get(method) ?? new Set()
    listeners.add(listener)
    this.events.set(method, listeners)
    return () => listeners.delete(listener)
  }
  async connect() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
  }
  send(method, params = {}) {
    const id = ++this.seq
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error('Browser JS failed: ' + response.exceptionDetails.text)
    return response.result.value
  }
  async key(name) {
    const mapping = name === 'Tab' || name === 'ShiftTab'
      ? { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, ...(name === 'ShiftTab' ? { modifiers: 8 } : {}) }
      : name === 'Enter'
        ? { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
        : name === 'End'
          ? { key: 'End', code: 'End', windowsVirtualKeyCode: 35 }
          : name === 'Home'
            ? { key: 'Home', code: 'Home', windowsVirtualKeyCode: 36 }
            : name === 'Escape'
              ? { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }
              : { key: ' ', code: 'Space', windowsVirtualKeyCode: 32 }
    // Chromium requires Enter's character payload for keyboard activation.
    // Dispatching only keyDown/keyUp focuses a button but does not click it.
    const keyDown = name === 'Enter'
      ? { ...mapping, text: '\r', unmodifiedText: '\r' }
      : mapping
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...keyDown })
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...mapping })
  }
  close() { this.ws.close() }
}
let profile
let chrome
let cdp
try {
  const { binary, version } = findChrome()
  console.log('Chrome: ' + binary + ' / ' + version)
  profile = await mkdtemp(join(tmpdir(), 'gas-portfolio-qa-'))
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const localUrl = 'http://127.0.0.1:' + server.address().port + '/'
  chrome = spawn(binary, [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
    '--disable-default-apps', '--disable-sync', '--no-first-run', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, '--window-size=1280,900', localUrl,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  let stderr = ''
  chrome.stderr.on('data', chunk => { stderr = (stderr + String(chunk)).slice(-2000) })
  const port = await waitFor(async () => {
    if (chrome.exitCode !== null) throw new Error('Chrome exited before CDP launch: ' + stderr)
    try { return Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) || null }
    catch { return null }
  }, 'Chrome DevTools port')
  const target = await waitFor(async () => {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list')
      const pages = await response.json()
      return pages.find(page => page.type === 'page' && page.webSocketDebuggerUrl)
    } catch { return null }
  }, 'Chrome page target')
  cdp = new DevTools(target.webSocketDebuggerUrl)
  await cdp.connect()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await keyboardProof(cdp, localUrl, 375, 'Attention present', 'Synthetic Alpha', 'Enter')
  await keyboardProof(cdp, localUrl, 375, 'No current run', 'no current run', 'Space')
  await attentionChoiceProof(cdp, localUrl)
  await workspaceJourneyProof(cdp, localUrl)
  await reportBrowserProof(cdp, localUrl, profile)
  await reportUnavailableBrowserProof(cdp, localUrl)
  await snapshotDialogProof(cdp, localUrl)
  console.log('BROWSER_QA_PASS: synthetic Portfolio, Attention, Reports PDF/JSON, unavailable report state, and Snapshot dialog proof')
} catch (error) {
  console.error('BROWSER_QA_FAIL:', error)
  process.exitCode = 1
} finally {
  cdp?.close()
  chrome?.kill('SIGTERM')
  await new Promise(resolve => server.close(resolve))
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 3 })
}
