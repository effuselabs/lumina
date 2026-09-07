/**
 * Service Factory - Generate comprehensive service menu with packages and pricing tiers
 *
 * Creates 30+ services across 6+ categories:
 * - Hair (12 services)
 * - Nails (8 services)
 * - Skincare (6 services)
 * - Massage (4 services)
 * - Lashes (4 services)
 * - Brows (4 services)
 * - Packages (5 service packages)
 */

import { faker } from '@faker-js/faker';
import { Service } from '@prisma/client';
import { BaseFactory } from './base-factory';
import {
  ServiceCategory,
  ServiceDefinition,
  ServicePackage,
  ValidationResult,
} from './types';

export interface ServiceFactoryOptions {
  includeSeasonalServices?: boolean;
  includePricingTiers?: boolean;
  includePackages?: boolean;
}

export interface PricingTier {
  level: 'JUNIOR' | 'SENIOR' | 'MASTER';
  multiplier: number;
}

export interface SeasonalService {
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  category: string;
  availableMonths: number[];
  isHolidaySpecial: boolean;
}

export class ServiceFactory extends BaseFactory<Service> {
  private readonly pricingTiers: PricingTier[] = [
    { level: 'JUNIOR', multiplier: 0.85 },
    { level: 'SENIOR', multiplier: 1.0 },
    { level: 'MASTER', multiplier: 1.25 },
  ];

  private readonly serviceCategories: ServiceCategory[] = [
    {
      name: 'Hair',
      services: [
        {
          name: 'Haircut & Style',
          description: 'Professional haircut with wash and style',
          basePrice: 65,
          duration: 60,
        },
        {
          name: 'Hair Color',
          description: 'Full hair coloring service',
          basePrice: 120,
          duration: 120,
        },
        {
          name: 'Highlights',
          description: 'Partial or full highlights',
          basePrice: 95,
          duration: 90,
        },
        {
          name: 'Balayage',
          description: 'Hand-painted highlights for natural look',
          basePrice: 140,
          duration: 150,
        },
        {
          name: 'Color Correction',
          description: 'Fix previous color treatments',
          basePrice: 200,
          duration: 180,
        },
        {
          name: 'Hair Treatment',
          description: 'Deep conditioning and repair treatment',
          basePrice: 45,
          duration: 30,
        },
        {
          name: 'Blowout',
          description: 'Professional wash and blow dry styling',
          basePrice: 35,
          duration: 45,
        },
        {
          name: 'Updo',
          description: 'Special occasion hair styling',
          basePrice: 75,
          duration: 60,
        },
        {
          name: 'Hair Extensions',
          description: 'Temporary or semi-permanent hair extensions',
          basePrice: 250,
          duration: 120,
        },
        {
          name: 'Keratin Treatment',
          description: 'Smoothing and straightening treatment',
          basePrice: 180,
          duration: 150,
        },
        {
          name: 'Perm',
          description: 'Chemical wave or curl treatment',
          basePrice: 90,
          duration: 120,
        },
        {
          name: 'Relaxer',
          description: 'Chemical straightening treatment',
          basePrice: 85,
          duration: 90,
        },
      ],
    },
    {
      name: 'Nails',
      services: [
        {
          name: 'Manicure',
          description: 'Classic manicure with polish',
          basePrice: 35,
          duration: 45,
        },
        {
          name: 'Pedicure',
          description: 'Relaxing pedicure with polish',
          basePrice: 45,
          duration: 60,
        },
        {
          name: 'Gel Manicure',
          description: 'Long-lasting gel manicure',
          basePrice: 50,
          duration: 60,
        },
        {
          name: 'Gel Pedicure',
          description: 'Long-lasting gel pedicure',
          basePrice: 60,
          duration: 75,
        },
        {
          name: 'Acrylic Nails',
          description: 'Full set of acrylic nail extensions',
          basePrice: 70,
          duration: 90,
        },
        {
          name: 'Nail Art',
          description: 'Custom nail art and designs',
          basePrice: 25,
          duration: 30,
        },
        {
          name: 'French Manicure',
          description: 'Classic French tip manicure',
          basePrice: 40,
          duration: 50,
        },
        {
          name: 'Dip Powder Nails',
          description: 'Durable dip powder manicure',
          basePrice: 55,
          duration: 75,
        },
      ],
    },
    {
      name: 'Skincare',
      services: [
        {
          name: 'Facial',
          description: 'Customized facial treatment',
          basePrice: 80,
          duration: 60,
        },
        {
          name: 'Chemical Peel',
          description: 'Exfoliating chemical peel treatment',
          basePrice: 120,
          duration: 45,
        },
        {
          name: 'Microdermabrasion',
          description: 'Diamond-tip skin resurfacing',
          basePrice: 100,
          duration: 60,
        },
        {
          name: 'HydraFacial',
          description: 'Hydrating and exfoliating facial',
          basePrice: 150,
          duration: 60,
        },
        {
          name: 'Anti-Aging Facial',
          description: 'Specialized anti-aging treatment',
          basePrice: 110,
          duration: 75,
        },
        {
          name: 'Acne Treatment',
          description: 'Targeted acne clearing treatment',
          basePrice: 90,
          duration: 60,
        },
      ],
    },
    {
      name: 'Massage',
      services: [
        {
          name: 'Swedish Massage',
          description: 'Relaxing full-body massage',
          basePrice: 90,
          duration: 60,
        },
        {
          name: 'Deep Tissue Massage',
          description: 'Therapeutic deep tissue massage',
          basePrice: 110,
          duration: 60,
        },
        {
          name: 'Hot Stone Massage',
          description: 'Massage with heated stones',
          basePrice: 130,
          duration: 75,
        },
        {
          name: 'Aromatherapy Massage',
          description: 'Massage with essential oils',
          basePrice: 100,
          duration: 60,
        },
      ],
    },
    {
      name: 'Lashes',
      services: [
        {
          name: 'Lash Extensions',
          description: 'Individual lash extensions',
          basePrice: 120,
          duration: 120,
        },
        {
          name: 'Lash Lift',
          description: 'Natural lash lifting and curling',
          basePrice: 65,
          duration: 60,
        },
        {
          name: 'Lash Tint',
          description: 'Lash tinting service',
          basePrice: 25,
          duration: 30,
        },
        {
          name: 'Lash Fill',
          description: 'Lash extension maintenance',
          basePrice: 80,
          duration: 90,
        },
      ],
    },
    {
      name: 'Brows',
      services: [
        {
          name: 'Eyebrow Shaping',
          description: 'Professional eyebrow shaping',
          basePrice: 25,
          duration: 30,
        },
        {
          name: 'Eyebrow Tint',
          description: 'Eyebrow tinting service',
          basePrice: 20,
          duration: 20,
        },
        {
          name: 'Microblading',
          description: 'Semi-permanent eyebrow tattooing',
          basePrice: 350,
          duration: 150,
        },
        {
          name: 'Brow Lamination',
          description: 'Eyebrow setting and shaping treatment',
          basePrice: 55,
          duration: 45,
        },
      ],
    },
  ];

  private readonly seasonalServices: SeasonalService[] = [
    {
      name: 'Holiday Glam Package',
      description: 'Special holiday styling with glitter and glamour',
      basePrice: 95,
      duration: 90,
      category: 'Hair',
      availableMonths: [11, 12], // November, December
      isHolidaySpecial: true,
    },
    {
      name: 'Summer Beach Waves',
      description: 'Effortless beach wave styling perfect for summer',
      basePrice: 55,
      duration: 60,
      category: 'Hair',
      availableMonths: [5, 6, 7, 8], // May-August
      isHolidaySpecial: false,
    },
    {
      name: 'Bridal Trial Run',
      description: 'Complete bridal beauty trial for your special day',
      basePrice: 150,
      duration: 120,
      category: 'Hair',
      availableMonths: [4, 5, 6, 7, 8, 9], // Wedding season
      isHolidaySpecial: false,
    },
    {
      name: "Valentine's Day Mani",
      description: "Romantic nail art perfect for Valentine's Day",
      basePrice: 45,
      duration: 60,
      category: 'Nails',
      availableMonths: [2], // February
      isHolidaySpecial: true,
    },
    {
      name: 'Spring Renewal Facial',
      description: 'Refreshing facial to prepare skin for spring',
      basePrice: 95,
      duration: 75,
      category: 'Skincare',
      availableMonths: [3, 4, 5], // March-May
      isHolidaySpecial: false,
    },
    {
      name: 'New Year Detox Facial',
      description: 'Purifying facial to start the year fresh',
      basePrice: 110,
      duration: 90,
      category: 'Skincare',
      availableMonths: [1], // January
      isHolidaySpecial: true,
    },
  ];

  private readonly servicePackages: ServicePackage[] = [
    {
      name: 'Bridal Package',
      description: 'Complete bridal beauty package for your special day',
      serviceIds: [
        'haircut-style',
        'updo',
        'facial',
        'gel-manicure',
        'eyebrow-shaping',
      ],
      discountPercentage: 15,
      duration: 240,
    },
    {
      name: 'Spa Day Package',
      description: 'Full day of relaxation and beauty treatments',
      serviceIds: ['facial', 'swedish-massage', 'gel-manicure', 'gel-pedicure'],
      discountPercentage: 12,
      duration: 180,
    },
    {
      name: 'Hair Transformation',
      description: 'Complete hair makeover package',
      serviceIds: ['haircut-style', 'hair-color', 'hair-treatment'],
      discountPercentage: 10,
      duration: 210,
    },
    {
      name: 'Nail Care Deluxe',
      description: 'Premium nail care package with art',
      serviceIds: ['gel-manicure', 'gel-pedicure', 'nail-art'],
      discountPercentage: 8,
      duration: 165,
    },
    {
      name: 'Glow Up Package',
      description: 'Complete beauty refresh for face and nails',
      serviceIds: ['facial', 'eyebrow-shaping', 'lash-tint', 'gel-manicure'],
      discountPercentage: 10,
      duration: 135,
    },
  ];

  /**
   * Generate a single service
   */
  async generate(options?: ServiceFactoryOptions): Promise<Service> {
    const category = faker.helpers.arrayElement(this.serviceCategories);
    const serviceDefinition = faker.helpers.arrayElement(category.services);

    return this.createService(serviceDefinition, category.name, options);
  }

  /**
   * Generate all services for the business
   */
  async generateAllServices(
    options: ServiceFactoryOptions = {}
  ): Promise<Service[]> {
    console.log('🎨 Generating comprehensive service menu...');

    const services: Service[] = [];

    // Generate regular services from all categories
    for (const category of this.serviceCategories) {
      console.log(
        `  Creating ${category.name} services (${category.services.length} services)...`
      );

      for (const serviceDefinition of category.services) {
        const service = await this.createService(
          serviceDefinition,
          category.name,
          options
        );
        services.push(service);
      }
    }

    // Generate seasonal services if requested
    if (options.includeSeasonalServices !== false) {
      console.log('  Creating seasonal services...');

      for (const seasonalService of this.seasonalServices) {
        const service = await this.createSeasonalService(
          seasonalService,
          options
        );
        services.push(service);
      }
    }

    console.log(
      `✅ Generated ${services.length} services across ${this.serviceCategories.length} categories`
    );

    return services;
  }

  /**
   * Generate service packages
   */
  async generateServicePackages(): Promise<ServicePackage[]> {
    console.log('📦 Generating service packages...');

    // For now, return the predefined packages
    // In a full implementation, these would be stored in the database
    console.log(`✅ Generated ${this.servicePackages.length} service packages`);

    return this.servicePackages;
  }

  /**
   * Create a regular service
   */
  private async createService(
    serviceDefinition: ServiceDefinition,
    category: string,
    options?: ServiceFactoryOptions
  ): Promise<Service> {
    const validation = this.validate(serviceDefinition);
    if (!validation.isValid) {
      throw new Error(
        `Invalid service data: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Apply pricing tier variation if requested
    let finalPrice = serviceDefinition.basePrice;
    if (options?.includePricingTiers !== false) {
      const tier = faker.helpers.arrayElement(this.pricingTiers);
      finalPrice = Math.round(serviceDefinition.basePrice * tier.multiplier);
    }

    // Round to nearest $5 for realistic pricing
    finalPrice = Math.round(finalPrice / 5) * 5;

    const service = await this.prisma.service.create({
      data: {
        businessId: this.businessId,
        name: serviceDefinition.name,
        description: serviceDefinition.description,
        category: category,
        price: finalPrice,
        duration: serviceDefinition.duration,
        isActive: true,
        isOnline: true,
      },
    });

    return service;
  }

  /**
   * Create a seasonal service
   */
  private async createSeasonalService(
    seasonalService: SeasonalService,
    options?: ServiceFactoryOptions
  ): Promise<Service> {
    const currentMonth = new Date().getMonth() + 1; // 1-based month
    const isCurrentlyAvailable =
      seasonalService.availableMonths.includes(currentMonth);

    // Apply pricing tier variation if requested
    let finalPrice = seasonalService.basePrice;
    if (options?.includePricingTiers !== false) {
      const tier = faker.helpers.arrayElement(this.pricingTiers);
      finalPrice = Math.round(seasonalService.basePrice * tier.multiplier);
    }

    // Round to nearest $5 for realistic pricing
    finalPrice = Math.round(finalPrice / 5) * 5;

    const service = await this.prisma.service.create({
      data: {
        businessId: this.businessId,
        name: seasonalService.name,
        description: seasonalService.description,
        category: seasonalService.category,
        price: finalPrice,
        duration: seasonalService.duration,
        isActive: isCurrentlyAvailable,
        isOnline: isCurrentlyAvailable,
      },
    });

    return service;
  }

  /**
   * Get pricing for different staff levels
   */
  getPricingTiers(basePrice: number): {
    junior: number;
    senior: number;
    master: number;
  } {
    return {
      junior: Math.round((basePrice * this.pricingTiers[0].multiplier) / 5) * 5,
      senior: Math.round((basePrice * this.pricingTiers[1].multiplier) / 5) * 5,
      master: Math.round((basePrice * this.pricingTiers[2].multiplier) / 5) * 5,
    };
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category: string): ServiceDefinition[] {
    const categoryData = this.serviceCategories.find(
      cat => cat.name === category
    );
    return categoryData ? categoryData.services : [];
  }

  /**
   * Get all service categories
   */
  getAllCategories(): string[] {
    return this.serviceCategories.map(cat => cat.name);
  }

  /**
   * Get seasonal services for a specific month
   */
  getSeasonalServicesForMonth(month: number): SeasonalService[] {
    return this.seasonalServices.filter(service =>
      service.availableMonths.includes(month)
    );
  }

  /**
   * Get holiday specials
   */
  getHolidaySpecials(): SeasonalService[] {
    return this.seasonalServices.filter(service => service.isHolidaySpecial);
  }

  /**
   * Calculate package pricing with discount
   */
  calculatePackagePrice(
    packageDef: ServicePackage,
    services: Service[]
  ): number {
    const serviceMap = new Map(services.map(s => [this.slugify(s.name), s]));

    let totalPrice = 0;
    for (const serviceId of packageDef.serviceIds) {
      const service = serviceMap.get(serviceId);
      if (service) {
        totalPrice += Number(service.price);
      }
    }

    const discountAmount = totalPrice * (packageDef.discountPercentage / 100);
    return Math.round((totalPrice - discountAmount) / 5) * 5;
  }

  /**
   * Validate service data
   */
  protected validate(data: ServiceDefinition): ValidationResult {
    const errors = [];
    const warnings = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Service name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!data.description || data.description.trim().length === 0) {
      warnings.push({
        field: 'description',
        message: 'Service description is recommended',
        code: 'MISSING_DESCRIPTION',
      });
    }

    if (data.basePrice <= 0) {
      errors.push({
        field: 'basePrice',
        message: 'Service price must be greater than 0',
        code: 'INVALID_PRICE',
      });
    }

    if (data.duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Service duration must be greater than 0',
        code: 'INVALID_DURATION',
      });
    }

    if (data.duration > 480) {
      // 8 hours
      warnings.push({
        field: 'duration',
        message: 'Service duration is unusually long (over 8 hours)',
        code: 'LONG_DURATION',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Convert service name to slug format
   */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
