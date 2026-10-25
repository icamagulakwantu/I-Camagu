// Runs maintenance tasks in order, one at a time so they don't pile onto
// the database pooler. A failing task is logged and the rest still run.
// Returns the labels of the tasks that failed. Kept free of database
// imports so it can be unit tested on its own.
export async function runTasks(tasks, log = console.error) {
  const failed = [];
  for (const [label, task] of tasks) {
    try {
      await task();
    } catch (err) {
      failed.push(label);
      log(`${label} failed — name=${err?.name} code=${err?.code} message=${err?.message}`);
    }
  }
  return failed;
}
