/** Shared grievance status/priority/category display helpers */

export const getStatusTone = (status) => {
  if (!status) return 'neutral';
  return String(status).toLowerCase().replace(/\s+/g, '-');
};

export const getPriorityTone = (priority) => {
  if (priority === 'High') return 'danger';
  if (priority === 'Medium') return 'warning';
  return 'success';
};

export const getStatusColorClass = (statusStr) => {
  const s = String(statusStr || '').toLowerCase();
  if (s.includes('review') || s.includes('pending')) return 'orange';
  if (s.includes('progress')) return 'blue';
  if (s.includes('resolve') || s.includes('complete') || s.includes('close')) return 'green';
  return 'orange';
};

export const getPriorityColorClass = (priorityStr) => {
  const p = String(priorityStr || '').toLowerCase();
  if (p.includes('high') || p.includes('urgent')) return 'high';
  if (p.includes('low')) return 'low';
  return 'medium';
};

export const getCategoryIconClass = (category) => {
  const cat = String(category || '').toUpperCase();
  if (cat.includes('HOSTEL')) return 'fa-solid fa-building';
  if (cat.includes('ACADEMIC')) return 'fa-solid fa-file-lines';
  if (cat.includes('EXAM')) return 'fa-solid fa-star';
  if (cat.includes('FINAN')) return 'fa-solid fa-dollar-sign';
  return 'fa-solid fa-file-lines';
};
