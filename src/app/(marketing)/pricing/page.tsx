
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    frequency: '/ user / month',
    description: 'For small teams and individuals getting started.',
    features: [
      'Up to 3 virtual spaces',
      '10 participants per space',
      'Proximity video & audio chat',
      'Basic integrations',
      'Community support',
    ],
    cta: 'Get Started for Free',
    href: '/signup',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$15',
    frequency: '/ user / month',
    description: 'For growing teams that need more power and customization.',
    features: [
      'Unlimited virtual spaces',
      '50 participants per space',
      'Advanced space customization',
      'All integrations',
      'AI-powered suggestions',
      'Priority email support',
    ],
    cta: 'Start Pro Trial',
    href: '/signup',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    frequency: '',
    description: 'For large organizations with advanced security and support needs.',
    features: [
      'Everything in Pro, plus:',
      'Unlimited participants',
      'Single Sign-On (SSO)',
      'Advanced security & compliance',
      'Dedicated account manager',
      '24/7 premium support',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find the Perfect Plan
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Choose the plan that fits your team's needs and start building your digital headquarters today.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {pricingTiers.map((tier) => (
          <Card key={tier.name} className={`flex flex-col ${tier.popular ? 'border-primary shadow-lg' : ''}`}>
            <CardHeader className={tier.popular ? 'bg-primary/5' : ''}>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.frequency && <span className="text-muted-foreground">{tier.frequency}</span>}
              </div>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              <ul className="space-y-4">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant={tier.popular ? 'default' : 'outline'}>
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
