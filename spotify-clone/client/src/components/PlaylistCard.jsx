import { Link } from 'react-router-dom';
import { Music } from 'lucide-react';

export default function PlaylistCard({ playlist }) {
  return (
    <Link
      to={`/playlist/${playlist._id}`}
      className="bg-surface-900 hover:bg-surface-800 p-4 rounded-md transition-colors block"
    >
      <div className="w-full aspect-square rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg">
        <Music size={36} className="text-white/80" />
      </div>
      <div className="font-semibold truncate">{playlist.name}</div>
      <div className="text-muted text-sm truncate">
        {playlist.tracks?.length || 0} tracks
      </div>
    </Link>
  );
}
