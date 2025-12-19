import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminDashboardService, DashboardData, LoadingState } from '../../../../core/services/admin-dashboard.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faShoppingCart, 
  faUsers, 
  faRecycle, 
  faChartLine,
  faTrophy,
  faMedal,
  faAward,
  faUserTie,
  faArrowUp,
  faArrowDown,
  faMinus,
  faSync
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FontAwesomeModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit {
  data = signal<DashboardData>({
    totalOrders: 0,
    orderStatus: {},
    ordersPerDay: [],
    topUsers: [],
    userGrowth: [],
    topMaterials: [],
    citiesData: null,
    categories: []
  });

  loading = signal<LoadingState>({
    analytics: true,
    users: true,
    materials: true,
    userStats: true,
    cities: true,
    categories: true
  });

  error = signal<string | null>(null);

  // Chart configurations
  userGrowthChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  orderStatusChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: []
  };

  weeklyOrdersChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  materialsChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  citiesChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  topUsersChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  // FontAwesome Icons
  faShoppingCart = faShoppingCart;
  faUsers = faUsers;
  faRecycle = faRecycle;
  faChartLine = faChartLine;
  faTrophy = faTrophy;
  faMedal = faMedal;
  faAward = faAward;
  faUserTie = faUserTie;
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;
  faMinus = faMinus;
  faSync = faSync;

  // Top Users Chart Metric Toggle
  topUsersMetric = signal<'points' | 'orders'>('points');
  topUsersByOrders = signal<any[]>([]);

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      }
    }
  };

  orderStatusChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
      onComplete: () => {
        // Animation complete callback
      }
    },
    onHover: (event: any, activeElements: any[]) => {
      const chart = event.native.target;
      if (activeElements.length > 0) {
        chart.style.cursor = 'pointer';
        chart.style.transition = 'transform 0.3s ease';
        chart.style.transform = 'scale(1.05)';
      } else {
        chart.style.cursor = 'default';
        chart.style.transform = 'scale(1)';
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      arc: {
        borderWidth: 0,
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff',
        hoverOffset: 12,
        animation: {
          animateRotate: true,
          animateScale: true
        }
      }
    }
  };

  constructor(
    private dashboardService: AdminDashboardService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set({
      analytics: true,
      users: true,
      materials: true,
      userStats: true,
      cities: true,
      categories: true
    });

    this.dashboardService.fetchAllDashboardData().subscribe({
      next: (result) => {
        this.data.set(result);
        this.calculateUserOrderCounts(result);
        this.updateCharts(result);
        this.loading.set({
          analytics: false,
          users: false,
          materials: false,
          userStats: false,
          cities: false,
          categories: false
        });
      },
      error: (err) => {
        console.error('Failed to load dashboard data:', err);
        this.error.set('Failed to load dashboard data');
        this.loading.set({
          analytics: false,
          users: false,
          materials: false,
          userStats: false,
          cities: false,
          categories: false
        });
      }
    });
  }

  updateCharts(data: DashboardData): void {
    // User Growth Chart
    if (data.userGrowth.length > 0) {
      this.userGrowthChartData = {
        labels: data.userGrowth.map(item => item.label),
        datasets: [{
          label: 'New Users',
          data: data.userGrowth.map(item => item.count),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true
        }]
      };
    }

    // Order Status Chart
    if (Object.keys(data.orderStatus).length > 0) {
      const statusLabels = Object.keys(data.orderStatus);
      const statusValues = Object.values(data.orderStatus);
      
      // Color mapping based on status
      const colorMap: { [key: string]: string } = {
        'Pending': '#fb923c',           // Orange
        'Completed': '#22c55e',         // Green
        'Cancelled': '#ef4444',          // Red
        'Assigned To Courier': '#3b82f6', // Blue
        'Collected': '#a855f7',         // Purple
        'pending': '#fb923c',
        'completed': '#22c55e',
        'cancelled': '#ef4444',
        'assigned': '#3b82f6',
        'collected': '#a855f7'
      };
      
      this.orderStatusChartData = {
        labels: statusLabels,
        datasets: [{
          data: statusValues,
          backgroundColor: statusLabels.map((label: string) => {
            const normalizedLabel = label.toLowerCase();
            for (const [key, color] of Object.entries(colorMap)) {
              if (normalizedLabel.includes(key.toLowerCase())) {
                return color;
              }
            }
            return '#9ca3af'; // Default gray
          }),
          borderWidth: 0,
          hoverOffset: 8,
          hoverBorderWidth: 3,
          hoverBorderColor: '#ffffff'
        }]
      };
    }

    // Weekly Orders Chart
    if (data.ordersPerDay.length > 0) {
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.weeklyOrdersChartData = {
        labels: dayLabels.slice(0, data.ordersPerDay.length),
        datasets: [{
          label: 'Orders',
          data: data.ordersPerDay,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        }]
      };
    }

    // Materials Chart
 // Materials Chart
if (data.topMaterials.length > 0) {
  this.materialsChartData = {
    labels: data.topMaterials.map((m: any) => {
      // يدعم أكثر من شكل backend (Node + .NET)
      const rawName = m.material ?? m.displayName ?? m.name ?? m.nameEn ?? m.nameAr;

      if (!rawName) return 'Unknown';
      if (typeof rawName === 'string') return rawName;

      // لو الاسم object { en, ar }
      if (rawName && typeof rawName === 'object') {
        return rawName.en || rawName.ar || 'Unknown';
      }

      return 'Unknown';
    }),
    datasets: [{
      label: 'Recycled',
      data: data.topMaterials.map((m: any) =>
        m.count ?? m.quantity ?? m.totalQuantity ?? m.orderCount ?? 0
      ),
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 1
    }]
  };
}

    // Cities Chart
    if (data.citiesData) {
      this.citiesChartData = data.citiesData;
    }

    // Top Users Chart - will be updated based on selected metric
    // Initialize chart after data is set
    if (data.topUsers && data.topUsers.length > 0) {
      this.updateTopUsersChart();
    }
  }

  getTopUsers(): any[] {
    if (!this.data().topUsers || this.data().topUsers.length === 0) return [];
    return [...this.data().topUsers]
      .sort((a: any, b: any) => {
        const aPoints = a.points || a.totalPoints || 0;
        const bPoints = b.points || b.totalPoints || 0;
        return bPoints - aPoints;
      })
      .slice(0, 5);
  }

  getRankIcon(index: number): any {
    if (index === 0) return this.faTrophy;
    if (index === 1) return this.faMedal;
    if (index === 2) return this.faAward;
    return this.faUserTie;
  }

  getRankColor(index: number): string {
    if (index === 0) return '#FFD700'; // Gold
    if (index === 1) return '#C0C0C0'; // Silver
    if (index === 2) return '#CD7F32'; // Bronze
    return '#22c55e'; // Green
  }

  getFormattedDate(): string {
    const now = new Date();
    const locale = this.translation.getLocale();
    return now.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  t(key: string): string {
    return this.translation.t(key);
  }

  convertNumber(value: number | string): string {
    return this.translation.convertNumber(value);
  }

  refetch(): void {
    this.loadDashboardData();
  }

  getOrderStatusCount(status: string): number {
    return this.data().orderStatus[status] || 0;
  }

  getTotalOrders(): number {
    return Object.values(this.data().orderStatus).reduce((sum: number, count: number) => sum + count, 0);
  }

  getMostCommonStatus(): string {
    const statuses = this.data().orderStatus;
    if (Object.keys(statuses).length === 0) return 'N/A';
    return Object.entries(statuses).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'Pending': '#fb923c',
      'Completed': '#22c55e',
      'Cancelled': '#ef4444',
      'Assigned To Courier': '#3b82f6',
      'Collected': '#a855f7',
      'pending': '#fb923c',
      'completed': '#22c55e',
      'cancelled': '#ef4444',
      'assigned': '#3b82f6',
      'collected': '#a855f7'
    };
    const normalizedStatus = status.toLowerCase();
    for (const [key, color] of Object.entries(colorMap)) {
      if (normalizedStatus.includes(key.toLowerCase())) {
        return color;
      }
    }
    return '#9ca3af';
  }

  getUserAvatar(user: any): string {
    return user.imageUrl || user.imgUrl || user.attachments?.profileImage || '';
  }

  getUserInitials(user: any): string {
    const name = user.name || user.fullName || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getProgressPercentage(user: any, maxPoints: number): number {
    if (!maxPoints || maxPoints === 0) return 0;
    const points = user.points || user.totalPoints || 0;
    return Math.min((points / maxPoints) * 100, 100);
  }

  getMaxPoints(): number {
    const users = this.getTopUsers();
    if (users.length === 0) return 1;
    return Math.max(...users.map((u: any) => u.points || 0));
  }

  getRankBackgroundColor(index: number): string {
    if (index === 0) return '#fef3c7'; // Light yellow/gold
    if (index === 1) return '#ffffff'; // White
    if (index === 2) return '#f5f5dc'; // Light beige
    return '#f9fafb'; // Light gray
  }

  getRankBackgroundGradient(index: number): string {
    if (index === 0) return 'linear-gradient(to right, #fef3c7, #fde68a)'; // Yellow gradient
    if (index === 1) return 'linear-gradient(to right, #f9fafb, #f3f4f6)'; // Gray gradient
    if (index === 2) return 'linear-gradient(to right, #fed7aa, #fdba74)'; // Orange gradient
    return '#f9fafb'; // Light gray
  }

  getRankBadgeColor(index: number): string {
    if (index === 0) return '#fef3c7'; // Yellow
    if (index === 1) return '#f3f4f6'; // Gray
    if (index === 2) return '#fed7aa'; // Orange
    return '#f9fafb';
  }

  calculateUserOrderCounts(data: DashboardData): void {
    // Order counts are now included in topUsers from the service
    this.topUsersByOrders.set(data.topUsers || []);
  }

  updateTopUsersChart(): void {
    const metric = this.topUsersMetric();
    const users = metric === 'points' 
      ? this.data().topUsers 
      : this.topUsersByOrders();

    if (!users || users.length === 0) {
      // Initialize empty chart data if no users
      this.topUsersChartData = {
        labels: [],
        datasets: []
      };
      return;
    }

    const sortedUsers = [...users]
      .sort((a: any, b: any) => {
        if (metric === 'points') {
          return (b.points || b.totalPoints || 0) - (a.points || a.totalPoints || 0);
        } else {
          return (b.orderCount || 0) - (a.orderCount || 0);
        }
      })
      .slice(0, 10);
    
    this.topUsersChartData = {
      labels: sortedUsers.map((u: any) => {
        const name = u.name || u.fullName || 'Unknown';
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
      }),
      datasets: [{
        label: metric === 'points' ? 'Points' : 'Orders',
        data: sortedUsers.map((u: any) => 
          metric === 'points' ? (u.points || u.totalPoints || 0) : (u.orderCount || 0)
        ),
        backgroundColor: [
          'rgba(255, 215, 0, 0.8)',   // Gold for #1
          'rgba(192, 192, 192, 0.8)', // Silver for #2
          'rgba(205, 127, 50, 0.8)',  // Bronze for #3
          'rgba(34, 197, 94, 0.6)',   // Green for others
          'rgba(34, 197, 94, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(34, 197, 94, 0.6)'
        ],
        borderColor: [
          'rgba(255, 215, 0, 1)',
          'rgba(192, 192, 192, 1)',
          'rgba(205, 127, 50, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(34, 197, 94, 1)'
        ],
        borderWidth: 2
      }]
    };
  }

  toggleTopUsersMetric(): void {
    this.topUsersMetric.update(prev => prev === 'points' ? 'orders' : 'points');
    this.updateTopUsersChart();
  }
}
