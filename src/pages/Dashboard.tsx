import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Settings, LogOut, Plus, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    if (!profile) return;
    
    setLoading(true);
    
    const startDate = startOfWeek(startOfMonth(currentMonth));
    const endDate = endOfWeek(endOfMonth(currentMonth));

    try {
      // Buscar apenas registros e feriados em paralelo
      const [registrosResponse, feriadosResponse] = await Promise.all([
        supabase
          .from('registros_presenca')
          .select(`
            id,
            funcionario_id,
            data,
            status,
            observacoes,
            profiles!inner (nome, matricula)
          `)
          .gte('data', format(startDate, 'yyyy-MM-dd'))
          .lte('data', format(endDate, 'yyyy-MM-dd')),
        
        supabase
          .from('feriados')
          .select('id, nome, data, tipo')
          .gte('data', format(startDate, 'yyyy-MM-dd'))
          .lte('data', format(endDate, 'yyyy-MM-dd'))
      ]);

      if (registrosResponse.error) throw registrosResponse.error;
      if (feriadosResponse.error) throw feriadosResponse.error;

      setRegistros(registrosResponse.data || []);
      setFeriados(feriadosResponse.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do calendário');
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
          relative w-full h-16 sm:h-20 md:h-24 p-1 sm:p-2 border border-gray-200 cursor-pointer transition-colors
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}
          ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : 'bg-white'}
          ${isToday ? 'bg-blue-100' : ''}
        `}
        onClick={() => setSelectedDate(date)}
      >
        <div className={`text-xs sm:text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
          {format(date, 'd')}
        </div>
        
        {feriado && isCurrentMonth && (
          <div className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded mb-1 truncate">
            <span className="hidden sm:inline">{feriado.nome}</span>
            <span className="sm:hidden">Feriado</span>
          </div>
        )}
        
        {isWeekendDay && !feriado && isCurrentMonth && (
          <div className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded mb-1">
            FDS
          </div>
        )}

        {isCurrentMonth && (
          <div className="space-y-1">
            {registrosDay.slice(0, 1).map((registro) => (
              <div
                key={registro.id}
                className={`text-xs px-1 py-0.5 rounded text-white truncate ${
                  statusColors[registro.status as keyof typeof statusColors]
                }`}
                title={`${registro.profiles.nome} - ${statusLabels[registro.status as keyof typeof statusLabels]}`}
              >
                <span className="hidden sm:inline">{registro.profiles.nome.split(' ')[0]}</span>
                <span className="sm:hidden">•</span>
              </div>
            ))}
            {registrosDay.length > 1 && (
              <div className="text-xs text-gray-500">
                +{registrosDay.length - 1}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const selectedDateRegistros = getRegistrosForDate(selectedDate);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Sistema de Presença
                </h1>
                <p className="text-sm text-gray-500">
                  Bem-vindo, {profile.nome}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-semibold text-gray-900">Presença</h1>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {profile.is_admin && (
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

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="flex flex-col space-y-2">
                {profile.is_admin && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate('/admin');
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate('/perfil');
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Perfil
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Calendário */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">Calendário de Presença</CardTitle>
                      <CardDescription>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-2">
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
                        className="text-xs sm:text-sm"
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
                    
                    <Button
                      onClick={() => navigate('/registro')}
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Novo Registro</span>
                      <span className="sm:hidden">Novo</span>
                    </Button>
                  </div>
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
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                      <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                        <span className="sm:hidden">{day}</span>
                        <span className="hidden sm:inline">
                          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][index]}
                        </span>
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
                <CardTitle className="text-lg">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </CardTitle>
                <CardDescription>
                  {format(selectedDate, 'EEEE', { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDateRegistros.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">
                    Nenhum registro para este dia
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateRegistros.map((registro) => (
                      <div key={registro.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{registro.profiles.nome}</p>
                          <p className="text-xs text-gray-500">{registro.profiles.matricula}</p>
                          {registro.observacoes && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{registro.observacoes}</p>
                          )}
                        </div>
                        <Badge
                          className={`${statusColors[registro.status as keyof typeof statusColors]} text-white text-xs ml-2 shrink-0`}
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
            <Card className="mt-4 lg:mt-6">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Legenda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${statusColors[status as keyof typeof statusColors]}`}></div>
                      <span className="text-xs sm:text-sm">{label}</span>
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