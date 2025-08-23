import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CustomAuth from '@/components/CustomAuth';
import { CalendarDays } from 'lucide-react';

const Login = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <CalendarDays className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Presença
          </h1>
          <p className="text-gray-600">
            Controle de presença para sua equipe
          </p>
        </div>

        <CustomAuth onSuccess={() => navigate('/dashboard')} />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Sistema desenvolvido para controle de presença de funcionários
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;