import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const fallback = process.argv.includes('--fallback')
const chromeArguments = [
  '--headless=new', '--no-sandbox', '--remote-debugging-port=9341',
  '--user-data-dir=D:/Projects/portfolio/.tmp/chrome-particles', 'about:blank',
]
if (fallback) chromeArguments.unshift('--disable-webgl')
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', chromeArguments, { windowsHide: true, stdio: 'ignore' })

let socket
try {
  let pages
  for (let index = 0; index < 50; index += 1) {
    try {
      pages = await (await fetch('http://127.0.0.1:9341/json')).json()
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }
  socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  let exceptions = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') exceptions += 1
    if (pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
    }
  })
  const call = (method, params = {}) => new Promise((resolve) => {
    pending.set(++id, resolve)
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async (expression) => {
    const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (response.result.exceptionDetails) throw new Error(JSON.stringify(response.result.exceptionDetails))
    return response.result.result.value
  }

  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await call('Emulation.setHardwareConcurrencyOverride', { hardwareConcurrency: 4 })
  await call('Page.navigate', { url: 'http://127.0.0.1:4173/' })
  await new Promise((resolve) => setTimeout(resolve, 4500))
  const initial = await evaluate(`(async()=>{
    const root=document.querySelector('.portrait-particles');
    const resource=performance.getEntriesByType('resource').find(entry=>entry.name.includes('ScrollTrigger-'));
    if(!resource)return {ready:root.classList.contains('is-particle-ready'),hardware:navigator.hardwareConcurrency};
    const module=await import(resource.name);
    const trigger=module.ScrollTrigger.getAll().find(item=>item.vars.id==='portrait-particles');
    return {ready:root.classList.contains('is-particle-ready'),particles:root.dataset.particleCount,hardware:navigator.hardwareConcurrency,triggerCount:module.ScrollTrigger.getAll().filter(item=>item.vars.id==='portrait-particles').length,start:trigger?.start,end:trigger?.end,imageOpacity:getComputedStyle(root.querySelector('picture')).opacity,canvasOpacity:getComputedStyle(root.querySelector('canvas')).opacity};
  })()`)
  console.log('initial', initial)
  if (fallback) {
    console.log('fallback', await evaluate(`JSON.stringify({ready:document.querySelector('.portrait-particles').classList.contains('is-particle-ready'),imageOpacity:getComputedStyle(document.querySelector('.portrait-particles picture')).opacity,canvasOpacity:getComputedStyle(document.querySelector('.portrait-particles__canvas')).opacity,imageComplete:document.querySelector('.portrait-particles img').complete})`))
  }
  for (const progress of fallback ? [] : [0, 0.2, 0.5, 0.75, 1]) {
    const y = initial.start + (initial.end - initial.start) * progress
    await evaluate(`window.scrollTo({top:${y},behavior:'instant'})`)
    await new Promise((resolve) => setTimeout(resolve, 900))
    const shot = await call('Page.captureScreenshot', { format: 'png' })
    await writeFile(`.tmp/particles-${String(progress).replace('.', '-')}.png`, Buffer.from(shot.result.data, 'base64'))
    console.log(progress, await evaluate(`JSON.stringify({scrollY,ready:document.querySelector('.portrait-particles').classList.contains('is-particle-ready'),canvasOpacity:getComputedStyle(document.querySelector('.portrait-particles__canvas')).opacity})`))
  }
  if (!fallback) {
    await evaluate(`window.scrollTo({top:0,behavior:'instant'})`)
    await new Promise((resolve) => setTimeout(resolve, 900))
    console.log('reverse', await evaluate(`JSON.stringify({scrollY,ready:document.querySelector('.portrait-particles').classList.contains('is-particle-ready'),imageOpacity:getComputedStyle(document.querySelector('.portrait-particles picture')).opacity,canvasOpacity:getComputedStyle(document.querySelector('.portrait-particles__canvas')).opacity})`))
  }
  console.log('exceptions', exceptions)
} finally {
  socket?.close()
  chrome.kill()
}
