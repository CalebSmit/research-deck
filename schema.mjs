import { z } from "zod";

export const Payload = z.object({
  ticker: z.string(),
  companyName: z.string(),
  asOfDate: z.string(),                 // YYYY-MM-DD
  priceToday: z.number().optional(),
  snapshot: z.object({
    industry: z.string(),
    businessModel: z.string(),          // keep short in your GPT prompt
    marketCap: z.string().optional(),
    growthFocus: z.string()
  }),
  ratings: z.array(z.object({
    source: z.string(),
    rating: z.string(),
    target: z.number()
  })),
  positives: z.array(z.string()),
  negatives: z.array(z.string()),
  competitors: z.array(z.object({
    peer: z.string(),
    mktCap: z.number().optional(),
    pe: z.number().nullable().optional(),
    note: z.string().nullable().optional()
  })).optional(),
  risks: z.array(z.string()).optional(),
  tone: z.enum(["Bullish","Neutral","Bearish"]),
  whyTone: z.string(),
  discrepancies: z.array(z.string()).optional(),
  watch: z.array(z.string()).optional(),
  charts: z.array(z.object({
    title: z.string(),
    type: z.enum(["bar","line","candlestick"]).default("bar"),
    dataLabels: z.array(z.string()),
    dataValues: z.array(z.number())
  })).optional(),
  logoUrl: z.string().optional(),
  sources: z.array(z.string()).optional()
});
