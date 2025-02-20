import express from 'express';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Patient, Provider, Organization } from '../../../../src/types';

abstract class MockEHRServer {
  protected app: express.Application;
  protected server: Server | null = null;
  protected port: number = 0;
  protected data: {
    patients: Map<string, Patient>;
    providers: Map<string, Provider>;
    organizations: Map<string, Organization>;
  };
  
  constructor() {
    this.app = express();
    this.data = {
      patients: new Map(),
      providers: new Map(),
      organizations: new Map()
    };
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  protected setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      // Log request for debugging
      console.log(`[${this.constructor.name}] ${req.method} ${req.path}`);
      next();
    });
  }
  
  protected abstract setupRoutes(): void;
  
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(0, () => {
        this.port = (this.server?.address() as any).port;
        console.log(`[${this.constructor.name}] Started on port ${this.port}`);
        resolve();
      });
    });
  }
  
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  get url(): string {
    if (!this.port) {
      throw new Error('Server not started');
    }
    return `http://localhost:${this.port}`;
  }
  
  // Helper methods for data management
  protected addTestData() {
    // Add test patients
    this.data.patients.set('test-patient-1', {
      id: 'test-patient-1',
      externalId: 'EXT001',
      name: 'John Doe',
      dateOfBirth: new Date('1980-01-01'),
      status: 'active'
    });
    
    // Add test providers
    this.data.providers.set('test-provider-1', {
      id: 'test-provider-1',
      externalId: 'PROV001',
      name: 'Dr. Jane Smith',
      speciality: 'Family Medicine',
      status: 'active'
    });
    
    // Add test organizations
    this.data.organizations.set('test-org-1', {
      id: 'test-org-1',
      externalId: 'ORG001',
      name: 'Test Hospital',
      type: 'Hospital',
      status: 'active'
    });
  }
}

export class MockEpicServer extends MockEHRServer {
  protected setupRoutes() {
    // Add Epic-specific routes
    this.app.get('/api/FHIR/R4/Patient/:id', (req, res) => {
      const patient = this.data.patients.get(req.params.id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }
      res.json(patient);
    });
    
    this.app.get('/api/FHIR/R4/Patient', (req, res) => {
      const patients = Array.from(this.data.patients.values());
      res.json({
        resourceType: 'Bundle',
        type: 'searchset',
        total: patients.length,
        entry: patients.map(p => ({ resource: p }))
      });
    });
    
    this.app.post('/api/FHIR/R4/Patient', (req, res) => {
      const patient = req.body;
      patient.id = uuidv4();
      this.data.patients.set(patient.id, patient);
      res.status(201).json(patient);
    });
    
    // Add more Epic-specific endpoints as needed
  }
}

export class MockCernerServer extends MockEHRServer {
  protected setupRoutes() {
    // Add Cerner-specific routes
    this.app.get('/api/v1/patients/:id', (req, res) => {
      const patient = this.data.patients.get(req.params.id);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }
      res.json(patient);
    });
    
    this.app.get('/api/v1/patients', (req, res) => {
      const patients = Array.from(this.data.patients.values());
      res.json({
        data: patients,
        metadata: {
          count: patients.length
        }
      });
    });
    
    this.app.post('/api/v1/patients', (req, res) => {
      const patient = req.body;
      patient.id = uuidv4();
      this.data.patients.set(patient.id, patient);
      res.status(201).json(patient);
    });
    
    // Add more Cerner-specific endpoints as needed
  }
}

export class MockAllscriptsServer extends MockEHRServer {
  protected setupRoutes() {
    // Add Allscripts-specific routes
    this.app.get('/Unity/SOAP/GetPatient', (req, res) => {
      const patientId = req.query.patientId as string;
      const patient = this.data.patients.get(patientId);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }
      res.json({
        GetPatientResult: patient
      });
    });
    
    this.app.get('/Unity/SOAP/SearchPatients', (req, res) => {
      const patients = Array.from(this.data.patients.values());
      res.json({
        SearchPatientsResult: patients
      });
    });
    
    this.app.post('/Unity/SOAP/SavePatient', (req, res) => {
      const patient = req.body;
      patient.id = uuidv4();
      this.data.patients.set(patient.id, patient);
      res.status(201).json({
        SavePatientResult: patient
      });
    });
    
    // Add more Allscripts-specific endpoints as needed
  }
}

// Export test data types
export interface TestPatient extends Patient {
  id: string;
  externalId: string;
  name: string;
  dateOfBirth: Date;
  status: string;
}

export interface TestProvider extends Provider {
  id: string;
  externalId: string;
  name: string;
  speciality: string;
  status: string;
}

export interface TestOrganization extends Organization {
  id: string;
  externalId: string;
  name: string;
  type: string;
  status: string;
} 