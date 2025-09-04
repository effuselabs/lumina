# Linear Issue Templates

This directory contains standardized templates for creating Linear issues. These templates ensure consistency and completeness when creating different types of issues.

## 📋 Available Templates

### 🐛 [Bug Report](./bug-report.md)
Use this template when reporting bugs or defects.
- **When to use:** Something is broken or not working as expected
- **Linear Labels:** `bug`, `needs-triage`
- **Priority:** Varies based on severity

### 🚀 [Feature Request](./feature-request.md)
Use this template when requesting new features or enhancements.
- **When to use:** Proposing new functionality or improvements
- **Linear Labels:** `feature`, `enhancement`
- **Priority:** Usually `medium` unless business-critical

### 🎯 [Epic](./epic.md)
Use this template when creating large initiatives that span multiple issues.
- **When to use:** Major features or projects with multiple components
- **Linear Labels:** `epic`, `initiative`
- **Priority:** Usually `high` for strategic initiatives

## 🔧 How to Use Templates

### In Linear Web App:
1. Create a new issue in Linear
2. Copy the relevant template content from this directory
3. Paste into the issue description
4. Fill in the template sections
5. Add appropriate labels and assignees

### In Linear CLI:
```bash
# Create issue with template
linear issue create --title "Bug: Login not working" --description "$(cat docs/project-management/templates/bug-report.md)"
```

### With MCP Integration:
The Linear MCP tools can automatically use these templates when creating issues programmatically.

## 📝 Template Guidelines

### General Rules:
- **Be Specific:** Provide clear, actionable information
- **Use Checklists:** Break down requirements into checkboxes
- **Link Related Work:** Reference related issues, PRs, or documentation
- **Include Context:** Add screenshots, logs, or examples when relevant

### Required Sections:
- **Title:** Clear, descriptive title following our naming conventions
- **Description:** Detailed explanation of the issue/request
- **Acceptance Criteria:** Specific, testable requirements
- **Labels:** Appropriate Linear labels for categorization

### Optional Sections:
- **Priority:** Business priority (Low/Medium/High/Critical)
- **Effort Estimate:** Development effort (Small/Medium/Large)
- **Dependencies:** Related issues or external dependencies
- **Timeline:** Target dates or milestones

## 🏷️ Linear Label Standards

### Issue Types:
- `bug` - Something is broken
- `feature` - New functionality
- `enhancement` - Improvement to existing feature
- `epic` - Large initiative
- `task` - General work item
- `documentation` - Documentation updates

### Priority Levels:
- `critical` - System down, blocking users
- `high` - Important for current sprint
- `medium` - Standard priority
- `low` - Nice to have, future consideration

### Status Labels:
- `needs-triage` - Requires initial review
- `ready` - Ready for development
- `in-progress` - Currently being worked on
- `blocked` - Cannot proceed due to dependency
- `needs-review` - Ready for code review

## 🔄 Template Updates

These templates are living documents. Update them as our processes evolve:

1. **Propose Changes:** Create a Linear issue with the `documentation` label
2. **Review Process:** Get approval from team leads
3. **Update Templates:** Modify the template files
4. **Communicate Changes:** Announce updates to the team

## 📚 Related Documentation

- [Linear Integration Guide](../LINEAR_INTEGRATION.md) - Complete Linear workflow
- [Git Workflow](../GIT_WORKFLOW.md) - Branching and PR process
- [Project Management Overview](../README.md) - General project management practices