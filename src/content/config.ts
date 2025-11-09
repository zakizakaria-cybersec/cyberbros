import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string().default('CyberBros Security Team'),
    tags: z.array(z.string()),
    image: z.string().optional(),
    readTime: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const trainingCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['specialty', 'trending', 'standard']),
    badge: z.string().optional(),
    duration: z.string(),
    handsOnPercentage: z.number().min(0).max(100),
    price: z.string().default('Contact for Pricing'),
    level: z.string(),
    prerequisites: z.string(),
    featured: z.boolean().default(false),
    
    // Learning objectives
    objectives: z.array(z.string()),
    
    // Training modules
    modules: z.array(z.object({
      title: z.string(),
      description: z.string(),
      topics: z.array(z.string()),
    })),
    
    // Target audience
    audience: z.array(z.string()),
    
    // Delivery options
    deliveryOptions: z.array(z.string()),
    
    // What's included
    includes: z.array(z.string()),
    
    // SEO
    keywords: z.string().optional(),
    publishDate: z.coerce.date(),
  }),
});

export const collections = {
  blog: blogCollection,
  training: trainingCollection,
};
