# TherapyTrain Project Board Guide

## Overview
The TherapyTrain project board is organized to track the development of our therapy training simulation platform. This guide explains how we organize and manage our development process.

## Board Structure

### Columns
- 🎯 **To Do**: Tasks that are ready to be worked on
- 💫 **In Progress**: Tasks currently being implemented
- ✅ **Done**: Completed tasks

### Epics
Our work is organized into eight main epics:

1. **Client Profile System**
   - Management of client personas
   - Behavioral patterns and triggers
   - Profile displays and interactions

2. **Session Management**
   - Timer functionality
   - Session controls
   - Emergency protocols

3. **AI Enhancements**
   - Dialogue systems
   - Emotional responses
   - Behavioral simulations

4. **Evaluation System**
   - Performance tracking
   - Feedback generation
   - Analysis tools

5. **UI/UX Improvements**
   - Interface design
   - User experience
   - Visual feedback

6. **Educational Features**
   - Training materials
   - Best practices
   - Reference guides

7. **Data & Analytics**
   - Performance metrics
   - Progress tracking
   - Reporting systems

8. **Security & Ethics**
   - Privacy measures
   - Ethical guidelines
   - Data protection

## Labels

### Priority Labels
- 🔴 `priority-high`: Urgent tasks requiring immediate attention
- 🟠 `priority-medium`: Important but not urgent tasks
- 🟡 `priority-low`: Tasks that can be addressed later

### Type Labels
- 💠 `epic`: Major feature sets or themes
- 🟢 `feature`: New functionality
- 🔵 `enhancement`: Improvements to existing features
- 🔺 `bug`: Issues requiring fixes
- 📘 `documentation`: Documentation updates
- 🛡️ `security`: Security-related tasks

## Issue Management

### Creating Issues
1. Use the issue template appropriate for the task type
2. Link to the relevant epic
3. Add appropriate labels
4. Assign to a milestone if applicable
5. Add to the project board

### Issue Format
```markdown
## Description
[Brief description of the task]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Additional Context
- Dependencies:
- Related Issues:
- Technical Notes:
```

### Working on Issues
1. Move card to "In Progress"
2. Create a feature branch
3. Reference issue number in commits
4. Create PR when ready
5. Move to "Done" after merge

## Automation Rules

### Automated Transitions
- New issues automatically added to "To Do"
- PRs linked to issues move them to "In Progress"
- Merged PRs move issues to "Done"

### Review Process
1. All PRs require review
2. Issues must meet acceptance criteria
3. Documentation must be updated
4. Tests must pass

## Best Practices

### Issue Management
- Keep descriptions clear and concise
- Link related issues
- Update status regularly
- Add relevant labels

### Board Maintenance
- Regular backlog grooming
- Weekly progress review
- Priority reassessment
- Epic progress tracking

## Getting Started

1. **Viewing Tasks**
   - Browse the board by epic
   - Check priority labels
   - Review unassigned tasks

2. **Taking on Work**
   - Select from "To Do"
   - Assign to yourself
   - Move to "In Progress"

3. **Completing Work**
   - Meet acceptance criteria
   - Get PR approved
   - Update documentation
   - Move to "Done"

## Questions?
Contact the project maintainers or add a comment to the relevant issue.

---
Last Updated: 2025-01-18
