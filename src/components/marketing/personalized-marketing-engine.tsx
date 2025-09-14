'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Mail, 
  Users, 
  Sparkles,
  RefreshCw,
  Target,
  TrendingUp,
  MessageSquare,
  Calendar,
  Zap
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

interface PersonalizedContent {
  content: string;
  contentType: string;
}

export function PersonalizedMarketingEngine() {
  const [user] = useAuthState(auth);
  const [content, setContent] = useState<PersonalizedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('welcome');

  const contentTypes = [
    { id: 'welcome', label: 'Welcome Message', icon: Mail, description: 'Personalized onboarding content' },
    { id: 'feature_recommendation', label: 'Feature Recommendations', icon: Target, description: 'AI-suggested features based on usage' },
    { id: 'space_suggestion', label: 'Space Suggestions', icon: Users, description: 'Recommended spaces and teams' },
    { id: 'engagement_boost', label: 'Engagement Boost', icon: TrendingUp, description: 'Content to increase user activity' },
  ];

  const generateContent = async (contentType: string) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/bigquery/personalized-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          contentType,
          userData: {
            name: user.displayName || 'User',
            email: user.email,
            role: 'user', // This would come from your user data
            lastActive: new Date().toISOString(),
            spacesCount: 0, // This would come from your Firebase data
            meetingsAttended: 0, // This would come from your Firebase data
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setContent(prev => [...prev, {
          content: data.content,
          contentType: data.contentType
        }]);
      } else {
        setError(data.error || 'Failed to generate content');
      }
    } catch (err) {
      setError('Failed to generate personalized content');
    } finally {
      setLoading(false);
    }
  };

  const clearContent = () => {
    setContent([]);
  };

  const getContentTypeInfo = (type: string) => {
    return contentTypes.find(ct => ct.id === type) || contentTypes[0];
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'welcome': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      case 'feature_recommendation': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'space_suggestion': return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200';
      case 'engagement_boost': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Personalized Marketing Engine
          </CardTitle>
          <CardDescription>Generating personalized content...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-600" />
            Personalized Marketing Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => generateContent(selectedType)} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Personalized Marketing Engine
            </CardTitle>
            <CardDescription>
              AI-powered personalized content generation for enhanced user engagement
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={clearContent} variant="outline" size="sm">
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Type Selection */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            Generate Content
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contentTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedType === type.id ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardContent className="p-4 text-center">
                    <IconComponent className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h5 className="font-semibold text-sm mb-1">{type.label}</h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{type.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => generateContent(selectedType)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {getContentTypeInfo(selectedType).label}
            </Button>
            <Button 
              onClick={() => generateContent(selectedType)}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Generated Content */}
        {content.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Generated Content
            </h4>
            {content.map((item, index) => {
              const typeInfo = getContentTypeInfo(item.contentType);
              const IconComponent = typeInfo.icon;
              return (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5 text-purple-600" />
                          <h5 className="font-semibold">{typeInfo.label}</h5>
                        </div>
                        <Badge className={getContentTypeColor(item.contentType)}>
                          {item.contentType.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <h6 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                              AI-Generated Content
                            </h6>
                            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Generated at: {new Date().toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span>AI-Powered</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No content generated yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Select a content type and click "Generate" to create personalized content
            </p>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-600" />
            Usage Statistics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {content.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Generated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {contentTypes.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Content Types</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {content.filter(c => c.contentType === 'welcome').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {content.filter(c => c.contentType === 'engagement_boost').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Engagement Content</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
