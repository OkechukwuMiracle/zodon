import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you are looking for does not exist."
        action={<Link to="/" className="btn-primary">Back to dashboard</Link>}
      />
    </div>
  );
}
