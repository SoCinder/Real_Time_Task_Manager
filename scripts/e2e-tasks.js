require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

(async () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const email = `e2e+${Date.now()}@example.com`;
    const password = 'testpass';

    console.log('Creating test user:', email);
    const user = await prisma.user.create({
      data: { email, password },
    });
    console.log('User id:', user.id);

    const tasksToCreate = [
      { title: 'Task A', description: 'A - todo 0', status: 'TODO', position: 0 },
      { title: 'Task B', description: 'A - todo 1', status: 'TODO', position: 1 },
      { title: 'Task C', description: 'In progress 0', status: 'IN_PROGRESS', position: 0 },
    ];

    console.log('Creating tasks...');
    for (const t of tasksToCreate) {
      await prisma.task.create({ data: { ...t, userId: user.id } });
    }

    console.log('Fetching tasks ordered by position (global):');
    const all = await prisma.task.findMany({ where: { userId: user.id }, orderBy: { position: 'asc' } });
    console.log(all.map((t) => ({ id: t.id, title: t.title, status: t.status, position: t.position })));

    console.log('Fetching tasks grouped by status (simulate frontend grouping):');
    const todo = all.filter((t) => t.status === 'TODO');
    const inProgress = all.filter((t) => t.status === 'IN_PROGRESS');
    console.log('TODO:', todo.map((t) => ({ title: t.title, position: t.position })));
    console.log('IN_PROGRESS:', inProgress.map((t) => ({ title: t.title, position: t.position })));

    console.log('Cleaning up test data...');
    await prisma.task.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Done.');
  } catch (err) {
    console.error('E2E error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
