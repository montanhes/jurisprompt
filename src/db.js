import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL || 'postgresql://jurisprompt:secret@localhost:5432/jurisprompt')

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id      TEXT PRIMARY KEY,
      email   TEXT NOT NULL,
      name    TEXT NOT NULL,
      picture TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS jobs (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id),
      original_name TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      result_file   TEXT,
      error         TEXT,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      completed_at  TIMESTAMPTZ
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON jobs(user_id)`
}

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
      original_name  AS "originalName",
      status,
      result_file    AS "resultFile",
      error,
      created_at     AS "createdAt",
      completed_at   AS "completedAt"
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
  const rows = await sql`SELECT user_id FROM jobs WHERE id = ${jobId}`
  return rows[0]?.user_id ?? null
}
