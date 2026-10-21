import prisma from '../config/db.js';

// What a member is saving for. Used by the "Complete your profile" card and,
// later, to match people with stokvels and bulk pools of the same kind.
// Kept in its own small table, created the first time it's needed, so no
// manual database step is required (same approach as the ledger tables).
export const SAVING_GOALS = ['FUNERAL', 'GROCERIES', 'CEREMONY', 'SAVINGS', 'BULK_BUYING', 'SCHOOL'];

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSavingGoal" (
        "userId" TEXT NOT NULL PRIMARY KEY,
        "goals" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

function parseGoals(text) {
  return (text || '').split(',').filter((g) => SAVING_GOALS.includes(g));
}

export async function getSavingGoals(req, res) {
  try {
    await ensureTable();
    const rows = await prisma.$queryRaw`SELECT "goals" FROM "UserSavingGoal" WHERE "userId" = ${req.userId}`;
    res.json({ goals: parseGoals(rows[0]?.goals), options: SAVING_GOALS });
  } catch (error) {
    console.error('Get saving goals error:', error.message);
    res.status(500).json({ error: 'Could not load what you are saving for' });
  }
}

export async function setSavingGoals(req, res) {
  const input = Array.isArray(req.body?.goals) ? req.body.goals : null;
  if (!input) return res.status(400).json({ error: 'Choose at least one thing you are saving for' });

  const goals = [...new Set(input.filter((g) => SAVING_GOALS.includes(g)))];
  if (goals.length === 0) return res.status(400).json({ error: 'Choose at least one thing you are saving for' });

  try {
    await ensureTable();
    const text = goals.join(',');
    await prisma.$executeRaw`
      INSERT INTO "UserSavingGoal" ("userId", "goals", "updatedAt")
      VALUES (${req.userId}, ${text}, CURRENT_TIMESTAMP)
      ON CONFLICT ("userId") DO UPDATE SET "goals" = ${text}, "updatedAt" = CURRENT_TIMESTAMP
    `;
    res.json({ goals });
  } catch (error) {
    console.error('Set saving goals error:', error.message);
    res.status(500).json({ error: 'Could not save what you are saving for' });
  }
}
