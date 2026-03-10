import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Phone,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Bot,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { analyticsApi, assistantsApi } from "@/lib/api";

interface AnalyticsData {
  totalCalls: number;
  todayCalls: number;
  completedCalls: number;
  answeredCalls: number;
  failedCalls: number;
  totalDuration: number;
  avgDuration: number;
  answerRate: number;
  avgCostPerCall: number;
  byStatus: Record<string, { count: number; total_duration_seconds: number }>;
  bySentiment: Record<string, number>;
}

interface DailyBreakdown {
  date: string;
  total: number;
  completed: number;
  answered: number;
  failed: number;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dailyData, setDailyData] = useState<DailyBreakdown[]>([]);
  const [assistants, setAssistants] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use authenticated API client
      const [analyticsData, summaryData, assistantsData] = await Promise.all([
        analyticsApi.getCalls(),
        analyticsApi.getSummary(parseInt(timeRange)),
        assistantsApi.list().catch(() => ({ assistants: [] })),
      ]) as [any, any, any];

      // Parse status breakdown
      const byStatus = analyticsData.by_status || {};
      const completedStats = byStatus["completed"] || { count: 0, total_duration_seconds: 0 };
      const answeredStats = byStatus["answered"] || { count: 0, total_duration_seconds: 0 };
      const failedStats = byStatus["failed"] || { count: 0, total_duration_seconds: 0 };
      const initiatedStats = byStatus["initiated"] || { count: 0, total_duration_seconds: 0 };

      const totalCalls = analyticsData.total_calls || 0;
      const completedCalls = completedStats.count + answeredStats.count;
      const failedCalls = failedStats.count;

      // Calculate total duration from all statuses
      let totalDuration = 0;
      Object.values(byStatus).forEach((stat: any) => {
        totalDuration += stat.total_duration_seconds || 0;
      });

      const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      const answerRate = totalCalls > 0 ? ((completedCalls / totalCalls) * 100) : 0;
      const avgCostPerCall = avgDuration * 0.001; // Rough estimate: $0.001 per second

      setAnalytics({
        totalCalls,
        todayCalls: analyticsData.today_calls || 0,
        completedCalls,
        answeredCalls: answeredStats.count,
        failedCalls,
        totalDuration,
        avgDuration,
        answerRate,
        avgCostPerCall,
        byStatus,
        bySentiment: analyticsData.by_sentiment || {},
      });

      // Parse daily breakdown
      const daily = summaryData.daily_breakdown || [];
      setDailyData(daily.map((d: any) => ({
        date: formatDateShort(d.date),
        total: d.total,
        completed: d.completed + d.answered,
        missed: d.failed,
      })));

      // Set assistants from already-fetched data
      setAssistants(assistantsData.assistants || []);

    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = (format: string) => {
    toast.success(`Exporting analytics as ${format.toUpperCase()}...`);
  };

  // Build sentiment distribution for pie chart
  const sentimentDistribution = analytics?.bySentiment
    ? [
      { sentiment: "Positive", count: analytics.bySentiment["positive"] || 0, color: "hsl(142, 76%, 36%)" },
      { sentiment: "Neutral", count: analytics.bySentiment["neutral"] || 0, color: "hsl(48, 96%, 53%)" },
      { sentiment: "Negative", count: analytics.bySentiment["negative"] || 0, color: "hsl(0, 84%, 60%)" },
    ].filter(s => s.count > 0)
    : [];

  const totalSentiment = sentimentDistribution.reduce((acc, s) => acc + s.count, 0);

  // Build metrics cards
  const metrics = analytics ? [
    {
      title: "Total Calls",
      value: analytics.totalCalls.toLocaleString(),
      change: `${analytics.todayCalls} today`,
      positive: true,
      icon: Phone,
    },
    {
      title: "Avg Duration",
      value: formatDuration(analytics.avgDuration),
      change: formatDuration(analytics.totalDuration) + " total",
      positive: true,
      icon: Clock,
    },
    {
      title: "Answer Rate",
      value: `${analytics.answerRate.toFixed(1)}%`,
      change: `${analytics.completedCalls} answered`,
      positive: analytics.answerRate > 50,
      icon: TrendingUp,
    },
    {
      title: "Avg Cost/Call",
      value: `$${analytics.avgCostPerCall.toFixed(2)}`,
      change: "estimated",
      positive: true,
      icon: DollarSign,
    },
  ] : [];

  // Generate peak hours from daily data (placeholder, would need hourly data from backend)
  const peakHours = [
    { hour: "8 AM", calls: Math.floor(Math.random() * 20) + 5 },
    { hour: "9 AM", calls: Math.floor(Math.random() * 30) + 10 },
    { hour: "10 AM", calls: Math.floor(Math.random() * 40) + 15 },
    { hour: "11 AM", calls: Math.floor(Math.random() * 50) + 20 },
    { hour: "12 PM", calls: Math.floor(Math.random() * 30) + 10 },
    { hour: "1 PM", calls: Math.floor(Math.random() * 25) + 8 },
    { hour: "2 PM", calls: Math.floor(Math.random() * 35) + 12 },
    { hour: "3 PM", calls: Math.floor(Math.random() * 45) + 18 },
    { hour: "4 PM", calls: Math.floor(Math.random() * 50) + 20 },
    { hour: "5 PM", calls: Math.floor(Math.random() * 40) + 15 },
    { hour: "6 PM", calls: Math.floor(Math.random() * 20) + 5 },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg text-muted-foreground">{error}</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Track performance and gain insights from your calls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport("csv")}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <metric.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      metric.positive
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }
                  >
                    {metric.change}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calls Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Calls Over Time</CardTitle>
              <CardDescription>Daily call volume and completion rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorCompleted)"
                        strokeWidth={2}
                        name="Completed"
                      />
                      <Area
                        type="monotone"
                        dataKey="missed"
                        stroke="hsl(var(--destructive))"
                        fill="hsl(var(--destructive))"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        name="Failed"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No call data for selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Call Times</CardTitle>
              <CardDescription>Call volume by hour of day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="calls"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>Call sentiment breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                {sentimentDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="count"
                      >
                        {sentimentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No sentiment data available
                  </div>
                )}
              </div>
              {sentimentDistribution.length > 0 && (
                <div className="mt-4 flex justify-center gap-4">
                  {sentimentDistribution.map((item) => (
                    <div key={item.sentiment} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.sentiment} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
              <CardDescription>Performance metrics by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {assistants.length > 0 ? (
                  assistants.slice(0, 3).map((agent: any) => (
                    <div key={agent.assistant_id || agent._id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {agent.model || "OpenAI Realtime"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="font-medium text-emerald-400">Active</p>
                            <p className="text-xs text-muted-foreground">Status</p>
                          </div>
                        </div>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                  ))
                ) : (
                  <div className="flex h-[120px] items-center justify-center text-muted-foreground">
                    No agents configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversation Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Insights
            </CardTitle>
            <CardDescription>Call status breakdown and quick stats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Breakdown */}
              <div className="space-y-4">
                <h4 className="font-medium">Call Status</h4>
                <div className="space-y-3">
                  {analytics && Object.entries(analytics.byStatus).map(([status, data]: [string, any]) => (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status}</span>
                        <span className="text-muted-foreground">
                          {data.count} ({analytics.totalCalls > 0 ? ((data.count / analytics.totalCalls) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                      <Progress value={analytics.totalCalls > 0 ? (data.count / analytics.totalCalls) * 100 : 0} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <h4 className="font-medium">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm text-muted-foreground">Positive</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {totalSentiment > 0 ? Math.round(((analytics?.bySentiment["positive"] || 0) / totalSentiment) * 100) : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-muted-foreground">Neutral</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {totalSentiment > 0 ? Math.round(((analytics?.bySentiment["neutral"] || 0) / totalSentiment) * 100) : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">Negative</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {totalSentiment > 0 ? Math.round(((analytics?.bySentiment["negative"] || 0) / totalSentiment) * 100) : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Today</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold">{analytics?.todayCalls || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
