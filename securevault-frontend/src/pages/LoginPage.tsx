import React from 'react';
import { AuthForm } from '../components/auth/AuthForm';

export const LoginPage: React.FC = () => {
  return <AuthForm mode="login" />;
};