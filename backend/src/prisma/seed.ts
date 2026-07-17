import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@saasplatform.com' },
    update: {},
    create: {
      email: 'superadmin@saasplatform.com',
      password: await bcrypt.hash('SuperAdmin123!', 12),
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Demo Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp-demo' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme-corp-demo',
      description: 'A demo organization for showcasing the platform',
      industry: 'Technology',
      size: '50-100',
      plan: 'pro',
    },
  });

  // Org Admin
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      password: await bcrypt.hash('Admin123!', 12),
      firstName: 'Alice',
      lastName: 'Johnson',
      role: Role.ORG_ADMIN,
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Member
  const member = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: {},
    create: {
      email: 'member@acme.com',
      password: await bcrypt.hash('Member123!', 12),
      firstName: 'Bob',
      lastName: 'Smith',
      role: Role.MEMBER,
      isEmailVerified: true,
      isActive: true,
    },
  });

  // Link users to org
  await prisma.organizationUser.upsert({
    where: { userId_organizationId: { userId: orgAdmin.id, organizationId: org.id } },
    update: {},
    create: { userId: orgAdmin.id, organizationId: org.id, role: Role.ORG_ADMIN },
  });

  await prisma.organizationUser.upsert({
    where: { userId_organizationId: { userId: member.id, organizationId: org.id } },
    update: {},
    create: { userId: member.id, organizationId: org.id, role: Role.MEMBER },
  });

  // Projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: 'Website Redesign',
        description: 'Complete overhaul of company website',
        status: ProjectStatus.ACTIVE,
        organizationId: org.id,
        ownerId: orgAdmin.id,
        color: '#6366f1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.project.create({
      data: {
        name: 'Mobile App v2',
        description: 'Second version of the mobile application',
        status: ProjectStatus.ACTIVE,
        organizationId: org.id,
        ownerId: orgAdmin.id,
        color: '#8b5cf6',
      },
    }),
    prisma.project.create({
      data: {
        name: 'API Integration',
        description: 'Third-party API integration project',
        status: ProjectStatus.PAUSED,
        organizationId: org.id,
        ownerId: member.id,
        color: '#06b6d4',
      },
    }),
  ]);

  // Tasks
  const taskData = [
    { title: 'Design new homepage layout', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeId: member.id },
    { title: 'Implement authentication flow', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT, assigneeId: orgAdmin.id },
    { title: 'Write unit tests for API', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeId: member.id },
    { title: 'Setup CI/CD pipeline', status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH, assigneeId: orgAdmin.id },
    { title: 'Database optimization', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: member.id },
    { title: 'Update documentation', status: TaskStatus.TODO, priority: TaskPriority.LOW, assigneeId: member.id },
  ];

  for (let i = 0; i < taskData.length; i++) {
    await prisma.task.create({
      data: {
        ...taskData[i],
        organizationId: org.id,
        projectId: projects[i % projects.length].id,
        creatorId: orgAdmin.id,
        position: i,
        completedAt: taskData[i].status === TaskStatus.DONE ? new Date() : undefined,
        dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('\n🔐 Demo Credentials:');
  console.log('  Super Admin:  superadmin@saasplatform.com / SuperAdmin123!');
  console.log('  Org Admin:    admin@acme.com / Admin123!');
  console.log('  Member:       member@acme.com / Member123!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
