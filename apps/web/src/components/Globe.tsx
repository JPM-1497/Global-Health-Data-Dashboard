import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface GlobeProps {
  selectedIso3: string
}

const COUNTRY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  USA: { lat: 38.9, lon: -97.0 },
  CHN: { lat: 35.9, lon: 104.2 },
  IND: { lat: 21.1, lon: 78.0 },
  DEU: { lat: 51.2, lon: 10.5 },
  GBR: { lat: 55.4, lon: -3.4 },
  BRA: { lat: -10.8, lon: -52.9 },
  NGA: { lat: 9.1, lon: 8.7 },
  ZAF: { lat: -30.6, lon: 22.9 },
  JPN: { lat: 36.2, lon: 138.3 },
  AUS: { lat: -25.3, lon: 133.8 },
}

function positionForCountry(lat: number, lon: number, radius: number) {
  const latitude = THREE.MathUtils.degToRad(lat)
  const longitude = THREE.MathUtils.degToRad(lon)
  return new THREE.Vector3(
    radius * Math.cos(latitude) * Math.sin(longitude),
    radius * Math.sin(latitude),
    radius * Math.cos(latitude) * Math.cos(longitude),
  )
}

export default function Globe({ selectedIso3 }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef(selectedIso3)

  useEffect(() => {
    selectedRef.current = selectedIso3
  }, [selectedIso3])

  useEffect(() => {
    if (!mountRef.current) return

    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.z = 4.6

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const globe = new THREE.Group()
    scene.add(globe)

    const earthTexture = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg',
    )
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.45, 36, 24),
      new THREE.MeshBasicMaterial({
        map: earthTexture,
        color: 0x9cc7d9,
        transparent: true,
        opacity: 0.94,
      }),
    )
    globe.add(sphere)

    const grid = new THREE.Mesh(
      new THREE.SphereGeometry(1.46, 36, 24),
      new THREE.MeshBasicMaterial({ color: 0x8bd5ff, transparent: true, opacity: 0.16, wireframe: true }),
    )
    globe.add(grid)

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.52, 32, 20),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.07,
        side: THREE.BackSide,
      }),
    )
    globe.add(atmosphere)

    const markers = new Map<string, THREE.Mesh>()
    for (const [iso3, coordinates] of Object.entries(COUNTRY_COORDINATES)) {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc }),
      )
      marker.position.copy(positionForCountry(coordinates.lat, coordinates.lon, 1.49))
      globe.add(marker)
      markers.set(iso3, marker)
    }

    const starGeometry = new THREE.BufferGeometry()
    const starPositions = new Float32Array(180)
    for (let index = 0; index < starPositions.length; index++) {
      starPositions[index] = (Math.random() - 0.5) * 8
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    scene.add(new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0x64748b, size: 0.018, transparent: true, opacity: 0.55 }),
    ))

    let targetRotation = { x: 0, y: 0 }
    let animationFrame = 0
    let previousTime = performance.now()

    const setTarget = (iso3: string) => {
      const coordinates = COUNTRY_COORDINATES[iso3] ?? COUNTRY_COORDINATES.USA
      const point = positionForCountry(coordinates.lat, coordinates.lon, 1)
      targetRotation = {
        x: THREE.MathUtils.degToRad(coordinates.lat) * 0.45,
        y: -Math.atan2(point.x, point.z),
      }
    }

    setTarget(selectedIso3)
    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const animate = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      setTarget(selectedRef.current)
      globe.rotation.x += (targetRotation.x - globe.rotation.x) * Math.min(delta * 4, 1)
      globe.rotation.y += (targetRotation.y - globe.rotation.y) * Math.min(delta * 4, 1)
      globe.rotation.z += delta * 0.035

      markers.forEach((marker, iso3) => {
        const selected = iso3 === selectedRef.current
        const material = marker.material as THREE.MeshBasicMaterial
        material.color.set(selected ? 0xfacc15 : 0x7dd3fc)
        marker.scale.setScalar(selected ? 1.7 : 1)
      })

      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(animate)
    }
    animationFrame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      globe.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
          else object.material.dispose()
        }
      })
      starGeometry.dispose()
      earthTexture.dispose()
    }
  }, [])

  return <div ref={mountRef} className="h-full w-full" aria-label="Interactive country globe" />
}