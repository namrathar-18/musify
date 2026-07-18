import { Link } from 'react-router-dom';

// Small shared presentational primitives used across pages.

export const Section = ({ title, action, children }) => (
  <section className="animate-fade-up">
    <div className="flex items-end justify-between mb-3">
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

// Horizontally scrollable card row
export const CardRow = ({ children }) => (
  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
    {children}
  </div>
);

export const SkeletonCard = () => (
  <div className="w-40 shrink-0 animate-pulse">
    <div className="w-40 h-40 rounded-lg bg-surface-800" />
    <div className="h-3 bg-surface-800 rounded mt-3 w-3/4" />
    <div className="h-3 bg-surface-800 rounded mt-2 w-1/2" />
  </div>
);

export const SkeletonRows = ({ count = 6 }) => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-2">
        <div className="w-10 h-10 rounded bg-surface-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-800 rounded w-1/3" />
          <div className="h-3 bg-surface-800 rounded w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonRow = () => (
  <CardRow>
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </CardRow>
);

export const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    {Icon && (
      <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted" />
      </div>
    )}
    <h3 className="text-lg font-bold">{title}</h3>
    {subtitle && <p className="text-muted text-sm mt-1 max-w-sm">{subtitle}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const AlbumCard = ({ album }) => (
  <Link
    to={`/album/${album.id}`}
    className="w-40 shrink-0 group focus-visible:outline-accent"
  >
    <div className="w-40 h-40 rounded-lg overflow-hidden bg-surface-800 shadow-lg">
      {album.image && (
        <img
          src={album.image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </div>
    <div className="mt-2 font-semibold text-sm truncate group-hover:text-accent transition-colors">
      {album.name}
    </div>
    <div className="text-muted text-xs truncate">{album.artist}</div>
  </Link>
);

export const PodcastCard = ({ podcast }) => (
  <Link
    to={`/podcast/${podcast.id}`}
    className="w-40 shrink-0 group focus-visible:outline-accent"
  >
    <div className="w-40 h-40 rounded-lg overflow-hidden bg-surface-800 shadow-lg">
      {podcast.image && (
        <img
          src={podcast.image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
    </div>
    <div className="mt-2 font-semibold text-sm truncate group-hover:text-accent transition-colors">
      {podcast.name}
    </div>
    <div className="text-muted text-xs truncate">{podcast.publisher}</div>
  </Link>
);
