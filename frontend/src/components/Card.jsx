import React from 'react';
import clsx from 'clsx';

const Card = ({ children, className, title, action }) => {
  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border', className)}>
      {(title || action) && (
        <div className="px-6 py-4 border-b flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;