'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  DollarSign,
  Heart,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface ClientInsight {
  type: 'revenue' | 'frequency' | 'loyalty' | 'retention';
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  description: string;
  icon: React.ReactNode;
}

interface ClientInsightsCardProps {
  insights: ClientInsight[];
  className?: string;
}

export function ClientInsightsCard({
  insights,
  className,
}: ClientInsightsCardProps) {
  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return <TrendingUp className="h-3 w-3" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className={`border border-gray-200 bg-white shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="lumina-heading-3 flex items-center gap-2">
          <Star className="h-5 w-5" style={{ color: '#ff7a5a' }} />
          Client Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {insights.map((insight, index) => (
            <div key={index} className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {insight.icon}
                  <span className="text-lumina-primary text-sm font-medium">
                    {insight.title}
                  </span>
                </div>
                {insight.change && (
                  <div
                    className={`flex items-center gap-1 text-xs ${getChangeColor(insight.change.type)}`}
                  >
                    {getChangeIcon(insight.change.type)}
                    {insight.change.type === 'increase' ? '+' : ''}
                    {insight.change.value}%
                  </div>
                )}
              </div>

              <div className="text-lumina-primary mb-1 text-xl font-bold">
                {typeof insight.value === 'number'
                  ? insight.value.toLocaleString()
                  : insight.value}
              </div>

              <div className="text-xs" style={{ color: '#808285' }}>
                {insight.description}
                {insight.change && (
                  <span className="ml-1">• {insight.change.period}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <Heart className="mr-1 h-3 w-3" />
              High Value Client
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Calendar className="mr-1 h-3 w-3" />
              Regular Visitor
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Punctual
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Example usage component
export function ClientInsightsExample() {
  const sampleInsights: ClientInsight[] = [
    {
      type: 'revenue',
      title: 'Lifetime Value',
      value: '$2,450',
      change: { value: 15, type: 'increase', period: 'vs last quarter' },
      description: 'Total revenue generated',
      icon: <DollarSign className="h-4 w-4" style={{ color: '#ff7a5a' }} />,
    },
    {
      type: 'frequency',
      title: 'Visit Frequency',
      value: '2.3x/month',
      change: { value: 8, type: 'increase', period: 'vs last month' },
      description: 'Average visits per month',
      icon: <Calendar className="h-4 w-4" style={{ color: '#ff7a5a' }} />,
    },
    {
      type: 'loyalty',
      title: 'Loyalty Score',
      value: '9.2/10',
      change: { value: 5, type: 'increase', period: 'this quarter' },
      description: 'Based on retention & referrals',
      icon: <Heart className="h-4 w-4" style={{ color: '#ff7a5a' }} />,
    },
    {
      type: 'retention',
      title: 'Retention Rate',
      value: '95%',
      description: 'Likelihood to return',
      icon: <TrendingUp className="h-4 w-4" style={{ color: '#ff7a5a' }} />,
    },
  ];

  return <ClientInsightsCard insights={sampleInsights} />;
}
