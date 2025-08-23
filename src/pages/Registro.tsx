import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Registro = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [existingRecord, setExistingRecord] = useState<any>(null);

  const statusOptions = [
    { value: 'presencial', label: 'Presencial', description: 'Trabalhando no escritório' },
    { value: 'home_office', label: 'Home Office', description: 'Trabalhando remotamente' },
    { value: 'ferias', label: 'Férias', description: 'Período de férias' },
    { value: 'folga', label: 'Folga', description: 'Dia de folga' },
    { value: 'plantao', label: 'Plantão', description: 'Plantão especial' },
    { value: 'atestado', label: 'Atestado', description: 'Atestado médico' },
    { value: 'falta', label: 'Falta', description: 'Ausência não justificada' },
  ];

  useEffect(() => {
    if (data) {
      checkExistingRecord();
    }
  }, [data]);

  const checkExistingRecord = async () => {
    if (!profile) return;

    try {
      const { data: record, error } = await supabase
        .from('registros_presenca')
        .select('*')
        .eq('funcionario_id', profile.id)
        .eq('data', data)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar registro existente:', error);
        return;
      }

      if (record) {
        setExistingRecord(record);
        setStatus(record.status);
        setObservacoes(record.observacoes || '');
      } else {
        setExistingRecord(null);
        setStatus('');
        setObservacoes('');
      }
    } catch (error) {
      console.error('Erro ao verificar registro:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const registroData = {
        funcionario_id: profile.id,
        data,
        status,
        observacoes: observacoes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('registros_presenca')
          .update(registroData)
          .eq('id', existingRecord.id);

        if (error) throw error;
        setSuccess('Registro atualizado com sucesso!');
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('registros_presenca')
          .insert([registroData]);

        if (error) throw error;
        setSuccess('Registro criado com sucesso!');
      }

      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error: any) {
      console.error('Erro ao salvar registro:', error);
      setError(error.message || 'Erro ao salvar registro');
    } finally {
      setLoading(false);
    }
  };

  const selectedStatusOption = statusOptions.find(option => option.value === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
            <div className="flex items-center space-x-4">
              <Calendar className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {existingRecord ? 'Editar Registro' : 'Novo Registro'}
                </h1>
                <p className="text-sm text-gray-500">
                  Registrar presença para {profile?.nome}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {existingRecord ? 'Editar Registro de Presença' : 'Novo Registro de Presença'}
            </CardTitle>
            <CardDescription>
              {existingRecord 
                ? 'Atualize as informações do seu registro de presença'
                : 'Registre sua presença para o dia selecionado'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  {format(new Date(data), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status do dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStatusOption && (
                  <p className="text-sm text-gray-600">
                    {selectedStatusOption.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações (Opcional)</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Adicione observações sobre este registro..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Informações adicionais sobre o dia de trabalho
                </p>
              </div>

              {existingRecord && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    Você já possui um registro para esta data. Ao salvar, o registro anterior será atualizado.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={loading || !status}
                  className="flex-1 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{existingRecord ? 'Atualizar' : 'Salvar'} Registro</span>
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Registro;