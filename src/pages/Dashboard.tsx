import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Settings, LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroPresenca {
  id: string;
  funcionario_id: string;
  data: string;
  status: string;
  observacoes?: string;
  profiles: {
    nome: string;
    matricula: string;
  };
}

interface Feriado {
  id: string;
  nome: string;
  data: string;
  tipo: string;
}

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [registros, setRegistros] = useState<RegistroPresenca[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);

  const statusColors = {
    presencial: 'bg-green-500',
    home_office: 'bg-blue-500',
    ferias: 'bg-purple-500',
    folga: 'bg-yellow-500',
    plantao: 'bg-orange-500',
    atestado: 'bg-red-500',
    falta: 'bg-gray-500',
  };

  const statusLabels = {
    presencial: 'Presencial',
    home_office: 'Home Office',
    ferias: 'Férias',
    folga: 'Folga',
    plantao: 'Plantão',
    atestado: 'Atestado',
    falta: 'Falta',
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    
    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);

    try {
      // Buscar registros do mês
      const { data: registrosData, error: registrosError } = await supabase
        .from('registros_presenca')
        .select(`
          *,
          profiles (nome, matricula)
        `)
        .gte('data', format(startDate, 'yyyy-MM-dd'))
        .lte('data', format(endDate, 'yyyy-MM-dd'));

      if (registrosError) throw registrosError;

      // Buscar feriados do mês
      const { data: feriadosData, error: feriadosError } = await supabase
        .from('feriados')
        .select('*')
        .gte('data', format(startDate, 'yyyy-MM-dd'))
        .lte('data', format(endDate, 'yyyy-MM-dd'));

      if (feriadosError) throw feriadosError;

      setRegistros(registrosData || []);
      setFeriados(feriadosData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRegistrosForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return registros.filter(registro => registro.data === dateStr);
  };

  const getFeriadoForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return feriados.find(feriado => feriado.data === dateStr);
  };

  const renderCalendarDay = (date: Date) => {
    const registrosDay = getRegistrosForDate(date);
    const feriado = getFeriadoForDate(date);
    const isWeekendDay = isWeekend(date);

    return (
      <div className="relative w-full h-full min-h-[80px] p-1">
        <div className="text-sm font-medium mb-1">
          {format(date, 'd')}
        </div>
        
        {feriado && (
          <div className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded mb-1 truncate">
            {feriado.nome}
          </div>
        )}
        
        {isWeekendDay && !feriado && (
          <div className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded mb-1">
            Final de semana
          </div>
        )}

        <div className="space-y-1">
          {registrosDay.slice(0, 3).map((registro) => (
            <div
              key={registro.id}
              className={`text-xs px-1 py-0.5 rounded text-white truncate ${
                statusColors[registro.status as keyof typeof statusColors]
              }`}
              title={`${registro.profiles.nome} - ${statusLabels[registro.status as keyof typeof statusLabels]}`}
            >
              {registro.profiles.nome.split(' ')[0]}
            </div>
          ))}
          {registrosDay.length > 3 && (
            <div className="text-xs text-gray-500">
              +{registrosDay.length - 3} mais
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedDateRegistros = getRegistrosForDate(selectedDate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <CalendarDays className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Sistema de Presença
                </h1>
                <p className="text-sm text-gray-500">
                  Bem-vindo, {profile?.nome}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile?.is_admin && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Admin</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={() => navigate('/perfil')}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Perfil</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Calendário de Presença</CardTitle>
                    <CardDescription>
                      {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => navigate('/registro')}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Novo Registro</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {/* Cabeçalho dos dias da semana */}
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                    
                    {/* Dias do mês */}
                    {eachDayOfInterval({
                      start: startOfMonth(selectedDate),
                      end: endOfMonth(selectedDate),
                    }).map((date) => (
                      <div
                        key={date.toISOString()}
                        className={`border rounded-lg cursor-pointer hover:bg-gray-50 ${
                          isSameDay(date, selectedDate) ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedDate(date)}
                      >
                        {renderCalendarDay(date)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do dia selecionado */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  {format(selectedDate, 'EEEE', { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateRegistros.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum registro para este dia
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateRegistros.map((registro) => (
                      <div key={registro.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{registro.profiles.nome}</p>
                          <p className="text-sm text-gray-500">{registro.profiles.matricula}</p>
                          {registro.observacoes && (
                            <p className="text-sm text-gray-600 mt-1">{registro.observacoes}</p>
                          )}
                        </div>
                        <Badge
                          className={`${statusColors[registro.status as keyof typeof statusColors]} text-white`}
                        >
                          {statusLabels[registro.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legenda */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Legenda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${statusColors[status as keyof typeof statusColors]}`}></div>
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;