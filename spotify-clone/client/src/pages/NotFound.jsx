import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="h-full flex items-center justify-center">
      <EmptyState
        icon={Compass}
        title="Page not found"
        subtitle="The page you're looking for doesn't exist or has moved."
        action={
          <Link
            to="/"
            className="bg-accent-deep hover:bg-accent text-white font-semibold rounded-full px-6 py-2.5 inline-block"
          >
            Back to Home
          </Link>
        }
      />
    </div>
  );
}
