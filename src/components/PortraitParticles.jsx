import { useEffect, useRef } from 'react'

const vertexShaderSource = `
  attribute vec2 aPosition;
  attribute vec2 aScatter;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aThreshold;
  attribute float aAlpha;

  uniform vec2 uFit;
  uniform float uProgress;
  uniform float uPointSize;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisperse;

  void main() {
    vec2 base = vec2(aPosition.x * uFit.x, (aPosition.y + 1.0) * uFit.y - 1.0);
    float disperse = smoothstep(aThreshold, min(aThreshold + 0.42, 0.96), uProgress);
    float drift = sin((aSeed * 37.0 + uProgress * 7.0) * 6.2831853) * 0.014 * disperse;
    vec2 position = base + aScatter * disperse * disperse + vec2(drift, -drift * 0.55);
    float fade = 1.0 - smoothstep(0.58 + aSeed * 0.2, 0.99, uProgress);

    vColor = aColor;
    vAlpha = aAlpha * fade;
    vDisperse = disperse;
    gl_PointSize = max(1.0, uPointSize * (0.72 + aSeed * 0.58) * (1.0 - disperse * 0.24));
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShaderSource = `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vDisperse;

  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float circle = 1.0 - smoothstep(0.34, 0.5, length(point));
    vec3 warm = vec3(1.0, 0.54, 0.25);
    vec3 color = mix(vColor, warm, vDisperse * 0.1);
    gl_FragColor = vec4(color, vAlpha * circle);
  }
`

function randomFrom(x, y, salt) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453
  return value - Math.floor(value)
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Portrait particle shader failed: ${message}`)
  }
  return shader
}

function createProgram(gl) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error(`Portrait particle program failed: ${message}`)
  }
  return program
}

function samplePortrait(image, compactDevice) {
  const sampleWidth = compactDevice ? 390 : 480
  const sampleHeight = Math.round(sampleWidth * image.naturalHeight / image.naturalWidth)
  const sampler = document.createElement('canvas')
  sampler.width = sampleWidth
  sampler.height = sampleHeight
  const context = sampler.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight)
  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data
  const step = compactDevice ? 3 : 2
  const values = []

  for (let y = 0; y < sampleHeight; y += step) {
    for (let x = 0; x < sampleWidth; x += step) {
      const pixel = (y * sampleWidth + x) * 4
      const alpha = pixels[pixel + 3] / 255
      if (alpha < 0.12) continue

      const red = pixels[pixel] / 255
      const green = pixels[pixel + 1] / 255
      const blue = pixels[pixel + 2] / 255
      const luminance = Math.pow(red * 0.2126 + green * 0.7152 + blue * 0.0722, 0.82)
      const tone = 0.1 + luminance * 0.9
      const seed = randomFrom(x, y, 1)
      const randomX = randomFrom(x, y, 2) - 0.5
      const randomY = randomFrom(x, y, 3) - 0.5
      const positionX = x / sampleWidth * 2 - 1
      const positionY = 1 - y / sampleHeight * 2
      const radius = Math.min(1, Math.hypot(positionX * 0.78, positionY))
      const outwardLength = Math.max(0.001, Math.hypot(positionX, positionY * 0.72))
      const outwardX = positionX / outwardLength
      const outwardY = positionY * 0.72 / outwardLength
      const scatterX = outwardX * (0.1 + seed * 0.2) + randomX * 0.28
      const scatterY = outwardY * (0.08 + seed * 0.18) + randomY * 0.32 - seed * 0.05
      const threshold = 0.05 + (1 - radius) * 0.1 + randomFrom(x, y, 4) * 0.05
      const warm = seed > 0.94 ? 0.14 : 0

      values.push(
        positionX, positionY,
        scatterX, scatterY,
        tone * (1 - warm) + warm,
        tone * (1 - warm) + 0.54 * warm,
        tone * (1 - warm) + 0.25 * warm,
        seed, threshold, alpha,
      )
    }
  }

  return { data: new Float32Array(values), count: values.length / 10, aspect: sampleWidth / sampleHeight }
}

export default function PortraitParticles({ motionOn, reduceMotion }) {
  const rootRef = useRef(null)
  const imageRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!root || !image || !canvas || !motionOn || reduceMotion) return

    const compactDevice = window.matchMedia('(max-width: 800px), (pointer: coarse)').matches
      || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)
      || (navigator.deviceMemory && navigator.deviceMemory <= 2)

    let disposed = false
    let idleId
    let timeoutId
    let loadHandler
    let context
    let tween
    let resizeObserver
    let intersectionObserver
    let gl
    let program
    let buffer
    let fitUniform
    let progressUniform
    let pointSizeUniform
    let count = 0
    let portraitAspect = 1
    let inView = true
    const progress = { value: 0 }

    const render = () => {
      if (!gl || !program || !inView || disposed) return
      const remainingPortrait = Math.pow(1 - progress.value, 2.2)
      root.style.setProperty('--portrait-base-opacity', String(0.1 + remainingPortrait * 0.48))
      const width = Math.max(1, root.clientWidth)
      const height = Math.max(1, root.clientHeight)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, compactDevice ? 1 : 1.5)
      const renderWidth = Math.round(width * pixelRatio)
      const renderHeight = Math.round(height * pixelRatio)
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth
        canvas.height = renderHeight
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      const containerAspect = width / height
      const fitX = portraitAspect > containerAspect ? 1 : portraitAspect / containerAspect
      const fitY = portraitAspect > containerAspect ? containerAspect / portraitAspect : 1
      gl.uniform2f(fitUniform, fitX, fitY)
      gl.uniform1f(progressUniform, progress.value)
      gl.uniform1f(pointSizeUniform, 1.55 * pixelRatio)
      gl.drawArrays(gl.POINTS, 0, count)
    }

    const initialize = async () => {
      try {
        await image.decode().catch(() => undefined)
        if (disposed || !image.naturalWidth) return

        gl = canvas.getContext('webgl', {
          alpha: true,
          antialias: false,
          depth: false,
          powerPreference: 'high-performance',
          premultipliedAlpha: false,
        })
        if (!gl) return

        program = createProgram(gl)
        const particles = samplePortrait(image, compactDevice)
        count = particles.count
        portraitAspect = particles.aspect
        root.dataset.particleCount = String(count)
        buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, particles.data, gl.STATIC_DRAW)
        gl.useProgram(program)
        fitUniform = gl.getUniformLocation(program, 'uFit')
        progressUniform = gl.getUniformLocation(program, 'uProgress')
        pointSizeUniform = gl.getUniformLocation(program, 'uPointSize')
        const stride = 10 * Float32Array.BYTES_PER_ELEMENT
        const attributes = [
          ['aPosition', 2, 0],
          ['aScatter', 2, 2],
          ['aColor', 3, 4],
          ['aSeed', 1, 7],
          ['aThreshold', 1, 8],
          ['aAlpha', 1, 9],
        ]
        attributes.forEach(([name, size, offset]) => {
          const location = gl.getAttribLocation(program, name)
          gl.enableVertexAttribArray(location)
          gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * Float32Array.BYTES_PER_ELEMENT)
        })
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(0, 0, 0, 0)
        render()
        requestAnimationFrame(() => {
          if (!disposed) root.classList.add('is-particle-ready')
        })

        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
        if (disposed) return
        gsap.registerPlugin(ScrollTrigger)
        const hero = root.closest('.hero')
        context = gsap.context(() => {
          tween = gsap.to(progress, {
            value: 1,
            ease: 'none',
            onUpdate: render,
            scrollTrigger: {
              id: 'portrait-particles',
              trigger: hero,
              start: 'top top+=84',
              end: 'bottom 18%',
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          })
        }, hero)

        resizeObserver = new ResizeObserver(() => render())
        resizeObserver.observe(root)
        intersectionObserver = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          if (inView) render()
        }, { rootMargin: '15% 0px' })
        intersectionObserver.observe(root)
        ScrollTrigger.refresh()
      } catch (error) {
        root.classList.remove('is-particle-ready')
        console.warn('Portrait particle fallback enabled.', error)
      }
    }

    const schedule = () => {
      if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(initialize, { timeout: 1800 })
      else timeoutId = window.setTimeout(initialize, 350)
    }
    if (document.readyState === 'complete') schedule()
    else {
      loadHandler = schedule
      window.addEventListener('load', loadHandler, { once: true })
    }

    const onContextLost = (event) => {
      event.preventDefault()
      root.classList.remove('is-particle-ready')
      root.style.removeProperty('--portrait-base-opacity')
      delete root.dataset.particleCount
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    return () => {
      disposed = true
      if (idleId) window.cancelIdleCallback(idleId)
      window.clearTimeout(timeoutId)
      if (loadHandler) window.removeEventListener('load', loadHandler)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      tween?.scrollTrigger?.kill()
      context?.revert()
      root.classList.remove('is-particle-ready')
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer)
        if (program) gl.deleteProgram(program)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
    }
  }, [motionOn, reduceMotion])

  return <div ref={rootRef} className="portrait-particles">
    <picture>
      <source type="image/avif" srcSet="/images/portrait-640.avif 640w, /images/portrait-1024.avif 1024w" sizes="(max-width: 760px) 88vw, 420px" />
      <img ref={imageRef} src="/images/portrait.webp" srcSet="/images/portrait-640.webp 640w, /images/portrait-1024.webp 1024w" sizes="(max-width: 760px) 88vw, 420px" alt="Black-and-white cutout portrait of Noman Hassan" width="1024" height="1035" loading="eager" fetchPriority="high" decoding="async" />
    </picture>
    <canvas ref={canvasRef} className="portrait-particles__canvas" aria-hidden="true" />
  </div>
}
