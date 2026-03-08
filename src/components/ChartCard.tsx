import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}

export function ChartCard({ title, children, description, action }: ChartCardProps) {
  return (
    <Card className="theme-widget-card animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {action}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}
