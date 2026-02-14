import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { BreadcrumbItem } from '../../types';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  isPublic?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, isPublic = false }) => {
  const navigate = useNavigate();
  const baseUrl = isPublic ? '/public/f' : '/app/folder';
  const homeUrl = isPublic ? '/public' : '/app';

  // Calculate the back navigation target
  const handleBack = () => {
    if (items.length > 1) {
      // Navigate to parent folder (second to last item)
      navigate(`${baseUrl}/${items[items.length - 2].id}`);
    } else {
      // Navigate to root
      navigate(homeUrl);
    }
  };

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {/* Back button - only show when not in root */}
      {items.length > 0 && (
        <button
          onClick={handleBack}
          className="flex items-center px-2 py-1 mr-1 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}

      <Link
        to={homeUrl}
        className="flex items-center px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="ml-1.5 font-medium">{isPublic ? 'Public' : 'Home'}</span>
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
          {index === items.length - 1 ? (
            <span className="px-2 py-1 text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
              {item.name}
            </span>
          ) : (
            <Link
              to={`${baseUrl}/${item.id}`}
              className="px-2 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate max-w-[150px]"
            >
              {item.name}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
