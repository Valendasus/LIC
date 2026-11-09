// Готовит тестовую базу до старта сервера: создаёт lic_test, если её нет, и приводит схему к актуальной.
// Запускается из команды webServer в playwright.config.ts, поэтому сервер никогда не видит пустую базу.
import { execSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const url = process.env.DATABASE_URL
if (!url?.endsWith('/lic_test')) throw new Error('prepare-db: ожидается DATABASE_URL тестовой базы lic_test')

const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.replace(/\/lic_test$/, '/lic') }) })
const exists = await admin.$queryRawUnsafe("SELECT 1 FROM pg_database WHERE datname = 'lic_test'")
if (exists.length === 0) await admin.$executeRawUnsafe('CREATE DATABASE lic_test')
await admin.$disconnect()
execSync('npx prisma db push', { stdio: 'ignore' })
console.log('prepare-db: тестовая база готова')
