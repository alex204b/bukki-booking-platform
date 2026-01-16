import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../../.env') });

async function recalculateBusinessRatings() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Get all businesses
    const businesses = await dataSource.query(`
      SELECT id, name FROM businesses
    `);

    console.log(`\n📊 Found ${businesses.length} businesses to process`);

    let updated = 0;
    let skipped = 0;

    for (const business of businesses) {
      // Calculate rating from reviews
      const reviewStats = await dataSource.query(`
        SELECT
          COUNT(*)::int as review_count,
          AVG(rating)::numeric as avg_rating
        FROM reviews
        WHERE "businessId" = $1
      `, [business.id]);

      const { review_count, avg_rating } = reviewStats[0];

      if (review_count > 0) {
        const roundedRating = Math.round(parseFloat(avg_rating) * 10) / 10;

        await dataSource.query(`
          UPDATE businesses
          SET rating = $1, "reviewCount" = $2
          WHERE id = $3
        `, [roundedRating, review_count, business.id]);

        console.log(`✅ ${business.name}: ${review_count} reviews, rating ${roundedRating}`);
        updated++;
      } else {
        await dataSource.query(`
          UPDATE businesses
          SET rating = 0, "reviewCount" = 0
          WHERE id = $1
        `, [business.id]);

        console.log(`⚪ ${business.name}: No reviews (set to 0)`);
        skipped++;
      }
    }

    console.log(`\n✅ Done! Updated ${updated} businesses with ratings, ${skipped} businesses have no reviews`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

recalculateBusinessRatings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
