"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";
import { useTranslation } from "@/context/LanguageContext";
import { trackContact, trackLead } from "@/lib/analytics";

const contactItems = [
  {
    icon: Phone,
    labelKey: "contact.phone",
    value: "+57 300 000 0000",
  },
  {
    icon: Mail,
    labelKey: "contact.email",
    value: "reservations@cartagenatailoredtravel.com",
  },
  {
    icon: MessageCircle,
    labelKey: "checkout.whatsapp",
    valueKey: "contact.assistedAttention",
  },
  {
    icon: MapPin,
    labelKey: "contact.location",
    value: "Cartagena, Colombia",
  },
];

const interestOptions = [
  { value: "alojamiento", labelKey: "contact.interest.stay" },
  { value: "experiencia", labelKey: "contact.interest.experience" },
  { value: "paquete", labelKey: "contact.interest.package" },
  { value: "evento especial", labelKey: "contact.interest.event" },
  { value: "otro", labelKey: "contact.interest.other" },
];

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ContactoPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    subject: "",
    message: "",
    interestType: "alojamiento",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");

  const validationMessage = useMemo(() => {
    if (!form.name.trim()) return t("contact.validation.name");
    if (!form.email.trim() || !isEmail(form.email)) {
      return t("contact.validation.email");
    }
    if (!form.whatsapp.trim()) return t("contact.validation.whatsapp");
    if (!form.subject.trim()) return t("contact.validation.subject");
    if (form.message.trim().length < 10) {
      return t("contact.validation.message");
    }

    return "";
  }, [form, t]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submitContact() {
    if (validationMessage) {
      setFeedback(validationMessage);
      return;
    }

    try {
      setLoading(true);
      setFeedback("");
      setSuccess(false);

      const res = await fetch(apiUrl("/contact"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback(data.message || t("contact.error"));
        return;
      }

      setSuccess(true);
      trackContact("contact_form");
      trackLead("contact_form", {
        interest_type: form.interestType,
      });
      setFeedback(t("contact.success"));
      setForm({
        name: "",
        email: "",
        whatsapp: "",
        subject: "",
        message: "",
        interestType: "alojamiento",
      });
    } catch (error) {
      console.error(error);
      setFeedback(t("contact.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F6F1] text-[#0D2B52]">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-16">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#B48A5A]">
            {t("contact.eyebrow")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
            {t("contact.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            {t("contact.subtitle")}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {contactItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.labelKey}
                  className="rounded-2xl border border-[#D4AF37]/15 bg-white shadow-sm"
                >
                  <CardContent className="p-5">
                    <Icon className="h-5 w-5 text-[#B48A5A]" />
                    <p className="mt-4 text-sm text-slate-500">
                      {t(item.labelKey as any)}
                    </p>
                    <p className="mt-1 font-medium">
                      {"valueKey" in item
                        ? t(item.valueKey as any)
                        : item.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="rounded-2xl border border-[#D4AF37]/20 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6 lg:p-8">
            <div>
              <h2 className="text-2xl font-semibold">
                {t("contact.speakAdvisor")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("contact.formNote")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder={t("contact.name")}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
              <Input
                type="email"
                placeholder={t("contact.email")}
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
              />
              <Input
                placeholder={t("checkout.whatsapp")}
                value={form.whatsapp}
                onChange={(event) =>
                  updateForm("whatsapp", event.target.value)
                }
              />
              <select
                value={form.interestType}
                onChange={(event) =>
                  updateForm("interestType", event.target.value)
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {interestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey as any)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              placeholder={t("contact.subject")}
              value={form.subject}
              onChange={(event) => updateForm("subject", event.target.value)}
            />

            <Textarea
              placeholder={t("contact.message")}
              value={form.message}
              onChange={(event) => updateForm("message", event.target.value)}
              className="min-h-36"
            />

            <Button
              type="button"
              onClick={submitContact}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#0D2B52] hover:bg-[#12396d]"
            >
              {loading ? (
                t("contact.sending")
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t("contact.send")}
                </>
              )}
            </Button>

            {feedback && (
              <div
                className={`rounded-xl p-4 text-sm ${
                  success
                    ? "bg-green-50 text-green-700"
                    : "bg-[#F8F6F1] text-slate-700"
                }`}
              >
                {success && <CheckCircle2 className="mb-2 h-5 w-5" />}
                {feedback}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
