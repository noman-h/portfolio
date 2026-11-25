import { useEffect } from 'react'

function effectForMonth(month) {
  if (month >= 9 || month <= 1) return 'snow'
  if (month >= 5 && month <= 8) return 'rain'
  return 'leaves'
}

export default function SeasonalWeather({ motionOn }) {
  useEffect(() => {
    if (!motionOn) return

    let weather
    let cancelled = false
    let timer

    async function start() {
      const { createWeather } = await import('@elementalfx/weather')
      if (cancelled) return

      let effect = effectForMonth(new Date().getMonth())
      weather = createWeather(document.body, {
        effects: [effect],
        intensity: 0.35,
        maxPixelRatio: 1,
        respectReducedMotion: true,
      })

      // A tab left open across a month boundary should switch seasons too.
      timer = window.setInterval(() => {
        const nextEffect = effectForMonth(new Date().getMonth())
        if (nextEffect !== effect) {
          weather.remove(effect)
          weather.add(nextEffect)
          effect = nextEffect
        }
      }, 60 * 60 * 1000)
    }

    start()
    return () => {
      cancelled = true
      window.clearInterval(timer)
      weather?.destroy()
    }
  }, [motionOn])

  return null
}
