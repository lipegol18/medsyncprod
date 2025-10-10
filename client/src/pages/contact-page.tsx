import React from "react";
import { ContactForm } from "@/components/contact/contact-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useSupportContact } from "@/lib/support-contact";
import { useLocation } from "wouter";

export default function ContactPage() {
  const { t } = useTranslation();
  const [_, navigate] = useLocation();
  const { openSupport } = useSupportContact();

  const handleGoBack = () => {
    // Wouter não suporta navigate(-1), então usamos window.history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback para página inicial se não houver histórico
      navigate("/");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        {/* Botão Voltar */}
        <button 
          onClick={handleGoBack}
          className="btn-medsync-light mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back", "Voltar")}
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-4">{t("contact.title")}</h1>
            <p className="text-lg mb-6">
              {t("contact.subtitle")}
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{t("contact.whatsapp")}</h3>
                <button
                  type="button"
                  className="btn-medsync-green mt-2 flex items-center gap-2"
                  onClick={() => openSupport("Olá! Gostaria de saber mais sobre o MedSync.", "br")}
                >
                  <FaWhatsapp className="h-5 w-5" />
                  {t("contact.whatsapp.description")}
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </button>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t("contact.email")}</h3>
                <p>medsync.suporte@gmail.com</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t("common.businessHours")}</h3>
                <p>{t("common.weekdayHours")}</p>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}