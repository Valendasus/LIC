import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Темы курса — MDX-файлы в content/, страницы подключают их динамическим импортом.
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // Практика переехала с /review на /practice: старые ссылки и закладки продолжают работать.
  async redirects() {
    return [{ source: '/review', destination: '/practice', permanent: true }]
  },
}

const withMDX = createMDX({
  options: {
    // Плагины для Turbopack задаются строками: функции нельзя передать в Rust.
    remarkPlugins: ['remark-gfm'],
  },
})

export default withMDX(nextConfig)
