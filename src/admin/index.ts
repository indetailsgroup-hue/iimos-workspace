export { SuperAdminDashboard } from './SuperAdminDashboard';
export { PlatformSearchPanel } from './PlatformSearchPanel';
export { SearchAnalyticsDashboard } from './SearchAnalyticsDashboard';
export { platformSearch, searchJobs, searchMembers, searchInvoices, createDebouncedSearch } from './platformSearch';
export { fetchSearchAnalytics, logSearch, logSearchClick } from './searchAnalytics';
export type {
  SearchResult,
  SearchEntityType,
  PlatformSearchOptions,
  PlatformSearchResponse,
} from './platformSearch';
export type { SearchAnalyticsData, SearchLogEntry } from './searchAnalytics';
