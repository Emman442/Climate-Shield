import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Pool, Policy, PayoutRecord } from '../lib/contract/types';
import { MapPin, Calendar, HelpCircle, ArrowRight, ShieldCheck, FileText, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { useWallet } from '../lib/genlayer/wallet';
import toast from '../lib/utils/toast';
import { useCancelPolicy, useFetchConsecutiveDroughtDays, useFetchFarmerPayouts, useFetchWeatherReading } from '../hooks/ClimateShield';

interface MyCoveragePageProps {
  pools: Pool[];
  setCurrentTab: (tab: string) => void;
  setSelectedPoolId: (id: string) => void;
}

export default function MyCoveragePage({ pools, setCurrentTab, setSelectedPoolId }: MyCoveragePageProps) {
  const { address } = useWallet();
  const { showToast } = useApp();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const {data: payouts} = useFetchFarmerPayouts(address!)
  const [isLoading, setIsLoading] = useState(false);


  const [cancellingPolicyId, setCancellingPolicyId] = useState<string | null>(null);
  const { isPending: isCancellingPolicy, mutate: cancelPolicy } = useCancelPolicy()
  const balance = 5000;

  if (!address) {
    return (
      <div className="bg-[#000000] text-white min-h-[80vh] flex items-center justify-center py-10 px-4">
        <div className="max-w-md w-full bg-[#0f0f0f] border border-[#1e1e1e] p-8 rounded-[6px] text-center space-y-4">
          <HelpCircle className="w-12 h-12 text-[#6b7280] mx-auto" />
          <h2 className="text-xl font-bold">Wallet Connection Required</h2>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            Connect your EVM wallet to view coverage certificates, track daily weather telemetry, and view parametric payout histories.
          </p>
        </div>
      </div>
    );
  }

  const handleCancelPolicy = async (policy: Policy) => {
    cancelPolicy({ policyId: policy.policy_id }, {
      onSuccess: () => {
        showToast("Policy cancelled successfully", "success")
      },
      onError: () => {
        showToast("Failed to create policy", "error")
      }
    })
  };

  const handleViewPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setCurrentTab(`pool-${poolId}`);
  };

  // Drought index colors
  const getIndexDotColor = (index: string) => {
    switch (index) {
      case 'normal': return 'bg-[#16a34a]';
      case 'watch': return 'bg-[#ca8a04]';
      case 'warning': return 'bg-[#d97706]';
      case 'severe': return 'bg-[#dc2626]';
      default: return 'bg-[#374151]';
    }
  };

  const activePolicies = policies.filter(p => p.active === true);

  return (
    <div className="bg-[#000000] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Title */}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">My Coverage</h1>
            <p className="text-xs text-[#6b7280] font-mono">
              FARMER WORKSPACE: {address.slice(0, 10)}...{address.slice(-8)}
            </p>
          </div>
          {/* <button
            onClick={fetchFarmerData}
            disabled={isLoading}
            className="p-2 border border-[#1e1e1e] hover:border-[#16a34a] text-[#6b7280] hover:text-white rounded-[4px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button> */}
        </div>

        {/* Policies Content */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-24 bg-[#1e1e1e] rounded-[4px]" />
            <div className="h-24 bg-[#1e1e1e] rounded-[4px]" />
          </div>
        ) : policies.length === 0 ? (
          <div className="p-12 border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] text-center space-y-5">
            <FileText className="w-12 h-12 text-[#6b7280] mx-auto" />
            <div className="space-y-2">
              <h3 className="text-white font-bold text-base">You have no active policies</h3>
              <p className="text-xs text-[#6b7280] max-w-sm mx-auto leading-relaxed">
                Browse our decentralized, autonomous parametric coverage pools in your farming region to purchase emergency drought protection.
              </p>
            </div>
            <button
              onClick={() => setCurrentTab('pools')}
              className="px-5 py-2 bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-bold rounded-[4px] transition-colors cursor-pointer"
            >
              Find a Pool
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policies.map((policy) => {
                const pool = pools.find(p => p.pool_id === policy.pool_id);
                if (!pool) return null;
                const { data: consecutive_drought_days } = useFetchConsecutiveDroughtDays(pool.pool_id)
                const daysRemaining = Math.max(0, pool.consecutive_days_required - Number(consecutive_drought_days));
                const { data: weatherReading } = useFetchWeatherReading(pool.pool_id)

                return (
                  <div
                    key={policy.policy_id}
                    className="bg-[#0f0f0f] border-l-4 border-l-[#16a34a] border border-[#1e1e1e] p-5 rounded-[6px] flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Name & Badge Row */}
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <h3 className="text-white text-sm font-bold leading-tight">{pool.name}</h3>
                          <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{pool.region_name}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${policy.active
                          ? 'border-[#16a34a] text-[#16a34a]'
                          : policy.claimed
                            ? 'border-[#6b7280] text-[#6b7280]'
                            : 'border-red-900 text-[#dc2626]'
                          }`}>
                          {policy.active ? "active" : policy.claimed ? "claimed" : "inactive"}

                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-[#141414] rounded-[4px] text-xs">
                        <div>
                          <span className="text-[#6b7280] block text-[10px] uppercase">Policy ID</span>
                          <span className="font-mono text-white break-all">{policy.policy_id}</span>
                        </div>
                        <div>
                          <span className="text-[#6b7280] block text-[10px] uppercase">Premium Paid</span>
                          <span className="font-mono text-white font-bold">{policy.premium_paid} GEN</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[#6b7280] block text-[10px] uppercase">Member Since</span>
                          <span className="font-mono text-white">{policy.joined_at}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-[#6b7280] block text-[10px] uppercase">Target Coverage</span>
                          <span className="font-mono text-[#22c55e] font-bold">{policy.coverage_amount} GEN</span>
                        </div>
                      </div>

                      {/* Streak Status Line */}
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-[#1e1e1e]">
                        <span className="text-[#6b7280] flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${getIndexDotColor(weatherReading?.drought_index!)}`} />
                          Drought status: <strong className="text-white font-normal">{weatherReading?.drought_index}</strong>
                        </span>

                        {policy.active && (
                          <span className="text-[11px] font-mono text-white">
                            {daysRemaining === 0 ? (
                              <strong className="text-[#22c55e] font-semibold">Conditions Met</strong>
                            ) : (
                              <span>{daysRemaining} streak days remaining</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handleViewPool(pool.pool_id)}
                        className="text-xs font-bold text-[#16a34a] hover:text-[#22c55e] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        View Pool Page
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {policy.active && (
                        cancellingPolicyId === policy.policy_id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCancelPolicy(policy)}
                              className="px-2 py-1 bg-[#dc2626] hover:bg-red-700 text-white text-[10px] font-bold rounded-[3px] cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setCancellingPolicyId(null)}
                              className="px-2 py-1 bg-[#1e1e1e] text-[#6b7280] text-[10px] font-bold rounded-[3px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingPolicyId(policy.policy_id)}
                            className="text-[10px] text-[#6b7280] hover:text-[#dc2626] cursor-pointer transition-colors"
                          >
                            Cancel policy (50% refund)
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payout History Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Received Payouts</h2>
              {payouts?.length === 0 ? (
                <div className="p-8 border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] text-center text-xs text-[#6b7280] italic">
                  No parametric payout disbursements received yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts?.map((payout) => {
                    const pool = pools.find(p => p.pool_id === payout.pool_id);
                    return (
                      <div
                        key={payout.payout_id}
                        className="bg-[#0f0f0f] border border-[#1e1e1e] p-5 rounded-[6px] flex flex-col md:flex-row justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-[#14532d] text-[#22c55e] text-[10px] font-bold rounded-[3px]">
                              DISBURSED
                            </span>
                            <h4 className="text-white text-sm font-bold">{pool?.name || 'Crop Pool'}</h4>
                          </div>
                          <p className="text-xs text-[#6b7280]">{payout.trigger_reason}</p>
                          <p className="text-[10px] text-[#6b7280] font-mono">Date: {payout.paid_at} | Transaction ID: {payout.payout_id}</p>
                        </div>
                        <div className="flex md:flex-col justify-between items-end shrink-0">
                          <span className="text-[#6b7280] text-[10px] uppercase block">Funds Disbursed</span>
                          <span className="text-xl font-mono text-[#22c55e] font-bold">+{payout.amount} GEN</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
