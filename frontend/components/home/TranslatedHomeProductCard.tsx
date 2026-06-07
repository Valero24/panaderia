"use client";

import { memo, type ComponentProps, type ReactNode } from "react";

import PublicProductCard from "@/components/public-product-card";
import TranslatedText from "@/components/TranslatedText";
import { useTranslation } from "@/context/LanguageContext";
import { getDynamicText, type TranslatableEntity } from "@/lib/dynamic-translations";

type TranslatedHomeProductCardProps = Omit<
  ComponentProps<typeof PublicProductCard>,
  "title" | "description" | "location" | "trackingLocation"
> & {
  item: TranslatableEntity;
  titleField?: string;
  descriptionField?: string;
  locationField?: string;
  locationFallback?: string;
  descriptionFallback?: ReactNode;
};

function TranslatedHomeProductCard({
  item,
  titleField = "title",
  descriptionField,
  locationField,
  locationFallback = "Cartagena",
  descriptionFallback,
  ...props
}: TranslatedHomeProductCardProps) {
  const { language } = useTranslation();
  const title = getDynamicText(item, titleField, language);
  const description = descriptionField
    ? getDynamicText(item, descriptionField, language)
    : "";
  const location = locationField
    ? getDynamicText(item, locationField, language, locationFallback)
    : locationFallback;

  return (
    <PublicProductCard
      {...props}
      title={title}
      description={description || descriptionFallback}
      location={location || locationFallback}
      trackingLocation="home_product_card"
    />
  );
}

export default memo(TranslatedHomeProductCard);

export function ValidationAssistedText() {
  return <TranslatedText k="shared.validationAssisted" />;
}
