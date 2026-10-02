-- Prisma schema can't express CHECK constraints, so they live in this hand-written migration.
-- Defense in depth: the API validates too, but the database must never hold a non-positive salary
-- or a non-positive exchange rate.
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_rate_positive" CHECK ("rate_to_usd" > 0);
