import type { ComponentChildren, JSX } from 'preact';

import { ELEMENT_INFO, type ElementId } from '../../game/elements';

/** Progress meter. `tone` picks the fill colour. */
export function Meter({
  value,
  tone = 'jade',
  height = 10,
}: {
  value: number;
  tone?: 'jade' | 'gold' | 'blood';
  height?: number;
}): JSX.Element {
  const ratio = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div class="meter" style={{ height: `${height}px` }}>
      <div class={`meter-fill ${tone === 'jade' ? '' : tone}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

/** Rotated-square frame with upright contents. */
export function Diamond({
  children,
  lit,
  badge,
  onClick,
  size,
}: {
  children: ComponentChildren;
  lit?: boolean;
  badge?: number;
  onClick?: () => void;
  size?: number;
}): JSX.Element {
  return (
    <button
      class={`diamond${lit ? ' diamond-lit' : ''}`}
      onClick={onClick}
      style={size ? { width: `${size}px`, height: `${size}px` } : undefined}
    >
      <span>{children}</span>
      {badge !== undefined && badge > 0 ? (
        <i class="badge" style={{ transform: 'rotate(-45deg)' }}>
          {badge > 99 ? '99+' : badge}
        </i>
      ) : null}
    </button>
  );
}

/** Coloured phase chip carrying its Han character. */
export function ElChip({ element }: { element: ElementId }): JSX.Element {
  const info = ELEMENT_INFO[element];
  return (
    <i class={`el ${info.css}`} title={info.name}>
      {info.han}
    </i>
  );
}

/**
 * The trigram ring behind the cultivation seal. Drawn as SVG so it stays crisp
 * and can be tinted from the palette; the eight marks are the bagua, spaced
 * evenly the way the reference's altar is.
 */
export function TrigramRing({ className }: { className?: string }): JSX.Element {
  const marks = Array.from({ length: 8 }, (_, i) => i);

  return (
    <svg class={className} viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" stroke-width="0.7" />
      <circle cx="100" cy="100" r="78" fill="none" stroke="currentColor" stroke-width="1.6" />
      <circle
        cx="100"
        cy="100"
        r="62"
        fill="none"
        stroke="currentColor"
        stroke-width="0.6"
        stroke-dasharray="3 7"
      />
      {marks.map((index) => {
        const angle = (index / 8) * 360;
        // Each trigram is three bars; the pattern differs per position so the
        // ring reads as the bagua rather than eight identical ticks.
        const bars = [index & 1, (index >> 1) & 1, (index >> 2) & 1];
        return (
          <g key={index} transform={`rotate(${angle} 100 100)`}>
            {bars.map((broken, row) => {
              const y = 82 + row * 5.5;
              return broken ? (
                <g key={row}>
                  <rect x="86" y={y} width="11" height="2.6" fill="currentColor" />
                  <rect x="103" y={y} width="11" height="2.6" fill="currentColor" />
                </g>
              ) : (
                <rect key={row} x="86" y={y} width="28" height="2.6" fill="currentColor" />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/** Full-screen dialog. The scrim closes it; the panel swallows its own taps. */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
}): JSX.Element {
  return (
    <div class="scrim" onClick={onClose}>
      <div class="modal panel" onClick={(event) => event.stopPropagation()}>
        <div class="modal-head">
          <i class="seal">道</i>
          <span class="modal-title">{title}</span>
          <button class="modal-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div class="modal-body scroll">{children}</div>
        {footer ? <div class="modal-body" style={{ paddingTop: 0 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

/** A labelled figure, used across the stat panels. */
export function Stat({
  name,
  value,
  tone,
}: {
  name: string;
  value: string;
  tone?: string;
}): JSX.Element {
  return (
    <div class="row" style={{ justifyContent: 'space-between' }}>
      <span class="stat-name">{name}</span>
      <b class={`num ${tone ?? ''}`}>{value}</b>
    </div>
  );
}
