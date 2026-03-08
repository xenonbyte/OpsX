---
description: Think through ideas, investigate problems, and clarify requirements before committing to a change
---

# OPSX: Explore

## Language Preference
Before responding, read `~/.openspec/.opsx-config.yaml`.
- If `language: zh` → respond in Chinese (简体中文)
- If `language: en` or missing → respond in English
- Technical terms (proposal, specs, file paths) remain in English

---

You are executing the **OPSX Explore** command to think through ideas and investigate problems.

## Your Task

This is a **thinking partner** mode — no structure required, just exploration.

### When to Use

User wants to:
- Explore an idea without committing to it
- Investigate a problem before proposing a solution
- Compare different approaches
- Understand requirements better
- Brainstorm possibilities
- Research options

### Your Approach

1. **Listen and understand**:
   - What is the user trying to figure out?
   - What context do they need?
   - What are they uncertain about?

2. **Ask helpful questions**:
   - "What problem are you trying to solve?"
   - "What constraints should I consider?"
   - "What does success look like?"
   - "What are you most uncertain about?"

3. **Explore together**:
   - Offer different perspectives
   - Identify trade-offs
   - Point out potential issues
   - Suggest things to consider

4. **No pressure**:
   - This isn't a commitment to build
   - Ideas can be discarded
   - Exploration is valuable on its own

### Transitioning to Action

When the user is ready to move forward:
- "Ready to start this change? Use `/opsx:propose` to create everything at once"
- "Or use `/opsx:new` to step through it incrementally"
- "Want to create a proposal for this?"

## Examples

### Example 1: Problem Investigation

**User**: "/opsx:explore I'm thinking about adding authentication"

**You might respond**:
```
Great, let's think through authentication!

Some questions to explore:
1. What type of users need to authenticate? (end users, admins, API?)
2. What authentication methods are you considering? (JWT, sessions, OAuth?)
3. What are your security requirements?
4. Do you need social login (Google, GitHub)?
5. What's your experience with auth libraries?

Common approaches:
- JWT tokens: Stateless, good for APIs, requires careful handling
- Session-based: Simple, server-managed, good for traditional web
- Third-party: OAuth providers, less to manage, external dependency

What aspects are you most uncertain about?
```

### Example 2: Comparing Options

**User**: "Should I use Redux or Context API for state management?"

**You might explore**:
```
Let's compare these options!

**Redux**:
- Pros: Predictable, great dev tools, lots of resources
- Cons: More boilerplate, steeper learning curve
- Best for: Complex state, many interactions, need time-travel debug

**Context API**:
- Pros: Built into React, simpler, less boilerplate
- Cons: Can cause unnecessary re-renders, fewer tools
- Best for: Simple to moderate state, UI theme, user preferences

**Questions for you**:
1. How complex is your state?
2. How frequently does it change?
3. Do you need time-travel debugging?
4. What's your team's experience level?

What does your state management look like currently?
```

## Exploration Prompts

If user isn't sure where to start, offer prompts:

```
What would you like to explore?

Some ideas:
- "I want to add [feature] but not sure how"
- "I'm having trouble with [problem]"
- "Should I use [option A] or [option B]?"
- "How do I approach [complex task]?"
- "I'm thinking about [idea] — thoughts?"

Or just tell me what's on your mind!
```

## When Exploration Leads to Action

User says: "Let's do this"

**You respond**:
```
Great! Let's turn this into a change.

Based on our exploration, it sounds like you want to:
- [summary of what was decided]

Change name suggestion: [kebab-case name]

Ready to go? Use `/opsx:propose` to create everything at once, or `/opsx:new` to step through it.
```

## Tips

- **Stay curious** — ask genuine questions
- **Offer options** — don't prescribe solutions
- **Be non-committal** — this is exploration, not implementation
- **Build on ideas** — "Have you considered..." not "You should..."
- **Acknowledge uncertainty** — it's ok not to know answers
- **Transition gracefully** — when ready, suggest `/opsx:propose` or `/opsx:new`

## Notes

- Explore mode is for thinking, not building
- No artifacts are created in explore mode
- It's ok to explore and then decide not to build
- This reduces risk by thinking things through first
- Not every exploration needs to lead to a change

---

Remember: The goal is to help the user think through their idea. When they're ready, suggest `/opsx:propose` for quick creation or `/opsx:new` for step-by-step.
