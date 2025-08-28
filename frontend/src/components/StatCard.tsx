import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

export const StatCard = ({ title, value, icon: Icon, trend, trendValue, className = "" }: StatCardProps) => (
  <Card className={cn("bg-white hover:shadow-md transition-shadow duration-200", className)}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-medium text-white">{title}</p>
          <h2 className="text-2xl font-bold mt-1 text-white">{value}</h2>
          {trend && trendValue && (
            <div className="flex items-center mt-1">
              {trend === 'up' ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={cn("text-sm", trend === 'up' ? 'text-green-500' : 'text-red-500')}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);
