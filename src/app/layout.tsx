import type { Metadata } from 'next'
import { MotionPreference } from '@/features/settings'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'LIC', template: '%s · LIC' },
  description: 'Learn → Implement → Confirm. Платформа для обучения разработке.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh font-sans antialiased">
        <MotionPreference />
        {children}
      </body>
    </html>
  )
}
