export interface PlatformApp {
  name: string;
  slug: string;
  route: string;
  description: string;
}

export const platformApps: PlatformApp[] = [
  {
    name: 'Finance',
    slug: 'finance',
    route: '/finance',
    description: 'Track income, expenses, and budgets',
  },
];