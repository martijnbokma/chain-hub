import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="docs-prose">
      <h1>Page not found</h1>
      <p>
        That page doesn't exist. Head back to the{' '}
        <Link to="/" className="text-primary underline underline-offset-2">
          docs home
        </Link>
        .
      </p>
    </div>
  );
}
