import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
// Importar o logo
import MedSyncLogo from "../assets/medsync-logo-new.png";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TranslatedText } from "@/components/ui/translated-text";
import { insertUserSchema } from "@shared/schema";
import { validations } from "@/lib/validations";
import { ArrowLeft, AlertCircle, CheckCircle2, Check, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Schemas for form validation
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Por favor confirme sua senha"),
  roleId: z.number().min(1, "Por favor selecione uma função"),
  phone: validations.phone.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Check for token in URL for password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setActiveTab('reset-password');
    }
  }, []);

  // Form configurations
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      phone: "+55",
      crm: undefined,
      roleId: 0,
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Query for roles using public endpoint
  const rolesQuery = useQuery({
    queryKey: ['/api/roles/public'],
    queryFn: async () => {
      const res = await fetch('/api/roles/public');
      if (!res.ok) {
        throw new Error('Failed to fetch roles');
      }
      return res.json();
    },
    enabled: activeTab === 'register',
  });

  // Set "Médico" as default when roles are loaded
  useEffect(() => {
    if (rolesQuery.data) {
      const medicoRole = rolesQuery.data.find((role: any) => role.name === 'Médico');
      if (medicoRole && registerForm.watch('roleId') === 0) {
        registerForm.setValue('roleId', medicoRole.id);
      }
    }
  }, [rolesQuery.data, registerForm]);

  // Usando as mutações do hook de autenticação
  // loginMutation e registerMutation já vêm do useAuth()

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send reset email");
      return response.json();
    },
    onSuccess: () => {
      setResetEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Please check your email for reset instructions.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormValues) => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, token }),
      });
      if (!response.ok) throw new Error("Password reset failed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
      setActiveTab("login");
      resetPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form handlers  
  const onLoginSubmit = (data: LoginFormValues) => {
    console.log("🔐 Frontend - Submetendo login");
    loginMutation.mutate({ 
      username: data.username, 
      password: data.password,
      remember: data.remember 
    }, {
      onSuccess: () => {
        console.log("🔐 Frontend - Login success, aguardando estabilização...");
        // Aguardar um pouco para garantir que a sessão foi estabelecida
        setTimeout(() => {
          console.log("🔐 Frontend - Redirecionando para home");
          setLocation("/");
        }, 100);
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
    setActiveTab("login");
  };

  const onForgotPasswordSubmit = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data);
  };

  const onResetPasswordSubmit = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <div className="h-screen bg-[#1a2332] p-4 overflow-hidden flex flex-col">
      {/* Header space */}
      <div className="mb-4 pt-4">
      </div>

      {/* Main content - 3 column layout */}
      <div className="flex-1 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
        
        {/* Left column - What is MedSync */}
        <div className="space-y-3 overflow-y-auto">
          <Card className="bg-[#243447] border border-blue-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-white text-base">
                <span className="text-pink-400 mr-2">🚀</span>
                O que é o MedSync?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-blue-200 pt-0">
              <p className="text-xs leading-relaxed">
                O MedSync é um sistema inteligente que automatiza pedidos cirúrgicos, 
                organiza toda a documentação, integra convênios e hospitais, e acelera 
                a aprovação de cirurgias com tecnologia de ponta.
              </p>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Ideal para médicos cirurgiões que desejam ganhar tempo, evitar 
                    glosas e aumentar sua produtividade.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Indicado para cirurgiões e clínicas que buscam eficiência e 
                    rastreabilidade nos processos cirúrgicos.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#243447] border border-blue-800 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-white text-base">
                <span className="text-pink-400 mr-2">🎯</span>
                Por que usar o MedSync?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-blue-200 pt-0">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Economia de tempo: fluxos guiados e preenchimento automático.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Redução de glosas e negativas: preenchimento técnico, testado 
                    previamente e baseado em normas da tabela CBHPM.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Produção otimizada: mais cirurgias realizadas, mais receita para 
                    você e sua equipe.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Segurança e rastreabilidade: cada pedido com histórico completo e backup.
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span className="text-xs">
                    Organização centralizada: exames, laudos, documentos e pedidos 
                    em um só lugar.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center column - Login form */}
        <div className="flex justify-center overflow-y-auto">
          <Card className="w-full max-w-md bg-[#243447] border border-blue-800 shadow-lg h-fit">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-white text-lg mb-1">
                Bem-vindo ao MedSync
              </CardTitle>
              <CardDescription className="text-blue-300 text-sm">
                Faça login para acessar o sistema ou crie uma nova conta.
              </CardDescription>
            </CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pb-2">
                <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-blue-900/30 border border-blue-800">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 text-sm font-medium"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white py-2 text-sm font-medium"
                  >
                    Registrar
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="login" className="px-4 pb-4 pt-0 space-y-3">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white">
                      Usuário
                    </Label>
                    <Input
                      {...loginForm.register('username')}
                      id="username"
                      placeholder="Medico08"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400"
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-red-400 text-sm">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-white">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('forgot-password')}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <Input
                      {...loginForm.register('password')}
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-red-400 text-sm">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        {...loginForm.register('remember')}
                        id="remember"
                        className="border-blue-700 data-[state=checked]:bg-blue-600"
                      />
                      <Label htmlFor="remember" className="text-sm text-gray-300">
                        Lembrar de mim
                      </Label>
                    </div>
                    <span className="text-blue-400 text-sm cursor-pointer hover:text-blue-300">
                      Fale Conosco
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="px-4 pb-4 pt-0 space-y-2">
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-2">
                  {/* Nome Completo */}
                  <div className="space-y-1">
                    <Label htmlFor="reg-name" className="text-white text-sm">
                      Nome Completo
                    </Label>
                    <Input
                      {...registerForm.register('name')}
                      id="reg-name"
                      placeholder="Digite seu nome completo"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                    />
                    {registerForm.formState.errors.name && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label htmlFor="reg-email" className="text-white text-sm">
                      Email
                    </Label>
                    <Input
                      {...registerForm.register('email')}
                      id="reg-email"
                      type="email"
                      placeholder="Digite seu email"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Usuário */}
                  <div className="space-y-1">
                    <Label htmlFor="reg-username" className="text-white text-sm">
                      Usuário
                    </Label>
                    <Input
                      {...registerForm.register('username')}
                      id="reg-username"
                      placeholder="Digite seu usuário"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>

                  {/* Telefone Celular */}
                  <div className="space-y-1">
                    <Label htmlFor="reg-phone" className="text-white text-sm">
                      Telefone Celular
                    </Label>
                    <Input
                      {...registerForm.register('phone')}
                      id="reg-phone"
                      type="tel"
                      placeholder="+5521999999999"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                      onChange={(e) => {
                        let value = e.target.value;
                        // Garantir que sempre comece com +55
                        if (!value.startsWith('+55')) {
                          value = '+55' + value.replace(/\D/g, '').substring(2);
                        }
                        // Limitar a 15 caracteres (+55 + 11 dígitos)
                        if (value.length > 15) {
                          value = value.substring(0, 15);
                        }
                        e.target.value = value;
                        registerForm.setValue('phone', value);
                      }}
                    />
                    {registerForm.formState.errors.phone && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  {/* Terceira linha: Senhas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="reg-password" className="text-white text-sm">
                        Senha
                      </Label>
                      <Input
                        {...registerForm.register('password')}
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-red-400 text-xs">{registerForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reg-confirm-password" className="text-white text-sm">
                        Confirmar Senha
                      </Label>
                      <Input
                        {...registerForm.register('confirmPassword')}
                        id="reg-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-red-400 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Função */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="reg-role" className="text-white text-sm">
                        Função
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-blue-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a2332] border-blue-800 text-white max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-blue-300">Descrição das Funções:</p>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-blue-400 font-medium">Médico:</span> Acesso a pacientes e pedidos médicos</p>
                                <p><span className="text-blue-400 font-medium">Assistente Básico:</span> Assistente administrativo para tarefas básicas</p>
                                <p><span className="text-blue-400 font-medium">Assistente Administrativo:</span> Funções administrativas avançadas</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select 
                      value={registerForm.watch('roleId')?.toString() || ""} 
                      onValueChange={(value) => registerForm.setValue('roleId', parseInt(value))}
                    >
                      <SelectTrigger className="bg-[#2a3441] border-blue-700 text-white h-8 text-sm">
                        <SelectValue placeholder="Selecione sua função" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#2a3441] border-blue-700">
                        {rolesQuery.data?.map((role: any) => (
                          <SelectItem key={role.id} value={role.id.toString()} className="text-white focus:bg-blue-600">
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {registerForm.formState.errors.roleId && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.roleId.message}</p>
                    )}
                  </div>

                  {/* CRM */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="reg-crm" className="text-white text-sm">
                        CRM <span className="text-white text-xs">Não incluir os caracteres 52 do CRM no campo abaixo</span>
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-blue-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a2332] border-blue-800 text-white max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-blue-300">Informações sobre CRM:</p>
                              <div className="space-y-1 text-sm">
                                <p>Seu CRM será validado pela API da CREMERJ.</p>
                                <p>Insira na mesma formatação encontrada em <a href="https://portal.cremerj.org.br/busca-medicos" target="_blank" className="text-blue-400 underline">https://portal.cremerj.org.br/busca-medicos</a>.</p>
                                <p className="text-yellow-300 font-medium">Use somente números</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      {...registerForm.register('crm', {
                        setValueAs: (value) => value ? parseInt(value, 10) : undefined,
                      })}
                      id="reg-crm"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Digite o número do CRM"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400 h-8 text-sm"
                      onChange={(e) => {
                        // Only allow numeric characters
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        e.target.value = value;
                        registerForm.setValue('crm', value ? parseInt(value, 10) : undefined);
                      }}
                    />
                    {registerForm.formState.errors.crm && (
                      <p className="text-red-400 text-xs">{registerForm.formState.errors.crm.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 mt-3 text-sm"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Registrando..." : "Registrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="forgot-password" className="px-6 pb-6 pt-0 space-y-4">
                {!resetEmailSent ? (
                  <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-white">
                        Email
                      </Label>
                      <Input
                        {...forgotPasswordForm.register('email')}
                        id="forgot-email"
                        type="email"
                        placeholder="Digite seu email"
                        className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400"
                      />
                      {forgotPasswordForm.formState.errors.email && (
                        <p className="text-red-400 text-sm">{forgotPasswordForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar Link de Redefinição"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="w-full text-sm text-blue-400 hover:text-blue-300"
                    >
                      Voltar ao Login
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Email Enviado!
                    </h3>
                    <p className="text-gray-300">
                      Verifique seu email para o link de redefinição de senha.
                    </p>
                    <button
                      onClick={() => setActiveTab('login')}
                      className="w-full text-sm text-blue-400 hover:text-blue-300"
                    >
                      Voltar ao Login
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="reset-password" className="px-6 pb-6 pt-0 space-y-4">
                <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-password" className="text-white">
                      Nova Senha
                    </Label>
                    <Input
                      {...resetPasswordForm.register('password')}
                      id="reset-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400"
                    />
                    {resetPasswordForm.formState.errors.password && (
                      <p className="text-red-400 text-sm">{resetPasswordForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reset-confirm-password" className="text-white">
                      Confirmar Nova Senha
                    </Label>
                    <Input
                      {...resetPasswordForm.register('confirmPassword')}
                      id="reset-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-[#2a3441] border-blue-700 text-white placeholder:text-gray-400"
                    />
                    {resetPasswordForm.formState.errors.confirmPassword && (
                      <p className="text-red-400 text-sm">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right column - AI Integration */}
        <div className="flex justify-center overflow-y-auto">
          <Card className="w-full bg-[#243447] border border-blue-800 shadow-lg h-fit">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center text-white text-base mb-1">
                <span className="text-pink-400 mr-2">🧠</span>
                Inteligência Médica Integrada
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-200 text-center space-y-3 pt-0">
              <p className="text-blue-300 text-sm italic">
                "A Revolução nas <span className="text-blue-400">Autorizações Cirúrgicas.</span><br />
                <span className="text-blue-400">Menos papel. Mais cirurgia.</span>"
              </p>
              <p className="text-xs leading-relaxed">
                O MedSync utiliza algoritmos treinados com base em milhares de protocolos 
                ortopédicos e cirúrgicos para sugerir os procedimentos mais adequados — tudo 
                de forma segura e editável.
              </p>
              <div className="flex justify-center mt-4">
                <img 
                  src={MedSyncLogo} 
                  alt="MedSync Logo" 
                  className="h-52" 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}