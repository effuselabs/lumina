/**
 * Utility functions for validators
 */

export function getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
}

export function getTimeString(date: Date): string {
    return date.toTimeString().slice(0, 5); // HH:MM format
}

export function parseTimeString(timeString: string, date: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}