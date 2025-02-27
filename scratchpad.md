# Lessons

- For website image paths, always use the correct relative path (e.g., 'images/filename.png') and ensure the images directory exists
- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- When using Jest, a test suite can fail even if all individual tests pass, typically due to issues in suite-level setup code or lifecycle hooks

## Security Improvements

- Update the `SECURITY.md` file:
  - Add a section on responsible disclosure.
  - Specify the supported versions of the project and the security updates policy for each version.
  - Consider adding a PGP key for secure communication.
  - Add a link to the project's bug bounty program (if any).
- Implement a Content Security Policy (CSP) in `next.config.js`.
- Use a security linter (e.g., ESLint with a security plugin).
- Implement rate limiting (configure `express-rate-limit` properly).
- Sanitize user inputs in both the frontend and backend.
- Use a strong password policy in the authentication system.
- Implement multi-factor authentication (MFA).
- Regularly audit the code for security vulnerabilities.
- Keep dependencies up-to-date (use automated dependency updates).
- Address the deprecated subdependencies.

## Scratchpad
