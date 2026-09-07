import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
}

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      q: "What is the Soil Moisture Index?",
      a: "The soil moisture index represents the volume of water per unit volume of soil (m³/m³) in the topsoil layer (0-7cm). It is tracked daily via satellite microwave sensors, providing a highly reliable, objective proxy for vegetative crop health and water availability without requiring manual physical probes."
    },
    {
      q: "What counts as a severe drought?",
      a: "A severe drought is classified when the satellite soil moisture index falls below 60% of the historical regional median (the 'Drought Threshold' configured in the pool). Sustained periods below this threshold lead to irreparable cellular desiccation in crop leaves and severe grain yield stunting."
    },
    {
      q: "How quickly are payouts distributed after a trigger?",
      a: "Payouts are entirely automated. As soon as the daily consensus Oracle writes the final required consecutive dry reading to the pool, the smart contract's trigger conditions are unlocked. Anyone can trigger the distribution block, causing immediate wallet-to-wallet transfer of the coverage capital to all active policy holders in the region."
    },
    {
      q: "Can I cancel my policy?",
      a: "Yes, active policies can be cancelled at any time before the pool triggers. Cancelling a policy triggers an immediate, automated 50% premium refund from the pool's vault. The remaining 50% is retained in the vault to support coverage liquidity for other farmers in the cooperative."
    },
    {
      q: "What if the vault does not have enough to cover everyone?",
      a: "ClimateShield encourages pools to remain fully or over-collateralized. If a pool's policies exceed its vault capital, emergency funding can be deposited at any time by humanitarian NGOs, local governments, or cooperatives. The smart contract distributes available funds proportionately if collateralization falls below 100%."
    },
    {
      q: "Who records the daily weather readings?",
      a: "Readings are written by decentralized nodes querying the Open-Meteo satellite API. Any cooperative worker, farmer, or interested user can initiate the daily transaction. The validator consensus network cross-checks the physical coordinate response before executing the transaction and committing the moisture decimal to the blockchain."
    }
  ];

  return (
    <div className="bg-[#000000] text-white min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Page Title */}
        <div className="space-y-4 text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">How ClimateShield Works</h1>
          <p className="text-sm text-[#6b7280] max-w-2xl">
            A deep-dive look into decentralized parametric agriculture, satellite weather consensus, and zero-delay crop micro-insurance.
          </p>
        </div>

        {/* Section 1: The Problem */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight border-l-2 border-l-[#16a34a] pl-3">
            Why Smallholder Farmers Need This
          </h2>
          <div className="text-xs sm:text-sm text-[#6b7280] leading-relaxed space-y-4">
            <p>
              Traditional crop insurance is broken for smallholders. When a drought strikes remote farming cooperatives, assessing damage is a slow, expensive, and error-prone process. Insurance adjusters must physically visit isolated fields, manually cross-examine claims, and handle massive volumes of physical paperwork.
            </p>
            <p>
              This overhead means high premiums, months of delay before receiving relief, and frequent disputes. By the time traditional insurance payouts arrive, the planting season has passed, and smallholder families have already suffered critical livelihood loss. ClimateShield removes the middleman, replacing manual reviews with instant, automated satellite validation.
            </p>
          </div>
        </section>

        {/* Section 2: The Technology */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight border-l-2 border-l-[#16a34a] pl-3">
            Parametric Insurance on GenLayer
          </h2>
          <div className="text-xs sm:text-sm text-[#6b7280] leading-relaxed space-y-4">
            <p>
              ClimateShield operates on **parametric crop coverage**. Rather than paying out based on subjective damage reviews, our smart contracts monitor objective physical parameters—specifically, topsoil moisture content recorded by orbiting satellites.
            </p>
            <p>
              The platform interfaces directly with high-resolution synthetic aperture radar (SAR) satellite models via the Open-Meteo weather API. When a daily reading is recorded, GenLayer's decentralized validator network queries the GPS coordinates of the pool's designated agricultural radius. The validators reach consensus on the soil saturation decimal (m³/m³) before committing it to the blockchain history.
            </p>
            <p>
              A **consecutive dry streak of 21 days** (or the pool's custom threshold) is the agronomic standard for crop stunting. If the verified topsoil saturation falls below the pool's critical drought threshold for the required streak length, the policy's payout terms are unlocked automatically.
            </p>
          </div>
        </section>

        {/* Section 3: The Payout */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight border-l-2 border-l-[#16a34a] pl-3">
            How Payouts Work
          </h2>
          <div className="text-xs sm:text-sm text-[#6b7280] leading-relaxed space-y-4">
            <p>
              The entire lifecyle of a policy is handled securely by self-executing smart contracts:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 font-mono text-xs">
              <div className="p-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] space-y-2">
                <span className="text-[#16a34a] font-bold">STREAK UNLOCKED</span>
                <p className="text-[#6b7280] text-[11px] leading-relaxed">
                  Weather nodes record the final consecutive drought reading. The smart contract automatically verifies that the agronomic criteria have been fully met.
                </p>
              </div>
              <div className="p-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] space-y-2">
                <span className="text-[#16a34a] font-bold">TRIGGER INITIATED</span>
                <p className="text-[#6b7280] text-[11px] leading-relaxed">
                  Anyone can call the contract's check_trigger function. No board of directors or adjusters are required to approve the payout.
                </p>
              </div>
              <div className="p-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] space-y-2">
                <span className="text-[#16a34a] font-bold">AUTOMATED DISBURSEMENT</span>
                <p className="text-[#6b7280] text-[11px] leading-relaxed">
                  The pool's collateral vault releases funds, immediately executing direct wallet transfers of the GEN coverage amount to every active policy holder.
                </p>
              </div>
            </div>
            <p className="text-xs italic text-[#22c55e]">
              No human permission. No administrative delay. Just emergency liquidity delivered within seconds of drought validation.
            </p>
          </div>
        </section>

        {/* Section 4: FAQ */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white tracking-tight border-l-2 border-l-[#16a34a] pl-3">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 flex justify-between items-center text-left text-xs sm:text-sm font-semibold hover:bg-[#141414] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#6b7280]" /> : <ChevronDown className="w-4 h-4 text-[#6b7280]" />}
                  </button>
                  
                  {isOpen && (
                    <div className="p-4 border-t border-[#1e1e1e] bg-[#000000] text-xs text-[#6b7280] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
