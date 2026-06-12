import { EmailLocale, EmailTemplateKey, ReservationEmailContext } from "./email.types";

type TemplateRenderer = (context: ReservationEmailContext) => {
  subject: string;
  intro: string;
  detailsTitle: string;
  note: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

const statusLabels: Record<EmailLocale, Record<string, string>> = {
  es: {
    PENDING_ADVISOR: "Pendiente de asesor",
    ASSIGNED: "Asignada",
    VALIDATING: "En validacion",
    AVAILABLE: "Disponible",
    UNAVAILABLE: "No disponible",
    PAYMENT_PENDING: "Pendiente de pago",
    PAID: "Pagada",
    CONFIRMED: "Confirmada",
    CANCELLED: "Cancelada",
  },
  en: {
    PENDING_ADVISOR: "Waiting for an advisor",
    ASSIGNED: "Assigned",
    VALIDATING: "Being reviewed",
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
    PAYMENT_PENDING: "Payment pending",
    PAID: "Paid",
    CONFIRMED: "Confirmed",
    CANCELLED: "Cancelled",
  },
  fr: {
    PENDING_ADVISOR: "En attente de conseiller",
    ASSIGNED: "Assignee",
    VALIDATING: "En verification",
    AVAILABLE: "Disponible",
    UNAVAILABLE: "Non disponible",
    PAYMENT_PENDING: "Paiement en attente",
    PAID: "Payee",
    CONFIRMED: "Confirmee",
    CANCELLED: "Annulee",
  },
  pt: {
    PENDING_ADVISOR: "Pendente de assessor",
    ASSIGNED: "Atribuida",
    VALIDATING: "Em validacao",
    AVAILABLE: "Disponivel",
    UNAVAILABLE: "Indisponivel",
    PAYMENT_PENDING: "Pagamento pendente",
    PAID: "Paga",
    CONFIRMED: "Confirmada",
    CANCELLED: "Cancelada",
  },
  it: {
    PENDING_ADVISOR: "In attesa di consulente",
    ASSIGNED: "Assegnata",
    VALIDATING: "In verifica",
    AVAILABLE: "Disponibile",
    UNAVAILABLE: "Non disponibile",
    PAYMENT_PENDING: "Pagamento in sospeso",
    PAID: "Pagata",
    CONFIRMED: "Confermata",
    CANCELLED: "Annullata",
  },
};

const labels: Record<EmailLocale, Record<string, string>> = {
  es: {
    greeting: "Hola",
    product: "Producto",
    type: "Tipo",
    dates: "Fechas",
    guests: "Personas",
    status: "Estado",
    total: "Valor",
    advisor: "Asesor",
    reservationCode: "Codigo de reserva",
    contact: "Contacto",
    footer: "Gracias por viajar con nosotros.",
  },
  en: {
    greeting: "Hi",
    product: "Product",
    type: "Type",
    dates: "Dates",
    guests: "Guests",
    status: "Status",
    total: "Amount",
    advisor: "Advisor",
    reservationCode: "Reservation code",
    contact: "Contact",
    footer: "Thank you for traveling with us.",
  },
  fr: {
    greeting: "Bonjour",
    product: "Produit",
    type: "Type",
    dates: "Dates",
    guests: "Personnes",
    status: "Statut",
    total: "Montant",
    advisor: "Conseiller",
    reservationCode: "Code de reservation",
    contact: "Contact",
    footer: "Merci de voyager avec nous.",
  },
  pt: {
    greeting: "Ola",
    product: "Produto",
    type: "Tipo",
    dates: "Datas",
    guests: "Pessoas",
    status: "Estado",
    total: "Valor",
    advisor: "Assessor",
    reservationCode: "Codigo da reserva",
    contact: "Contato",
    footer: "Obrigado por viajar conosco.",
  },
  it: {
    greeting: "Ciao",
    product: "Prodotto",
    type: "Tipo",
    dates: "Date",
    guests: "Persone",
    status: "Stato",
    total: "Importo",
    advisor: "Consulente",
    reservationCode: "Codice prenotazione",
    contact: "Contatto",
    footer: "Grazie per aver viaggiato con noi.",
  },
};

const templates: Record<EmailTemplateKey, Record<EmailLocale, TemplateRenderer>> = {
  PRERESERVATION_CREATED_CUSTOMER: {
    es: (c) => ({
      subject: "Hemos recibido tu solicitud de reserva",
      intro: `Recibimos tu pre-reserva para ${c.productTitle}. Nuestro equipo revisara disponibilidad y te contactara pronto.`,
      detailsTitle: "Resumen de tu solicitud",
      note: "Importante: esta pre-reserva no confirma disponibilidad ni pago. La reserva se confirma solo cuando nuestro equipo valide disponibilidad y, si aplica, el pago sea aprobado.",
    }),
    en: (c) => ({
      subject: "We received your reservation request",
      intro: `We received your pre-reservation for ${c.productTitle}. Our team will review availability and contact you soon.`,
      detailsTitle: "Request summary",
      note: "Important: this pre-reservation does not confirm availability or payment. Your reservation is confirmed only after our team validates availability and, if applicable, payment is approved.",
    }),
    fr: (c) => ({
      subject: "Nous avons recu votre demande de reservation",
      intro: `Nous avons recu votre pre-reservation pour ${c.productTitle}. Notre equipe verifiera la disponibilite et vous contactera bientot.`,
      detailsTitle: "Resume de votre demande",
      note: "Important : cette pre-reservation ne confirme ni la disponibilite ni le paiement.",
    }),
    pt: (c) => ({
      subject: "Recebemos sua solicitacao de reserva",
      intro: `Recebemos sua pre-reserva para ${c.productTitle}. Nossa equipe verificara a disponibilidade e entrara em contato em breve.`,
      detailsTitle: "Resumo da solicitacao",
      note: "Importante: esta pre-reserva nao confirma disponibilidade nem pagamento.",
    }),
    it: (c) => ({
      subject: "Abbiamo ricevuto la tua richiesta di prenotazione",
      intro: `Abbiamo ricevuto la tua pre-prenotazione per ${c.productTitle}. Il nostro team verifichera la disponibilita e ti contattera presto.`,
      detailsTitle: "Riepilogo richiesta",
      note: "Importante: questa pre-prenotazione non conferma disponibilita o pagamento.",
    }),
  },
  PRERESERVATION_CREATED_ADMIN: {
    es: (c) => ({
      subject: "Nueva pre-reserva recibida",
      intro: `${c.customerName} envio una nueva solicitud para ${c.productTitle}.`,
      detailsTitle: "Datos de la solicitud",
      note: `Gestionar en panel: ${c.adminUrl}`,
      ctaLabel: "Abrir panel",
      ctaUrl: c.adminUrl,
    }),
    en: (c) => ({
      subject: "New pre-reservation received",
      intro: `${c.customerName} submitted a new request for ${c.productTitle}.`,
      detailsTitle: "Request details",
      note: `Manage in admin: ${c.adminUrl}`,
      ctaLabel: "Open admin",
      ctaUrl: c.adminUrl,
    }),
    fr: (c) => ({ subject: "Nouvelle pre-reservation recue", intro: `${c.customerName} a envoye une demande pour ${c.productTitle}.`, detailsTitle: "Details", note: `Gerer dans le panel: ${c.adminUrl}`, ctaLabel: "Ouvrir", ctaUrl: c.adminUrl }),
    pt: (c) => ({ subject: "Nova pre-reserva recebida", intro: `${c.customerName} enviou uma solicitacao para ${c.productTitle}.`, detailsTitle: "Detalhes", note: `Gerenciar no painel: ${c.adminUrl}`, ctaLabel: "Abrir painel", ctaUrl: c.adminUrl }),
    it: (c) => ({ subject: "Nuova pre-prenotazione ricevuta", intro: `${c.customerName} ha inviato una richiesta per ${c.productTitle}.`, detailsTitle: "Dettagli", note: `Gestisci nel pannello: ${c.adminUrl}`, ctaLabel: "Apri pannello", ctaUrl: c.adminUrl }),
  },
  PRERESERVATION_PAYMENT_LINK: {
    es: (c) => ({ subject: "Tu link de pago esta listo", intro: `Validamos tu solicitud para ${c.productTitle}. Puedes completar el pago de forma segura.`, detailsTitle: "Resumen para pago", note: "Tu reserva quedara confirmada cuando el pago sea aprobado.", ctaLabel: "Pagar reserva", ctaUrl: c.paymentLink }),
    en: (c) => ({ subject: "Your payment link is ready", intro: `We validated your request for ${c.productTitle}. You can complete payment securely.`, detailsTitle: "Payment summary", note: "Your reservation will be confirmed once payment is approved.", ctaLabel: "Pay reservation", ctaUrl: c.paymentLink }),
    fr: (c) => ({ subject: "Votre lien de paiement est pret", intro: `Nous avons valide votre demande pour ${c.productTitle}.`, detailsTitle: "Resume du paiement", note: "La reservation sera confirmee lorsque le paiement sera approuve.", ctaLabel: "Payer", ctaUrl: c.paymentLink }),
    pt: (c) => ({ subject: "Seu link de pagamento esta pronto", intro: `Validamos sua solicitacao para ${c.productTitle}.`, detailsTitle: "Resumo do pagamento", note: "A reserva sera confirmada quando o pagamento for aprovado.", ctaLabel: "Pagar", ctaUrl: c.paymentLink }),
    it: (c) => ({ subject: "Il tuo link di pagamento e pronto", intro: `Abbiamo validato la richiesta per ${c.productTitle}.`, detailsTitle: "Riepilogo pagamento", note: "La prenotazione sara confermata quando il pagamento sara approvato.", ctaLabel: "Paga", ctaUrl: c.paymentLink }),
  },
  BOOKING_CONFIRMED_CUSTOMER: {
    es: (c) => ({ subject: `Reserva confirmada ${c.reservationCode}`, intro: `Tu reserva para ${c.productTitle} esta confirmada.`, detailsTitle: "Resumen de reserva", note: "Nuestro equipo queda atento para coordinar detalles operativos, llegada y servicios adicionales." }),
    en: (c) => ({ subject: `Reservation confirmed ${c.reservationCode}`, intro: `Your reservation for ${c.productTitle} is confirmed.`, detailsTitle: "Reservation summary", note: "Our team remains available to coordinate arrival details and additional services." }),
    fr: (c) => ({ subject: `Reservation confirmee ${c.reservationCode}`, intro: `Votre reservation pour ${c.productTitle} est confirmee.`, detailsTitle: "Resume", note: "Notre equipe reste disponible pour coordonner les details." }),
    pt: (c) => ({ subject: `Reserva confirmada ${c.reservationCode}`, intro: `Sua reserva para ${c.productTitle} esta confirmada.`, detailsTitle: "Resumo", note: "Nossa equipe esta disponivel para coordenar os detalhes." }),
    it: (c) => ({ subject: `Prenotazione confermata ${c.reservationCode}`, intro: `La tua prenotazione per ${c.productTitle} e confermata.`, detailsTitle: "Riepilogo", note: "Il nostro team resta disponibile per coordinare i dettagli." }),
  },
  BOOKING_CONFIRMED_ADMIN: {
    es: (c) => ({ subject: `Reserva confirmada ${c.reservationCode}`, intro: `Se confirmo una reserva para ${c.customerName}.`, detailsTitle: "Datos de reserva", note: `Ver en panel: ${c.adminUrl}`, ctaLabel: "Abrir panel", ctaUrl: c.adminUrl }),
    en: (c) => ({ subject: `Reservation confirmed ${c.reservationCode}`, intro: `A reservation was confirmed for ${c.customerName}.`, detailsTitle: "Reservation details", note: `View in admin: ${c.adminUrl}`, ctaLabel: "Open admin", ctaUrl: c.adminUrl }),
    fr: (c) => ({ subject: `Reservation confirmee ${c.reservationCode}`, intro: `Une reservation a ete confirmee pour ${c.customerName}.`, detailsTitle: "Details", note: `Voir: ${c.adminUrl}`, ctaLabel: "Ouvrir", ctaUrl: c.adminUrl }),
    pt: (c) => ({ subject: `Reserva confirmada ${c.reservationCode}`, intro: `Uma reserva foi confirmada para ${c.customerName}.`, detailsTitle: "Detalhes", note: `Ver: ${c.adminUrl}`, ctaLabel: "Abrir", ctaUrl: c.adminUrl }),
    it: (c) => ({ subject: `Prenotazione confermata ${c.reservationCode}`, intro: `Una prenotazione e stata confermata per ${c.customerName}.`, detailsTitle: "Dettagli", note: `Vedi: ${c.adminUrl}`, ctaLabel: "Apri", ctaUrl: c.adminUrl }),
  },
  PRERESERVATION_STATUS_CHANGED: {
    es: (c) => ({ subject: "Actualizacion de tu solicitud de reserva", intro: `Tu solicitud para ${c.productTitle} cambio a estado ${c.status}.`, detailsTitle: "Resumen actualizado", note: "Si tienes preguntas, responde este correo y nuestro equipo te ayudara." }),
    en: (c) => ({ subject: "Reservation request update", intro: `Your request for ${c.productTitle} changed to ${c.status}.`, detailsTitle: "Updated summary", note: "Reply to this email if you have questions." }),
    fr: (c) => ({ subject: "Mise a jour de votre demande", intro: `Votre demande pour ${c.productTitle} est maintenant ${c.status}.`, detailsTitle: "Resume", note: "Repondez a cet email si vous avez des questions." }),
    pt: (c) => ({ subject: "Atualizacao da sua solicitacao", intro: `Sua solicitacao para ${c.productTitle} mudou para ${c.status}.`, detailsTitle: "Resumo", note: "Responda este email se tiver duvidas." }),
    it: (c) => ({ subject: "Aggiornamento richiesta", intro: `La tua richiesta per ${c.productTitle} e ora ${c.status}.`, detailsTitle: "Riepilogo", note: "Rispondi a questa email per domande." }),
  },
  PRERESERVATION_CANCELLED: {
    es: (c) => ({ subject: "Tu solicitud de reserva fue cancelada", intro: `La solicitud para ${c.productTitle} fue cancelada.`, detailsTitle: "Resumen de cancelacion", note: c.cancellationReason || "Podemos ayudarte a revisar alternativas disponibles." }),
    en: (c) => ({ subject: "Your reservation request was cancelled", intro: `The request for ${c.productTitle} was cancelled.`, detailsTitle: "Cancellation summary", note: c.cancellationReason || "We can help you review alternatives." }),
    fr: (c) => ({ subject: "Votre demande a ete annulee", intro: `La demande pour ${c.productTitle} a ete annulee.`, detailsTitle: "Resume", note: c.cancellationReason || "Nous pouvons vous aider avec des alternatives." }),
    pt: (c) => ({ subject: "Sua solicitacao foi cancelada", intro: `A solicitacao para ${c.productTitle} foi cancelada.`, detailsTitle: "Resumo", note: c.cancellationReason || "Podemos ajudar com alternativas." }),
    it: (c) => ({ subject: "La tua richiesta e stata annullata", intro: `La richiesta per ${c.productTitle} e stata annullata.`, detailsTitle: "Riepilogo", note: c.cancellationReason || "Possiamo aiutarti con alternative." }),
  },
  REVIEW_REQUEST_CUSTOMER: {
    es: (c) => ({ subject: "¿Como fue tu experiencia con Cartagena Tailored Travel?", intro: `Esperamos que hayas disfrutado ${c.productTitle}. Tu opinion nos ayuda a mejorar.`, detailsTitle: "Comparte tu opinion", note: "El enlace es privado y esta asociado a tu reserva.", ctaLabel: "Dejar resena", ctaUrl: c.reviewLink }),
    en: (c) => ({ subject: "How was your experience with Cartagena Tailored Travel?", intro: `We hope you enjoyed ${c.productTitle}. Your feedback helps us improve.`, detailsTitle: "Share your feedback", note: "This private link is associated with your reservation.", ctaLabel: "Leave a review", ctaUrl: c.reviewLink }),
    fr: (c) => ({ subject: "Comment s'est passee votre experience ?", intro: `Nous esperons que vous avez profite de ${c.productTitle}.`, detailsTitle: "Votre avis", note: "Ce lien prive est associe a votre reservation.", ctaLabel: "Laisser un avis", ctaUrl: c.reviewLink }),
    pt: (c) => ({ subject: "Como foi sua experiencia?", intro: `Esperamos que tenha aproveitado ${c.productTitle}.`, detailsTitle: "Compartilhe sua opiniao", note: "Este link privado esta associado a sua reserva.", ctaLabel: "Deixar avaliacao", ctaUrl: c.reviewLink }),
    it: (c) => ({ subject: "Com'e stata la tua esperienza?", intro: `Speriamo che tu abbia apprezzato ${c.productTitle}.`, detailsTitle: "Condividi la tua opinione", note: "Questo link privato e associato alla tua prenotazione.", ctaLabel: "Lascia recensione", ctaUrl: c.reviewLink }),
  },
};

export function normalizeEmailLocale(locale?: string | null): EmailLocale {
  const normalized = String(locale || "es").toLowerCase();
  return ["es", "en", "fr", "pt", "it"].includes(normalized)
    ? (normalized as EmailLocale)
    : "es";
}

export function emailStatusLabel(status: string, locale: EmailLocale) {
  return statusLabels[locale][status] || status;
}

export function renderEmailTemplate(
  templateKey: EmailTemplateKey,
  context: ReservationEmailContext,
  rawLocale?: string | null
) {
  const locale = normalizeEmailLocale(rawLocale);
  const copy = templates[templateKey][locale](context);
  const l = labels[locale];
  const dates = [context.startDate, context.endDate].filter(Boolean).join(" - ") || "Pendiente";
  const htmlRows = [
    [l.product, context.productTitle],
    [l.type, context.productTypeLabel],
    [l.dates, dates],
    [l.guests, context.guests],
    [l.status, context.status],
    [l.total, context.totalAmount],
    [l.advisor, context.advisorName],
    [l.reservationCode, context.reservationCode],
    [l.contact, `${context.supportEmail} ${context.supportWhatsApp}`.trim()],
  ]
    .filter(([, value]) => value && value !== "Pendiente")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#64748b">${label}</td><td style="padding:8px 12px;color:#0D2B52;font-weight:600">${value}</td></tr>`
    )
    .join("");

  const cta = copy.ctaUrl
    ? `<p style="margin:24px 0"><a href="${copy.ctaUrl}" style="background:#0D2B52;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block">${copy.ctaLabel || copy.ctaUrl}</a></p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0D2B52;line-height:1.6">
      <h1 style="margin:0 0 12px">${copy.subject}</h1>
      <p>${l.greeting} ${context.customerName},</p>
      <p>${copy.intro}</p>
      <h2 style="font-size:18px;margin-top:24px">${copy.detailsTitle}</h2>
      <table style="border-collapse:collapse;background:#F8F6F2;border-radius:10px;overflow:hidden">${htmlRows}</table>
      ${cta}
      <p>${copy.note}</p>
      <p style="margin-top:24px">${l.footer}<br /><strong>${context.companyName}</strong></p>
    </div>
  `;

  const text = [
    copy.subject,
    "",
    `${l.greeting} ${context.customerName},`,
    copy.intro,
    "",
    copy.detailsTitle,
    `${l.product}: ${context.productTitle}`,
    `${l.type}: ${context.productTypeLabel}`,
    `${l.dates}: ${dates}`,
    `${l.guests}: ${context.guests}`,
    `${l.status}: ${context.status}`,
    `${l.total}: ${context.totalAmount}`,
    `${l.advisor}: ${context.advisorName}`,
    `${l.reservationCode}: ${context.reservationCode}`,
    copy.ctaUrl ? `${copy.ctaLabel || "Link"}: ${copy.ctaUrl}` : "",
    "",
    copy.note,
    "",
    context.companyName,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: copy.subject, html, text, locale };
}
