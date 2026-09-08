/**
 * SLA Utility Functions
 * Provides functionality for calculating Service Level Agreement due dates
 */

/**
 * Calculate the SLA due date based on creation time and resolution hours
 * @param createdAt - The date when the grievance was created
 * @param resolutionHours - The number of hours within which the grievance should be resolved
 * @returns The calculated SLA due date
 */
export function calculateSlaDueDate(createdAt: Date, resolutionHours: number): Date {
    // Validate inputs
    if (!createdAt || !(createdAt instanceof Date) || isNaN(createdAt.getTime())) {
        throw new Error('Invalid createdAt date provided');
    }

    if (typeof resolutionHours !== 'number' || resolutionHours <= 0 || isNaN(resolutionHours)) {
        throw new Error('Invalid resolutionHours provided. Must be a positive number');
    }

    // Calculate due date by adding resolution hours to creation date
    const dueDate = new Date(createdAt.getTime() + (resolutionHours * 60 * 60 * 1000));

    return dueDate;
}

/**
 * Format resolution hours into a human-readable string
 * @param hours - The number of hours
 * @returns A formatted string (e.g., "24 hours", "3 days", "1 day")
 */
export function formatResolutionTime(hours: number): string {
    if (typeof hours !== 'number' || hours <= 0) {
        return 'unknown time';
    }

    if (hours < 24) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
    }

    return `${days} day${days !== 1 ? 's' : ''} and ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
}

/**
 * Check if a grievance has breached its SLA
 * @param slaDueAt - The SLA due date
 * @param currentDate - The current date (defaults to now)
 * @returns true if SLA is breached, false otherwise
 */
export function isSlaBreach(slaDueAt: Date, currentDate: Date = new Date()): boolean {
    if (!slaDueAt || !(slaDueAt instanceof Date)) {
        return false;
    }

    return currentDate > slaDueAt;
}

/**
 * Get time remaining until SLA breach
 * @param slaDueAt - The SLA due date
 * @param currentDate - The current date (defaults to now)
 * @returns Remaining hours (negative if breached), or null if invalid
 */
export function getSlaRemainingHours(slaDueAt: Date, currentDate: Date = new Date()): number | null {
    if (!slaDueAt || !(slaDueAt instanceof Date) || isNaN(slaDueAt.getTime())) {
        return null;
    }

    const diffMs = slaDueAt.getTime() - currentDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
}
