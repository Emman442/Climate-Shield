import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Menu, X, Leaf, ChevronDown, User, LogOut, Wallet, Shield } from 'lucide-react';
import { useWallet } from '../lib/genlayer/wallet';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const { address, disconnectWallet, connectWallet } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const balance = 0
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS

  const truncatedAddress = address 
    ? `${address.slice(0, 6)}...${address.slice(-4)}` 
    : '';

  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const handleNavClick = (tab: string) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setDropdownOpen(false);
    setCurrentTab('landing');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000] border-b border-[#1e1e1e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand */}
        <button 
          id="nav-logo-btn"
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2 text-white font-bold text-xl tracking-tight focus:outline-none cursor-pointer"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 12 10 2 12C2 12 10 12 12 22C12 22 12 14 22 12C22 12 14 12 12 2Z" fill="#16a34a"/>
          </svg>
          <span>ClimateShield</span>
        </button>

        {/* Center/Right: Desktop navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            id="nav-explore-btn"
            onClick={() => handleNavClick('pools')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'pools' || currentTab.startsWith('pool-') 
                ? 'text-[#22c55e]' 
                : 'text-white hover:text-[#22c55e]'
            }`}
          >
            Explore Pools
          </button>
          <button 
            id="nav-how-it-works-btn"
            onClick={() => handleNavClick('how-it-works')}
            className={`text-sm font-medium transition-colors cursor-pointer ${
              currentTab === 'how-it-works' ? 'text-[#22c55e]' : 'text-white hover:text-[#22c55e]'
            }`}
          >
            How It Works
          </button>
          
          {address && (
            <button 
              id="nav-coverage-btn"
              onClick={() => handleNavClick('coverage')}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                currentTab === 'coverage' ? 'text-[#22c55e]' : 'text-white hover:text-[#22c55e]'
              }`}
            >
              My Coverage
            </button>
          )}

          {isAdmin && (
            <button 
              id="nav-admin-btn"
              onClick={() => handleNavClick('admin')}
              className={`text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                currentTab === 'admin' ? 'text-[#dc2626] font-semibold' : 'text-[#6b7280] hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          )}
        </nav>

        {/* Right: Wallet Connect */}
        <div className="hidden md:flex items-center gap-4">
          {address ? (
            <div className="relative">
              <button
                id="wallet-dropdown-trigger-btn"
                onClick={toggleDropdown}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#000000] border border-[#16a34a] hover:border-[#22c55e] text-white text-xs font-mono rounded-[4px] focus:outline-none transition-colors cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></div>
                <span>{truncatedAddress}</span>
                <span className="text-[#6b7280] font-normal font-sans border-l border-[#1e1e1e] pl-2 ml-1">
                  {balance} GEN
                </span>
                <ChevronDown className="w-3 h-3 text-[#6b7280]" />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] shadow-2xl py-1 z-50">
                    <button
                      id="dropdown-coverage-btn"
                      onClick={() => {
                        handleNavClick('coverage');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-white hover:bg-[#141414] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#6b7280]" />
                      My Coverage
                    </button>
                    {isAdmin && (
                      <button
                        id="dropdown-admin-btn"
                        onClick={() => {
                          handleNavClick('admin');
                          setDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-white hover:bg-[#141414] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-[#dc2626]" />
                        Admin Panel
                      </button>
                    )}
                    <div className="border-t border-[#1e1e1e] my-1"></div>
                    <button
                      id="dropdown-disconnect-btn"
                      onClick={handleDisconnect}
                      className="w-full px-4 py-2 text-left text-xs text-[#dc2626] hover:bg-[#141414] transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              id="desktop-connect-wallet-btn"
              // onClick={() => setIsConnectModalOpen(true)}
              onClick={connectWallet}
              className="px-4 py-1.5 bg-[#16a34a] hover:bg-[#22c55e] text-white text-xs font-bold tracking-tight rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-3">
          {address && (
            <span className="text-[10px] font-mono text-[#16a34a] border border-[#14532d] bg-[#0f0f0f] px-2 py-0.5 rounded-[4px]">
              {balance} GEN
            </span>
          )}
          <button
            id="mobile-menu-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:text-[#22c55e] focus:outline-none cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col md:hidden">
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#1e1e1e]">
            <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C12 2 12 10 2 12C2 12 10 12 12 22C12 22 12 14 22 12C22 12 14 12 12 2Z" fill="#16a34a"/>
              </svg>
              <span>ClimateShield</span>
            </div>
            <button
              id="close-mobile-drawer-btn"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[#22c55e] cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <button
                id="mobile-nav-explore-btn"
                onClick={() => handleNavClick('pools')}
                className={`text-left text-lg font-semibold py-2 border-b border-[#1e1e1e] cursor-pointer ${
                  currentTab === 'pools' ? 'text-[#22c55e]' : 'text-white'
                }`}
              >
                Explore Pools
              </button>
              <button
                id="mobile-nav-how-it-works-btn"
                onClick={() => handleNavClick('how-it-works')}
                className={`text-left text-lg font-semibold py-2 border-b border-[#1e1e1e] cursor-pointer ${
                  currentTab === 'how-it-works' ? 'text-[#22c55e]' : 'text-white'
                }`}
              >
                How It Works
              </button>
              {address && (
                <button
                  id="mobile-nav-coverage-btn"
                  onClick={() => handleNavClick('coverage')}
                  className={`text-left text-lg font-semibold py-2 border-b border-[#1e1e1e] cursor-pointer ${
                    currentTab === 'coverage' ? 'text-[#22c55e]' : 'text-white'
                  }`}
                >
                  My Coverage
                </button>
              )}
              {isAdmin && (
                <button
                  id="mobile-nav-admin-btn"
                  onClick={() => handleNavClick('admin')}
                  className={`text-left text-[#dc2626] text-lg font-semibold py-2 border-b border-[#1e1e1e] cursor-pointer flex items-center gap-2`}
                >
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </button>
              )}
            </div>

            <div className="pt-4">
              {address ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[4px] font-mono text-xs">
                    <p className="text-[#6b7280] mb-1">CONNECTED WALLET</p>
                    <p className="text-white font-bold text-sm mb-2 break-all">{address}</p>
                    <div className="flex justify-between items-center border-t border-[#1e1e1e] pt-2 mt-2">
                      <span className="text-[#6b7280]">Wallet Balance:</span>
                      <span className="text-white font-bold">{balance} GEN</span>
                    </div>
                  </div>
                  <button
                    id="mobile-disconnect-wallet-btn"
                    onClick={handleDisconnect}
                    className="w-full py-3 bg-[#dc2626] hover:bg-red-700 text-white font-bold text-sm rounded-[4px] transition-colors cursor-pointer"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              ) : (
                <button
                  id="mobile-connect-wallet-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsConnectModalOpen(true);
                  }}
                  className="w-full py-3 bg-[#16a34a] hover:bg-[#22c55e] text-white font-bold text-sm rounded-[4px] transition-colors cursor-pointer"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
