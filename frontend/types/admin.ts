export interface GlobalStats {
  totalRevenue: number;
  totalJobs: number;
  totalPages: number;
}

export interface ShopPerformance {
  shopId: string;
  shopName: string;
  ownerName: string;
  location: any;
  revenue: number;
  jobsCount: number;
  averageOrderValue: number;
}

export interface DashboardResponse {
  global: GlobalStats;
  shops: ShopPerformance[];
}
