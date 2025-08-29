import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Settings, LogOut, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    
    // Buscar dados para todo o período visível no calendário (incluindo dias de outros meses)
    const startDate = startOfWeek(startOfMonth(currentMonth));
    const endDate = endOfWeek(endOfMonth(currentMonth));

    try {
      // Buscar registros do período
      const { data: registrosData, error: registrosError } = await supabase
        .from('registros_presenca')
        .select(`
          *,
          profiles (nome, matricula)
        `)
        .gte('data', format(startDate, 'yyyy-MM-dd'))
        .lte('data', format(endDate, 'yyyy-MM-dd'));

      if (registrosError) throw registrosError;

      // Buscar feriados do período
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Gerar todos os dias visíveis no calendário (6 semanas completas)
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const renderCalendarDay = (date: Date) => {
    const registrosDay = getRegistrosForDate(date);
    const feriado = getFeriadoForDate(date);
    const isWeekendDay = isWeekend(date);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isToday = isSameDay(date, new Date());
    const isSelected = isSameDay(date, selectedDate);

    return (
      <div 
        className={`
          relative w-full h-24 p-2 border border-gray-200 cursor-pointer transition-colors
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
          ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : 'bg-white'}
          ${isToday ? 'bg-blue-100' : ''}
        `}
        onClick={() => setSelectedDate(date)}
      >
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
          {format(date, 'd')}
        </div>
        
        {feriado && isCurrentMonth && (
          <div className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded mb-1 truncate">
            {feriado.nome}
          </div>
        )}
        
        {isWeekendDay && !feriado && isCurrentMonth && (
          <div className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded mb-1">
            FDS
          </div>
        )}

        {isCurrentMonth && (
          <div className="space-y-1">
            {registrosDay.slice(0, 2).map((registro) => (
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
            {registrosDay.length > 2 && (
              <div className="text-xs text-gray-500">
                +{registrosDay.length - 2}
              </div>
            )}
          </div>
        )}
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
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle>Calendário de Presença</CardTitle>
                      <CardDescription>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth('prev')}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                      >
                        Hoje
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateMonth('next')}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
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
                  <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                    {/* Cabeçalho dos dias da semana */}
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day) => (
                      <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                        {day}
                      </div>
                    ))}
                    
                    {/* Dias do calendário */}
                    {calendarDays.map((date) => (
                      <div key={date.toISOString()}>
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
                <div className="grid grid-cols-1 gap-2">
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