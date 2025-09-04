# Documentation Quality Automation

Automated system for detecting and tracking documentation quality issues.

## What It Does

- **Broken Link Detection** - Scans markdown files for internal links that no longer work
- **Stale Content Detection** - Flags documentation not updated in 6+ months
- **Linear Integration** - Automatically creates issues for quality problems

## Key Commands

```bash
# Run quality audit (show results only)
npm run quality-audit

# Run audit and create Linear issues for problems
npm run quality-audit:create-issues

# Run with detailed output
npm run quality-audit:verbose

# Show help
npm run quality-audit -- --help
```

## How It Works

### Broken Links
- Scans all `*.md` files for `[text](path)` links
- Checks if internal file paths exist
- Skips external URLs (http/https) and anchors (#)
- Creates Medium priority Linear issues for broken links

### Stale Content  
- Checks file modification dates for `*.md` and `*.txt` files
- Flags files not updated in 6+ months
- Only flags files with meaningful content (>100 characters)
- Creates Low priority Linear issues for review

### Linear Integration
- Issues are created in the "Documentation Quality & Maintenance" project
- Automatically categorized by severity and type
- Includes action checklists for fixing issues
- Uses appropriate labels: `documentation`, `maintenance`, `broken-link`, `stale-content`

## Solo Dev Philosophy

This system follows the "set it and forget it" approach:

- **Non-intrusive** - Only creates issues for real problems
- **Prioritized** - High/Medium severity issues get Linear tickets, Low severity is just flagged
- **Actionable** - Each issue includes specific steps to fix
- **Automated** - Run as part of regular maintenance, not during active development

## Configuration

The system is pre-configured for the Lumina project:
- **Team**: Lumina-Product
- **Project**: Documentation Quality & Maintenance  
- **Labels**: documentation, maintenance, broken-link, stale-content

## Integration with Development Workflow

### When to Run
- **Weekly maintenance** - Part of regular cleanup
- **Before releases** - Ensure docs are up to date
- **After major refactoring** - Check for broken links from moved files

### CI/CD Integration
The audit command exits with error code 1 if issues are found, making it suitable for CI/CD pipelines:

```bash
# In CI pipeline - fail build if documentation issues found
npm run quality-audit
```

## Example Output

```
📊 Documentation Quality Report
================================

📁 Files scanned: 23
🔗 Broken links: 2
📅 Stale content: 1
🔧 Auto-fixable: 0

🔗 Broken Links:
  • docs/api/auth.md:15 - Broken link: ../lib/auth-helpers.ts
  • README.md:42 - Broken link: docs/setup/database.md

📅 Stale Content (6+ months old):
  • docs/deployment/legacy-setup.md - Content not updated since Jan 15, 2024

💡 Run with --create-issues to automatically create Linear issues for these problems.
```

## Future Enhancements

Potential additions when they become needed:
- **Auto-fix** for simple broken links (when files are just renamed)
- **Content freshness scoring** based on git activity
- **Integration with git hooks** for pre-commit checks
- **Slack/Discord notifications** for critical issues