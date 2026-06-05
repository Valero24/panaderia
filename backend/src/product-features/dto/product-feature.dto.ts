import {
  BookingType,
  ProductFeatureAppliesTo,
  ProductFeatureCategory,
} from "@prisma/client";

export type ProductFeatureActor = {
  userId?: number;
  role?: string;
  name?: string;
  email?: string;
};

export type ProductFeatureInput = {
  name?: string;
  slug?: string;
  description?: string;
  translations?: Record<string, Record<string, string>>;
  icon?: string;
  category?: ProductFeatureCategory;
  appliesTo?: ProductFeatureAppliesTo;
  active?: boolean;
};

export type ProductFeatureAssignmentInput = {
  featureId: number;
  productType: BookingType;
  productId: number;
};

export type ProductFeatureSetAssignmentsInput = {
  productType: BookingType;
  productId: number;
  featureIds: number[];
};
