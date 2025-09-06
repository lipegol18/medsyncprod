import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap } from "lucide-react";
import { Link } from "wouter";

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers: number;
  features: string[];
  trialDays: number;
  stripePriceId: string | null;
  isPopular: boolean;
  isActive: boolean;
}

export default function SubscriptionPlans() {
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceInCents / 100);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha o Plano Ideal para sua Prática Médica
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Simplifique suas autorizações médicas com o MedSync. 
            Todos os planos incluem suporte dedicado e atualizações gratuitas.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full p-1 shadow-lg">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" className="rounded-full px-6 py-2 bg-accent text-white">
                Mensal
              </Button>
              <Button variant="ghost" className="rounded-full px-6 py-2 text-gray-600">
                Anual
                <Badge variant="secondary" className="ml-2 text-xs">
                  20% off
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                plan.isPopular 
                  ? 'border-2 border-accent ring-4 ring-accent/20 shadow-2xl' 
                  : 'border border-gray-200 shadow-lg'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent hover:bg-accent/90 text-white px-4 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(plan.priceMonthly)}
                    </span>
                    <span className="text-gray-600 ml-2">/mês</span>
                  </div>
                  {plan.priceYearly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ou {formatPrice(plan.priceYearly)} anual
                    </p>
                  )}
                </div>

                {plan.trialDays > 0 && (
                  <Badge variant="outline" className="mt-4 mx-auto">
                    {plan.trialDays} dias grátis
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Até <span className="font-semibold">{plan.maxUsers}</span> usuário{plan.maxUsers > 1 ? 's' : ''}
                  </p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-8">
                <Link href={`/checkout?plan=${plan.id}`} className="w-full">
                  <Button 
                    className={`w-full py-3 text-base font-semibold ${
                      plan.isPopular
                        ? 'bg-accent hover:bg-accent/90 text-white'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {plan.trialDays > 0 ? 'Começar Teste Grátis' : 'Assinar Agora'}
                    <Zap className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Precisa de mais informações? Entre em contato conosco.
          </p>
          <Link href="/contact-page">
            <Button variant="outline" size="lg">
              Falar com Vendas
            </Button>
          </Link>
        </div>

        {/* Features Comparison */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Compare Todos os Recursos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Autorização Rápida</h3>
              <p className="text-gray-600 text-sm">
                Processe autorizações OPME em minutos, não horas
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">OCR Inteligente</h3>
              <p className="text-gray-600 text-sm">
                Extraia dados automaticamente de carteirinhas e documentos
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Suporte Premium</h3>
              <p className="text-gray-600 text-sm">
                Atendimento especializado para médicos brasileiros
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}