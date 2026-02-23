import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ThemeStore } from '../../../../core/store/theme/theme.store';

interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  legend: ApexLegend;
  tooltip: ApexTooltip;
}

@Component({
  selector: 'app-spending-chart-card',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './spending-chart-card.component.html',
  styleUrl: './spending-chart-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingChartCardComponent {
  readonly title = input.required<string>();
  readonly labels = input.required<string[]>();
  readonly values = input.required<number[]>();

  private readonly documentRef = inject(DOCUMENT);
  private readonly themeStore = inject(ThemeStore);

  readonly chartOptions = computed<ChartOptions>(() => {
    const labels = this.labels();
    const values = this.values();
    const themeMode = this.themeStore.mode();

    const axisTextColor = this.getCssVariable('--app-text-2', '#6b7280');
    const gridColor = this.getCssVariable('--app-border-1', 'rgba(148, 163, 184, 0.3)');
    const lineColor = this.getCssVariable('--app-tab-active', '#3b82f6');

    const maxValue = Math.max(...values, 0);
    const yStep = maxValue === 0 ? 50 : Math.ceil(maxValue / 4 / 10) * 10;
    const yMax = yStep * 4;

    return {
      chart: {
        type: 'area',
        height: 320,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 350,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 4,
        colors: [lineColor],
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: themeMode,
          type: 'vertical',
          shadeIntensity: 0.3,
          opacityFrom: themeMode === 'dark' ? 0.28 : 0.22,
          opacityTo: 0.03,
          stops: [0, 90, 100],
        },
      },
      series: [
        {
          name: 'Daily Spending',
          data: values,
        },
      ],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 5,
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: axisTextColor,
            fontSize: '14px',
          },
        },
      },
      yaxis: {
        min: 0,
        max: yMax,
        tickAmount: 4,
        labels: {
          formatter(value: number): string {
            return `$${Math.round(value)}`;
          },
          style: {
            colors: axisTextColor,
            fontSize: '14px',
          },
        },
      },
      legend: {
        show: false,
      },
      tooltip: {
        theme: themeMode,
        y: {
          formatter(value: number): string {
            return `$${value.toFixed(2)}`;
          },
        },
      },
    };
  });

  private getCssVariable(variableName: string, fallback: string): string {
    const root = this.documentRef.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variableName).trim();
    return value || fallback;
  }
}
