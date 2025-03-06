import Resource from "fhir-kit-client";
import Patient from "fhir-kit-client";
import Practitioner from "fhir-kit-client";
import Organization from "fhir-kit-client";
import { boolean, number, string } from "zod";

// Core FHIR resource types we'll be working with
export type FHIRResourceType =
  | "Patient"
  | "Practitioner"
  | "Organization"
  | "Appointment"
  | "Schedule"
  | "Slot"
  | "Observation"
  | "Condition"
  | "MedicationStatement";

// Base interface for all FHIR resources
export interface FHIRResource extends Resource {
  id: unknown;
  resourceType: FHIRResourceType;
}

// EHR Provider interface
export interface EHRProvider {
  id: string;
  name: string;
  baseUrl: string;
  authType: "oauth2" | "apikey" | "basic";
  settings: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    username?: string;
    password?: string;
    scope?: string[];
  };
}

// HIPAA-compliant audit log entry
export interface AuditLogEntry {
  timestamp: string;
  actor: {
    id: string;
    type: "user" | "system";
    name: string;
  };
  action: "create" | "read" | "update" | "delete";
  resource: {
    type: FHIRResourceType;
    id: string;
  };
  details: string;
  status: "success" | "failure";
  ipAddress: string;
  userAgent: string;
}

// Error types
export type EHRError = {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  source: "ehr" | "fhir" | "internal";
};

// Configuration types
export interface EHRConfig {
  providers: Array<EHRProvider>;
  defaultProvider: string;
  auditLogEnabled: boolean;
  cacheDuration: number; // in seconds
  retryAttempts: number;
  timeout: number; // in milliseconds
}
