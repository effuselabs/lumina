# Documentation Standards Guide

This guide defines the standards and conventions for all documentation in the Lumina project.

## 📝 Writing Standards

### Language and Tone
- **Clear and Concise**: Use simple, direct language
- **Professional but Approachable**: Maintain technical accuracy while being accessible
- **Active Voice**: Prefer active voice over passive voice
- **Present Tense**: Use present tense for current functionality
- **Consistent Terminology**: Use the same terms throughout all documentation

### Content Structure
1. **Overview/Introduction** - Brief description and purpose
2. **Prerequisites** - What's needed before starting
3. **Main Content** - Step-by-step instructions or detailed information
4. **Examples** - Practical code examples or use cases
5. **Troubleshooting** - Common issues and solutions
6. **Related Resources** - Links to related documentation

## 🎯 Markdown Standards

### Headers
```markdown
# Main Title (H1) - One per document
## Major Sections (H2)
### Subsections (H3)
#### Details (H4) - Use sparingly
```

### Formatting
- **Bold** for UI elements, important terms, and emphasis
- *Italics* for file names, variables, and subtle emphasis
- `Code` for inline code, commands, and technical terms
- **Lists** with consistent bullet points or numbering

### Code Blocks
```markdown
# Language-specific syntax highlighting
```typescript
const example = "Use appropriate language tags";
```

# Command examples with clear context
```bash
npm run dev
```

# Configuration examples
```json
{
  "setting": "value"
}
```
```

### Links
```markdown
# Internal links (relative paths)
[Development Setup](./DEVELOPMENT_SETUP.md)
[Feature Documentation](./features/README.md)

# External links (full URLs)
[Linear Documentation](https://linear.app/docs)

# Linear issue references (standard format)
**Linear Issue**: [LUM-123](https://linear.app/lumina/issue/LUM-123)
```

## 🏗️ Document Structure

### File Naming
- **kebab-case** for file names: `development-setup.md`
- **UPPERCASE** for major documents: `README.md`, `CHANGELOG.md`
- **Descriptive names** that indicate content: `authentication-system.md`

### Directory Organization
```
docs/
├── README.md                    # Main documentation hub
├── features/                    # Feature-specific docs
│   ├── README.md               # Features overview
│   └── [feature-name]/         # Individual feature docs
├── testing/                     # Testing documentation
├── project-management/          # Workflow and project docs
├── archive/                     # Archived documentation
└── [topic-specific]/           # Other organized topics
```

### Front Matter (when applicable)
```markdown
---
title: "Document Title"
description: "Brief description"
last_updated: "2025-01-09"
author: "Team Name"
tags: ["tag1", "tag2"]
---
```

## 🔗 Cross-Reference Standards

### Internal References
- Use **relative paths** from the current document location
- Include **descriptive link text** that explains the destination
- Add **context** about why the link is relevant

```markdown
# Good examples
For setup instructions, see [Development Setup](./DEVELOPMENT_SETUP.md).
Review the [Authentication System](./features/authentication/AUTHENTICATION.md) for security details.

# Avoid
Click [here](./DEVELOPMENT_SETUP.md) for setup.
See [this document](./features/authentication/AUTHENTICATION.md).
```

### Linear Integration
```markdown
# Standard Linear reference format
**Linear Issue**: [LUM-123: Feature Name](https://linear.app/lumina/issue/LUM-123)
**Epic**: [Epic Name (LUM-100)](https://linear.app/lumina/issue/LUM-100)

# In text references
This feature ([LUM-123](https://linear.app/lumina/issue/LUM-123)) implements...
```

### External References
- Use **full URLs** for external links
- Include **link text** that describes the destination
- Add **context** about why the external resource is relevant

## 📊 Content Guidelines

### Code Examples
- **Working examples** that can be copied and executed
- **Proper syntax highlighting** with language tags
- **Clear context** about when and how to use the code
- **Comments** explaining complex parts

```typescript
// Good example with context and comments
interface BookingData {
  clientId: string;        // Client identifier
  serviceId: string;       // Service being booked
  startTime: Date;         // Appointment start time
  duration: number;        // Duration in minutes
}

// Create a new booking
const booking = await createBooking({
  clientId: "client-123",
  serviceId: "service-456",
  startTime: new Date("2025-01-15T10:00:00Z"),
  duration: 60
});
```

### Screenshots and Images
- **High quality** images with clear text
- **Consistent styling** across all screenshots
- **Alt text** for accessibility
- **Captions** explaining what the image shows
- **Update regularly** to match current UI

### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

## ✅ Quality Standards

### Accuracy
- **Verify all instructions** by following them step-by-step
- **Test all code examples** to ensure they work
- **Update regularly** to match current implementation
- **Review with subject matter experts** for technical accuracy

### Completeness
- **Cover all major use cases** and scenarios
- **Include error handling** and troubleshooting
- **Provide context** about when and why to use features
- **Link to related documentation** for comprehensive coverage

### Accessibility
- **Clear headings** for screen reader navigation
- **Descriptive link text** that makes sense out of context
- **Alt text** for all images and diagrams
- **Logical document structure** with proper heading hierarchy

### Maintainability
- **Modular structure** that's easy to update
- **Clear ownership** and maintenance responsibilities
- **Version information** and last updated dates
- **Change tracking** through git history

## 🎨 Visual Standards

### Emojis and Icons
Use emojis consistently for visual organization:
- 📋 Planning and checklists
- 🚀 Getting started and quick actions
- 🔧 Configuration and setup
- 🧪 Testing and quality assurance
- 📊 Analytics and reporting
- 🎯 Goals and objectives
- ⚠️ Warnings and important notes
- ✅ Completed items and success states
- 🔗 Links and references

### Callouts and Alerts
```markdown
> **Note**: Important information that users should be aware of.

> **Warning**: Critical information that could cause issues if ignored.

> **Tip**: Helpful suggestions to improve the user experience.
```

### Status Indicators
- ✅ **Complete** - Feature is fully implemented and documented
- 🚧 **In Progress** - Feature is being developed
- 📋 **Planned** - Feature is planned for future development
- ⚠️ **Deprecated** - Feature is being phased out
- 🔄 **Updated** - Recently updated content

## 📚 Template Examples

### Feature Documentation Template
```markdown
# Feature Name

**Linear Issue**: [LUM-123](https://linear.app/lumina/issue/LUM-123)  
**Status**: ✅ Complete

## Overview
[Brief description of the feature and its purpose]

## Features
- [Feature 1]
- [Feature 2]
- [Feature 3]

## Implementation
[Technical implementation details]

## Usage Examples
[Code examples and use cases]

## API Reference
[API endpoints and parameters]

## Testing
[Testing approach and coverage]

## Related Documentation
- [Related Doc 1](./related-doc-1.md)
- [Related Doc 2](./related-doc-2.md)
```

### Process Documentation Template
```markdown
# Process Name

## Overview
[Brief description of the process]

## Prerequisites
- [Requirement 1]
- [Requirement 2]

## Step-by-Step Instructions
1. [Step 1 with details]
2. [Step 2 with details]
3. [Step 3 with details]

## Examples
[Practical examples]

## Troubleshooting
### Common Issues
- **Issue**: [Description]
  **Solution**: [How to fix]

## Related Resources
- [Internal Doc](./internal-doc.md)
- [External Resource](https://external-link.com)
```

## 🔍 Review Process

### Self-Review Checklist
- [ ] **Spelling and grammar** checked
- [ ] **Links tested** and working
- [ ] **Code examples** verified
- [ ] **Screenshots** current and clear
- [ ] **Structure** follows standards
- [ ] **Cross-references** accurate

### Peer Review Guidelines
- **Technical accuracy** - Does the content match implementation?
- **Clarity** - Is the content easy to understand?
- **Completeness** - Are all important aspects covered?
- **Consistency** - Does it follow project standards?
- **Usefulness** - Will this help the target audience?

### Approval Process
1. **Author** creates documentation following standards
2. **Self-review** using checklist
3. **Peer review** by subject matter expert
4. **Final review** by documentation maintainer
5. **Merge** after all feedback addressed

---

**Standards Owner**: Development Team  
**Review Schedule**: Quarterly standards review  
**Last Updated**: January 9, 2025