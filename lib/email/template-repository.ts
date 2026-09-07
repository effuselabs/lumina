/**
 * Email Template Repository
 * Manages CRUD operations for email templates in the database
 */

import { prisma } from '@/lib/prisma';
import type { EmailTemplateType } from './templates';

export interface EmailTemplate {
  id: string;
  businessId: string | null;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateInput {
  businessId?: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  variables?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  subject?: string;
  htmlTemplate?: string;
  textTemplate?: string;
  variables?: string[];
  isActive?: boolean;
}

export class TemplateRepository {
  /**
   * Create a new email template
   */
  async create(input: CreateEmailTemplateInput): Promise<EmailTemplate> {
    try {
      // Validate business exists if businessId provided
      if (input.businessId) {
        await this.validateBusinessExists(input.businessId);
      }

      // Check for existing template with same type and business
      const existing = await this.findByTypeAndBusiness(
        input.type,
        input.businessId || null
      );

      if (existing) {
        throw new TemplateRepositoryError(
          `Template of type ${input.type} already exists for this business`,
          'DUPLICATE_TEMPLATE'
        );
      }

      const template = await prisma.emailTemplate.create({
        data: {
          businessId: input.businessId || null,
          type: input.type,
          name: input.name,
          subject: input.subject,
          htmlTemplate: input.htmlTemplate,
          textTemplate: input.textTemplate,
          variables: input.variables || [],
          isDefault: input.isDefault || false,
          isActive: input.isActive !== undefined ? input.isActive : true,
        },
      });

      return this.mapToEmailTemplate(template);
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CREATE_ERROR'
      );
    }
  }

  /**
   * Find template by ID
   */
  async findById(id: string): Promise<EmailTemplate | null> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { id },
      });

      return template ? this.mapToEmailTemplate(template) : null;
    } catch (error) {
      throw new TemplateRepositoryError(
        `Failed to find template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * Find template by type and business
   * Returns business-specific template if exists, otherwise returns default template
   */
  async findByTypeAndBusiness(
    type: EmailTemplateType,
    businessId: string | null
  ): Promise<EmailTemplate | null> {
    try {
      // First try to find business-specific template
      if (businessId) {
        const businessTemplate = await prisma.emailTemplate.findFirst({
          where: {
            type,
            businessId,
            isActive: true,
          },
        });

        if (businessTemplate) {
          return this.mapToEmailTemplate(businessTemplate);
        }
      }

      // Fall back to default template
      const defaultTemplate = await prisma.emailTemplate.findFirst({
        where: {
          type,
          businessId: null,
          isDefault: true,
          isActive: true,
        },
      });

      return defaultTemplate ? this.mapToEmailTemplate(defaultTemplate) : null;
    } catch (error) {
      throw new TemplateRepositoryError(
        `Failed to find template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * Find all templates for a business
   */
  async findByBusiness(businessId: string): Promise<EmailTemplate[]> {
    try {
      await this.validateBusinessExists(businessId);

      const templates = await prisma.emailTemplate.findMany({
        where: {
          businessId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return templates.map(t => this.mapToEmailTemplate(t));
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to find templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * Find all default templates
   */
  async findDefaults(): Promise<EmailTemplate[]> {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: {
          businessId: null,
          isDefault: true,
          isActive: true,
        },
        orderBy: {
          type: 'asc',
        },
      });

      return templates.map(t => this.mapToEmailTemplate(t));
    } catch (error) {
      throw new TemplateRepositoryError(
        `Failed to find default templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FIND_ERROR'
      );
    }
  }

  /**
   * Update an email template
   */
  async update(
    id: string,
    input: UpdateEmailTemplateInput
  ): Promise<EmailTemplate> {
    try {
      // Verify template exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new TemplateRepositoryError(
          `Template not found: ${id}`,
          'NOT_FOUND'
        );
      }

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.subject && { subject: input.subject }),
          ...(input.htmlTemplate && { htmlTemplate: input.htmlTemplate }),
          ...(input.textTemplate && { textTemplate: input.textTemplate }),
          ...(input.variables && { variables: input.variables }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      return this.mapToEmailTemplate(template);
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_ERROR'
      );
    }
  }

  /**
   * Delete an email template
   */
  async delete(id: string): Promise<void> {
    try {
      // Verify template exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new TemplateRepositoryError(
          `Template not found: ${id}`,
          'NOT_FOUND'
        );
      }

      // Prevent deletion of default templates
      if (existing.isDefault) {
        throw new TemplateRepositoryError(
          'Cannot delete default templates',
          'DELETE_DEFAULT_FORBIDDEN'
        );
      }

      await prisma.emailTemplate.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_ERROR'
      );
    }
  }

  /**
   * Activate a template
   */
  async activate(id: string): Promise<EmailTemplate> {
    return this.update(id, { isActive: true });
  }

  /**
   * Deactivate a template
   */
  async deactivate(id: string): Promise<EmailTemplate> {
    return this.update(id, { isActive: false });
  }

  /**
   * Clone a template for a specific business
   * Useful for creating business-specific versions of default templates
   */
  async cloneForBusiness(
    templateId: string,
    businessId: string
  ): Promise<EmailTemplate> {
    try {
      await this.validateBusinessExists(businessId);

      const source = await this.findById(templateId);
      if (!source) {
        throw new TemplateRepositoryError(
          `Template not found: ${templateId}`,
          'NOT_FOUND'
        );
      }

      // Check if business already has this template type
      const existing = await this.findByTypeAndBusiness(
        source.type,
        businessId
      );
      if (existing && existing.businessId === businessId) {
        throw new TemplateRepositoryError(
          `Business already has a template of type ${source.type}`,
          'DUPLICATE_TEMPLATE'
        );
      }

      return this.create({
        businessId,
        type: source.type,
        name: `${source.name} (Custom)`,
        subject: source.subject,
        htmlTemplate: source.htmlTemplate,
        textTemplate: source.textTemplate,
        variables: source.variables,
        isDefault: false,
        isActive: true,
      });
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to clone template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLONE_ERROR'
      );
    }
  }

  /**
   * Get template statistics for a business
   */
  async getStats(businessId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }> {
    try {
      await this.validateBusinessExists(businessId);

      const templates = await this.findByBusiness(businessId);

      const stats = {
        total: templates.length,
        active: templates.filter(t => t.isActive).length,
        inactive: templates.filter(t => !t.isActive).length,
        byType: {} as Record<string, number>,
      };

      templates.forEach(template => {
        stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      if (error instanceof TemplateRepositoryError) {
        throw error;
      }

      throw new TemplateRepositoryError(
        `Failed to get template stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STATS_ERROR'
      );
    }
  }

  /**
   * Validate that a business exists
   */
  private async validateBusinessExists(businessId: string): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!business) {
      throw new TemplateRepositoryError(
        `Business not found: ${businessId}`,
        'BUSINESS_NOT_FOUND'
      );
    }
  }

  /**
   * Map Prisma model to EmailTemplate interface
   */
  private mapToEmailTemplate(template: any): EmailTemplate {
    return {
      id: template.id,
      businessId: template.businessId,
      type: template.type as EmailTemplateType,
      name: template.name,
      subject: template.subject,
      htmlTemplate: template.htmlTemplate,
      textTemplate: template.textTemplate,
      variables: Array.isArray(template.variables)
        ? template.variables
        : JSON.parse(template.variables || '[]'),
      isDefault: template.isDefault,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

/**
 * Template Repository Error
 */
export class TemplateRepositoryError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'TemplateRepositoryError';
  }
}

// Export singleton instance
export const templateRepository = new TemplateRepository();
