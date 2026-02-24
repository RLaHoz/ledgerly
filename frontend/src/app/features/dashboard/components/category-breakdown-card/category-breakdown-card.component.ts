import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { ThemeStore } from '../../../../core/store/theme/theme.store';
import { DashboardCategoryItem } from '../../models/dashboard.models';

interface CategoryDonutOptions {
  chart: ApexChart;
  labels: string[];
  series: ApexNonAxisChartSeries;
  colors: string[];
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  stroke: ApexStroke;
  legend: ApexLegend;
  tooltip: ApexTooltip;
}

@Component({
  selector: 'app-category-breakdown-card',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './category-breakdown-card.component.html',
  styleUrl: './category-breakdown-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBreakdownCardComponent {
  readonly title = input.required<string>();
  readonly totalLabel = input.required<string>();
  readonly totalAmountLabel = input.required<string>();
  readonly categories = input.required<DashboardCategoryItem[]>();

  private readonly documentRef = inject(DOCUMENT);
  private readonly themeStore = inject(ThemeStore);

  readonly donutOptions = computed<CategoryDonutOptions>(() => {
    const categories = this.categories();
    const themeMode = this.themeStore.mode();

    return {
      chart: {
        type: 'donut',
        width: 236,
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 320,
        },
      },
      labels: categories.map((category) => category.label),
      series: categories.map((category) => category.amount),
      colors: categories.map((category) => category.color),
      stroke: {
        width: 3,
        colors: [this.getCssVariable('--app-card', '#111f38')],
      },
      legend: {
        show: false,
      },
      dataLabels: {
        enabled: false,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              name: {
                show: true,
                offsetY: -6,
                color: this.getCssVariable('--app-text-2', 'rgba(255,255,255,0.62)'),
                fontSize: '12px',
                formatter: () => this.totalLabel(),
              },
              value: {
                show: true,
                offsetY: 8,
                color: this.getCssVariable('--app-text-1', 'rgba(255,255,255,0.92)'),
                fontSize: '20px',
                fontWeight: '700',
                formatter: () => this.totalAmountLabel(),
              },
            },
          },
        },
      },
      tooltip: {
        enabled: true,
        theme: themeMode,
        y: {
          formatter: (value: number): string => `$${value.toFixed(2)}`,
        },
      },
    };
  });

  readonly leftColumnCategories = computed(() => {
    const categories = this.categories();
    const half = Math.ceil(categories.length / 2);
    return categories.slice(0, half);
  });

  readonly rightColumnCategories = computed(() => {
    const categories = this.categories();
    const half = Math.ceil(categories.length / 2);
    return categories.slice(half);
  });

  private getCssVariable(variableName: string, fallback: string): string {
    const root = this.documentRef.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variableName).trim();
    return value || fallback;
  }
}
