const formatTimelineDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimelineVisuals = (actionType) => {
  switch (actionType) {
    case 'CREATED':
      return { color: 'blue', iconClass: 'fa-solid fa-plus' };
    case 'ASSIGNMENT':
    case 'REASSIGNMENT':
      return { color: 'orange', iconClass: 'fa-solid fa-user' };
    case 'REOPENED':
      return { color: 'red', iconClass: 'fa-solid fa-rotate-left' };
    case 'RESOLUTION':
      return { color: 'green', iconClass: 'fa-solid fa-check' };
    case 'FIRST_RESPONSE':
      return { color: 'purple', iconClass: 'fa-solid fa-comment-dots' };
    case 'STATUS_CHANGE':
      return { color: 'purple', iconClass: 'fa-solid fa-arrows-rotate' };
    case 'UPDATED':
      return { color: 'purple', iconClass: 'fa-solid fa-pen-to-square' };
    default:
      return { color: 'purple', iconClass: 'fa-solid fa-circle-info' };
  }
};

const buildDescription = (event) => {
  const { actionType, description, targetName, targetRole } = event;

  if (actionType === 'ASSIGNMENT' && targetName) {
    return `Ticket has been assigned to ${targetName}${targetRole ? ` (${targetRole})` : ''}.`;
  }
  if (actionType === 'REASSIGNMENT' && targetName) {
    return `Ticket has been reassigned to ${targetName}${targetRole ? ` (${targetRole})` : ''}.`;
  }
  if (actionType === 'REOPENED') {
    return event.remarks || description || 'This ticket was reopened.';
  }
  if (actionType === 'STATUS_CHANGE') {
    return description || 'Ticket status or priority was updated.';
  }
  if (actionType === 'REASSIGNMENT') {
    return description || 'This ticket was reassigned to another staff member.';
  }
  return description || event.title || '';
};

const buildUserLabel = (event) => {
  const roleSuffix = event.actorRole ? ` (${event.actorRole})` : '';
  return `${event.actorName || 'System'}${roleSuffix}`;
};

/**
 * Maps normalized timeline API events to the UI shape used by StudentGrievanceDetail.
 */
export const mapTimelineEventsToUI = (apiEvents = []) => {
  return apiEvents.map((event) => {
    const actionType = event.actionType || 'UPDATED';
    const visuals = getTimelineVisuals(actionType);
    let title = event.title;

    if (!title || title === 'Grievance Assigned') {
      if (actionType === 'ASSIGNMENT') title = 'Ticket Assigned';
    }

    return {
      id: event.id,
      type: actionType.toLowerCase(),
      title,
      description: buildDescription(event),
      date: formatTimelineDate(event.createdAt),
      user: buildUserLabel(event),
      reason: actionType === 'REOPENED' ? event.remarks : undefined,
      iconClass: visuals.iconClass,
      color: visuals.color,
    };
  });
};

export default mapTimelineEventsToUI;
