import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { MainLayout } from '@/components/layout/MainLayout';

export default function RegisterPage() {
  return (
    <MainLayout showFooter={false}>
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <RegisterForm />
      </div>
    </MainLayout>
  );
}
