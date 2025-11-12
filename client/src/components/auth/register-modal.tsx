ssName="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">✨ Benefícios Exclusivos</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Médicos ilimitados na clínica
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Integração com sistemas existentes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Suporte técnico dedicado 24/7
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Treinamento da equipe incluso
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Relatórios avançados e analytics
            </li>
          </ul>
        </div>

        {/* Processo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Como funciona?</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
              <span>Entre em contato conosco pelo WhatsApp ou formulário</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
              <span>Nossa equipe agenda uma reunião para entender suas necessidades</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
              <span>Criamos uma proposta personalizada com preço e cronograma</span>
            </div>
          </div>
        </div>

        {/* Opções de contato */}
        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-gray-900 text-center">💬 Entre em contato agora:</h3>
          
          {/* WhatsApp */}
          <button
            onClick={() => openSupport("Olá! Tenho interesse no Plano CLÍNICA do MedSync e gostaria de saber mais informações.", "sales")}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📱</span>
            Falar via WhatsApp
          </button>

          {/* Formulário de contato */}
          <button
            onClick={() => {
              toast({
                title: "Formulário em breve!",
                description: "Use o WhatsApp para contato imediato ou envie email para contato@medsync.com.br",
              });
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <span className="text-xl">📧</span>
            Formulário de Contato
          </button>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="button"
            onClick={() => setCurrentStep('pricing')}
            className="flex-1 font-semibold py-3 px-8 rounded-lg transition-colors duration-200 bg-accent hover:bg-gray-300 text-white flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Planos
          </button>
        </div>
      </div>
    );
  }

  // Etapa de pagamento removida - agora redirecionamos diretamente para Checkout Session

  // Tela de boas-vindas para trial do plano START
  if (currentStep === 'trial-welcome') {
    return (
      <div className="text-center px-4 py-6">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Título principal */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          🎉 Bem-vindo ao MedSync!
        </h2>

        {/* Mensagem de boas-vindas */}
        <div className="space-y-4 mb-6">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Seu período de teste <strong>gratuito de 15 dias</strong> está ativo!
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              O que você pode fazer agora:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
              <li>✓ Criar pedidos cirúrgicos com IA</li>
              <li>✓ Gerar laudos automatizados</li>
              <li>✓ Usar OCR para cadastro de pacientes</li>
              <li>✓ Acessar relatórios e controle financeiro</li>
              <li>✓ Receber suporte especializado</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                Sem compromisso
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Teste todas as funcionalidades sem cartão de crédito. 
              Você decide se quer continuar no final do período.
            </p>
          </div>
        </div>

        {/* Botão para acessar o dashboard */}
        <button 
          type="button"
          onClick={() => {
            console.log('🎯 Redirecionando para dashboard');
            toast({
              title: "Bem-vindo ao MedSync!",
              description: "Sua conta foi criada com sucesso. Aproveite seu trial gratuito!",
            });
            
            // Invalidar cache do usuário e redirecionar
            queryClient.invalidateQueries({ queryKey: ['/api/user'] });
            setLocation('/welcome');
          }}
          className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg"
        >
          Começar a Usar o MedSync
        </button>

        {/* Botão para voltar */}
        <button 
          type="button"
          onClick={() => setCurrentStep('pricing')}
          className="mt-4 w-full py-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
          disabled={registerWithPlanMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Planos
        </button>
      </div>
    );
  }

  // Tela de erro
  if (currentStep === 'error') {
    return (
      <div className="text-center px-4 py-6">
        {/* Ícone de erro */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Ops! Usuário já existe
        </h2>

        {/* Mensagem */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Já existe uma conta cadastrada com esses dados.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Se você já tem uma conta, faça login para acessar o sistema.
              Se esqueceu sua senha, use a opção "Esqueci minha senha".
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="space-y-3">
          <button 
            type="button"
            onClick={onSwitchToLogin}
            className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-lg"
          >
            Fazer Login
          </button>

          <button 
            type="button"
            onClick={() => setCurrentStep('form')}
            className="w-full border border-gray-300 hover:bg-gray-100 py-2 rounded-lg transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Fallback: retornar ao formulário se currentStep não for reconhecido
  return (
    <div>
      <ProgressIndicator />
      <RegisterForm 
        onSubmit={handleFormSubmit}
        onSwitchToLogin={onSwitchToLogin}
        isLoading={isLoading}
        validationErrors={validationErrors}
        onFieldValidation={onFieldValidation}
        defaultValues={preloadedFormData || formData || undefined}
      />
    </div>
  );
}
