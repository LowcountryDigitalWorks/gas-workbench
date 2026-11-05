// Standalone synthetic browser QA, without a test-browser dependency or customer data.
// Uses the Chrome DevTools Protocol available in the hosted Linux CI image.
// Fail closed when Chrome or a real keyboard/focus transition cannot be proven.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
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
class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.seq = 0
    this.pending = new Map()
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id === undefined) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)))
      else pending.resolve(message.result)
    })
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
    const mapping = name === 'Tab'
      ? { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }
      : name === 'Enter'
        ? { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }
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
  console.log('BROWSER_QA_PASS: exact synthetic portfolio selection, filter and keyboard-focus proof')
} catch (error) {
  console.error('BROWSER_QA_FAIL:', error)
  process.exitCode = 1
} finally {
  cdp?.close()
  chrome?.kill('SIGTERM')
  await new Promise(resolve => server.close(resolve))
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 3 })
}
