import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react'
import { projects } from './data/projects.js'
import ProjectCard from './components/ProjectCard.jsx'
import PortraitParticles from './components/PortraitParticles.jsx'
import './App.css'

const CosmicShader = lazy(() => import('./three/CosmicShader.jsx'))

function WaterRipple({ motionOn }) {
  const reduceMotion = useReducedMotion()
  const cursor = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || reduceMotion || !motionOn) return
    const element = cursor.current
    let frame = 0
    let x = -120
    let y = -120
    let targetX = x
    let targetY = y
    const render = () => {
      frame = 0
      x += (targetX - x) * 0.24
      y += (targetY - y) * 0.24
      element.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'
      element.classList.add('is-visible')
      if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) frame = requestAnimationFrame(render)
    }
    const onMove = (event) => {
      if (event.pointerType !== 'mouse') return
      targetX = event.clientX
      targetY = event.clientY
      if (!frame) frame = requestAnimationFrame(render)
    }
    const onLeave = () => element.classList.remove('is-visible')
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [motionOn, reduceMotion])

  if (reduceMotion || !motionOn) return null
  return <div ref={cursor} className="water-ripple" aria-hidden="true" />
}

const links = [
  ['Work', 'projects'], ['About', 'about'], ['Experience', 'experience'], ['Skills', 'skills'], ['Profiles', 'profiles'],
]

const skillGroups = [
  ['01', 'Frontend', ['HTML5', 'CSS3', 'JavaScript', 'React.js', 'Next.js', 'Redux Toolkit', 'Tailwind CSS']],
  ['02', 'Backend', ['Node.js', 'Express.js', 'REST APIs']],
  ['03', 'Data', ['MongoDB', 'Mongoose', 'MySQL', 'Sequelize']],
  ['04', 'Tools & thinking', ['Git', 'GitHub', 'VS Code', 'Postman', 'Data Structures', 'Problem Solving', 'Database Indexing']],
]

function Arrow({ diagonal = false }) {
  return <span aria-hidden="true" className="arrow">{diagonal ? '↗' : '→'}</span>
}

function Navigation({ motionOn, onMotionToggle }) {
  const [active, setActive] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id) })
    }, { rootMargin: '-35% 0px -55% 0px' })
    document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return <><header className="site-header">
    <span className="story-progress" aria-hidden="true" />
    <a className="nav-brand" href="#home" onClick={() => setMenuOpen(false)}>Noman <em>Hassan</em></a>
    <m.button whileTap={reduceMotion ? undefined : { scale: 0.95 }} className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? 'Close' : 'Menu'} <span>{menuOpen ? '−' : '+'}</span></m.button>
    <m.nav initial={false} className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
      {links.map(([label, id]) => <m.a whileHover={reduceMotion ? undefined : { y: -2 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'location' : undefined} href={`#${id}`} onClick={() => setMenuOpen(false)}>{active === id && (reduceMotion ? <span className="nav-active-dot" /> : <m.span className="nav-active-dot" layoutId="nav-active-dot" />)} {label}</m.a>)}
    </m.nav>
    <m.a whileHover={reduceMotion ? undefined : { y: -2 }} className="nav-cta" href="#contact">Let’s talk <Arrow diagonal /></m.a>
  </header><button className={`motion-toggle floating-motion-toggle${motionOn ? ' is-on' : ''}`} type="button" onClick={onMotionToggle} aria-pressed={motionOn}>MOTION <span>{motionOn ? 'ON' : 'OFF'}</span></button></>
}

function Hero({ motionOn }) {
  const reduceMotion = useReducedMotion()
  const [shaderReady, setShaderReady] = useState(false)
  const stageRef = useRef(null)

  useEffect(() => {
    const lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)
    if (!motionOn || reduceMotion || lowEnd || window.matchMedia('(max-width: 760px)').matches) return
    const hero = document.querySelector('.hero')
    if (!hero) return
    const start = () => setShaderReady(true)
    hero.addEventListener('pointerenter', start, { once: true, passive: true })
    hero.addEventListener('focusin', start, { once: true })
    return () => {
      hero.removeEventListener('pointerenter', start)
      hero.removeEventListener('focusin', start)
    }
  }, [motionOn, reduceMotion])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !motionOn || reduceMotion || !window.matchMedia('(pointer:fine)').matches) return
    let frame = 0
    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0
    const render = () => {
      frame = 0
      x += (targetX - x) * 0.08
      y += (targetY - y) * 0.08
      stage.style.setProperty('--pointer-x', `${x.toFixed(2)}px`)
      stage.style.setProperty('--pointer-y', `${y.toFixed(2)}px`)
      stage.style.setProperty('--tilt-x', `${(-y * 0.35).toFixed(2)}deg`)
      stage.style.setProperty('--tilt-y', `${(x * 0.35).toFixed(2)}deg`)
      stage.style.setProperty('--outline-x', `${(-x * 1.1).toFixed(2)}px`)
      stage.style.setProperty('--orbit-x', `${(-x * 0.55).toFixed(2)}px`)
      if (Math.abs(targetX - x) > 0.1 || Math.abs(targetY - y) > 0.1) frame = requestAnimationFrame(render)
    }
    const onMove = (event) => {
      const bounds = stage.getBoundingClientRect()
      targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2))) * 8
      targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2))) * 8
      if (!frame) frame = requestAnimationFrame(render)
    }
    const onLeave = () => { targetX = 0; targetY = 0; if (!frame) frame = requestAnimationFrame(render) }
    stage.addEventListener('pointermove', onMove, { passive: true })
    stage.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
      stage.style.removeProperty('--pointer-x')
      stage.style.removeProperty('--pointer-y')
    }
  }, [motionOn, reduceMotion])

  return <section className={`hero section-pad${motionOn && !reduceMotion ? ' motion-enabled' : ' motion-disabled'}`} id="home">
    <div className="hero-shader" aria-hidden="true">{shaderReady && <Suspense fallback={null}><CosmicShader /></Suspense>}</div>
    <div className="hero-meta"><span><i className="availability-dot" /> AVAILABLE FOR THE RIGHT OPPORTUNITY</span><span>CHITTORGARH, INDIA · 24°53′N 74°38′E</span></div>
    <div className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">FULL-STACK DEVELOPER <span>✳</span> BUILDING WITH INTENTION</p>
        <h1 className="hero-name">Noman <em>Hassan</em></h1>
        <div className="hero-bottom">
          <p>I’m Noman Hassan. I build thoughtful web products, dependable backend systems, and interfaces that make everyday work feel simpler.</p>
          <div className="hero-actions"><a className="button button-dark" href="#projects">View Projects <Arrow /></a><a className="text-link" href="#contact">Get in touch <Arrow diagonal /></a><a className="resume-link" href="/resume-noman%20hassan.pdf" download="Noman-Hassan-Resume.pdf">Download Resume <Arrow diagonal /></a></div>
        </div>
        <div className="hero-socials"><a href="https://github.com/noman-h" target="_blank" rel="noreferrer">GITHUB <Arrow diagonal /></a><a href="https://www.linkedin.com/in/noman-h/" target="_blank" rel="noreferrer">LINKEDIN <Arrow diagonal /></a><a href="https://leetcode.com/u/noman-h/" target="_blank" rel="noreferrer">LEETCODE <Arrow diagonal /></a></div>
      </div>
      <div ref={stageRef} className="portrait-stage">
        <span className="portrait-outline" aria-hidden="true">FULL-STACK DEVELOPER</span>
        <span className="portrait-orbit portrait-orbit-one" aria-hidden="true" /><span className="portrait-orbit portrait-orbit-two" aria-hidden="true" />
        <div className="portrait-index"><span>FIG. 01</span><span>THE PERSON BEHIND THE PIXELS</span></div>
        <div className="portrait-frame portrait-cutout"><div className="portrait-scroll"><div className="portrait-motion"><div className="portrait-wipe"><PortraitParticles motionOn={motionOn} reduceMotion={reduceMotion} /></div></div></div><span className="portrait-scanline" aria-hidden="true" /></div>
        <div className="portrait-hud" aria-hidden="true"><span>FIG. 01 / SIGNAL</span><span>24°53′N · 74°38′E</span></div>
        <div className="portrait-caption"><span>NOMAN HASSAN</span><span>DEVELOPER · PROBLEM SOLVER</span></div>
        <div className="portrait-stamp" aria-hidden="true"><span>CODE WITH<br />PURPOSE</span><b>✳</b></div>
      </div>
    </div>
    <div className="hero-footer"><span>SCROLL TO EXPLORE</span><span className="scroll-line" /><span>01 — 06</span></div>
  </section>
}

function SectionLabel({ number, children, dark = false }) {
  return <div className={`section-label${dark ? ' light-label' : ''}`}><span>{number} / 06</span><span>{children}</span></div>
}

function About({ motionOn }) {
  const reduceMotion = useReducedMotion()
  const [perspective, setPerspective] = useState('Build')
  const perspectiveCopy = {
    Build: ['I’m a full-stack web developer who likes turning real-world friction into clear, useful software.', 'I enjoy working across the stack: shaping intuitive interfaces, building scalable APIs, and making sure the small decisions add up to a reliable product.'],
    Teach: ['Curiosity keeps the work moving.', 'My path combines hands-on software engineering, independent product building, and a steady curiosity for how things work.'],
    Connect: ['Good work starts with a real problem.', 'An interesting idea, a project, or an opportunity? I’d love to hear what you’re working on.'],
  }
  return <section className="about section-pad" id="about">
    <SectionLabel number="01">A LITTLE ABOUT ME</SectionLabel>
    <div className="about-layout">
      <h2 data-scroll={reduceMotion ? undefined : ''} data-scroll-speed={reduceMotion ? undefined : '-0.04'}>Curiosity got<br />me <em>started.</em></h2>
      <div className={`about-copy perspective-${perspective.toLowerCase()}`}><div className="perspective-tabs" role="tablist" aria-label="Choose a perspective">{Object.keys(perspectiveCopy).map((tab) => <button type="button" role="tab" aria-selected={perspective === tab} className={perspective === tab ? 'active' : ''} key={tab} onClick={() => setPerspective(tab)}>{perspective === tab && motionOn && !reduceMotion && <m.span className="perspective-pill" layoutId="perspective-pill" transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }} />}<span>{tab}</span></button>)}</div><div className="perspective-panel" role="tabpanel" key={perspective}><p className="about-lead">{perspectiveCopy[perspective][0]}</p><p>{perspectiveCopy[perspective][1]}</p><div className="perspective-visual" aria-hidden="true"><span>{perspective === 'Build' ? 'INTERFACES · APIS · PRODUCT' : perspective === 'Teach' ? 'LEARN · MAKE · REPEAT' : 'IDEAS · PEOPLE · SOFTWARE'}</span><i /><i /><i /></div></div><div className="about-facts"><div><span>EDUCATION</span><b>Bachelor of Computer Applications</b><small>Pacific University · Udaipur · 2022–2025</small></div><div><span>BASED IN</span><b>Chittorgarh, Rajasthan</b><small>India · IST (UTC+5:30)</small></div></div></div>
    </div>
    <div className="journey-timeline" aria-label="Education and career timeline">
      <article className="journey-stop"><span className="journey-date">2022 — 2025</span><span className="journey-node" /><div><span className="eyebrow">EDUCATION</span><h3>Bachelor of Computer Applications</h3><p>Pacific University · Udaipur, Rajasthan</p></div></article>
      <article className="journey-stop"><span className="journey-date">APRIL 2026 — NOW</span><span className="journey-node" /><div><span className="eyebrow">SOFTWARE DEVELOPMENT INTERN</span><h3>REGex Software Services</h3><p>Jaipur, Rajasthan · Full-stack development</p></div></article>
    </div>
    <div className="about-bottom"><span>CURIOUS BY DEFAULT. PRACTICAL BY DESIGN.</span><span>JAVASCRIPT <i>·</i> SYSTEMS <i>·</i> GOOD UX</span></div>
  </section>
}

function Experience() {
  return <section className="experience section-pad" id="experience">
    <p className="chapter-intro">My studies gave me the foundations. Curiosity pushed me to build beyond the classroom.</p>
    <SectionLabel number="02">WHERE I’VE BEEN</SectionLabel>
    <div className="experience-heading"><h2>The next chapter<br /><em>was shipping.</em></h2><p>My first real-world role taught me to turn ideas into reliable features, collaborate closely, and sweat the details that matter to people.</p></div>
    <article className="role-card"><div className="role-timeline"><span>APR ’26</span><span className="timeline-rule"/><span>PRESENT</span></div><div className="role-main"><div className="role-title-row"><div><p className="eyebrow">SOFTWARE DEVELOPMENT INTERN</p><h3>REGex Software Services</h3></div><span className="role-location">JAIPUR, RAJASTHAN ↗</span></div><p className="role-summary">Building responsive full-stack applications and dependable product features alongside a software team.</p><ul className="role-points"><li>Developed web applications using React.js, Node.js, Express.js, and MongoDB.</li><li>Built reusable UI components and integrated REST APIs, authentication, and CRUD workflows.</li><li>Implemented validation, search, filtering, sorting, and application state management.</li><li>Collaborated on API debugging and performance improvements using Git and GitHub.</li></ul><div className="role-tags"><span>REACT</span><span>NODE.JS</span><span>EXPRESS</span><span>MONGODB</span><span>GIT</span></div></div></article>
  </section>
}

function Projects() {
  return <section className="projects section-pad" id="projects">
    <p className="chapter-intro">I kept following that question beyond tutorials and into products people could actually use.</p>
    <SectionLabel number="03" dark>SELECTED WORK</SectionLabel>
    <div className="projects-heading"><h2>Real problems.<br /><em>Useful products.</em></h2><p>That curiosity became a habit: find the friction, understand who feels it, then build a clearer way through.</p></div>
    <div className="project-rail"><div className="project-list">{projects.map((project) => <ProjectCard project={project} key={project.number} />)}</div></div>
    <div className="projects-outro"><span>MORE EXPERIMENTS ARE ALWAYS UNDERWAY.</span><a href="https://github.com/noman-h" target="_blank" rel="noreferrer">FIND ME ON GITHUB <Arrow diagonal /></a></div>
  </section>
}

function Skills() {
  return <section className="skills section-pad" id="skills"><SectionLabel number="04">TOOLS OF THE TRADE</SectionLabel><div className="skills-heading"><h2>Keep learning.<br /><em>Keep making.</em></h2><p>Every project leaves me with a new question. These are the tools I use to keep answering them.</p></div><div className="skills-grid">{skillGroups.map(([number, title, skills]) => <article className="skill-group" key={title}><div className="skill-heading"><span>{number}</span><h3>{title}</h3><span className="skill-plus">↗</span></div><div className="skill-tags">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}</div><div className="skills-marquee" aria-label="Build with care, ship with purpose"><div>BUILD WITH CARE <i>✳</i> SHIP WITH PURPOSE <i>✳</i> LEARN IN PUBLIC <i>✳</i> BUILD WITH CARE <i>✳</i> SHIP WITH PURPOSE <i>✳</i></div></div></section>
}

function CodingProfiles() {
  return <section className="profiles section-pad" id="profiles"><SectionLabel number="05">OUTSIDE THE EDITOR</SectionLabel><div className="profiles-layout"><h2>Still curious<br />after <em>hours.</em></h2><div className="profile-cards"><a href="https://github.com/noman-h" target="_blank" rel="noreferrer" className="profile-card"><span className="profile-icon">GH</span><span><b>GitHub</b><small>Projects, experiments, and code.</small></span><Arrow diagonal /></a><a href="https://leetcode.com/u/noman-h/" target="_blank" rel="noreferrer" className="profile-card"><span className="profile-icon lc">LC</span><span><b>LeetCode</b><small>Practicing the fundamentals.</small></span><Arrow diagonal /></a><a href="https://www.linkedin.com/in/noman-h/" target="_blank" rel="noreferrer" className="profile-card"><span className="profile-icon in">in</span><span><b>LinkedIn</b><small>Professional updates and conversations.</small></span><Arrow diagonal /></a></div></div></section>
}

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  function submit(event) {
    event.preventDefault()
    const subject = encodeURIComponent(`Portfolio enquiry from ${form.name}`)
    const body = encodeURIComponent(`Hi Noman,\n\n${form.message}\n\n${form.name}\n${form.email}`)
    window.location.href = `mailto:nomanhasan8503@gmail.com?subject=${subject}&body=${body}`
    setStatus('Your email app should open with your message ready to send.')
  }
  return <section className="contact section-pad" id="contact"><SectionLabel number="06" dark>YOUR TURN</SectionLabel><div className="contact-layout"><div className="contact-copy"><p className="eyebrow">HAVE A GOOD ONE IN MIND?</p><h2>Let’s make<br />something<br /><em>meaningful.</em></h2><p className="contact-lead">An interesting idea, a project, or an opportunity? I’d love to hear what you’re working on.</p><a className="email-link" href="mailto:nomanhasan8503@gmail.com">nomanhasan8503@gmail.com <Arrow diagonal /></a><div className="contact-social"><a href="https://www.linkedin.com/in/noman-h/" target="_blank" rel="noreferrer">LINKEDIN ↗</a><a href="https://github.com/noman-h" target="_blank" rel="noreferrer">GITHUB ↗</a><a href="https://www.instagram.com/heyyy_nomaan/" target="_blank" rel="noreferrer">INSTAGRAM ↗</a></div></div><form className="contact-form" onSubmit={submit}><p className="form-kicker">OR LEAVE A NOTE HERE</p><label>Your name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="What should I call you?" /></label><label>Your email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label><label>A little about it<textarea required rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell me what’s on your mind..." /></label><button className="button button-light" type="submit">Prepare an email <Arrow diagonal /></button><p className="form-note" aria-live="polite">{status || 'This opens your email app; nothing is sent from this site.'}</p></form></div><footer className="site-footer"><span>DESIGNED & BUILT WITH CARE · 2026</span><a href="#home">BACK TO TOP ↑</a></footer></section>
}

function App() {
  const reduceMotion = useReducedMotion()
  const [motionOn, setMotionOn] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (reduceMotion || !motionOn) return
    let alive = true
    let cleanup = () => {}
    let idleId
    let timeoutId
    const initializeScrollEffects = () => Promise.all([import('gsap'), import('gsap/ScrollTrigger'), import('locomotive-scroll')]).then(([gsapModule, triggerModule, locomotiveModule]) => {
      if (!alive) return
      const gsap = gsapModule.gsap || gsapModule.default
      const ScrollTrigger = triggerModule.ScrollTrigger
      const LocomotiveScroll = locomotiveModule.default
      gsap.registerPlugin(ScrollTrigger)
      let ticker
      const locomotive = new LocomotiveScroll({
        lenisOptions: { smoothWheel: !reduceMotion, syncTouch: false, anchors: true },
        scrollCallback: ({ progress }) => {
          ScrollTrigger.update()
          document.documentElement.style.setProperty('--story-progress', progress)
        },
        initCustomTicker: (render) => {
          ticker = (time) => render(time * 1000)
          gsap.ticker.add(ticker)
          gsap.ticker.lagSmoothing(0)
        },
        destroyCustomTicker: () => {
          if (ticker) gsap.ticker.remove(ticker)
          gsap.ticker.lagSmoothing(500, 33)
        },
      })
      const context = gsap.context(() => {
        if (!reduceMotion) {
          ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7, onUpdate: (self) => {
            const outline = document.querySelector('.portrait-outline')
            const orbit = document.querySelector('.portrait-orbit')
            outline?.style.setProperty('--scroll-drift', `${(-self.progress * 9).toFixed(2)}vw`)
            orbit?.style.setProperty('--scroll-drift', `${(self.progress * 5).toFixed(2)}vw`)
          } })
          gsap.utils.toArray('main section:not(#home) .section-label, .about-layout, .journey-timeline, .experience-heading, .role-card, .projects-heading, .project-card, .skills-heading, .skill-group, .profiles-layout, .contact-layout').forEach((element) => {
            gsap.fromTo(element, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: element, start: 'top 86%', once: true } })
          })
          gsap.utils.toArray('main section:not(#home) h2').forEach((element) => {
            gsap.fromTo(element, { clipPath: 'inset(0 0 100% 0)', y: 18 }, { clipPath: 'inset(0 0 0 0)', y: 0, duration: 0.95, ease: 'expo.out', clearProps: 'clipPath,transform', scrollTrigger: { trigger: element, start: 'top 88%', once: true } })
          })
        }
      })
      const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 300)
      cleanup = () => {
        window.clearTimeout(refresh)
        context.revert()
        locomotive.destroy()
        document.documentElement.style.removeProperty('--story-progress')
      }
    }).catch((error) => {
      if (alive) console.error('Scroll enhancement failed to initialize.', error)
    })
    if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(initializeScrollEffects, { timeout: 2500 })
    else timeoutId = window.setTimeout(initializeScrollEffects, 1200)
    return () => {
      alive = false
      if (idleId) window.cancelIdleCallback(idleId)
      window.clearTimeout(timeoutId)
      cleanup()
    }
  }, [motionOn, reduceMotion])
  const effectiveMotion = motionOn && !reduceMotion
  return <LazyMotion features={domAnimation}><WaterRipple motionOn={effectiveMotion} /><Navigation motionOn={motionOn} onMotionToggle={() => setMotionOn((value) => !value)} /><main><Hero motionOn={effectiveMotion} /><About motionOn={effectiveMotion} /><Experience /><Projects /><Skills /><CodingProfiles /><Contact /></main></LazyMotion>
}

export default App
