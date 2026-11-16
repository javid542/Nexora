import { Globe2, Map, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HEADLINES, HeadlineItem, WORLD_HOTSPOTS } from '../data/stonicData';
import { filterHeadlines } from '../utils/stonicLogic';
import { WorldMonitorGlobe } from './WorldMonitorGlobe';

type MonitorViewMode = '3d' | '2d';
type RegionFilter = HeadlineItem['region'] | 'All';

export function WorldMonitorSection() {
  const [viewMode, setViewMode] = useState<MonitorViewMode>('3d');
  const [hotspots, setHotspots] = useState(WORLD_HOTSPOTS);
  const [headlines, setHeadlines] = useState(HEADLINES);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>(WORLD_HOTSPOTS[0].id);
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('All');
  const [utcNow, setUtcNow] = useState<string>(() => new Date().toISOString().slice(11, 19));

  useEffect(() => {
    const id = window.setInterval(() => {
      setUtcNow(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void fetch('/api/world/telemetry')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hotspots?: typeof WORLD_HOTSPOTS; headlines?: typeof HEADLINES } | null) => {
        if (data?.hotspots?.length) setHotspots(data.hotspots);
        if (data?.headlines?.length) setHeadlines(data.headlines);
      })
      .catch(() => {});
  }, []);

  const activeHotspot =
    hotspots.find((h) => h.id === selectedHotspotId) || hotspots[0];
  const visibleHeadlines = filterHeadlines(headlines, regionFilter);

  return (
    <section
      id="world-monitor"
      aria-labelledby="world-monitor-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 border-t border-white/10"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
            World Monitor · Mission Control
          </p>
          <h2
            id="world-monitor-heading"
            className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white text-balance"
          >
            The whole world, on your radar.
          </h2>
          <p className="mt-3 text-base text-slate-400 leading-relaxed">
            Spin the 3D globe or flip to the 2D command map on live UTC time, click regional hotspots, and scan today&apos;s headlines in one workspace.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="font-mono text-xs text-slate-300 tabular-nums border border-white/10 bg-[#0A0F1A] rounded-lg px-3 py-2">
            UTC {utcNow}
          </div>
          <div className="inline-flex rounded-lg border border-white/10 bg-[#0A0F1A] p-1 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '3d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe2 className="h-3.5 w-3.5" />
              <span>3D Globe</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === '2d' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              <span>2D Command Map</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Left: 3D Globe or 2D Equirectangular Command Map */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/10 bg-[#0A0F1A] p-5">
          <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-lg border border-white/10 bg-[#05070B]">
            {viewMode === '3d' ? (
              <WorldMonitorGlobe
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={setSelectedHotspotId}
              />
            ) : (
              <svg
                viewBox="0 0 800 400"
                role="img"
                aria-label="2D Command Map with active hotspots"
                className="h-full w-full bg-[#060A13]"
              >
                {/* Command Grid */}
                {Array.from({ length: 9 }).map((_, idx) => (
                  <line
                    key={`vx-${idx}`}
                    x1={(idx + 1) * 80}
                    y1={0}
                    x2={(idx + 1) * 80}
                    y2={400}
                    stroke="rgba(59,130,246,0.14)"
                    strokeWidth="1"
                  />
                ))}
                {Array.from({ length: 4 }).map((_, idx) => (
                  <line
                    key={`hy-${idx}`}
                    x1={0}
                    y1={(idx + 1) * 80}
                    x2={800}
                    y2={(idx + 1) * 80}
                    stroke="rgba(59,130,246,0.14)"
                    strokeWidth="1"
                  />
                ))}
                {/* Stylized Continental Silhouettes */}
                <ellipse cx="185" cy="135" rx="85" ry="52" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />
                <ellipse cx="250" cy="265" rx="45" ry="68" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />
                <ellipse cx="425" cy="120" rx="52" ry="34" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />
                <ellipse cx="440" cy="230" rx="58" ry="70" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />
                <ellipse cx="590" cy="145" rx="115" ry="62" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />
                <ellipse cx="670" cy="295" rx="48" ry="32" fill="#101B2E" stroke="rgba(96,165,250,0.3)" />

                {/* Interactive Hotspot Pins */}
                {WORLD_HOTSPOTS.map((hs) => {
                  const x = ((hs.lon + 180) / 360) * 800;
                  const y = ((90 - hs.lat) / 180) * 400;
                  const active = hs.id === activeHotspot.id;
                  return (
                    <g
                      key={hs.id}
                      onClick={() => setSelectedHotspotId(hs.id)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={active ? 14 : 9}
                        fill={active ? 'rgba(251,191,36,0.2)' : 'rgba(59,130,246,0.2)'}
                        stroke={active ? '#FBBF24' : '#60A5FA'}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={active ? 5 : 3.5}
                        fill={active ? '#FBBF24' : '#93C5FD'}
                      />
                      <text
                        x={x + 12}
                        y={y + 4}
                        fill={active ? '#FEF3C7' : '#CBD5E1'}
                        fontSize="11"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {hs.city}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Hotspot selector strip + selected detail */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {WORLD_HOTSPOTS.map((hs) => {
                const active = hs.id === activeHotspot.id;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setSelectedHotspotId(hs.id)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                        : 'border-white/10 bg-[#05070B] text-slate-400 hover:text-white'
                    }`}
                  >
                    {hs.city}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-white/10 bg-[#05070B] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
                <span>
                  {activeHotspot.city}, {activeHotspot.country} · {activeHotspot.lat.toFixed(2)}°,{' '}
                  {activeHotspot.lon.toFixed(2)}°
                </span>
                <span>{activeHotspot.timestampUtc}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white">{activeHotspot.headline}</p>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{activeHotspot.summary}</p>
            </div>
          </div>
        </div>

        {/* Right: Headlines Feed */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-white/10 bg-[#0A0F1A] p-5">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-blue-400" />
              <h3 className="font-display text-base font-semibold text-white">Today&apos;s Headlines</h3>
            </div>
            <label htmlFor="region-filter" className="sr-only">
              Filter headlines by region
            </label>
            <select
              id="region-filter"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as RegionFilter)}
              className="rounded-md border border-white/10 bg-[#05070B] px-2.5 py-1 text-xs text-slate-200 focus:border-blue-400 focus:outline-none"
            >
              <option value="All">All Regions</option>
              <option value="Americas">Americas</option>
              <option value="Europe">Europe</option>
              <option value="Asia-Pacific">Asia-Pacific</option>
              <option value="Middle East">Middle East</option>
            </select>
          </div>

          <ul className="mt-4 flex-1 space-y-3 overflow-y-auto">
            {visibleHeadlines.map((hl) => (
              <li
                key={hl.id}
                className="rounded-lg border border-white/10 bg-[#05070B] p-4 transition-colors hover:border-white/20"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <span>
                    {hl.source} · {hl.category}
                  </span>
                  <span>{hl.timeAgo}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-slate-100 leading-snug">
                  {hl.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">{hl.region}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
