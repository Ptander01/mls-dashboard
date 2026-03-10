import { useState, useEffect, useRef } from 'react';
import FilterPanel from '@/components/FilterPanel';
import PlayerStats from '@/components/tabs/PlayerStats';
import TeamBudget from '@/components/tabs/TeamBudget';
import Attendance from '@/components/tabs/Attendance';
import TravelMap from '@/components/tabs/TravelMap';
import PitchMatch from '@/components/tabs/PitchMatch';
import { useFilters } from '@/contexts/FilterContext';
import { Users, DollarSign, BarChart3, Map, Target } from 'lucide-react';

const HERO_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663348511113/fBEeqeVYwBHXg2g2gjhenP/hero-stadium-YUnnMoGMi6PoZPwoH5aXFc.webp';

const tabs = [
  { id: 'players', label: 'Player Stats', icon: Users },
  { id: 'budget', label: 'Team Budget', icon: DollarSign },
  { id: 'attendance', label: 'Attendance', icon: BarChart3 },
  { id: 'travel', label: 'Travel Map', icon: Map },
  { id: 'pitch', label: 'Pitch Match', icon: Target },
];

// Exploded Z-axis assembly animation component
function ZAssemblyTitle() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const letters = 'MLS'.split('');
  const word2 = 'Analytics'.split('');

  return (
    <div className="flex items-baseline gap-1 mb-1">
      <div className="w-1 h-10 rounded-full bg-cyan" style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'scaleY(1)' : 'scaleY(0)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        transformOrigin: 'bottom',
        boxShadow: '0 0 12px rgba(0,212,255,0.5)',
      }} />
      <div className="flex">
        {letters.map((l, i) => (
          <span
            key={`mls-${i}`}
            className="text-4xl font-bold text-white inline-block"
            style={{
              fontFamily: 'Space Grotesk',
              opacity: phase >= 1 ? 1 : 0,
              transform: phase >= 1
                ? 'perspective(800px) translateZ(0) scale(1)'
                : `perspective(800px) translateZ(${200 + i * 100}px) scale(${1.3 + i * 0.1})`,
              filter: phase >= 1 ? 'blur(0)' : `blur(${6 + i * 2}px)`,
              transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <div className="flex ml-2">
        {word2.map((l, i) => (
          <span
            key={`an-${i}`}
            className="text-4xl font-bold text-cyan inline-block"
            style={{
              fontFamily: 'Space Grotesk',
              textShadow: phase >= 2 ? '0 0 15px rgba(0,212,255,0.5), 0 0 30px rgba(0,212,255,0.2)' : 'none',
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2
                ? 'perspective(800px) translateZ(0) translateY(0) scale(1)'
                : `perspective(800px) translateZ(${300 + i * 80}px) translateY(-${10 + i * 3}px) scale(${1.2 + i * 0.05})`,
              filter: phase >= 2 ? 'blur(0)' : `blur(${8 + i * 1.5}px)`,
              transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.04}s`,
            }}
          >
            {l}
          </span>
        ))}
      </div>
      <span
        className="text-xs font-mono text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full ml-3 border border-white/5"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'perspective(800px) translateZ(0)' : 'perspective(800px) translateZ(500px)',
          filter: phase >= 3 ? 'blur(0)' : 'blur(12px)',
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        2025 SEASON
      </span>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('players');
  const [loaded, setLoaded] = useState(false);
  const [tabTransition, setTabTransition] = useState(false);
  const { isFilterActive, filteredPlayers, filteredTeams } = useFilters();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setTabTransition(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setTabTransition(false);
    }, 150);
  };

  return (
    <div className="min-h-screen noise-bg relative" style={{ background: '#121220' }}>
      {/* Hero Header with cinematic entry */}
      <header className="relative overflow-hidden" style={{ height: '200px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${HERO_IMG})`,
            filter: 'brightness(0.3) saturate(1.3) contrast(1.1)',
            transform: loaded ? 'scale(1)' : 'scale(1.1)',
            transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#12122080] to-[#121220]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121220cc] via-transparent to-[#12122066]" />
        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.03 }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '200%',
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)',
            animation: 'scan-line 8s linear infinite',
          }} />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-5">
          <ZAssemblyTitle />
          <div style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.2s',
          }}>
            <p className="text-xs text-muted-foreground ml-6 font-mono tracking-wider">
              <span className="text-white/40">///</span>{' '}
              {filteredTeams.length} teams{' '}
              <span className="text-white/20">·</span>{' '}
              {filteredPlayers.length} players{' '}
              <span className="text-white/20">·</span>{' '}
              510 matches
              {isFilterActive && (
                <span className="text-cyan ml-2 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-glow-pulse" />
                  filtered
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        className="sticky top-0 z-30 px-4 py-2.5 border-b border-white/[0.03]"
        style={{
          background: 'rgba(18,18,32,0.92)',
          backdropFilter: 'blur(16px) saturate(1.5)',
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
        }}
      >
        <div className="max-w-[1600px] mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative group"
                style={{
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'perspective(800px) translateZ(0)' : `perspective(800px) translateZ(${150 + i * 60}px)`,
                  filter: loaded ? 'blur(0)' : `blur(${4 + i}px)`,
                  transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.9 + i * 0.06}s`,
                }}
              >
                <div className={`tab-btn flex items-center gap-2 whitespace-nowrap ${isActive ? 'active' : ''}`}>
                  <Icon size={14} />
                  {tab.label}
                </div>
                {/* Active indicator line */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-cyan"
                    style={{
                      boxShadow: '0 0 8px rgba(0,212,255,0.5)',
                      animation: 'slide-up-fade 0.3s ease-out',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content Area */}
      <main className="px-4 pb-8 max-w-[1600px] mx-auto">
        <div
          key={activeTab}
          style={{
            opacity: tabTransition ? 0 : 1,
            transform: tabTransition ? 'translateY(15px)' : 'translateY(0)',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {activeTab === 'players' && <PlayerStats />}
          {activeTab === 'budget' && <TeamBudget />}
          {activeTab === 'attendance' && <Attendance />}
          {activeTab === 'travel' && <TravelMap />}
          {activeTab === 'pitch' && <PitchMatch />}
        </div>
      </main>

      {/* Filter Panel */}
      <FilterPanel />
    </div>
  );
}
