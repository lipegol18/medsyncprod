import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { Layout } from "@/components/layout/layout";
import { useTheme } from "@/components/theme-provider";
import { CrmRequiredModal } from "@/components/crm-required-modal";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const [showCrmModal, setShowCrmModal] = useState(false);

  useEffect(() => {
    if (user && user.roleId === 2 && !user.crmUrl) {
      setShowCrmModal(true);
    } else {
      setShowCrmModal(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className={`flex items-center justify-center min-h-screen ${theme === 'light' ? 'bg-white' : ''}`}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  const handleCrmSuccess = () => {
    setShowCrmModal(false);
  };

  return (
    <Route path={path}>
      <Layout includeHeader={true}>
        {showCrmModal && user.roleId === 2 && (
          <CrmRequiredModal 
            isOpen={showCrmModal} 
            userId={user.id} 
            onSuccess={handleCrmSuccess} 
          />
        )}
        <Component />
      </Layout>
    </Route>
  );
}