"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"

interface AnimatedCounterProps {
  value: number
  duration?: number
  format?: (value: number) => string
  className?: string
  delay?: number
}

export function AnimatedCounter({
  value,
  duration = 2,
  format = (v) => Math.round(v).toLocaleString("fr-BE"),
  className,
  delay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 30, // Higher damping for smoother finish
    stiffness: 100, // Lower stiffness for slower animation
    bounce: 0,
  })

  useEffect(() => {
    if (isInView && !hasStarted) {
      setTimeout(() => {
        setHasStarted(true)
        motionValue.set(value)
      }, delay * 1000)
    }
  }, [isInView, hasStarted, value, duration, motionValue, delay])

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format(latest)
      }
    })
  }, [springValue, format])

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  )
}
