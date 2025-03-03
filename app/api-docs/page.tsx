"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { Metadata } from "next";

// Add metadata export for better SEO
export const metadata: Metadata = {
  title: "Gradiant API Documentation",
  description: "Interactive documentation for the Gradiant API",
};

/**
 * API Documentation page using Swagger UI
 * @returns {ReactElement} Swagger UI component
 */
export default function ApiDocs(): ReactElement {
  useEffect(() => {
    // Update page title
    document.title = "Gradiant API Documentation";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="prose dark:prose-invert max-w-none mb-8">
          <h1>API Documentation</h1>
          <p>
            Welcome to the Gradiant API documentation. This interactive
            documentation allows you to explore the API endpoints and try them
            out.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
          <SwaggerUI
            url="/api/openapi.yaml"
            docExpansion="list"
            filter={true}
            persistAuthorization={true}
            tryItOutEnabled={true}
          />
        </div>

        <div className="prose dark:prose-invert max-w-none mt-8">
          <h2>Getting Started</h2>
          <p>
            To use the API, you'll need to authenticate using one of the
            supported methods:
          </p>
          <ul>
            <li>
              <strong>Bearer Token</strong>: Obtain a JWT token by logging in
              through the authentication endpoints
            </li>
            <li>
              <strong>API Key</strong>: Request an API key for server-to-server
              communication
            </li>
            <li>
              <strong>WebAuthn</strong>: Use passwordless authentication with
              security keys or biometrics
            </li>
          </ul>

          <h2>Rate Limiting</h2>
          <p>
            The API implements rate limiting to ensure fair usage. Rate limit
            information is included in the response headers:
          </p>
          <ul>
            <li>
              <code>X-RateLimit-Limit</code>: Maximum requests per time window
            </li>
            <li>
              <code>X-RateLimit-Remaining</code>: Remaining requests in the
              current window
            </li>
            <li>
              <code>X-RateLimit-Reset</code>: Time until the rate limit resets
            </li>
          </ul>

          <h2>Support</h2>
          <p>
            If you need help or have questions about the API, please contact our
            support team at{" "}
            <a href="mailto:support@gradiant.dev">support@gradiant.dev</a> or
            visit our{" "}
            <a href="https://gradiant.dev/support">support documentation</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
