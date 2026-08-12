import React from 'react';
import { Link } from 'react-router-dom';

export function DocsLink({ href, children, ...props }: React.ComponentProps<'a'>) {
  if (href?.startsWith('/')) {
    return (
      <Link to={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  );
}
