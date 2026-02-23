export type DashboardSubtitleTone = 'muted' | 'success';
export type DashboardIconTone = 'accent' | 'success';

export interface DashboardMetricCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  subtitleTone: DashboardSubtitleTone;
  icon: string;
  iconTone: DashboardIconTone;
  progressPercent?: number;
}

export interface DashboardInsight {
  icon: string;
  emphasis: string;
  detail: string;
}

export interface DashboardChartData {
  title: string;
  labels: string[];
  values: number[];
}

export interface DashboardMonthData {
  key: string;
  monthLabel: string;
  metrics: DashboardMetricCard[];
  insight: DashboardInsight;
  chart: DashboardChartData;
}
