import { NotificationHandler } from "../NotificationHandler";
import { Alert, AlertType, AlertSeverity, NotificationConfig } from "../types";
import * as nodemailer from "nodemailer";
import axios from "axios";

jest.mock("nodemailer");
jest.mock("axios");
jest.mock("../utils/logger");

describe("NotificationHandler", () => {
  let notificationHandler: NotificationHandler;
  let mockAlert: Alert;
  let mockTransporter: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock nodemailer
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Create test alert
    mockAlert = {
      id: "test-id",
      type: AlertType.AUTH_FAILURE,
      severity: AlertSeverity.HIGH,
      message: "Test alert message",
      timestamp: new Date(),
      metadata: { userId: "123" },
    };

    // Set environment variables
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "test@test.com";
    process.env.SMTP_PASS = "password";
    process.env.SMTP_FROM = "alerts@test.com";
  });

  describe("Email Notifications", () => {
    beforeEach(() => {
      const config: NotificationConfig = {
        email: {
          recipients: ["admin@test.com"],
        },
      };
      notificationHandler = new NotificationHandler(config);
    });

    it("should send email notification with correct content", async () => {
      await notificationHandler.handleAlert(mockAlert);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "alerts@test.com",
        to: "admin@test.com",
        subject: "[HIGH] Security Alert: AUTH_FAILURE",
        html: expect.stringContaining("Test alert message"),
      });
    });

    it("should handle email sending failure", async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

      await expect(notificationHandler.handleAlert(mockAlert)).rejects.toThrow(
        "SMTP error",
      );
    });
  });

  describe("Webhook Notifications", () => {
    const webhookUrl = "https://webhook.test.com";

    beforeEach(() => {
      const config: NotificationConfig = {
        webhook: {
          url: webhookUrl,
          headers: { "X-API-Key": "test-key" },
        },
      };
      notificationHandler = new NotificationHandler(config);
    });

    it("should send webhook notification with correct payload", async () => {
      await notificationHandler.handleAlert(mockAlert);

      expect(axios.post).toHaveBeenCalledWith(
        webhookUrl,
        { alert: mockAlert },
        { headers: { "X-API-Key": "test-key" } },
      );
    });

    it("should handle webhook failure", async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error("Webhook error"));

      await expect(notificationHandler.handleAlert(mockAlert)).rejects.toThrow(
        "Webhook error",
      );
    });
  });

  describe("Slack Notifications", () => {
    const slackWebhookUrl = "https://hooks.slack.com/test";

    beforeEach(() => {
      const config: NotificationConfig = {
        slack: {
          webhookUrl: slackWebhookUrl,
          channel: "#security-alerts",
        },
      };
      notificationHandler = new NotificationHandler(config);
    });

    it("should send Slack notification with correct format", async () => {
      await notificationHandler.handleAlert(mockAlert);

      expect(axios.post).toHaveBeenCalledWith(
        slackWebhookUrl,
        expect.objectContaining({
          text: expect.stringContaining("Security Alert: AUTH_FAILURE"),
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: "header",
            }),
          ]),
        }),
      );
    });

    it("should handle Slack notification failure", async () => {
      (axios.post as jest.Mock).mockRejectedValue(new Error("Slack error"));

      await expect(notificationHandler.handleAlert(mockAlert)).rejects.toThrow(
        "Slack error",
      );
    });
  });

  describe("Multiple Notification Channels", () => {
    beforeEach(() => {
      const config: NotificationConfig = {
        email: {
          recipients: ["admin@test.com"],
        },
        webhook: {
          url: "https://webhook.test.com",
        },
        slack: {
          webhookUrl: "https://hooks.slack.com/test",
        },
      };
      notificationHandler = new NotificationHandler(config);
    });

    it("should send notifications to all configured channels", async () => {
      await notificationHandler.handleAlert(mockAlert);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledTimes(2); // Webhook and Slack
    });

    it("should continue if one channel fails", async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));
      (axios.post as jest.Mock).mockResolvedValue(undefined);

      await expect(notificationHandler.handleAlert(mockAlert)).rejects.toThrow(
        "SMTP error",
      );

      expect(axios.post).toHaveBeenCalledTimes(2); // Webhook and Slack still called
    });
  });
});
