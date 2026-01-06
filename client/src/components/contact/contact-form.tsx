import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Schema de validação do formulário de contato
const contactFormSchema = z.object({
  name: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres",
  }),
  email: z.string().email({
    message: "E-mail inválido",
  }),
  phone: z.string().optional(),
  subject: z.string().min(3, {
    message: "Assunto deve ter pelo menos 3 caracteres",
  }),
  message: z.string().min(10, {
    message: "Mensagem deve ter pelo menos 10 caracteres",
  }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: ContactFormValues) {
    try {
      // Enviar para API do backend (que cuida de salvar no DB e enviar para webhook N8N)
      await apiRequest("/api/contact", "POST", data);

      toast({
        title: t("contact.success"),
        description: "",
        variant: "default",
      });
      form.reset();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: t("contact.error"),
        description: "",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="modal-title">
          {t("contact.title")}
        </h2>
        <p className="modal-subtitle">{t("contact.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <label className="label-medsync">{t("contact.name")}</label>
                  <FormControl>
                    <input className="input-medsync" placeholder={t("contact.name")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <label className="label-medsync">{t("contact.email")}</label>
                  <FormControl>
                    <input className="input-medsync" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <label className="label-medsync">{t("contact.subject")}</label>
                  <FormControl>
                    <input className="input-medsync" placeholder={t("contact.subject")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <label className="label-medsync">{t("contact.message")}</label>
                  <FormControl>
                    <textarea
                      placeholder={t("contact.message")}
                      className="input-medsync min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button type="submit" className="btn-medsync-light w-full" disabled={isSubmitting}>
              {isSubmitting ? t("common.sending") : t("contact.send")}
            </button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
