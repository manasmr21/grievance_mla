/**
 * Application constants — ADMIN role and core ticket statuses/priorities are seeded by default. */

export const ROLE_CODES = {
    ADMIN: 'ADMIN',
} as const;

export const PRIORITY_CODES = {
    EMERGENCY: 'EMERGENCY',
    URGENT: 'URGENT',
    ROUTINE: 'ROUTINE',
} as const;

export const STATUS_CODES = {
    ACTIVE: 'ACTIVE',
    UNDER_REVIEW: 'UNDER_REVIEW',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
    REJECTED: 'REJECTED',
} as const;

export const CATEGORY_CODES = {
    INFRASTRUCTURE: 'INFRASTRUCTURE',
    MESS: 'MESS',
    SAFETY: 'SAFETY',
    HOSTEL_ADMIN: 'HOSTEL_ADMIN',
    WELFARE: 'WELFARE',
    OTHERS: 'OTHERS',
    SCHOLARSHIP: 'SCHOLARSHIP',
    LIBRARY: 'LIBRARY',
    HARASSMENT: 'HARASSMENT',
} as const;

export const SLA_HOURS = {
    EMERGENCY: 24,
    URGENT: 72,
    ROUTINE: 168,
    DEFAULT_FALLBACK: 24,
} as const;

export const EXECUTION_ACTION_TYPES = {
    ASSIGNMENT: 'ASSIGNMENT',
    REASSIGNMENT: 'REASSIGNMENT',
    RESOLUTION: 'RESOLUTION',
    REOPENED: 'REOPENED',
    FORWARD: 'FORWARD',
} as const;

export const REGISTRATION_REQUEST_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;

export type PriorityCode = typeof PRIORITY_CODES[keyof typeof PRIORITY_CODES];
export type StatusCode = typeof STATUS_CODES[keyof typeof STATUS_CODES];
export type CategoryCode = typeof CATEGORY_CODES[keyof typeof CATEGORY_CODES];
export type RoleCode = typeof ROLE_CODES[keyof typeof ROLE_CODES];
export type ExecutionActionType = typeof EXECUTION_ACTION_TYPES[keyof typeof EXECUTION_ACTION_TYPES];
export type RegistrationRequestStatus = typeof REGISTRATION_REQUEST_STATUS[keyof typeof REGISTRATION_REQUEST_STATUS];
