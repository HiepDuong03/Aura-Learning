import React, { useState } from 'react';

interface AvatarBadgeProps {
  src?: string;
  name: string;
  className?: string;
}

const PALETTES = [
  'from-teal-500 to-emerald-600',
  'from-indigo-500 to-violet-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600'
];

function getInitials(name: string): string {
  const parts = (name || 'AI').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  return (parts[0] || 'AI').slice(0, 2).toUpperCase();
}

function getPalette(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length] || PALETTES[0];
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({ src, name, className = 'size-11 rounded-2xl' }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const palette = getPalette(name);
  const initials = getInitials(name);

  if (!src || failed) {
    return (
      <div
        aria-label={name}
        className={`${className} bg-gradient-to-br ${palette} text-white font-black text-xs flex items-center justify-center shrink-0 select-none`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-gradient-to-br ${palette} shrink-0`}>
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xs select-none">
          {initials}
        </span>
      )}
      <img
        src={src}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
