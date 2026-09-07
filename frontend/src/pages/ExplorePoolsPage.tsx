import React, { useState, useMemo } from 'react';
import { Pool, FilterType } from '../lib/contract/types';
import { Search, MapPin, Calendar, Database, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';
import { useFetchConsecutiveDroughtDays, useFetchWeatherReading } from '../hooks/ClimateShield';

interface ExplorePoolsPageProps {
  pools: Pool[];
  isLoading: boolean;
  setCurrentTab: (tab: string) => void;
  setSelectedPoolId: (id: string) => void;
  policies: any[];
}

export default function ExplorePoolsPage({ pools, isLoading, setCurrentTab, setSelectedPoolId, policies }: ExplorePoolsPageProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      // Apply status filter
      if (activeFilter !== 'All') {
        if (pool.status.toUpperCase() !== activeFilter.toUpperCase()) {
          return false;
        }
      }
      // Apply search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesRegion = pool.region_name.toLowerCase().includes(query);
        const matchesName = pool.name.toLowerCase().includes(query);
        if (!matchesRegion && !matchesName) {
          return false;
        }
      }
      return true;
    });
  }, [pools, activeFilter, searchQuery]);

  const handleViewPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setCurrentTab(`pool-${poolId}`);
  };

  const filters: FilterType[] = ['All', 'Open', 'Active', 'Triggered', 'Closed'];
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#000000] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Coverage Pools</h1>
          <p className="text-sm text-[#6b7280]">
            Find the pool covering your farming region and buy a policy.
          </p>
        </div>

        {/* Filters and Search Bar Row */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {/* Filters (Pill Style) */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#16a34a] border-[#16a34a] text-white'
                      : 'border-[#1e1e1e] bg-[#0f0f0f] text-[#6b7280] hover:text-white hover:border-[#6b7280]'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Search by region name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#000000] border border-[#1e1e1e] rounded-[4px] text-white text-xs placeholder-[#6b7280] focus:border-[#16a34a] focus:outline-none"
            />
          </div>
        </div>

        {/* Pool Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-[#1e1e1e] rounded-[6px]"></div>
            <div className="h-64 bg-[#1e1e1e] rounded-[6px]"></div>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-20 border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px]">
            <HelpCircle className="w-12 h-12 text-[#6b7280] mx-auto mb-3" />
            <p className="text-[#6b7280] text-sm">No pools found matching your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPools?.map((pool) => {
              // Status Badge Styling
              let statusPill = 'bg-[#1e1e1e] text-[#6b7280]';
              if (pool.status === 'open') {
                statusPill = 'bg-[#16a34a] text-black font-bold';
              } else if (pool.status === 'active') {
                statusPill = 'border border-[#16a34a] text-[#16a34a] bg-transparent font-semibold';
              } else if (pool.status === 'triggered') {
                statusPill = 'bg-[#dc2626] text-white font-bold animate-pulse';
              } else if (pool.status === 'closed') {
                statusPill = 'bg-[#1e1e1e] text-[#6b7280]';
              }

              // Drought status coloring
              let indexColor = 'text-[#16a34a]';
              let indexDot = 'bg-[#16a34a]';
              const {data: weatherReading} = useFetchWeatherReading(pool?.pool_id, todayStr)
              const {data: consecutiveDroughtDays} = useFetchConsecutiveDroughtDays(pool?.pool_id)
              if ( weatherReading?.drought_index === 'watch') {
                indexColor = 'text-[#ca8a04]';
                indexDot = 'bg-[#ca8a04]';
              } else if (weatherReading?.drought_index === 'warning') {
                indexColor = 'text-[#d97706]';
                indexDot = 'bg-[#d97706]';
              } else if (weatherReading?.drought_index === 'severe') {
                indexColor = 'text-[#dc2626]';
                indexDot = 'bg-[#dc2626]';
              }

              // Count policies for this pool
              const activePoliciesForPool = policies.filter((p: any) => p.poolId === pool.pool_id && p.status === 'active').length;
              return (
                <div
                  key={pool.pool_id}
                  className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-6 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    {/* Header Row */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white tracking-tight leading-snug">{pool.name}</h2>
                        <div className="flex items-center gap-1 text-[#6b7280] text-xs">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{pool.region_name}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${statusPill}`}>
                        {pool.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#6b7280] leading-relaxed line-clamp-2">
                      {pool.description}
                    </p>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 py-3 border-y border-[#1e1e1e] text-xs">
                      <div className="text-center">
                        <p className="text-[#6b7280] text-[10px] uppercase mb-0.5">Premium</p>
                        <p className="text-white font-bold font-mono">{pool.premium_per_policy} GEN</p>
                      </div>
                      <div className="text-center border-x border-[#1e1e1e]">
                        <p className="text-[#6b7280] text-[10px] uppercase mb-0.5">Coverage</p>
                        <p className="text-[#22c55e] font-bold font-mono">{pool.coverage_per_policy} GEN</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#6b7280] text-[10px] uppercase mb-0.5">Policies</p>
                        <p className="text-white font-bold font-mono">{activePoliciesForPool}/{pool.max_policies}</p>
                      </div>
                    </div>

                    {/* Detailed Stats Lines */}
                    <div className="space-y-2 text-xs">
                      {/* Triggers Line */}
                      <div className="flex items-center gap-2 text-[#6b7280]">
                        <Calendar className="w-4 h-4 text-[#6b7280] shrink-0" />
                        <span>Triggers after <strong className="text-white">{pool.consecutive_days_required}</strong> consecutive drought days</span>
                      </div>

                      {/* Vault Balance Line */}
                      <div className="flex items-center gap-2 text-[#6b7280]">
                        <Database className="w-4 h-4 text-[#6b7280] shrink-0" />
                        <span className="flex items-center gap-1">
                          Vault: <strong className="text-white">{pool.vault_balance} GEN</strong>
                        </span>
                      </div>

                      {/* Current Drought Dot Label */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#6b7280]">Drought Classification:</span>
                        <span className={`flex items-center gap-1.5 font-semibold ${indexColor}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${indexDot}`} />
                          {weatherReading?.drought_index}
                        </span>
                      </div>
                    </div>

                    {/* Trigger Streak Progress bar (Shown when active) */}
                    {(pool.status === 'active' || Number(consecutiveDroughtDays || 0) > 0) && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#6b7280]">Consecutive Drought Days:</span>
                          <span className="font-mono text-white font-bold">
                            {consecutiveDroughtDays?.toString() || 0} of {pool.consecutive_days_required} days
                          </span>
                        </div>
                        <div className="w-full bg-[#141414] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              (Number(consecutiveDroughtDays) || 0) >= pool.consecutive_days_required * 0.8
                                ? 'bg-[#dc2626]'
                                : (Number(consecutiveDroughtDays) || 0) >= pool.consecutive_days_required * 0.5
                                ? 'bg-[#d97706]'
                                : 'bg-[#16a34a]'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                ((Number(consecutiveDroughtDays) || 1) / pool.consecutive_days_required) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#6b7280]">
                          <span>{Math.round((Number(consecutiveDroughtDays || 1) / pool.consecutive_days_required) * 100)}% to trigger</span>
                          {Number(consecutiveDroughtDays || 0) >= pool.consecutive_days_required ? (
                            <span className="text-[#22c55e] font-bold">Payout terms met</span>
                          ) : (
                            <span>{pool.consecutive_days_required - Number(consecutiveDroughtDays || 0)} days remaining</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Details button */}
                  <button
                    id={`view-pool-${pool.pool_id}`}
                    onClick={() => handleViewPool(pool.pool_id)}
                    className="w-full py-2 bg-transparent border border-[#1e1e1e] hover:border-[#16a34a] hover:text-[#22c55e] text-white text-xs font-semibold rounded-[4px] transition-colors cursor-pointer text-center"
                  >
                    View Pool
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
