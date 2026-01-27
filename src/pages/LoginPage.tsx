import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { MainLayout } from '@/components/layout/MainLayout';

export default function LoginPage() {
  return (
    <MainLayout showFooter={false}>
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <LoginForm />
      </div>
    </MainLayout>
  );
}
