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
  experimental: {
    viewTransition: true,
  },
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
