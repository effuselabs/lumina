import { PublicBookingErrorType, TimeSlot } from '@/types/booking';

export class PublicBookingError extends Error {
  public readonly type: PublicBookingErrorType;
  public readonly userMessage: string;
  public readonly suggestions?: string[];
  public readonly alternativeSlots?: TimeSlot[];

  constructor(
    type: PublicBookingErrorType,
    message: string,
    userMessage: string,
    suggestions?: string[],
    alternativeSlots?: TimeSlot[]
  ) {
    super(message);
    this.name = 'PublicBookingError';
    this.type = type;
    this.userMessage = userMessage;
    this.suggestions = suggestions;
    this.alternativeSlots = alternativeSlots;
  }

  toJSON() {
    return {
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      suggestions: this.suggestions,
      alternativeSlots: this.alternativeSlots,
    };
  }
}
