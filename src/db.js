import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://zpply:secret@localhost:5432/zpply')

export async function initDb() {
  // ENUMs (idempotente)
  await sql`DO $$ BEGIN CREATE TYPE plan_type     AS ENUM ('free', 'pro', 'premium');              EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE billing_cycle AS ENUM ('mensal', 'trimestral', 'anual');        EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE plan_status   AS ENUM ('active', 'cancelled', 'trial');         EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE job_status    AS ENUM ('pending', 'processing', 'done', 'error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  // Tabela users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                         TEXT        PRIMARY KEY,
      email                      TEXT        NOT NULL,
      name                       TEXT        NOT NULL,
      picture                    TEXT,
      plan                       plan_type   NOT NULL DEFAULT 'free',
      plan_billing               billing_cycle,
      plan_status                plan_status NOT NULL DEFAULT 'active',
      abacatepay_customer_id     TEXT,
      abacatepay_subscription_id TEXT,
      plan_renews_at             TIMESTAMPTZ,
      monthly_pdf_count          INT         NOT NULL DEFAULT 0,
      monthly_pdf_reset_at       TIMESTAMPTZ,
      created_at                 TIMESTAMPTZ DEFAULT NOW()
    )
  `
  // Adições idempotentes para deployments existentes
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan plan_type NOT NULL DEFAULT 'free'`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_billing billing_cycle`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status plan_status NOT NULL DEFAULT 'active'`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS abacatepay_customer_id TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS abacatepay_subscription_id TEXT`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_renews_at TIMESTAMPTZ`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_pdf_count INT NOT NULL DEFAULT 0`
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_pdf_reset_at TIMESTAMPTZ`

  // Tabela jobs
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id            TEXT       PRIMARY KEY,
      user_id       TEXT       NOT NULL REFERENCES users(id),
      original_name TEXT       NOT NULL,
      status        job_status NOT NULL DEFAULT 'pending',
      result_file   TEXT,
      error         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      completed_at  TIMESTAMPTZ
    )
  `
  // Migra coluna status de TEXT para job_status (ignora se já for ENUM ou se houver valores inválidos)
  await sql`
    DO $$ BEGIN
      ALTER TABLE jobs ALTER COLUMN status TYPE job_status USING status::job_status;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `
  await sql`CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON jobs(user_id)`

  // Cache de produtos AbacatePay
  await sql`
    CREATE TABLE IF NOT EXISTS abacatepay_products (
      id          TEXT          PRIMARY KEY,
      external_id TEXT          NOT NULL UNIQUE,
      plan        plan_type     NOT NULL,
      billing     billing_cycle NOT NULL,
      UNIQUE (plan, billing)
    )
  `
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser({ id, email, name, picture }) {
  await sql`
    INSERT INTO users (id, email, name, picture)
    VALUES (${id}, ${email}, ${name}, ${picture})
    ON CONFLICT (id) DO UPDATE SET
      email   = EXCLUDED.email,
      name    = EXCLUDED.name,
      picture = EXCLUDED.picture
  `
}

export async function getUserById(id) {
  const [user] = await sql`SELECT * FROM users WHERE id = ${id}`
  return user ?? null
}

export async function setAbacateCustomer(userId, customerId) {
  await sql`UPDATE users SET abacatepay_customer_id = ${customerId} WHERE id = ${userId}`
}

export async function activateSubscription(userId, { subscriptionId, plan, planBilling, renewsAt }) {
  const nextReset = new Date()
  nextReset.setMonth(nextReset.getMonth() + 1)
  await sql`
    UPDATE users SET
      abacatepay_subscription_id = ${subscriptionId},
      plan                       = ${plan}::plan_type,
      plan_billing               = ${planBilling}::billing_cycle,
      plan_status                = 'active'::plan_status,
      plan_renews_at             = ${renewsAt ?? null},
      monthly_pdf_count          = 0,
      monthly_pdf_reset_at       = ${nextReset.toISOString()}
    WHERE id = ${userId}
  `
}

export async function renewSubscription(userId, renewsAt) {
  await sql`
    UPDATE users SET
      plan_status          = 'active'::plan_status,
      plan_renews_at       = ${renewsAt ?? null},
      monthly_pdf_count    = 0,
      monthly_pdf_reset_at = NOW() + INTERVAL '1 month'
    WHERE id = ${userId}
  `
}

export async function cancelSubscription(userId) {
  await sql`
    UPDATE users SET
      plan                       = 'free'::plan_type,
      plan_billing               = NULL,
      plan_status                = 'cancelled'::plan_status,
      abacatepay_subscription_id = NULL,
      plan_renews_at             = NULL
    WHERE id = ${userId}
  `
}

export async function incrementPdfCount(userId) {
  await sql`UPDATE users SET monthly_pdf_count = monthly_pdf_count + 1 WHERE id = ${userId}`
}

export async function resetPdfCount(userId) {
  const nextReset = new Date()
  nextReset.setMonth(nextReset.getMonth() + 1)
  await sql`
    UPDATE users SET
      monthly_pdf_count    = 0,
      monthly_pdf_reset_at = ${nextReset.toISOString()}
    WHERE id = ${userId}
  `
}

// ─── AbacatePay Products ──────────────────────────────────────────────────────

export async function getProductId(plan, billing) {
  const [row] = await sql`
    SELECT id FROM abacatepay_products
    WHERE plan = ${plan}::plan_type AND billing = ${billing}::billing_cycle
  `
  return row?.id ?? null
}

export async function getProductByExternalId(externalId) {
  const [row] = await sql`SELECT * FROM abacatepay_products WHERE external_id = ${externalId}`
  return row ?? null
}

export async function upsertAbacateProduct({ id, externalId, plan, billing }) {
  await sql`
    INSERT INTO abacatepay_products (id, external_id, plan, billing)
    VALUES (${id}, ${externalId}, ${plan}::plan_type, ${billing}::billing_cycle)
    ON CONFLICT (plan, billing) DO UPDATE SET
      id          = EXCLUDED.id,
      external_id = EXCLUDED.external_id
  `
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function addJob({ id, userId, originalName }) {
  await sql`
    INSERT INTO jobs (id, user_id, original_name, status)
    VALUES (${id}, ${userId}, ${originalName}, 'pending')
  `
}

export async function loadJobs(userId) {
  return sql`
    SELECT
      id,
      original_name AS "originalName",
      status,
      result_file   AS "resultFile",
      error,
      created_at    AS "createdAt",
      completed_at  AS "completedAt"
    FROM jobs
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
}

export async function updateJob(id, { status, resultFile, error, completedAt } = {}) {
  const updates = {}
  if (status      !== undefined) updates.status       = status
  if (resultFile  !== undefined) updates.result_file  = resultFile
  if (error       !== undefined) updates.error        = error
  if (completedAt !== undefined) updates.completed_at = completedAt

  if (!Object.keys(updates).length) return
  await sql`UPDATE jobs SET ${sql(updates)} WHERE id = ${id}`
}

export async function getJobOwner(jobId) {
  const [row] = await sql`SELECT user_id FROM jobs WHERE id = ${jobId}`
  return row?.user_id ?? null
}

export async function deleteJob(jobId) {
  const [row] = await sql`DELETE FROM jobs WHERE id = ${jobId} RETURNING result_file AS "resultFile"`
  return row?.resultFile ?? null
}
