# Test Generation Protocol & Standards (`generate-test.md`)

This skill document defines mandatory testing patterns, Arrange-Act-Assert (AAA) structures, mock isolation rules, coverage requirements, and scenario mandates for AI agents (`/test` command) and developers.

---

## 1. Mandatory Test Scenario Rule

Whenever a new function, service, or API endpoint is created or modified, writing a simple "it works" sanity test is strictly prohibited. Every generated test file MUST include at least:

1. **At least 1 Happy Path Scenario:** Validating correct output and state changes under normal execution conditions.
2. **At least 2 Edge Case / Error Handling Scenarios:** Testing invalid inputs, boundary conditions, missing fields, unauthorized requests, or failure exceptions.

---

## 2. Arrange-Act-Assert (AAA) Pattern

All unit and integration tests must strictly follow the explicit **AAA** structure with inline comments for readability.

```typescript
// DON'T: Unstructured, unreadable test block
test("payment process", async () => {
  const res = await processPayment({ amount: 100 });
  expect(res.status).toBe("SUCCESS");
});

// DO: Explicit AAA Pattern with Happy Path + Edge Cases
describe("PaymentService.processPayment", () => {
  it("should successfully process payment for valid input (Happy Path)", async () => {
    // 1. Arrange
    const mockPaymentGateway = { charge: vi.fn().mockResolvedValue({ id: "ch_123", status: "succeeded" }) };
    const paymentService = new PaymentService(mockPaymentGateway);
    const payload = { userId: "user_1", amount: 100, currency: "USD" };

    // 2. Act
    const result = await paymentService.processPayment(payload);

    // 3. Assert
    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("ch_123");
    expect(mockPaymentGateway.charge).toHaveBeenCalledWith(payload);
  });

  it("should throw IllegalArgumentException when payment amount is zero or negative (Edge Case 1)", async () => {
    // 1. Arrange
    const paymentService = new PaymentService(mockPaymentGatewayMock);

    // 2. Act & 3. Assert
    await expect(paymentService.processPayment({ userId: "u1", amount: -50, currency: "USD" }))
      .rejects.toThrow(IllegalArgumentException);
  });

  it("should handle third-party gateway timeouts gracefully (Edge Case 2)", async () => {
    // 1. Arrange
    const mockTimeoutGateway = { charge: vi.fn().mockRejectedValue(new Error("Gateway Timeout")) };
    const paymentService = new PaymentService(mockTimeoutGateway);

    // 2. Act & 3. Assert
    await expect(paymentService.processPayment({ userId: "u1", amount: 100, currency: "USD" }))
      .rejects.toThrow("Payment service unavailable. Please try again later.");
  });
});