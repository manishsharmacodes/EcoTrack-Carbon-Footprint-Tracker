export function formatCO2(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}t`;
  }
  return `${value.toFixed(1)} kg`;
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getScoreColor(level) {
  switch (level) {
    case 'low': return '#22c55e';
    case 'medium': return '#f59e0b';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
}

export function getDaysRemaining(endDate) {
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}
