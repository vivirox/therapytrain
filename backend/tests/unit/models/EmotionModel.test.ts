import { EmotionModel } from "../../../src/models/EmotionModel";
import { SecurityAuditService } from "../../../src/services/SecurityAuditService";

jest.mock("@xenova/transformers", () => ({
  pipeline: jest.fn().mockImplementation(() => ({
    __call__: jest.fn().mockResolvedValue([
      { label: "joy", score: 0.8 },
      { label: "trust", score: 0.6 },
    ]),
  })),
}));

describe("EmotionModel", () => {
  let emotionModel: EmotionModel;
  let mockSecurityAudit: jest.Mocked<SecurityAuditService>;

  beforeEach(() => {
    mockSecurityAudit = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    } as any;

    emotionModel = new EmotionModel(mockSecurityAudit);
  });

  describe("initialize", () => {
    it("should initialize the model successfully", async () => {
      await emotionModel.initialize();
      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        "emotion_model_initialized",
        expect.any(Object),
      );
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Model initialization failed");
      jest.spyOn(global, "pipeline").mockRejectedValueOnce(error);

      await expect(emotionModel.initialize()).rejects.toThrow(error);
      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        "emotion_model_init_error",
        expect.any(Object),
      );
    });
  });

  describe("predict", () => {
    beforeEach(async () => {
      await emotionModel.initialize();
    });

    it("should predict emotions successfully", async () => {
      const result = await emotionModel.predict("I am feeling happy");

      expect(result).toEqual({
        primary: "joy",
        secondary: "trust",
        intensity: 0.8,
      });

      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        "emotion_prediction",
        expect.any(Object),
      );
    });

    it("should handle prediction errors", async () => {
      const error = new Error("Prediction failed");
      jest.spyOn(emotionModel["model"], "_call").mockRejectedValueOnce(error);

      await expect(emotionModel.predict("test")).rejects.toThrow(error);
      expect(mockSecurityAudit.recordEvent).toHaveBeenCalledWith(
        "emotion_prediction_error",
        expect.any(Object),
      );
    });

    it("should normalize emotion labels correctly", async () => {
      jest.spyOn(emotionModel["model"], "_call").mockResolvedValueOnce([
        { label: "admiration", score: 0.9 },
        { label: "amusement", score: 0.7 },
      ]);

      const result = await emotionModel.predict("That was amazing!");

      expect(result).toEqual({
        primary: "trust",
        secondary: "joy",
        intensity: 0.9,
      });
    });

    it("should handle unknown emotion labels gracefully", async () => {
      jest
        .spyOn(emotionModel["model"], "_call")
        .mockResolvedValueOnce([{ label: "unknown_emotion", score: 0.9 }]);

      const result = await emotionModel.predict("I feel strange.");

      expect(result).toEqual({
        primary: "neutral",
        intensity: 0.9,
      });
    });

    it("should handle empty input gracefully", async () => {
      const result = await emotionModel.predict("");

      expect(result).toEqual({
        primary: "neutral",
        intensity: 0,
      });
    });

    it("should handle prediction with multiple emotions", async () => {
      jest.spyOn(emotionModel["model"], "_call").mockResolvedValueOnce([
        { label: "joy", score: 0.8 },
        { label: "fear", score: 0.4 },
      ]);

      const result = await emotionModel.predict("I am happy but a bit scared.");

      expect(result).toEqual({
        primary: "joy",
        secondary: "fear",
        intensity: 0.8,
      });
    });
  });
});
