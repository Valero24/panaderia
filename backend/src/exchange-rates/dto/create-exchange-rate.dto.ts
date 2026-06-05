export type CreateExchangeRateDto = {
  fromCurrency: string;
  toCurrency?: string;
  rate: number;
  source?: string;
  rateDate?: string;
};
