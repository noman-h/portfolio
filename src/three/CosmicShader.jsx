import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { Vector2 } from 'three'

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uPointer;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 centered = (uv - 0.5) * vec2(1.65, 1.0);
    centered += uPointer * 0.035;
    float time = uTime * 0.035;
    float nebula = noise(centered * 3.2 + vec2(time, -time * 0.7));
    nebula += 0.48 * noise(centered * 6.0 - vec2(time * 0.6, time));
    float cloud = smoothstep(0.53, 1.13, nebula);
    vec3 color = vec3(0.025, 0.10, 0.19) * cloud;
    color += vec3(0.16, 0.08, 0.32) * cloud * smoothstep(0.48, 0.82, uv.x);

    vec2 starGrid = uv * vec2(190.0, 120.0);
    vec2 cell = floor(starGrid);
    vec2 point = fract(starGrid) - 0.5;
    float star = step(0.992, hash(cell));
    float glow = exp(-dot(point, point) * 1800.0) * star;
    float twinkle = 0.62 + 0.38 * sin(uTime * 1.3 + hash(cell) * 20.0);
    color += vec3(0.48, 0.82, 1.0) * glow * twinkle;

    float vignette = 1.0 - smoothstep(0.12, 0.92, length((uv - 0.5) * vec2(1.1, 0.82)));
    float alpha = (cloud * 0.42 + glow * 0.9) * vignette;
    gl_FragColor = vec4(color * vignette, alpha);
  }
`

function Nebula() {
  const elapsed = useRef(0)
  const pointerTarget = useRef(new Vector2())
  const pointerCurrent = useRef(new Vector2())
  const material = useRef(null)

  useFrame(({ pointer }, delta) => {
    if (!material.current) return
    elapsed.current += delta
    pointerTarget.current.set(pointer.x, pointer.y)
    pointerCurrent.current.lerp(pointerTarget.current, 1 - Math.exp(-4 * delta))
    material.current.uniforms.uTime.value = elapsed.current
    material.current.uniforms.uPointer.value.copy(pointerCurrent.current)
  })

  return <mesh>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={{ uTime: { value: 0 }, uPointer: { value: new Vector2() } }} transparent depthWrite={false} />
  </mesh>
}

function RenderController({ active }) {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    if (!active) return
    const interval = window.setInterval(invalidate, 1000 / 30)
    invalidate()
    return () => window.clearInterval(interval)
  }, [active, invalidate])
  return null
}

export default function CosmicShader() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const hero = document.querySelector('.hero')
    if (!hero) return
    let inView = false
    const update = () => {
      const nextActive = inView && !document.hidden
      setActive((current) => current === nextActive ? current : nextActive)
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      update()
    }, { threshold: 0.01 })
    const onVisibilityChange = () => update()
    observer.observe(hero)
    document.addEventListener('visibilitychange', onVisibilityChange, { passive: true })
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} dpr={[1, 1.25]} frameloop="demand" gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}>
    <Nebula />
    <RenderController active={active} />
  </Canvas>
}
