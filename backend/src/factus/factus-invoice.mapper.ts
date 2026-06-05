type FactusBookingLike = {
  reservationCode?: string | null;
  invoiceNumber?: string | null;
  productName?: string | null;
  totalPrice?: number | null;
  taxesAmount?: number | null;
  discountAmount?: number | null;
  subtotalCop?: number | null;
  taxCop?: number | null;
  discountCop?: number | null;
  totalCop?: number | null;
  displayCurrency?: string | null;
  displayTotal?: number | null;
  exchangeRate?: number | null;
  exchangeRateSource?: string | null;
  exchangeRateDate?: Date | string | null;
  selectedExtras?: unknown;
  billingIdentificationNumber?: string | null;
  billingCustomerName?: string | null;
  billingEmail?: string | null;
  billingPhone?: string | null;
  billingLegalOrganizationType?: string | null;
  billingIdentificationDocumentType?: string | null;
  billingMunicipalityId?: string | null;
  billingTributeId?: string | null;
  billingAddress?: string | null;
};

type FactusConfigLike = {
  factusNumberingRangeId?: string | null;
  factusDefaultDocumentCode?: string | null;
  factusDefaultPaymentForm?: string | null;
  factusDefaultPaymentMethodCode?: string | null;
  factusDefaultUnitMeasureId?: string | null;
  factusDefaultStandardCodeId?: string | null;
  factusDefaultTributeId?: string | null;
  factusDefaultMunicipalityId?: string | null;
};

function extrasFrom(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function buildFactusInvoicePayload(
  booking: FactusBookingLike,
  config: FactusConfigLike = {}
) {
  const total = Number(booking.totalCop ?? booking.totalPrice ?? 0);
  const taxes = Number(booking.taxCop ?? booking.taxesAmount ?? 0);
  const discount = Number(booking.discountCop ?? booking.discountAmount ?? 0);
  const subtotal = Number(
    booking.subtotalCop ?? Math.max(total - taxes + discount, 0)
  );
  const displayCurrency = booking.displayCurrency || "COP";
  const hasDisplayReference = displayCurrency !== "COP";
  const visualReference = hasDisplayReference
    ? ` Valor de referencia visual: ${displayCurrency} ${Number(
        booking.displayTotal || 0
      )}. Tasa usada: ${Number(booking.exchangeRate || 1)} COP.`
    : "";

  return {
    reference_code: booking.invoiceNumber || booking.reservationCode,
    document: config.factusDefaultDocumentCode || "01",
    currency: "COP",
    subtotal,
    tax: taxes,
    discount,
    total,
    numbering_range_id: config.factusNumberingRangeId,
    observation:
      `Payload preparado en modo demo. No enviado a Factus ni DIAN. Valores fiscales en COP.${visualReference}`,
    customer: {
      identification: booking.billingIdentificationNumber,
      names: booking.billingCustomerName,
      email: booking.billingEmail,
      phone: booking.billingPhone,
      legal_organization_id: booking.billingLegalOrganizationType,
      identification_document_id: booking.billingIdentificationDocumentType,
      municipality_id:
        booking.billingMunicipalityId || config.factusDefaultMunicipalityId,
      tribute_id: booking.billingTributeId || config.factusDefaultTributeId,
      address: booking.billingAddress,
    },
    payment_details: [
      {
        payment_form: config.factusDefaultPaymentForm || "1",
        payment_method_code: config.factusDefaultPaymentMethodCode || "10",
        value: total,
        currency: "COP",
      },
    ],
    items: [
      {
        code_reference: booking.invoiceNumber || booking.reservationCode,
        name: booking.productName || "Reserva Cartagena Tailored Travel",
        quantity: 1,
        discount_rate: 0,
        price: subtotal,
        currency: "COP",
        tax_rate: taxes > 0 && subtotal > 0 ? (taxes / subtotal) * 100 : 0,
        unit_measure_id: config.factusDefaultUnitMeasureId || "70",
        standard_code_id: config.factusDefaultStandardCodeId || "1",
        is_excluded: 0,
        tribute_id: booking.billingTributeId || config.factusDefaultTributeId,
      },
      ...extrasFrom(booking.selectedExtras).map((extra: any) => ({
        code_reference: `extra-${extra.id || extra.name || "premium"}`,
        name: extra.name || "Servicio premium",
        quantity: Number(extra.quantity || 1),
        discount_rate: 0,
        price: Number(extra.unitPrice || extra.totalPrice || 0),
        currency: "COP",
        unit_measure_id: config.factusDefaultUnitMeasureId || "70",
        standard_code_id: config.factusDefaultStandardCodeId || "1",
        is_excluded: 0,
        tribute_id: booking.billingTributeId || config.factusDefaultTributeId,
      })),
    ],
  };
}
