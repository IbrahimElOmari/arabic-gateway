import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const sidebarSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AppSidebar.tsx'), 'utf8');

const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/terms', '/pricing', '/faq', '/install'];
const studentRoutes = ['/dashboard', '/self-study', '/live-lessons', '/recordings', '/forum', '/chat', '/calendar', '/progress', '/settings', '/helpdesk', '/gamification'];
const teacherRoutes = ['/teacher', '/teacher/content-studio', '/teacher/lessons', '/teacher/recordings', '/teacher/submissions', '/teacher/exercises', '/teacher/materials'];
const adminRoutes = ['/admin', '/admin/users', '/admin/teachers', '/admin/classes', '/admin/levels', '/admin/payments', '/admin/discounts', '/admin/placements', '/admin/analytics', '/admin/faq', '/admin/reports', '/admin/invitations', '/admin/final-exams', '/admin/enrollments', '/admin/design-system'];

function routePattern(path: string): RegExp {
  return new RegExp(`<Route\\s+path=["']${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`);
}

describe('route access matrix', () => {
  it('defines every expected public, student, teacher, and admin route', () => {
    for (const route of [...publicRoutes, ...studentRoutes, ...teacherRoutes, ...adminRoutes]) {
      expect(appSource, `${route} is missing from App.tsx`).toMatch(routePattern(route));
    }
  });

  it('protects role-specific route groups with the expected role policy', () => {
    for (const route of teacherRoutes) {
      const routeLine = appSource.split('\n').find((line) => line.includes(`path="${route}"`)) || '';
      expect(routeLine, `${route} must allow teacher/admin only`).toContain("allowedRoles={['admin', 'teacher']}");
    }

    for (const route of adminRoutes) {
      const routeLine = appSource.split('\n').find((line) => line.includes(`path="${route}"`)) || '';
      expect(routeLine, `${route} must require admin`).toContain('requiredRole="admin"');
    }
  });

  it('keeps primary static routes discoverable from navigation or as intentional utility routes', () => {
    const intentionalUtilityRoutes = new Set(['/forgot-password', '/reset-password', '/privacy', '/terms', '/install', '/profile', '/apply-teacher']);
    const staticRoutes = [...publicRoutes, ...studentRoutes, ...teacherRoutes, ...adminRoutes, '/apply-teacher'];

    for (const route of staticRoutes) {
      if (intentionalUtilityRoutes.has(route)) continue;
      expect(sidebarSource, `${route} should be present in AppSidebar navigation`).toContain(`to: '${route}'`);
    }
  });
});
