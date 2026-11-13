import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--no-sandbox','--remote-debugging-port=9338','--user-data-dir=D:/Projects/portfolio/.tmp/chrome-check','about:blank'], {windowsHide:true,stdio:'ignore'})
let socket
try {
  let pages
  for(let i=0;i<40;i++){try{pages=await (await fetch('http://127.0.0.1:9338/json')).json();break}catch{await new Promise(r=>setTimeout(r,250))}}
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
  await new Promise(r=>socket.addEventListener('open',r,{once:true}))
  let id=0;const pending=new Map()
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}})
  let exceptions=0
  socket.addEventListener('message',e=>{if(JSON.parse(e.data).method==='Runtime.exceptionThrown')exceptions++})
  const call=(method,params={})=>new Promise(r=>{pending.set(++id,r);socket.send(JSON.stringify({id,method,params}))})
  const evaluate=async(expression)=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value}
  await call('Emulation.setDeviceMetricsOverride',{width:Number(process.argv[3]) || 1440,height:900,deviceScaleFactor:1,mobile:false})
  await call('Page.navigate',{url:process.argv[2] || 'http://localhost:4173/'})
  await new Promise(r=>setTimeout(r,3000))
  if(process.argv[2]) {
    await evaluate('window.scrollTo({top:0,behavior:"instant"})')
    await new Promise(r=>setTimeout(r,1500))
    const shot=await call('Page.captureScreenshot',{format:'png'})
    await writeFile('.tmp/reference.png',Buffer.from(shot.result.data,'base64'))
    console.log(await evaluate('JSON.stringify([...document.querySelectorAll("header,h1")].map(e=>({tag:e.tagName,text:e.innerText,rect:e.getBoundingClientRect().toJSON()})))'))
    console.log(await evaluate('JSON.stringify({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,resume:!!document.querySelector("a[download]"),projects:document.querySelectorAll(".project-card").length})'))
    if(process.argv[3]) {
      console.log(await evaluate('(()=>{document.querySelector(".menu-toggle").click();return "opened menu"})()'))
      await new Promise(r=>setTimeout(r,300))
      console.log(await evaluate('JSON.stringify({menuExpanded:document.querySelector(".menu-toggle").getAttribute("aria-expanded"),navDisplay:getComputedStyle(document.querySelector(".nav-links")).display})'))
    }
    if(process.argv[4] === 'scroll') {
      for(const y of [0,250,500,750,1000]) {
        await evaluate(`window.scrollTo({top:${y},behavior:'instant'})`)
        await new Promise(r=>setTimeout(r,600))
        const shot=await call('Page.captureScreenshot',{format:'png'})
        await writeFile(`.tmp/scroll-${y}.png`,Buffer.from(shot.result.data,'base64'))
        console.log(y,await evaluate('JSON.stringify({opacity:getComputedStyle(document.querySelector(".portrait-scroll")).opacity,transform:getComputedStyle(document.querySelector(".portrait-scroll")).transform,imageComplete:document.querySelector(".portrait-motion img").complete})'))
      }
      await evaluate('window.scrollTo({top:0,behavior:"instant"})')
      await new Promise(r=>setTimeout(r,800))
      console.log('reverse',await evaluate('JSON.stringify({opacity:getComputedStyle(document.querySelector(".portrait-scroll")).opacity,transform:getComputedStyle(document.querySelector(".portrait-scroll")).transform})'))
      console.log('portraitTriggers',await evaluate('(async()=>{const u=performance.getEntriesByType("resource").find(x=>x.name.includes("ScrollTrigger-")).name;const m=await import(u);return m.ScrollTrigger.getAll().filter(t=>t.vars.id==="hero-portrait").length})()'))
      console.log('uncaughtExceptions',exceptions)
    }
  } else {
  for(const y of [0,300,600,0]) {
    await evaluate(`window.scrollTo({top:${y},behavior:'instant'})`)
    await new Promise(r=>setTimeout(r,700))
    console.log(await evaluate(`(()=>{const p=document.querySelector('.portrait-motion');return {scrollY,opacity:getComputedStyle(p).opacity,transform:getComputedStyle(p).transform,mask:getComputedStyle(p).maskImage}})()`))
  }
  await evaluate(`document.querySelector('.motion-toggle').click()`)
  await new Promise(r=>setTimeout(r,200))
  console.log(await evaluate(`(()=>{const p=document.querySelector('.portrait-motion');return {motionOffOpacity:getComputedStyle(p).opacity,transform:getComputedStyle(p).transform}})()`))
  }
} finally {socket?.close();chrome.kill()}
