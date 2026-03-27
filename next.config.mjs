/** @type {import('next').NextConfig} */
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Fix Turbopack root auto-detection (multiple lockfiles).
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
