import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { MainLayout } from '@/components/layout/MainLayout';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login', { state: { registered: true } });
  };

  return (
    <MainLayout showFooter={false}>
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <RegisterForm onSuccess={handleSuccess} />
      </div>
    </MainLayout>
  );
}
