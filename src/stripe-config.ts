export interface Product {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription' | 'payment';
}

export const products: Product[] = [
  {
    id: 'prod_SRiYnv189MOTZL',
    priceId: 'price_1RWp7IKBPYVpbhiDmxB86OAY',
    name: 'Growth Plan',
    description: '8,000 minutes/month. Up to 10 agents. Screen sharing, embeddable widget.',
    mode: 'subscription'
  },
  {
    id: 'prod_SRiXOQSGtQp2bn',
    priceId: 'price_1RWp6bKBPYVpbhiD4E9ToX8B',
    name: 'Starter Plan',
    description: '1,500 minutes/month. Up to 3 agents. Screen sharing and Slack alerts. Overage: $0.07/min.',
    mode: 'subscription'
  },
  {
    id: 'prod_SRiWHTg3ST6xax',
    priceId: 'price_1RWp5nKBPYVpbhiDV2v8HxwJ',
    name: 'Free Plan',
    description: '100 minutes per month included. 1 agent. Voice-only. Basic analytics. No overage.',
    mode: 'subscription'
  }
];