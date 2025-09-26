import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface ServiceBookingRequest {
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  serviceOrder?: number;
  startOffset?: number;
  assignedStaffId?: string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalDuration: number;
  totalPrice: Decimal;
  optimizedServices: ServiceBookingRequest[];
}

export interface ServiceChangeRequest {
  action: 'add' | 'remove' | 'modify';
  serviceId: string;
  newServiceData?: Partial<ServiceBookingRequest>;
}

export interface ModificationResult {
  success: boolean;
  errors: string[];
  newTotalPrice: Decimal;
  newTotalDuration: number;
  newEndTime: Date;
}

export interface ServiceCompatibility {
  serviceId: string;
  compatibleWith: string[];
  incompatibleWith: string[];
  requiredBefore: string[];
  requiredAfter: string[];
}

export interface StaffSkill {
  staffId: string;
  serviceIds: string[];
  skillLevel: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  certifications: string[];
}

export interface DiscountRule {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'SERVICE_DISCOUNT';
  value: number;
  applicableServices: string[];
  minimumServices: number;
  conditions: Record<string, unknown>;
}

// ============================================================================
// MULTI-SERVICE COORDINATOR
// ============================================================================

export class MultiServiceCoordinator {
  /**
   * Validates a multi-service booking with comprehensive checks
   */
  async validateMultiServiceBooking(
    services: ServiceBookingRequest[],
    timeSlot: TimeSlot,
    staffId: string,
    businessId: string
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      totalDuration: 0,
      totalPrice: new Decimal(0),
      optimizedServices: [],
    };

    try {
      // 1. Validate services exist and are active
      const serviceValidation = await this.validateServicesExist(
        services,
        businessId
      );
      if (!serviceValidation.isValid) {
        result.errors.push(...serviceValidation.errors);
        result.isValid = false;
      }

      // 2. Validate staff can perform all services
      const staffValidation = await this.validateStaffSkills(
        services,
        staffId,
        businessId
      );
      if (!staffValidation.isValid) {
        result.errors.push(...staffValidation.errors);
        result.isValid = false;
      }

      // 3. Validate service compatibility
      const compatibilityValidation = await this.validateServiceCompatibility(
        services,
        businessId
      );
      if (!compatibilityValidation.isValid) {
        result.errors.push(...compatibilityValidation.errors);
        result.isValid = false;
      }

      // 4. Validate duration fits in time slot
      const totalDuration = services.reduce(
        (sum, service) => sum + service.duration,
        0
      );
      const slotDuration =
        (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) /
        (1000 * 60);

      if (totalDuration > slotDuration) {
        result.errors.push(
          `Total service duration (${totalDuration} minutes) exceeds available time slot (${slotDuration} minutes)`
        );
        result.isValid = false;
      }

      // 5. Calculate totals and optimize service order
      result.totalDuration = totalDuration;
      result.totalPrice = services.reduce(
        (sum, service) => sum.plus(service.price),
        new Decimal(0)
      );
      result.optimizedServices = await this.optimizeServiceOrder(
        services,
        businessId
      );

      // 6. Add warnings for potential issues
      const warnings = await this.generateWarnings(
        services,
        timeSlot,
        staffId,
        businessId
      );
      result.warnings.push(...warnings);

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  /**
   * Calculates total duration for multiple services
   */
  async calculateTotalDuration(
    serviceIds: string[],
    businessId: string
  ): Promise<number> {
    try {
      const services = await prisma.service.findMany({
        where: {
          id: { in: serviceIds },
          businessId,
          isActive: true,
        },
        select: {
          id: true,
          duration: true,
        },
      });

      if (services.length !== serviceIds.length) {
        const foundIds = services.map(s => s.id);
        const missingIds = serviceIds.filter(id => !foundIds.includes(id));
        throw new Error(`Services not found: ${missingIds.join(', ')}`);
      }

      return services.reduce((sum, service) => sum + service.duration, 0);
    } catch (error) {
      throw new Error(
        `Failed to calculate total duration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculates total price with discounts and promotions
   */
  async calculateTotalPrice(
    services: ServiceBookingRequest[],
    businessId: string,
    clientId?: string
  ): Promise<Decimal> {
    try {
      // Base price calculation
      let totalPrice = services.reduce(
        (sum, service) => sum.plus(service.price),
        new Decimal(0)
      );

      // Apply multi-service discounts
      const discounts = await this.getApplicableDiscounts(
        services,
        businessId,
        clientId
      );
      for (const discount of discounts) {
        totalPrice = this.applyDiscount(totalPrice, discount);
      }

      // Apply promotions
      const promotions = await this.getApplicablePromotions(
        services,
        businessId,
        clientId
      );
      for (const promotion of promotions) {
        totalPrice = this.applyPromotion(totalPrice, promotion, services);
      }

      return totalPrice;
    } catch (error) {
      throw new Error(
        `Failed to calculate total price: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Optimizes service order for efficient scheduling
   */
  async optimizeServiceOrder(
    services: ServiceBookingRequest[],
    businessId: string
  ): Promise<ServiceBookingRequest[]> {
    try {
      // Get service compatibility rules
      const compatibilityRules = await this.getServiceCompatibilityRules(
        services.map(s => s.serviceId),
        businessId
      );

      // Sort services based on dependencies and efficiency
      const optimizedServices = [...services];

      // 1. Sort by required order (dependencies)
      optimizedServices.sort((a, b) => {
        const aRules = compatibilityRules.find(
          r => r.serviceId === a.serviceId
        );
        const bRules = compatibilityRules.find(
          r => r.serviceId === b.serviceId
        );

        // If A must come before B
        if (aRules?.requiredBefore.includes(b.serviceId)) return -1;
        if (bRules?.requiredBefore.includes(a.serviceId)) return 1;

        // If A must come after B
        if (aRules?.requiredAfter.includes(b.serviceId)) return 1;
        if (bRules?.requiredAfter.includes(a.serviceId)) return -1;

        // Default to duration (longer services first for better time management)
        return b.duration - a.duration;
      });

      // 2. Assign service orders and calculate start offsets
      let currentOffset = 0;
      optimizedServices.forEach((service, index) => {
        service.serviceOrder = index + 1;
        service.startOffset = currentOffset;
        currentOffset += service.duration;
      });

      return optimizedServices;
    } catch (error) {
      throw new Error(
        `Failed to optimize service order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handles service modifications for existing appointments
   */
  async handleServiceModification(
    appointmentId: string,
    serviceChanges: ServiceChangeRequest[],
    businessId: string
  ): Promise<ModificationResult> {
    const result: ModificationResult = {
      success: true,
      errors: [],
      newTotalPrice: new Decimal(0),
      newTotalDuration: 0,
      newEndTime: new Date(),
    };

    try {
      // Get current appointment
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, businessId },
        include: {
          services: {
            include: { service: true },
            orderBy: { serviceOrder: 'asc' },
          },
        },
      });

      if (!appointment) {
        result.success = false;
        result.errors.push('Appointment not found');
        return result;
      }

      // Apply changes
      let currentServices = appointment.services.map(as => ({
        serviceId: as.serviceId,
        serviceName: as.serviceName,
        price: as.price.toNumber(),
        duration: as.duration,
        serviceOrder: as.serviceOrder,
        startOffset: as.startOffset,
        assignedStaffId: as.assignedStaffId || undefined,
      }));

      for (const change of serviceChanges) {
        switch (change.action) {
          case 'add':
            if (change.newServiceData) {
              currentServices.push({
                serviceId: change.serviceId,
                serviceName: change.newServiceData.serviceName || '',
                price: change.newServiceData.price || 0,
                duration: change.newServiceData.duration || 0,
                serviceOrder:
                  change.newServiceData.serviceOrder ||
                  currentServices.length + 1,
                startOffset: change.newServiceData.startOffset || 0,
                assignedStaffId: change.newServiceData.assignedStaffId,
              });
            }
            break;

          case 'remove':
            currentServices = currentServices.filter(
              s => s.serviceId !== change.serviceId
            );
            break;

          case 'modify':
            const serviceIndex = currentServices.findIndex(
              s => s.serviceId === change.serviceId
            );
            if (serviceIndex >= 0 && change.newServiceData) {
              currentServices[serviceIndex] = {
                ...currentServices[serviceIndex],
                ...change.newServiceData,
              };
            }
            break;
        }
      }

      // Validate the new service combination
      const validation = await this.validateMultiServiceBooking(
        currentServices,
        { startTime: appointment.startTime, endTime: appointment.endTime },
        appointment.staffId,
        businessId
      );

      if (!validation.isValid) {
        result.success = false;
        result.errors.push(...validation.errors);
        return result;
      }

      // Calculate new totals
      result.newTotalPrice = validation.totalPrice;
      result.newTotalDuration = validation.totalDuration;
      result.newEndTime = new Date(
        appointment.startTime.getTime() + validation.totalDuration * 60000
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Service modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validates that all services exist and are active
   */
  private async validateServicesExist(
    services: ServiceBookingRequest[],
    businessId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const serviceIds = services.map(s => s.serviceId);
    const existingServices = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        businessId,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    const foundIds = existingServices.map(s => s.id);
    const missingIds = serviceIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return {
        isValid: false,
        errors: [`Services not found or inactive: ${missingIds.join(', ')}`],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validates staff can perform all requested services
   */
  private async validateStaffSkills(
    services: ServiceBookingRequest[],
    staffId: string,
    businessId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const serviceIds = services.map(s => s.serviceId);
    const staffServices = await prisma.staffService.findMany({
      where: {
        staffId,
        serviceId: { in: serviceIds },
        staff: { businessId },
      },
      select: { serviceId: true },
    });

    const authorizedServiceIds = staffServices.map(ss => ss.serviceId);
    const unauthorizedServices = serviceIds.filter(
      id => !authorizedServiceIds.includes(id)
    );

    if (unauthorizedServices.length > 0) {
      return {
        isValid: false,
        errors: [
          `Staff member cannot perform services: ${unauthorizedServices.join(', ')}`,
        ],
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Validates service compatibility
   */
  private async validateServiceCompatibility(
    services: ServiceBookingRequest[],
    _businessId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // For now, we'll implement basic compatibility checking
    // In a full implementation, this would check against business rules
    const serviceIds = services.map(s => s.serviceId);
    const errors: string[] = [];

    // Check for duplicate services
    const uniqueServiceIds = new Set(serviceIds);
    if (uniqueServiceIds.size !== serviceIds.length) {
      errors.push('Duplicate services detected in booking');
    }

    // Check service order conflicts
    const orders = services.map(s => s.serviceOrder || 0).filter(o => o > 0);
    const uniqueOrders = new Set(orders);
    if (orders.length > 0 && uniqueOrders.size !== orders.length) {
      errors.push('Duplicate service order numbers detected');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generates warnings for potential booking issues
   */
  private async generateWarnings(
    services: ServiceBookingRequest[],
    timeSlot: TimeSlot,
    _staffId: string,
    _businessId: string
  ): Promise<string[]> {
    const warnings: string[] = [];

    // Check if booking is very close to time slot limit
    const totalDuration = services.reduce(
      (sum, service) => sum + service.duration,
      0
    );
    const slotDuration =
      (timeSlot.endTime.getTime() - timeSlot.startTime.getTime()) / (1000 * 60);

    if (totalDuration > slotDuration * 0.9) {
      warnings.push(
        'Booking uses more than 90% of available time slot - consider buffer time'
      );
    }

    // Check for high-maintenance service combinations
    if (services.length > 3) {
      warnings.push(
        'Multiple services may require additional preparation time'
      );
    }

    return warnings;
  }

  /**
   * Gets applicable discounts for service combination
   */
  private async getApplicableDiscounts(
    services: ServiceBookingRequest[],
    _businessId: string,
    _clientId?: string
  ): Promise<DiscountRule[]> {
    // Multi-service discount rules (business logic)
    const discounts: DiscountRule[] = [];

    // Example: 10% discount for 3+ services
    if (services.length >= 3) {
      discounts.push({
        id: 'multi-service-discount',
        name: 'Multi-Service Discount',
        type: 'PERCENTAGE',
        value: 10,
        applicableServices: services.map(s => s.serviceId),
        minimumServices: 3,
        conditions: { multiService: true },
      });
    }

    // Example: $20 off for services totaling over $100
    const totalPrice = services.reduce(
      (sum, service) => sum + service.price,
      0
    );
    if (totalPrice > 100) {
      discounts.push({
        id: 'high-value-discount',
        name: 'High Value Discount',
        type: 'FIXED_AMOUNT',
        value: 20,
        applicableServices: services.map(s => s.serviceId),
        minimumServices: 1,
        conditions: { minimumSpend: 100 },
      });
    }

    return discounts;
  }

  /**
   * Gets applicable promotions for service combination
   */
  private async getApplicablePromotions(
    services: ServiceBookingRequest[],
    businessId: string,
    clientId?: string
  ): Promise<
    {
      discountType: string;
      discountValue: number;
      maximumDiscount?: number;
      applicableServices?: string[];
    }[]
  > {
    try {
      const serviceIds = services.map(s => s.serviceId);
      const now = new Date();

      // Query active promotions from database
      const promotions = await prisma.promotion.findMany({
        where: {
          businessId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            { applicableServices: { isEmpty: true } }, // Applies to all services
            { applicableServices: { hasSome: serviceIds } }, // Applies to specific services
          ],
        },
      });

      // Filter promotions based on conditions
      const applicablePromotions = promotions.filter(promotion => {
        // Check usage limits
        if (
          promotion.usageLimit &&
          promotion.usageCount >= promotion.usageLimit
        ) {
          return false;
        }

        // Check minimum service count
        if (
          promotion.minimumServices &&
          services.length < promotion.minimumServices
        ) {
          return false;
        }

        // Check minimum spend
        const totalPrice = services.reduce(
          (sum, service) => sum + service.price,
          0
        );
        if (
          promotion.minimumSpend &&
          totalPrice < promotion.minimumSpend.toNumber()
        ) {
          return false;
        }

        // Check if client-specific conditions are met
        if (promotion.newClientsOnly && clientId) {
          // Would need to check if client is new (placeholder logic)
          return true;
        }

        return true;
      });

      return applicablePromotions;
    } catch (_error) {
      // Log error but don't fail the calculation
      // TODO: Replace with proper logging service
      // console.error('Error fetching promotions:', error)
      return [];
    }
  }

  /**
   * Applies discount to total price
   */
  private applyDiscount(totalPrice: Decimal, discount: DiscountRule): Decimal {
    switch (discount.type) {
      case 'PERCENTAGE':
        return totalPrice.minus(totalPrice.mul(discount.value).div(100));
      case 'FIXED_AMOUNT':
        return totalPrice.minus(discount.value);
      default:
        return totalPrice;
    }
  }

  /**
   * Applies promotion to total price
   */
  private applyPromotion(
    totalPrice: Decimal,
    promotion: {
      discountType: string;
      discountValue: number;
      maximumDiscount?: number;
      applicableServices?: string[];
    },
    services: ServiceBookingRequest[]
  ): Decimal {
    try {
      let discountAmount = new Decimal(0);

      switch (promotion.discountType) {
        case 'PERCENTAGE':
          discountAmount = totalPrice.mul(promotion.discountValue).div(100);
          // Apply maximum discount limit if specified
          if (promotion.maximumDiscount) {
            discountAmount = Decimal.min(
              discountAmount,
              promotion.maximumDiscount
            );
          }
          break;

        case 'FIXED_AMOUNT':
          discountAmount = new Decimal(promotion.discountValue);
          break;

        case 'SERVICE_DISCOUNT':
          // Apply discount only to specific services
          const applicableServiceIds = promotion.applicableServices || [];
          if (applicableServiceIds.length > 0) {
            const applicableServicePrice = services
              .filter(s => applicableServiceIds.includes(s.serviceId))
              .reduce((sum, service) => sum + service.price, 0);

            if (promotion.discountType === 'PERCENTAGE') {
              discountAmount = new Decimal(applicableServicePrice)
                .mul(promotion.discountValue)
                .div(100);
            } else {
              discountAmount = new Decimal(promotion.discountValue);
            }
          }
          break;

        default:
          return totalPrice;
      }

      // Ensure discount doesn't exceed total price
      discountAmount = Decimal.min(discountAmount, totalPrice);

      return totalPrice.minus(discountAmount);
    } catch (_error) {
      // TODO: Replace with proper logging service
      // console.error('Error applying promotion:', error)
      return totalPrice;
    }
  }

  /**
   * Calculates pricing with time-based discounts (e.g., off-peak hours)
   */
  async calculateTimeBasedPricing(
    services: ServiceBookingRequest[],
    timeSlot: TimeSlot,
    _businessId: string
  ): Promise<{
    basePrice: Decimal;
    adjustedPrice: Decimal;
    discountApplied: string | null;
  }> {
    const basePrice = services.reduce(
      (sum, service) => sum.plus(service.price),
      new Decimal(0)
    );
    let adjustedPrice = basePrice;
    let discountApplied: string | null = null;

    // Off-peak hours discount (example: 10% off before 10 AM or after 6 PM)
    const hour = timeSlot.startTime.getHours();
    if (hour < 10 || hour >= 18) {
      const discount = basePrice.mul(0.1); // 10% discount
      adjustedPrice = basePrice.minus(discount);
      discountApplied = 'Off-peak hours discount (10%)';
    }

    // Weekday vs weekend pricing
    const dayOfWeek = timeSlot.startTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday or Saturday
      // Weekend premium (5% increase)
      const premium = basePrice.mul(0.05);
      adjustedPrice = adjustedPrice.plus(premium);
      discountApplied = discountApplied
        ? `${discountApplied}, Weekend premium (5%)`
        : 'Weekend premium (5%)';
    }

    return { basePrice, adjustedPrice, discountApplied };
  }

  /**
   * Calculates loyalty program discounts
   */
  async calculateLoyaltyDiscount(
    services: ServiceBookingRequest[],
    clientId: string,
    businessId: string
  ): Promise<{ discount: Decimal; pointsEarned: number; pointsUsed: number }> {
    try {
      // Query client's loyalty membership
      const loyaltyMembership = await prisma.loyaltyMembership.findFirst({
        where: {
          clientId,
          isActive: true,
          loyaltyProgram: {
            businessId,
            isActive: true,
          },
        },
        include: {
          loyaltyProgram: true,
        },
      });

      if (!loyaltyMembership) {
        return { discount: new Decimal(0), pointsEarned: 0, pointsUsed: 0 };
      }

      const totalPrice = services.reduce(
        (sum, service) => sum + service.price,
        0
      );
      const program = loyaltyMembership.loyaltyProgram;

      // Calculate points earned
      const pointsEarned = Math.floor(
        totalPrice * program.pointsPerDollar.toNumber()
      );

      // Calculate potential discount from available points
      const availablePoints = loyaltyMembership.currentPoints;
      const maxDiscountFromPoints = new Decimal(availablePoints).mul(
        program.pointsRedemptionRate
      );

      // Apply discount up to 50% of total price
      const maxAllowedDiscount = new Decimal(totalPrice).mul(0.5);
      const discount = Decimal.min(maxDiscountFromPoints, maxAllowedDiscount);

      const pointsUsed = discount.div(program.pointsRedemptionRate).toNumber();

      return { discount, pointsEarned, pointsUsed: Math.floor(pointsUsed) };
    } catch (_error) {
      // TODO: Replace with proper logging service
      // console.error('Error calculating loyalty discount:', error)
      return { discount: new Decimal(0), pointsEarned: 0, pointsUsed: 0 };
    }
  }

  /**
   * Gets service compatibility rules
   */
  private async getServiceCompatibilityRules(
    serviceIds: string[],
    businessId: string
  ): Promise<ServiceCompatibility[]> {
    // Enhanced compatibility rules with common salon service dependencies
    const rules: ServiceCompatibility[] = [];

    for (const serviceId of serviceIds) {
      // Get service details to determine compatibility
      const service = await prisma.service.findFirst({
        where: { id: serviceId, businessId },
        select: { name: true, category: true },
      });

      if (!service) continue;

      const rule: ServiceCompatibility = {
        serviceId,
        compatibleWith: [],
        incompatibleWith: [],
        requiredBefore: [],
        requiredAfter: [],
      };

      // Example business rules based on service names/categories
      const serviceName = service.name.toLowerCase();

      if (serviceName.includes('wash') || serviceName.includes('shampoo')) {
        // Hair wash should come before styling
        rule.requiredBefore = serviceIds.filter(id => {
          const otherService = serviceIds.find(sid => sid === id);
          return (
            otherService &&
            (serviceName.includes('style') || serviceName.includes('cut'))
          );
        });
      }

      if (serviceName.includes('cut') || serviceName.includes('trim')) {
        // Cutting should come before styling
        rule.requiredBefore = serviceIds.filter(id => {
          const otherService = serviceIds.find(sid => sid === id);
          return otherService && serviceName.includes('style');
        });
      }

      if (serviceName.includes('color') || serviceName.includes('dye')) {
        // Coloring should come after washing but before styling
        rule.requiredAfter = serviceIds.filter(id => {
          const otherService = serviceIds.find(sid => sid === id);
          return otherService && serviceName.includes('wash');
        });
        rule.requiredBefore = serviceIds.filter(id => {
          const otherService = serviceIds.find(sid => sid === id);
          return otherService && serviceName.includes('style');
        });
      }

      rules.push(rule);
    }

    return rules;
  }
}

export const multiServiceCoordinator = new MultiServiceCoordinator();
