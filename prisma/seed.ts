import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient()

const industryBenchmarks = [
  {
    industry_code: 'DEFAULT',
    industry_name: 'Ostatní / Nezařazeno',
    avg_engagement_rate: 0.02,
    reactions_pct: 70,
    comments_pct: 20,
    shares_pct: 10,
    ideal_engagement_pct: 60,
    ideal_sales_pct: 15,
    ideal_brand_pct: 25,
    ideal_posts_per_week: 3,
  },
  {
    industry_code: 'FOOD_RESTAURANT',
    industry_name: 'Restaurace a jídlo',
    avg_engagement_rate: 0.035,
    reactions_pct: 75,
    comments_pct: 15,
    shares_pct: 10,
    ideal_engagement_pct: 65,
    ideal_sales_pct: 20,
    ideal_brand_pct: 15,
    ideal_posts_per_week: 5,
  },
  {
    industry_code: 'RETAIL',
    industry_name: 'Maloobchod',
    avg_engagement_rate: 0.018,
    reactions_pct: 65,
    comments_pct: 20,
    shares_pct: 15,
    ideal_engagement_pct: 55,
    ideal_sales_pct: 25,
    ideal_brand_pct: 20,
    ideal_posts_per_week: 4,
  },
  {
    industry_code: 'BEAUTY_FITNESS',
    industry_name: 'Krása a fitness',
    avg_engagement_rate: 0.04,
    reactions_pct: 72,
    comments_pct: 18,
    shares_pct: 10,
    ideal_engagement_pct: 60,
    ideal_sales_pct: 20,
    ideal_brand_pct: 20,
    ideal_posts_per_week: 4,
  },
  {
    industry_code: 'EDUCATION',
    industry_name: 'Vzdělávání',
    avg_engagement_rate: 0.025,
    reactions_pct: 60,
    comments_pct: 25,
    shares_pct: 15,
    ideal_engagement_pct: 70,
    ideal_sales_pct: 10,
    ideal_brand_pct: 20,
    ideal_posts_per_week: 3,
  },
  {
    industry_code: 'HEALTHCARE',
    industry_name: 'Zdravotnictví',
    avg_engagement_rate: 0.022,
    reactions_pct: 65,
    comments_pct: 25,
    shares_pct: 10,
    ideal_engagement_pct: 65,
    ideal_sales_pct: 10,
    ideal_brand_pct: 25,
    ideal_posts_per_week: 2,
  },
  {
    industry_code: 'NONPROFIT',
    industry_name: 'Neziskové organizace',
    avg_engagement_rate: 0.03,
    reactions_pct: 55,
    comments_pct: 20,
    shares_pct: 25,
    ideal_engagement_pct: 70,
    ideal_sales_pct: 5,
    ideal_brand_pct: 25,
    ideal_posts_per_week: 3,
  },
  {
    industry_code: 'REAL_ESTATE',
    industry_name: 'Reality',
    avg_engagement_rate: 0.015,
    reactions_pct: 70,
    comments_pct: 20,
    shares_pct: 10,
    ideal_engagement_pct: 50,
    ideal_sales_pct: 35,
    ideal_brand_pct: 15,
    ideal_posts_per_week: 3,
  },
  {
    industry_code: 'ENTERTAINMENT',
    industry_name: 'Zábava a média',
    avg_engagement_rate: 0.05,
    reactions_pct: 68,
    comments_pct: 22,
    shares_pct: 10,
    ideal_engagement_pct: 75,
    ideal_sales_pct: 5,
    ideal_brand_pct: 20,
    ideal_posts_per_week: 5,
  },
  {
    industry_code: 'TECH_SERVICES',
    industry_name: 'Technologie a služby',
    avg_engagement_rate: 0.018,
    reactions_pct: 60,
    comments_pct: 30,
    shares_pct: 10,
    ideal_engagement_pct: 55,
    ideal_sales_pct: 20,
    ideal_brand_pct: 25,
    ideal_posts_per_week: 3,
  },
]

async function main() {
  console.log('Seeding industry benchmarks...')

  for (const benchmark of industryBenchmarks) {
    await prisma.industryBenchmark.upsert({
      where: { industry_code: benchmark.industry_code },
      update: benchmark,
      create: benchmark,
    })
    console.log(`  ✓ ${benchmark.industry_code}: ${benchmark.industry_name}`)
  }

  console.log(`\nSeeded ${industryBenchmarks.length} industry benchmarks.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
