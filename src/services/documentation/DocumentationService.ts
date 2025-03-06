import { singleton } from "tsyringe";
import { dataService } from "@/lib/data";
import { NLPService } from "../nlp/NLPService";

@singleton()
export class DocumentationService {
  private static instance: DocumentationService;
  private nlpService: NLPService;

  constructor() {
    this.nlpService = NLPService.getInstance();
  }

  public static getInstance(): DocumentationService {
    if (!DocumentationService.instance) {
      DocumentationService.instance = new DocumentationService();
    }
    return DocumentationService.instance;
  }

  public async getRequiredFields(session: any): Promise<string[]> {
    const sessionType = await this.getSessionType(session);
    return this.getRequiredFieldsByType(sessionType);
  }

  public async getCompletedFields(session: any): Promise<string[]> {
    const documentation = await this.getSessionDocumentation(session);
    return this.extractCompletedFields(documentation);
  }

  public async assessClarity(documentation: any): Promise<{
    readability: number;
    structure: number;
    consistency: number;
  }> {
    try {
      // Analyze readability
      const readabilityScore = await this.analyzeReadability(documentation);

      // Analyze structure
      const structureScore = await this.analyzeStructure(documentation);

      // Analyze consistency
      const consistencyScore = await this.analyzeConsistency(documentation);

      return {
        readability: readabilityScore,
        structure: structureScore,
        consistency: consistencyScore,
      };
    } catch (error) {
      console.error("Error assessing documentation clarity:", error);
      return {
        readability: 0,
        structure: 0,
        consistency: 0,
      };
    }
  }

  public async assessTimeliness(documentation: any): Promise<{
    submissionTime: number;
    completionTime: number;
  }> {
    try {
      // Calculate submission timeliness
      const submissionScore = this.calculateSubmissionTimeliness(documentation);

      // Calculate completion timeliness
      const completionScore = this.calculateCompletionTimeliness(documentation);

      return {
        submissionTime: submissionScore,
        completionTime: completionScore,
      };
    } catch (error) {
      console.error("Error assessing documentation timeliness:", error);
      return {
        submissionTime: 0,
        completionTime: 0,
      };
    }
  }

  public async assessAccuracy(documentation: any): Promise<{
    factualCorrectness: number;
    completeness: number;
    consistency: number;
  }> {
    try {
      // Analyze factual correctness
      const correctnessScore =
        await this.analyzeFactualCorrectness(documentation);

      // Analyze completeness
      const completenessScore = await this.analyzeCompleteness(documentation);

      // Analyze internal consistency
      const consistencyScore =
        await this.analyzeInternalConsistency(documentation);

      return {
        factualCorrectness: correctnessScore,
        completeness: completenessScore,
        consistency: consistencyScore,
      };
    } catch (error) {
      console.error("Error assessing documentation accuracy:", error);
      return {
        factualCorrectness: 0,
        completeness: 0,
        consistency: 0,
      };
    }
  }

  public async assessStandards(documentation: any): Promise<{
    formatCompliance: number;
    contentCompliance: number;
    regulatoryCompliance: number;
  }> {
    try {
      // Check format compliance
      const formatScore = await this.checkFormatCompliance(documentation);

      // Check content compliance
      const contentScore = await this.checkContentCompliance(documentation);

      // Check regulatory compliance
      const regulatoryScore =
        await this.checkRegulatoryCompliance(documentation);

      return {
        formatCompliance: formatScore,
        contentCompliance: contentScore,
        regulatoryCompliance: regulatoryScore,
      };
    } catch (error) {
      console.error("Error assessing documentation standards:", error);
      return {
        formatCompliance: 0,
        contentCompliance: 0,
        regulatoryCompliance: 0,
      };
    }
  }

  private async getSessionType(session: any): Promise<string> {
    const sessionData = await dataService.get("sessions", session.id);
    return sessionData.type;
  }

  private getRequiredFieldsByType(type: string): string[] {
    const baseFields = [
      "clientInformation",
      "sessionDate",
      "sessionDuration",
      "presentingProblems",
      "interventions",
      "observations",
      "planOfCare",
    ];

    switch (type) {
      case "initial":
        return [
          ...baseFields,
          "intakeAssessment",
          "diagnosticImpression",
          "treatmentGoals",
          "riskAssessment",
        ];
      case "progress":
        return [...baseFields, "progressNotes", "goalProgress", "adjustments"];
      case "termination":
        return [
          ...baseFields,
          "treatmentSummary",
          "outcomeMeasures",
          "terminationReason",
          "recommendations",
        ];
      default:
        return baseFields;
    }
  }

  private async getSessionDocumentation(session: any): Promise<any> {
    return await dataService.get("session_documentation", {
      where: {
        sessionId: session.id,
      },
    });
  }

  private extractCompletedFields(documentation: any): string[] {
    if (!documentation) return [];

    return Object.entries(documentation)
      .filter(([_, value]) => this.isFieldComplete(value))
      .map(([field]) => field);
  }

  private isFieldComplete(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  }

  private async analyzeReadability(documentation: any): Promise<number> {
    try {
      const content = this.extractTextContent(documentation);
      const analysis = await this.nlpService.assessUnderstanding(content);
      return analysis.taskClarity;
    } catch (error) {
      console.error("Error analyzing readability:", error);
      return 0;
    }
  }

  private async analyzeStructure(documentation: any): Promise<number> {
    try {
      // Check section organization
      const sectionScore = this.assessSectionOrganization(documentation);

      // Check formatting consistency
      const formatScore = this.assessFormattingConsistency(documentation);

      // Check logical flow
      const flowScore = this.assessLogicalFlow(documentation);

      return (sectionScore + formatScore + flowScore) / 3;
    } catch (error) {
      console.error("Error analyzing structure:", error);
      return 0;
    }
  }

  private async analyzeConsistency(documentation: any): Promise<number> {
    try {
      // Check terminology consistency
      const terminologyScore =
        await this.checkTerminologyConsistency(documentation);

      // Check format consistency
      const formatScore = this.checkFormatConsistency(documentation);

      // Check style consistency
      const styleScore = this.checkStyleConsistency(documentation);

      return (terminologyScore + formatScore + styleScore) / 3;
    } catch (error) {
      console.error("Error analyzing consistency:", error);
      return 0;
    }
  }

  private calculateSubmissionTimeliness(documentation: any): number {
    const submissionTime = new Date(documentation.submittedAt);
    const sessionTime = new Date(documentation.sessionDate);
    const deadline = new Date(sessionTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours deadline

    if (submissionTime <= deadline) return 1;

    const hoursLate =
      (submissionTime.getTime() - deadline.getTime()) / (60 * 60 * 1000);
    return Math.max(0, 1 - hoursLate / 72); // Deduct points for up to 72 hours late
  }

  private calculateCompletionTimeliness(documentation: any): number {
    const completionTime = new Date(documentation.completedAt);
    const startTime = new Date(documentation.startedAt);
    const expectedDuration = 60 * 60 * 1000; // 1 hour expected duration

    const actualDuration = completionTime.getTime() - startTime.getTime();
    return Math.min(1, expectedDuration / actualDuration);
  }

  private async analyzeFactualCorrectness(documentation: any): Promise<number> {
    try {
      // Check against session records
      const sessionAccuracy = await this.checkSessionAccuracy(documentation);

      // Check against client records
      const clientAccuracy = await this.checkClientAccuracy(documentation);

      // Check against treatment plan
      const treatmentAccuracy =
        await this.checkTreatmentAccuracy(documentation);

      return (sessionAccuracy + clientAccuracy + treatmentAccuracy) / 3;
    } catch (error) {
      console.error("Error analyzing factual correctness:", error);
      return 0;
    }
  }

  private async analyzeCompleteness(documentation: any): Promise<number> {
    try {
      const requiredFields = await this.getRequiredFields(
        documentation.sessionId,
      );
      const completedFields = this.extractCompletedFields(documentation);

      const completionRate = completedFields.length / requiredFields.length;
      const contentQuality = await this.assessContentQuality(documentation);

      return (completionRate + contentQuality) / 2;
    } catch (error) {
      console.error("Error analyzing completeness:", error);
      return 0;
    }
  }

  private async analyzeInternalConsistency(
    documentation: any,
  ): Promise<number> {
    try {
      // Check data consistency
      const dataConsistency = this.checkDataConsistency(documentation);

      // Check narrative consistency
      const narrativeConsistency =
        await this.checkNarrativeConsistency(documentation);

      // Check temporal consistency
      const temporalConsistency = this.checkTemporalConsistency(documentation);

      return (dataConsistency + narrativeConsistency + temporalConsistency) / 3;
    } catch (error) {
      console.error("Error analyzing internal consistency:", error);
      return 0;
    }
  }

  private async checkFormatCompliance(documentation: any): Promise<number> {
    try {
      // Check template compliance
      const templateScore = this.checkTemplateCompliance(documentation);

      // Check formatting rules
      const formattingScore = this.checkFormattingRules(documentation);

      // Check structure requirements
      const structureScore = this.checkStructureRequirements(documentation);

      return (templateScore + formattingScore + structureScore) / 3;
    } catch (error) {
      console.error("Error checking format compliance:", error);
      return 0;
    }
  }

  private async checkContentCompliance(documentation: any): Promise<number> {
    try {
      // Check required content
      const contentScore = this.checkRequiredContent(documentation);

      // Check terminology usage
      const terminologyScore = this.checkTerminologyUsage(documentation);

      // Check documentation standards
      const standardsScore = this.checkDocumentationStandards(documentation);

      return (contentScore + terminologyScore + standardsScore) / 3;
    } catch (error) {
      console.error("Error checking content compliance:", error);
      return 0;
    }
  }

  private async checkRegulatoryCompliance(documentation: any): Promise<number> {
    try {
      // Check HIPAA compliance
      const hipaaScore = this.checkHipaaCompliance(documentation);

      // Check professional standards
      const standardsScore = this.checkProfessionalStandards(documentation);

      // Check legal requirements
      const legalScore = this.checkLegalRequirements(documentation);

      return (hipaaScore + standardsScore + legalScore) / 3;
    } catch (error) {
      console.error("Error checking regulatory compliance:", error);
      return 0;
    }
  }

  private extractTextContent(documentation: any): string {
    return Object.values(documentation)
      .filter((value) => typeof value === "string")
      .join("\n");
  }

  private assessSectionOrganization(documentation: any): number {
    const requiredSections = this.getRequiredSections(documentation.type);
    const presentSections = Object.keys(documentation);

    return (
      requiredSections.filter((section) => presentSections.includes(section))
        .length / requiredSections.length
    );
  }

  private assessFormattingConsistency(documentation: any): number {
    // Implement formatting consistency checks
    return 1;
  }

  private assessLogicalFlow(documentation: any): number {
    // Implement logical flow assessment
    return 1;
  }

  private async checkTerminologyConsistency(
    documentation: any,
  ): Promise<number> {
    const content = this.extractTextContent(documentation);
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    return analysis.appropriateness;
  }

  private checkFormatConsistency(documentation: any): number {
    // Implement format consistency checks
    return 1;
  }

  private checkStyleConsistency(documentation: any): number {
    // Implement style consistency checks
    return 1;
  }

  private async checkSessionAccuracy(documentation: any): Promise<number> {
    const session = await dataService.get("sessions", documentation.sessionId);
    return this.compareSessionData(documentation, session);
  }

  private async checkClientAccuracy(documentation: any): Promise<number> {
    const client = await dataService.get("clients", documentation.clientId);
    return this.compareClientData(documentation, client);
  }

  private async checkTreatmentAccuracy(documentation: any): Promise<number> {
    const treatment = await dataService.get("treatment_plans", {
      where: {
        clientId: documentation.clientId,
        status: "active",
      },
    });
    return this.compareTreatmentData(documentation, treatment);
  }

  private async assessContentQuality(documentation: any): Promise<number> {
    const content = this.extractTextContent(documentation);
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    return analysis.effectiveness;
  }

  private checkDataConsistency(documentation: any): number {
    // Implement data consistency checks
    return 1;
  }

  private async checkNarrativeConsistency(documentation: any): Promise<number> {
    const content = this.extractTextContent(documentation);
    const analysis = await this.nlpService.analyzeTherapeuticContent(content);
    return analysis.appropriateness;
  }

  private checkTemporalConsistency(documentation: any): number {
    // Implement temporal consistency checks
    return 1;
  }

  private checkTemplateCompliance(documentation: any): number {
    // Implement template compliance checks
    return 1;
  }

  private checkFormattingRules(documentation: any): number {
    // Implement formatting rules checks
    return 1;
  }

  private checkStructureRequirements(documentation: any): number {
    // Implement structure requirements checks
    return 1;
  }

  private checkRequiredContent(documentation: any): number {
    // Implement required content checks
    return 1;
  }

  private checkTerminologyUsage(documentation: any): number {
    // Implement terminology usage checks
    return 1;
  }

  private checkDocumentationStandards(documentation: any): number {
    // Implement documentation standards checks
    return 1;
  }

  private checkHipaaCompliance(documentation: any): number {
    // Implement HIPAA compliance checks
    return 1;
  }

  private checkProfessionalStandards(documentation: any): number {
    // Implement professional standards checks
    return 1;
  }

  private checkLegalRequirements(documentation: any): number {
    // Implement legal requirements checks
    return 1;
  }

  private getRequiredSections(type: string): string[] {
    const baseSections = [
      "clientInformation",
      "sessionSummary",
      "interventions",
      "observations",
      "planOfCare",
    ];

    switch (type) {
      case "initial":
        return [
          ...baseSections,
          "intakeAssessment",
          "diagnosis",
          "treatmentPlan",
        ];
      case "progress":
        return [...baseSections, "progressNotes", "goalProgress"];
      case "termination":
        return [
          ...baseSections,
          "treatmentSummary",
          "outcomes",
          "recommendations",
        ];
      default:
        return baseSections;
    }
  }

  private compareSessionData(documentation: any, session: any): number {
    const fields = ["date", "duration", "type", "modality"];
    let matches = 0;

    fields.forEach((field) => {
      if (documentation[field] === session[field]) {
        matches++;
      }
    });

    return matches / fields.length;
  }

  private compareClientData(documentation: any, client: any): number {
    const fields = ["name", "id", "demographics", "diagnosis"];
    let matches = 0;

    fields.forEach((field) => {
      if (documentation[field] === client[field]) {
        matches++;
      }
    });

    return matches / fields.length;
  }

  private compareTreatmentData(documentation: any, treatment: any): number {
    const fields = ["goals", "interventions", "progress"];
    let matches = 0;

    fields.forEach((field) => {
      if (this.compareArrays(documentation[field], treatment[field])) {
        matches++;
      }
    });

    return matches / fields.length;
  }

  private compareArrays(arr1: any[], arr2: any[]): boolean {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => this.deepEqual(item, arr2[index]));
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 !== "object") return false;
    if (obj1 === null || obj2 === null) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(
      (key) => keys2.includes(key) && this.deepEqual(obj1[key], obj2[key]),
    );
  }
}
