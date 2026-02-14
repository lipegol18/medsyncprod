import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreateOrder from "@/pages/create-order";
import Patients from "@/pages/patients";
import Orders from "@/pages/orders";
import OrderDetails from "@/pages/order-details";
import OpmeCatalog from "@/pages/opme-catalog";
import SurgeryAppointments from "@/pages/surgery-appointments";
import Reports from "@/pages/reports";
import Hospitals from "@/pages/hospitals";
import Users from "@/pages/users";
import Roles from "@/pages/roles";
import Suppliers from "@/pages/suppliers";
import Procedures from "@/pages/procedures";
import InsuranceProviders from "@/pages/admin/insurance-providers";
import InsurancePlans from "@/pages/admin/insurance-plans";
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import Notifications from "@/pages/notifications";
import ContactPage from "@/pages/contact-page";
import LgpdPage from "@/pages/lgpd";
import ContactMessages from "@/pages/admin/contact-messages";
import ManufacturerDemo from "@/pages/manufacturer-demo";
import FontDemo from "@/pages/font-demo";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import StripeTest from "@/pages/stripe-test";
import LogoTest from "@/pages/logo-test";
import OcrValidator from "@/pages/admin/ocr-validator";

import OpmeMaterials from "@/pages/admin/opme-materials";
import CidCodes from "@/pages/admin/cid-codes";
import SurgicalProcedures from "@/pages/admin/surgical-procedures";
import SurgicalApproaches from "@/pages/admin/surgical-approaches";
import ProcedureAssociations from "@/pages/admin/procedure-associations";
import AdminSubscriptionPlans from "@/pages/admin/subscription-plans";
import AdminDiscountCodes from "@/pages/admin/discount-codes";
import ImportStripeCodes from "@/pages/admin/import-stripe-codes";
import AnatomicalRegions from "@/pages/admin/anatomical-regions";

import { useEffect } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { ThemeProvider } from "@/components/theme-provider";
import { ConsentProvider } from "@/components/consent-provider";
import { useNavigationTracker } from "@/hooks/use-navigation-tracker";
import { OnboardingProvider } from "@/features/onboarding";

function Router() {
  // Initialize navigation tracking
  useNavigationTracker();
  
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <ProtectedRoute path="/welcome" component={Home} />
      <ProtectedRoute path="/create-order" component={CreateOrder} />
      <ProtectedRoute path="/orders/create/:id" component={CreateOrder} />
      <ProtectedRoute path="/orders" component={Orders} />
      <ProtectedRoute path="/order/:id" component={OrderDetails} />
      <ProtectedRoute path="/patients" component={Patients} />
      <ProtectedRoute path="/opme-catalog" component={OpmeCatalog} />
      <ProtectedRoute path="/surgery-appointments" component={SurgeryAppointments} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/hospitals" component={Hospitals} />
      <ProtectedRoute path="/suppliers" component={Suppliers} />
      <ProtectedRoute path="/procedures" component={Procedures} />
      <ProtectedRoute path="/admin/insurance-providers" component={InsuranceProviders} />
      <ProtectedRoute path="/admin/insurance-plans" component={InsurancePlans} />
      <ProtectedRoute path="/users" component={Users} />
      <ProtectedRoute path="/roles" component={Roles} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/admin/contact-messages" component={ContactMessages} />

      <ProtectedRoute path="/admin/opme-materials" component={OpmeMaterials} />
      <ProtectedRoute path="/admin/cid-codes" component={CidCodes} />
      <ProtectedRoute path="/admin/surgical-procedures" component={SurgicalProcedures} />
      <ProtectedRoute path="/admin/surgical-approaches" component={SurgicalApproaches} />
      <ProtectedRoute path="/admin/procedure-associations" component={ProcedureAssociations} />
      <ProtectedRoute path="/admin/subscription-plans" component={AdminSubscriptionPlans} />
      <ProtectedRoute path="/admin/discount-codes" component={AdminDiscountCodes} />
      <ProtectedRoute path="/admin/import-stripe-codes" component={ImportStripeCodes} />
      <ProtectedRoute path="/admin/anatomical-regions" component={AnatomicalRegions} />
      <ProtectedRoute path="/manufacturer-demo" component={ManufacturerDemo} />
      <ProtectedRoute path="/font-demo" component={FontDemo} />
      <ProtectedRoute path="/logo-test" component={LogoTest} />
      <ProtectedRoute path="/admin/ocr-validator" component={OcrValidator} />
      
      {/* Checkout success/cancel pages - não precisam de autenticação */}
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/checkout/cancel" component={CheckoutCancel} />
      
      <ProtectedRoute path="/stripe-test" component={StripeTest} />

      <Route path="/auth" component={AuthPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/lgpd" component={LgpdPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Set document title
    document.title = "MedSync - Sistema para Ortopedistas";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="medsync-theme-v2">
        <TooltipProvider>
          <AuthProvider>
            <OnboardingProvider>
              <ConsentProvider>
                <Router />
              </ConsentProvider>
            </OnboardingProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
