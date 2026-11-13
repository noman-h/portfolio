import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--no-sandbox','--remote-debugging-port=9337', '--user-data-dir=D:/Projects/portfolio/.tmp/chrome-video','about:blank'], {windowsHide:true,stdio:'ignore'})
let socket
try {
  let pages
  for(let i=0;i<40;i++){try{pages=await (await fetch('http://127.0.0.1:9337/json')).json();break}catch{await new Promise(r=>setTimeout(r,250))}}
  socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
  await new Promise(r=>socket.addEventListener('open',r,{once:true}))
  let id=0; const pending=new Map()
  socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}})
  const call=(method,params={})=>new Promise(r=>{pending.set(++id,r);socket.send(JSON.stringify({id,method,params}))})
  const data=(await readFile(process.argv[2] || 'C:/Users/noman/Videos/Screen Recordings/Screen Recording 2026-11-11 193943.mp4')).toString('base64')
  const result=await call('Runtime.evaluate',{expression:`(async()=>{const v=document.createElement('video');v.src='data:video/mp4;base64,${data}';await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});const c=document.createElement('canvas');c.width=640;c.height=Math.round(640*v.videoHeight/v.videoWidth);const frames=[];for(let i=0;i<12;i++){v.currentTime=Math.max(.01,(v.duration-.1)*i/11);await new Promise(r=>v.onseeked=r);c.getContext('2d').drawImage(v,0,0,c.width,c.height);frames.push(c.toDataURL('image/png'))}return {duration:v.duration,width:c.width,height:c.height,frames}})()`,awaitPromise:true,returnByValue:true})
  if(result.result.exceptionDetails) throw Error(JSON.stringify(result.result.exceptionDetails))
  const v=result.result.result.value
  const inputs=v.frames.map((f,i)=>({input:Buffer.from(f.split(',')[1],'base64'),left:(i%3)*v.width,top:Math.floor(i/3)*v.height}))
  await sharp({create:{width:v.width*3,height:v.height*4,channels:3,background:'#222'}}).composite(inputs).png().toFile('.tmp/video-frames.png')
  console.log(JSON.stringify({duration:v.duration,frameInterval:v.duration/11}))
} finally {socket?.close();chrome.kill()}
