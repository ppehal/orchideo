#!/bin/sh
set -e

echo "🔄 Generating Prisma client..."
npm run db:generate

echo "🚀 Starting development server..."
exec npm run dev
