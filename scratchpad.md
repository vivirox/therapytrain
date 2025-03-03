# Lessons

- For website image paths, always use the correct relative path (e.g., 'images/filename.png') and ensure the images directory exists
- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
- When using Jest, a test suite can fail even if all individual tests pass, typically due to issues in suite-level setup code or lifecycle hooks
- In GitHub Actions workflows:
  - Use `secrets` only for truly sensitive information like private API keys (RESEND_API_KEY, ANTHROPIC_API_KEY, etc.)
  - Use `vars` for non-sensitive configuration when appropriate
  - To avoid "Context access might be invalid" warnings:
    - Use direct references to secrets and outputs where needed instead of environment variables
    - For Terraform credentials, use `${{ github.token }}` instead of `secrets.TF_API_TOKEN`
    - For environment URLs, remove the `url` property if it's causing warnings
    - Use consistent output variable naming across workflows
  - Use correct parameter names for actions:
    - For tfsec action: use `additional_args: "--out filename.sarif"` instead of `output_file: filename.sarif`
    - For checkov action: use `output_format: sarif` instead of `output: sarif`
  - Ensure consistent output variable naming across workflows and verify that referenced output variables actually exist
  - For Tailwind CSS v4 and Next.js compatibility:
    - When using Tailwind CSS v4 with Next.js, you may encounter an error with next/font: "Package subpath './nesting' is not defined by exports"
    - Solutions:
      1. Create a patch file at `node_modules/tailwindcss/nesting.js` that exports postcss-nesting
      2. Avoid using next/font/google in layout.tsx and use standard font classes instead
      3. Make sure postcss-nesting is installed and properly referenced in postcss.config.cjs
  - For Vercel deployments with amondnet/vercel-action, use `steps.[step-id].outputs.url` for environment URLs

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
