# Linear Integration Guide

## Overview

The Linear integration provides "one-click" functionality to automatically create Linear issues for blockers and link decisions to Linear issues. This eliminates the need to manually switch between your daily status workflow and Linear.

## Key Features

### 🚧 Blocker Integration
- **Auto-create Linear issues** for high-priority blockers
- **Link blockers to Linear issues** for tracking
- **Sync resolution status** between daily status and Linear

### 📝 Decision Integration  
- **Link decisions to existing Linear issues** for context
- **Create new Linear issues** for architectural decisions
- **Add decision context** as Linear comments

### 🔄 Automatic Sync
- **Bi-directional updates** between daily status and Linear
- **Status synchronization** when blockers are resolved
- **Maintenance issue creation** for broken links and stale content

## Quick Start

### 1. Test the Integration

```bash
npm run linear:test
```

This will create test blockers and decisions to verify everything works.

### 2. Add a Blocker with Linear Issue

```bash
# High priority blocker (auto-creates Linear issue)
npm run blocker:add "Can't deploy to production" \
  --priority high \
  --impact "Blocking release" \
  --create-linear-issue

# Medium priority blocker (no Linear issue by default)
npm run blocker:add "Need to update documentation" \
  --priority medium \
  --description "API docs are outdated"
```

### 3. Add a Decision with Linear Linking

```bash
# Link to existing Linear issue
npm run decision:add "Use PostgreSQL for analytics" \
  --context "Need to store time-series data" \
  --rationale "Better performance for our use case" \
  --link-linear-issue LUM-123

# Create new Linear issue for decision
npm run decision:add "Implement caching strategy" \
  --context "API response times are slow" \
  --impact "Performance" "User experience" \
  --create-linear-issue
```

### 4. Manage Blockers

```bash
# List active blockers
npm run blocker:list

# Resolve a blocker
npm run blocker:resolve BLOCK-2025-01-09-1234 \
  --notes "Fixed deployment pipeline configuration"
```

### 5. Generate Reports

```bash
# Generate comprehensive report
npm run linear:report

# Generate blocker-only report
npm run linear:report --type blockers --days 14

# Generate decision-only report  
npm run linear:report --type decisions --days 30
```

### 6. Sync Existing Data

```bash
# Sync existing blockers and decisions with Linear
npm run linear:sync --days 30
```

## Command Reference

### Blocker Commands

| Command | Description | Example |
|---------|-------------|---------|
| `blocker:add` | Add new blocker | `npm run blocker:add "Title" --create-linear-issue` |
| `blocker:resolve` | Resolve blocker | `npm run blocker:resolve BLOCK-ID --notes "Fixed"` |
| `blocker:list` | List active blockers | `npm run blocker:list --days 30` |

### Decision Commands

| Command | Description | Example |
|---------|-------------|---------|
| `decision:add` | Add new decision | `npm run decision:add "Title" --create-linear-issue` |

### Linear Commands

| Command | Description | Example |
|---------|-------------|---------|
| `linear:sync` | Sync with Linear | `npm run linear:sync --days 30` |
| `linear:report` | Generate report | `npm run linear:report --type both` |
| `linear:test` | Test integration | `npm run linear:test` |

## Options Reference

### Blocker Options

- `--priority <high|medium|low>` - Blocker priority (default: medium)
- `--description <text>` - Detailed description
- `--impact <text>` - Impact description
- `--steps <step1> <step2>` - Next steps to resolve
- `--assignee <name>` - Person assigned to resolve
- `--create-linear-issue` - Auto-create Linear issue
- `--team-id <id>` - Specific Linear team ID
- `--project-id <id>` - Specific Linear project ID

### Decision Options

- `--context <text>` - Context that led to decision
- `--decision <text>` - The actual decision made
- `--rationale <text>` - Why this decision was made
- `--alternatives <alt1> <alt2>` - Alternative options considered
- `--impact <area1> <area2>` - Areas impacted by decision
- `--status <proposed|approved|implemented|deprecated>` - Decision status
- `--link-linear-issue <issueId>` - Link to existing Linear issue
- `--create-linear-issue` - Create new Linear issue
- `--team-id <id>` - Specific Linear team ID
- `--project-id <id>` - Specific Linear project ID

## Automatic Behavior

### When Linear Issues Are Auto-Created

Blockers automatically get Linear issues when:
- Priority is `high`
- Impact contains keywords: "critical", "blocking"
- `--create-linear-issue` flag is used

Decisions automatically get linked to Linear when:
- Impact contains: "architecture", "design", "framework", "database", "api"
- Context contains: "system", "performance", "security", "scalability"
- `--create-linear-issue` or `--link-linear-issue` is used

### Linear Issue Templates

The integration uses predefined templates for different issue types:

- **Blocker Issues**: Include impact, priority, next steps, and daily status reference
- **Decision Issues**: Include context, rationale, alternatives, and impact areas
- **Maintenance Issues**: Include file paths, error details, and suggested fixes

## Integration Status

Check integration status in reports:

```bash
npm run linear:report
```

This shows:
- How many blockers/decisions have Linear issues
- Integration rate percentage
- Links to Linear issues
- Sync status

## Troubleshooting

### Linear Integration Not Working

1. **Check MCP Configuration**:
   ```bash
   cat .kiro/settings/mcp.json
   ```
   Ensure Linear MCP server is configured and enabled.

2. **Test Linear Connection**:
   ```bash
   npm run linear:test
   ```

3. **Check Linear API Key**:
   Ensure `LINEAR_API_KEY` is set in MCP configuration.

### No Linear Issues Created

1. **Check Auto-Creation Rules**:
   - High priority blockers auto-create issues
   - Use `--create-linear-issue` flag to force creation

2. **Check Team/Project Configuration**:
   - Integration auto-discovers Lumina team and project
   - Use `--team-id` and `--project-id` to override

### Sync Issues

1. **Run Manual Sync**:
   ```bash
   npm run linear:sync --days 7
   ```

2. **Check Daily Status Files**:
   Ensure daily status files exist in `docs/daily-status/`

## Best Practices

### For Solo Development

1. **Use High Priority Sparingly**: Only for true blockers that stop progress
2. **Link Architectural Decisions**: Use `--create-linear-issue` for important decisions
3. **Regular Sync**: Run `npm run linear:sync` weekly to catch missed items
4. **Review Reports**: Use `npm run linear:report` for weekly reviews

### Workflow Integration

1. **During Coding Flow**:
   ```bash
   # Hit a blocker
   npm run blocker:add "API rate limit exceeded" --priority high --create-linear-issue
   
   # Make architectural decision
   npm run decision:add "Use Redis for session storage" --create-linear-issue
   ```

2. **End of Day**:
   ```bash
   # Review active blockers
   npm run blocker:list
   
   # Generate daily report
   npm run linear:report --days 1
   ```

3. **Weekly Review**:
   ```bash
   # Generate weekly report
   npm run linear:report --days 7
   
   # Sync any missed items
   npm run linear:sync --days 7
   ```

## Configuration

The integration automatically configures itself by:

1. **Finding Lumina Team**: Looks for teams with "lumina" or "product" in the name
2. **Finding Project**: Looks for projects with "lumina" or "app" in the name  
3. **Setting Labels**: Uses predefined labels like "documentation", "blocker", "decision"

You can override these with command-line options if needed.

## File Locations

- **Daily Status Files**: `docs/daily-status/YYYY-MM-DD.md`
- **Integration Code**: `lib/daily-status-*-linear.ts`
- **CLI Scripts**: `scripts/daily-status-linear.ts`
- **Configuration**: `.kiro/settings/mcp.json`

## Next Steps

After setting up Linear integration:

1. **Try the commands** with real blockers and decisions
2. **Set up weekly review** using the report commands
3. **Configure team workflows** if working with others
4. **Explore automation** with agent hooks for automatic sync

The goal is to make Linear integration invisible - you focus on documenting your work, and Linear issues are created and managed automatically.