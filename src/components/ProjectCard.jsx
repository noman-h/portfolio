import { useCallback, useEffect, useRef, useState } from 'react'

function Arrow() {
  return <span className="arrow" aria-hidden="true">↗</span>
}

export default function ProjectCard({ project }) {
  const { id, number, name, category, description, stack, accent, href, linkLabel, features, screenshot, imageWidth, imageHeight } = project
  const figure = useRef(null)
  const revealFrame = useRef(0)
  const pendingPoint = useRef({ x: 0, y: 0 })
  const [touchReveal, setTouchReveal] = useState(false)

  const enterReveal = useCallback((event) => {
    if (event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pendingPoint.current.x = event.clientX - bounds.left
    pendingPoint.current.y = event.clientY - bounds.top
    event.currentTarget.style.setProperty('--reveal-x', `${pendingPoint.current.x}px`)
    event.currentTarget.style.setProperty('--reveal-y', `${pendingPoint.current.y}px`)
    event.currentTarget.style.setProperty('--reveal-opacity', '1')
  }, [])

  const moveReveal = useCallback((event) => {
    if (event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    pendingPoint.current.x = event.clientX - bounds.left
    pendingPoint.current.y = event.clientY - bounds.top
    if (revealFrame.current) return

    function animateReveal() {
      const element = figure.current
      if (!element) { revealFrame.current = 0; return }
      const x = Number.parseFloat(element.style.getPropertyValue('--reveal-x')) || pendingPoint.current.x
      const y = Number.parseFloat(element.style.getPropertyValue('--reveal-y')) || pendingPoint.current.y
      const dx = pendingPoint.current.x - x
      const dy = pendingPoint.current.y - y
      element.style.setProperty('--reveal-x', `${x + dx * 0.28}px`)
      element.style.setProperty('--reveal-y', `${y + dy * 0.28}px`)
      element.style.setProperty('--reveal-opacity', '1')
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) revealFrame.current = requestAnimationFrame(animateReveal)
      else revealFrame.current = 0
    }

    revealFrame.current = requestAnimationFrame(animateReveal)
  }, [])

  const hideReveal = useCallback((event) => {
    if (event.pointerType === 'touch') return
    if (revealFrame.current) cancelAnimationFrame(revealFrame.current)
    revealFrame.current = 0
    event.currentTarget.style.setProperty('--reveal-opacity', '0')
  }, [])

  const toggleTouchReveal = useCallback(() => {
    setTouchReveal((visible) => !visible)
  }, [])

  const handleFigureKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleTouchReveal()
    }
  }, [toggleTouchReveal])

  useEffect(() => {
    const element = figure.current
    if (!element) return
    element.addEventListener('pointerenter', enterReveal, { passive: true })
    element.addEventListener('pointermove', moveReveal, { passive: true })
    element.addEventListener('pointerleave', hideReveal, { passive: true })
    return () => {
      element.removeEventListener('pointerenter', enterReveal)
      element.removeEventListener('pointermove', moveReveal)
      element.removeEventListener('pointerleave', hideReveal)
      if (revealFrame.current) cancelAnimationFrame(revealFrame.current)
    }
  }, [enterReveal, moveReveal, hideReveal])

  return <article id={`project-${id}`} data-project={id} className={`project-card ${accent}${id === 'petromanager' ? ' featured-project' : ''}`}>
    <div className="project-visual">
      <div className="visual-top"><span>{category}</span><span>{number} — 03</span></div>
      <div ref={figure} className={`visual-art${touchReveal ? ' is-touch-revealed' : ''}`} role="button" tabIndex="0" aria-label={`Toggle color reveal for ${name} screenshot`} aria-pressed={touchReveal} onClick={toggleTouchReveal} onKeyDown={handleFigureKeyDown}>
        <picture>
          <source type="image/avif" srcSet={`${screenshot}-640.avif 640w, ${screenshot}-960.avif 960w, ${screenshot}-1200.avif 1200w`} sizes="(max-width: 900px) 88vw, 46vw" />
          <img className="project-screenshot" src={`${screenshot}-1200.webp`} srcSet={`${screenshot}-640.webp 640w, ${screenshot}-960.webp 960w, ${screenshot}-1200.webp 1200w`} sizes="(max-width: 900px) 88vw, 46vw" width={imageWidth} height={imageHeight} alt={`${name} product interface screenshot`} loading="lazy" decoding="async" />
        </picture>
        <picture>
          <source type="image/avif" srcSet={`${screenshot}-640.avif 640w, ${screenshot}-960.avif 960w, ${screenshot}-1200.avif 1200w`} sizes="(max-width: 900px) 88vw, 46vw" />
          <img className="project-screenshot project-screenshot-reveal" src={`${screenshot}-1200.webp`} srcSet={`${screenshot}-640.webp 640w, ${screenshot}-960.webp 960w, ${screenshot}-1200.webp 1200w`} sizes="(max-width: 900px) 88vw, 46vw" width={imageWidth} height={imageHeight} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        </picture>
        <div className="screenshot-caption">PRODUCT SCREENSHOT <span>{name}</span></div>
      </div>
      <div className="project-note">A CLOSER LOOK AT THE PRODUCT</div>
    </div>
    <div className="project-info">
      <div className="project-title-line"><span className="project-number">{number} / PROJECT</span><a className="external-link" href={href} target="_blank" rel="noreferrer" aria-label={`Visit ${name} live website`}><Arrow /></a></div>
      <h3>{name}</h3>
      <p>{description}</p>
      <ul className="project-features">{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <div className="project-stack" aria-label="Technologies used">{stack.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <a className="project-link" href={href} target="_blank" rel="noreferrer" aria-label={`Open ${name} live demo`}>{linkLabel} <Arrow /></a>
    </div>
  </article>
}
