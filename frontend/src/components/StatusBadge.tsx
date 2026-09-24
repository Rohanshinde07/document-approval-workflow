import React from 'react';
import { DocumentStatus, AssignmentStatus } from '../types.js';

export const StatusBadge: React.FC<{ status: DocumentStatus | AssignmentStatus | string }> = ({ status }) => {
  const formatted = status.replace(/_/g, ' ');
  const lowerClass = status.toLowerCase();

  return (
    <span className={`badge badge-${lowerClass}`}>
      {formatted}
    </span>
  );
};
