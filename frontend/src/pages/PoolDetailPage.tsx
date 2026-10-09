import React, { useState, useEffect } from 'react';
import { Pool, WeatherReading, PayoutRecord } from '../lib/contract/types';
import { MapPin, Calendar, Database, ArrowLeft, ShieldAlert, CheckCircle, UserCheck, Play, Send, RefreshCw } from 'lucide-react';
import { useWallet } from '../lib/genlayer/wallet';
import { useApp } from '../context/AppContext';
import { useBuyPolicy, useFetchConsecutiveDroughtDays, useFetchPool, useFetchPoolPayouts, useFetchPoolPolicies, useCancelPolicy, useRecordDailyReading, useExpirePool, useCheckTrigger, useFetchRecentReading } from '../hooks/ClimateShield';

interface PoolDetailPageProps {
  poolId: string;
  onBack: () => void;
  poolData: Pool;
  isLoading: boolean;
}

export default function PoolDetailPage({ poolId, onBack, poolData, isLoading }: PoolDetailPageProps) {
  const { address } = useWallet();
  const { showToast } = useApp()

  const { data: pool, refetch: refreshPool } = useFetchPool(poolId);
  const { data: policies, refetch: refreshPolicies } = useFetchPoolPolicies(poolId);
  const { data: consecutive_drought_days } = useFetchConsecutiveDroughtDays(poolId)
  const activePool = pool || poolData;
  const activePolicies = policies || [];

  const poolStartDate = new Date(activePool.created_at);
  const expirationDate = new Date(poolStartDate);
  expirationDate.setDate(expirationDate.getDate() + 21);

  const now = new Date();

  const hasReached21Days = now >= expirationDate;

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (expirationDate.getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24)
    )
  );

  const [txState, setTxState] = useState<'idle' | 'approving' | 'submitting' | 'confirmed'>('idle');
  const [txError, setTxError] = useState('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [recordingType, setRecordingType] = useState<'real' | 'drought' | 'normal'>('real');

  const [isTriggering, setIsTriggering] = useState(false);
  const { isPending: isBuyingPolicy, mutate: buyPolicy } = useBuyPolicy()
  const { isPending: isCancellingPolicy, mutate: cancelPolicy } = useCancelPolicy()
  const { isPending: isRecordingDailyReading, mutate: recordDailyReading } = useRecordDailyReading()
  const { isPending: isExpiringPool, mutate: expirePool } = useExpirePool()
  const { isPending: isCheckingTrigger, mutate: checkTrigger } = useCheckTrigger()

  const handleCheckTrigger = async () => {
    checkTrigger({ poolId }, {
      onSuccess: async () => {
        showToast('Trigger check executed successfully!', 'success');
      },
      onError: async () => {
        showToast('Failed to check trigger.', 'error');
      }
    })
  }


  const { data: readings } = useFetchRecentReading(poolId, 10)
  const { data: payouts } = useFetchPoolPayouts(poolId)


  if (isLoading || !activePool) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <button onClick={onBack} className="text-sm text-[#6b7280] hover:text-white flex items-center gap-2 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Pools
        </button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]" />
          <div className="h-64 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]" />
        </div>
      </div>
    );
  }

  const activeUserPolicy = address
    ? activePolicies.find(p => p.farmer.toLowerCase() === address.toLowerCase() && p.active)
    : null;

  const claimedUserPolicy = address
    ? activePolicies.find(p => p.farmer.toLowerCase() === address.toLowerCase() && p.claimed)
    : null;
      console.log(readings)

  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayRecorded = readings?.some(r => r.day === todayStr);


  const coveragePerPolicy = Number(activePool.coverage_per_policy || 0);
  const premiumPerPolicy = Number(activePool.premium_per_policy || 0);
  const consecutiveDaysRequired = Number(activePool.consecutive_days_required || 0);
  const consecutiveDroughtDays = Number(consecutive_drought_days || 0);
  const droughtThreshold = Number(activePool.drought_threshold || 0);

  const multiplier = premiumPerPolicy > 0 ? (coveragePerPolicy / premiumPerPolicy).toFixed(1) : '0.0';

  const handleRefreshData = async () => {
    await Promise.all([refreshPool?.(), refreshPolicies?.()]);
  };

  const handleBuyPolicy = async () => {
    if (!address) return;

    buyPolicy({ poolId, amount: premiumPerPolicy }, {
      onSuccess: async () => {
        showToast('Policy purchased successfully!', 'success');
      },
      onError: async () => {
        showToast('Failed to purchase policy.', 'error');
      }
    });

  };


  const handleExpirePool = () => {
    if (!hasReached21Days) {
      showToast('Pool must reach 21 days before it can expire.', "info");
      return;
    }

    // Call your expiration contract function here
    expirePool({ poolId }, {
      onSuccess: async () => {
        showToast('Pool expired successfully!', 'success');
      },
      onError: async () => {
        showToast('Failed to expire pool.', 'error');
      }
    });
  }

  const handleCancelPolicy = async () => {
    if (!address || !activeUserPolicy) return;

    cancelPolicy({ policyId: activeUserPolicy.policy_id }, {
      onSuccess: async () => {
        showToast('Policy cancelled successfully!', 'success');
      },
      onError: async () => {
        showToast('Failed to cancel policy.', 'error');
      }
    });
  };

  // Record weather reading
  const handleRecordReading = async () => {
    recordDailyReading({ poolId, day: todayStr }, {
      onSuccess: async () => {
        showToast('Daily reading recorded successfully!', 'success');
      },
      onError: async () => {
        showToast('Failed to record daily reading.', 'error');
      }
    });
  };


  // Drought index color utilities
  const getIndexPillColor = (index: string) => {
    switch (index?.toLowerCase()) {
      case 'normal': return 'bg-[#14532d] text-[#22c55e]';
      case 'watch': return 'bg-[#78350f] text-[#fbbf24]';
      case 'warning': return 'bg-[#92400e] text-[#f59e0b]';
      case 'severe': return 'bg-[#7f1d1d] text-[#ef4444]';
      default: return 'bg-[#1e1e1e] text-[#6b7280]';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-[#16a34a] text-black font-bold';
      case 'active': return 'border border-[#16a34a] text-[#16a34a] bg-transparent font-medium';
      case 'triggered': return 'bg-[#dc2626] text-white font-bold animate-pulse';
      case 'closed': return 'bg-[#1e1e1e] text-[#6b7280]';
      default: return 'bg-[#1e1e1e] text-white';
    }
  };

  const activePoliciesCount = activePolicies.filter(p => p.active).length;


  return (
    <div className="bg-[#000000] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Back Link */}
        <button
          onClick={onBack}
          className="text-xs font-semibold text-[#6b7280] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pools
        </button>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT COLUMN: 60% width on desktop */}
          <div className="lg:col-span-2 space-y-8">

            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{activePool.name}</h1>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadgeColor(activePool.status)}`}>
                  {activePool.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#22c55e]">
                <MapPin className="w-4 h-4" />
                <span>{activePool.region_name}</span>
              </div>
              <p className="text-sm text-[#6b7280] leading-relaxed max-w-3xl">
                {activePool.description}
              </p>
            </div>

            {/* Coverage Specifications Card */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-5">
              <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-4 text-[#6b7280]">
                Coverage Terms
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50">
                  <span className="text-[#6b7280]">Coverage per policy</span>
                  <span className="font-mono text-white font-semibold">{coveragePerPolicy} GEN</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50">
                  <span className="text-[#6b7280]">Premium fee</span>
                  <span className="font-mono text-white font-semibold">{premiumPerPolicy} GEN</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50">
                  <span className="text-[#6b7280]">Consecutive days required</span>
                  <span className="font-mono text-white font-semibold">{consecutiveDaysRequired} days</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50">
                  <span className="text-[#6b7280]">Soil moisture threshold</span>
                  <span className="font-mono text-[#d97706] font-semibold">≤ {droughtThreshold.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50 sm:border-none">
                  <span className="text-[#6b7280]">Max allowable policies</span>
                  <span className="font-mono text-white font-semibold">{activePool.max_policies}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#1e1e1e]/50 sm:border-none">
                  <span className="text-[#6b7280]">Geographic coordinates</span>
                  <span className="font-mono text-white font-semibold">
                    {Number(activePool.latitude || 0).toFixed(4)}, {Number(activePool.longitude || 0).toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 text-xs border-t border-[#1e1e1e] mt-2">
                <span className="text-[#6b7280]">Monitoring Radius</span>
                <span className="font-semibold text-white">{activePool.radius_km} km from center</span>
              </div>
            </div>

            {/* Weather Readings History Table */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white text-base font-bold">Weather Readings</h3>
                  <p className="text-xs text-[#6b7280]">Daily soil moisture readings recorded on-chain</p>
                </div>
                <button
                  onClick={handleRefreshData}
                  className="p-1 text-[#6b7280] hover:text-[#22c55e] transition-colors cursor-pointer"
                  title="Refresh weather data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {readings?.length === 0 ? (
                <div className="p-8 border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] text-center">
                  <p className="text-xs text-[#6b7280] mb-3">No readings recorded yet.</p>
                  <button
                    onClick={handleRecordReading}
                    disabled={isRecordingDailyReading}
                    className="px-3 py-1.5 bg-[#16a34a] hover:bg-[#22c55e] disabled:bg-[#1e1e1e] text-white text-xs font-bold rounded-[4px] cursor-pointer"
                  >
                    {isRecordingDailyReading ? "Fetching..." : "Record First Reading"}
                  </button>
                </div>
              ) : (
                <div className="border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#1e1e1e] bg-[#141414] text-[#6b7280] font-bold">
                          <th className="p-3">Date</th>
                          <th className="p-3">Soil Moisture</th>
                          <th className="p-3">Drought Index</th>
                          <th className="p-3">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]/50 font-mono">
                        {readings?.slice(0, 10).map((reading: WeatherReading) => (
                          <tr key={reading.day} className="hover:bg-[#141414]/40">
                            <td className="p-3 text-white">{reading.recorded_at}</td>
                            <td className="p-3 text-[#22c55e] font-semibold">
                              {Number(reading.soil_moisture).toFixed(4)}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold font-sans ${getIndexPillColor(reading.drought_index)}`}>
                                {reading.drought_index}
                              </span>
                            </td>
                            <td className="p-3 text-[#6b7280] text-[11px]">
                              {reading.recorded_by.startsWith('0x')
                                ? `${reading.recorded_by.slice(0, 6)}...${reading.recorded_by.slice(-4)}`
                                : reading.recorded_by}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {readings && readings?.length > 10 && (
                    <div className="p-3 text-center border-t border-[#1e1e1e] text-[11px] text-[#6b7280]">
                      Showing latest 10 of {readings?.length} weather readings
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Streak Tracker Progress bar */}
            {(activePool.status.toLowerCase() === 'active' || consecutiveDroughtDays > 0) && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-5 rounded-[6px] space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h4 className="text-xs text-[#6b7280] font-bold uppercase tracking-wide">Trigger Streak Status</h4>
                    <p className="text-white text-base font-bold font-mono mt-1">
                      Streak: {consecutiveDroughtDays} / {consecutiveDaysRequired} consecutive days
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-white font-mono">
                    {consecutiveDaysRequired > 0 ? Math.round((consecutiveDroughtDays || 0) / consecutiveDaysRequired * 100) : 0}% complete
                  </span>
                </div>

                <div className="w-full bg-[#141414] h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${consecutiveDroughtDays >= consecutiveDaysRequired
                      ? 'bg-[#dc2626]'
                      : consecutiveDroughtDays || 0 >= consecutiveDaysRequired * 0.8
                        ? 'bg-[#d97706]'
                        : 'bg-[#16a34a]'
                      }`}
                    style={{ width: `${consecutiveDroughtDays && consecutiveDaysRequired > 0 ? Math.min(100, (consecutiveDroughtDays / consecutiveDaysRequired) * 100) : 0}%` }}
                  />
                </div>

                <div className="text-xs text-[#6b7280]">
                  {consecutiveDroughtDays >= consecutiveDaysRequired ? (
                    <p className="text-[#22c55e] font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Drought condition trigger reached. Anyone can call check_trigger to release funds.
                    </p>
                  ) : (
                    <p>
                      Need <strong className="text-white">{consecutiveDaysRequired - consecutiveDroughtDays} more</strong> consecutive days below threshold ({droughtThreshold}) to trigger parametric payouts.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Covered Farmers Section */}
            <div className="space-y-3">
              <h3 className="text-white text-base font-bold">Covered Farmers</h3>
              <p className="text-xs text-[#6b7280]">
                {activePoliciesCount} farmer{activePoliciesCount === 1 ? '' : 's'} protected under active policies in this region
              </p>

              {activePolicies.length === 0 ? (
                <p className="text-xs text-[#6b7280] italic">No active policies in this pool yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {activePolicies.map((p, i) => (
                    <div
                      key={p.policy_id}
                      className="p-2.5 bg-[#0f0f0f] border border-[#1e1e1e] text-xs font-mono rounded-[4px] flex items-center justify-between"
                    >
                      <span className="text-[#6b7280]">{i + 1}. {p.farmer.slice(0, 8)}...{p.farmer.slice(-6)}</span>
                      <span className={`text-[10px] uppercase font-sans font-bold ${p?.active
                        ? 'text-[#22c55e]'
                        : p.claimed
                          ? 'text-[#6b7280]'
                          : 'text-[#dc2626]'
                        }`}>
                        {p.active ? "active" : p.claimed ? "claimed" : "inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout History Section */}
            {activePool.status.toLowerCase() === 'triggered' && (
              <div className="space-y-4">
                <h3 className="text-white text-base font-bold">Payout History</h3>
                {payouts?.length === 0 ? (
                  <p className="text-xs text-[#6b7280] italic">No payout disbursements recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {payouts?.map((payout: PayoutRecord) => (
                      <div
                        key={payout.payout_id}
                        className="bg-[#0f0f0f] border border-l-4 border-l-[#16a34a] border-[#1e1e1e] p-4 rounded-[4px]"
                      >
                        <div className="flex justify-between items-start text-xs mb-2">
                          <div>
                            <p className="text-[#6b7280]">RECIPIENT ADDRESS</p>
                            <p className="text-white font-mono font-bold mt-0.5">{payout.farmer}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#6b7280]">DATE DISBURSED</p>
                            <p className="text-white font-mono font-bold mt-0.5">{payout.paid_at}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-[#1e1e1e]/50 pt-2 mt-2 text-xs">
                          <span className="text-[#6b7280]">Parametric Relief Amount:</span>
                          <span className="font-mono text-[#22c55e] font-bold">{payout.amount} GEN</span>
                        </div>
                        <p className="text-[11px] text-[#6b7280] mt-2 leading-relaxed">
                          <strong>Note:</strong> {payout.trigger_reason}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: 40% width on desktop, sticky */}
          <div className="space-y-6 lg:sticky lg:top-24">

            {/* BUY POLICY CARD */}
            <div className={`bg-[#0f0f0f] border rounded-[6px] p-5 space-y-5 ${activeUserPolicy ? 'border-[#16a34a]' : 'border-[#1e1e1e]'
              }`}>
              <div className="flex justify-between items-center">
                <h3 className="text-white text-base font-bold">Buy Coverage</h3>
                {address && (
                  activeUserPolicy ? (
                    <span className="text-xs text-[#22c55e] font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Covered ✓
                    </span>
                  ) : (
                    <span className="text-xs text-[#6b7280]">Not covered</span>
                  )
                )}
              </div>

              {/* Terms Summary */}
              <div className="bg-[#141414] border border-[#1e1e1e] rounded-[4px] p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#6b7280]">
                  <span>Premium Cost:</span>
                  <span className="font-mono text-white font-bold">{premiumPerPolicy} GEN</span>
                </div>
                <div className="flex justify-between items-center text-[#6b7280]">
                  <span>Parametric Payout:</span>
                  <span className="font-mono text-[#22c55e] font-bold">{coveragePerPolicy} GEN</span>
                </div>
                <div className="flex justify-between items-center text-[#6b7280] border-t border-[#1e1e1e] pt-2 mt-2">
                  <span>Multiplier Ratio:</span>
                  <span className="font-bold text-white">{multiplier}x coverage</span>
                </div>
              </div>

              {/* Transaction States / Button */}
              {!address ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#6b7280] text-center leading-relaxed">
                    Connect your wallet to browse crop regions and purchase parametric relief coverage.
                  </p>
                </div>
              ) : activePool.status.toUpperCase() === 'TRIGGERED' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-[#14532d] border border-[#16a34a] text-[#22c55e] rounded-[4px] text-xs">
                    <p className="font-bold mb-1">Pool has triggered</p>
                    <p className="text-[11px] leading-relaxed">Emergency payouts have been distributed to all covered farmers.</p>
                  </div>
                  {claimedUserPolicy && (
                    <p className="text-xs text-[#22c55e] font-bold font-mono bg-[#14532d]/40 p-2 border border-[#16a34a]/30 rounded-[4px] text-center">
                      Your payout of {coveragePerPolicy} GEN was sent!
                    </p>
                  )}
                </div>
              ) : activePool.status.toUpperCase() === 'CLOSED' ? (
                <p className="text-xs text-[#6b7280] text-center italic">This pool has been closed.</p>
              ) : activeUserPolicy ? (
                // Active Policy card
                <div className="space-y-4 pt-1">
                  <div className="p-3 bg-[#14532d]/30 border border-[#16a34a]/30 text-white rounded-[4px] text-xs space-y-1">
                    <p className="text-[#22c55e] font-bold">Your policy is active</p>
                    <p className="text-[11px] text-[#6b7280]">Policy ID: <strong className="font-mono text-white">{activeUserPolicy.policy_id}</strong></p>
                    <p className="text-[11px] text-[#6b7280]">Farmer Address: <strong className="font-mono text-white">{activeUserPolicy.farmer.slice(0, 6)}...</strong></p>
                  </div>

                  {isCancelling ? (
                    <div className="space-y-3 border border-red-900/30 bg-red-950/20 p-3 rounded-[4px]">
                      <p className="text-[11px] text-[#dc2626] leading-relaxed font-semibold">
                        Are you sure? You will receive a 50% refund ({premiumPerPolicy * 0.5} GEN). This action is irreversible.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelPolicy}
                          disabled={isCancellingPolicy}
                          className="flex-1 py-1.5 bg-[#dc2626] hover:bg-red-700 text-white text-[11px] font-bold rounded-[4px] cursor-pointer"
                        >
                          {isCancellingPolicy ? 'Cancelling...' : 'Yes, Cancel'}
                        </button>
                        <button
                          onClick={() => setIsCancelling(false)}
                          className="flex-1 py-1.5 bg-[#141414] hover:bg-[#1e1e1e] border border-[#1e1e1e] text-[#6b7280] text-[11px] font-bold rounded-[4px] cursor-pointer"
                        >
                          Keep Policy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={() => setIsCancelling(true)}
                        className="text-[10px] text-[#6b7280] hover:text-[#dc2626] transition-colors cursor-pointer"
                      >
                        Cancel Policy (50% refund)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Wallet Connected, No Policy
                <div className="space-y-3">
                  <button
                    onClick={handleBuyPolicy}
                    disabled={isBuyingPolicy}
                    className="w-full py-3 bg-[#16a34a] hover:bg-[#22c55e] disabled:bg-[#1e1e1e] text-white text-xs font-bold rounded-[4px] transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    {isBuyingPolicy ? 'Buying...' : `Buy Policy — ${premiumPerPolicy} GEN`}
                  </button>

                  {txState !== 'idle' && (
                    <div className="text-center space-y-1">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-[#16a34a] border-t-transparent" />
                      <p className="text-[10px] text-[#6b7280]">
                        {txState === 'approving' && "Sign approval in wallet..."}
                        {txState === 'submitting' && "Writing parameters to GenLayer Block..."}
                        {txState === 'confirmed' && "Confirmed! Vault updated successfully."}
                      </p>
                    </div>
                  )}

                  {txError && (
                    <p className="text-[#dc2626] text-[11px] font-mono leading-tight">{txError}</p>
                  )}
                </div>
              )}
            </div>

            {activePool.status.toUpperCase() === 'ACTIVE' && consecutiveDroughtDays >= consecutiveDaysRequired && (
              <div className="bg-[#0f0f0f] border-2 border-[#dc2626] rounded-[6px] p-5 space-y-3">
                <h3 className="text-white text-sm font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
                  Trigger Conditions Met
                </h3>
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  {consecutiveDroughtDays} consecutive drought days have been recorded.
                  Anyone can trigger the payout distribution now.
                </p>
                <button
                  disabled={isTriggering}
                  className="w-full py-2.5 bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-bold rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Trigger Payout Distribution
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#6b7280] leading-normal">
                  Note: This will automatically distribute a total of {activePolicies.filter(p => p.active).length * coveragePerPolicy} GEN to all covered farmers.
                </p>
              </div>
            )}

            {/* RECORD DAILY WEATHER READING CARD */}
            {activePool.status.toUpperCase() === 'ACTIVE' && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-white text-xs font-bold tracking-widest uppercase text-[#6b7280]">
                    Record Today's Reading
                  </h3>
                  <p className="text-[11px] text-[#6b7280] leading-relaxed">
                    Help keep the pool updated by recording today's soil moisture. The contract fetches live satellite data from Open-Meteo or simulates wet/dry cycles.
                  </p>
                </div>



                {activePool.status === "active" && (
                  <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-4 mt-4">
                    <p className="text-[#16a34a] text-xs uppercase tracking-widest font-bold mb-3">
                      Drought Trigger Status
                    </p>

                    {/* Consecutive days progress */}
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400 text-xs">Consecutive Drought Days</span>
                        <span className="text-white text-xs font-mono">
                          {consecutiveDroughtDays} / {activePool.consecutive_days_required}
                        </span>
                      </div>
                      <div className="w-full bg-[#1e1e1e] h-1.5">
                        <div
                          className={`h-1.5 transition-all ${consecutiveDroughtDays >= Number(activePool.consecutive_days_required)
                            ? "bg-red-500"
                            : "bg-[#16a34a]"
                            }`}
                          style={{
                            width: `${Math.min(
                              (consecutiveDroughtDays / Number(activePool.consecutive_days_required)) * 100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                    </div>

                    {consecutiveDroughtDays >= Number(activePool.consecutive_days_required) ? (
                      <div>
                        <p className="text-amber-400 text-xs mb-3">
                          Trigger conditions met. Anyone can initiate emergency payout distribution.
                        </p>
                        <button
                          onClick={handleCheckTrigger}
                          disabled={isCheckingTrigger}
                          className="w-full bg-red-600 text-white text-sm font-bold py-2 px-4 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isCheckingTrigger ? "Checking..." : "Check Trigger & Distribute Payouts"}
                        </button>
                        <p className="text-gray-500 text-xs mt-2">
                          This distributes funds to all {activePool.total_policies} covered farmers automatically.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs">
                        {Number(activePool.consecutive_days_required) - consecutiveDroughtDays} more consecutive
                        drought days needed to trigger payout.
                      </p>
                    )}
                  </div>
                )}

                {activePool.status === "triggered" && (
                  <div className="bg-[#0a1a00] border border-[#16a34a] p-4 mt-4">
                    <p className="text-[#16a34a] text-xs uppercase tracking-widest font-bold mb-1">
                      Emergency Payouts Distributed
                    </p>
                    <p className="text-gray-400 text-xs">
                      Drought trigger activated. Funds have been sent to all covered farmers.
                    </p>
                  </div>
                )}

                <div className="border-t border-[#1e1e1e]/60 my-2 pt-2 text-xs">
                  <span className="text-[#6b7280]">Reporting Date: </span>
                  <span className="font-mono text-white font-bold">{todayStr}</span>
                </div>

                {isTodayRecorded ? (
                  <div className="p-3 bg-[#141414] border border-[#1e1e1e] text-[#6b7280] rounded-[4px] text-xs text-center">
                    ✓ Today's reading has already been recorded.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-[#6b7280] font-bold uppercase mb-1">
                        Reporting Method
                      </label>
                      <select
                        value={recordingType}
                        onChange={(e: any) => setRecordingType(e.target.value)}
                        className="w-full p-2 bg-[#141414] border border-[#1e1e1e] text-white text-xs rounded-[4px] focus:outline-none focus:border-[#16a34a]"
                      >
                        <option value="real">Real Satellite Fetch (Open-Meteo)</option>
                        <option value="drought">Simulate Severe Drought Day</option>
                        <option value="normal">Simulate Normal Wet Day</option>
                      </select>
                    </div>

                    <button
                      onClick={handleRecordReading}
                      disabled={isRecordingDailyReading}
                      className="w-full py-2 border border-[#16a34a] text-[#16a34a] hover:bg-[#16a34a] hover:text-white text-xs font-bold rounded-[4px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isRecordingDailyReading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Querying Satellites...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          {isRecordingDailyReading ? "Recording Daily Reading..." : "Record Daily Reading"}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}


            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#6b7280] font-bold uppercase mb-1">
                  SETTLE POOL WHEN IT EXPRIES (21 days)
                </label>

              </div>

              <button
                onClick={handleExpirePool}
                disabled={!hasReached21Days}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${hasReached21Days
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {hasReached21Days
                  ? 'Trigger Expiration'
                  : `Unavailable at the moment`}
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}