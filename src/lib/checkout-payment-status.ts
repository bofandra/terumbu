export function customerPaymentResolution(input: {
  paymentStatus: string; bookingStatus?: string; compensationStatus?: string | null
}) {
  if (input.compensationStatus === "provider_refunded") {
    return { stage: "refunded", message: "Midtrans reports a refund or chargeback. Bank or issuer completion may take additional time.", final: true };
  }
  if (input.compensationStatus === "refund_submitted") {
    return { stage: "refund_requested", message: "A refund request was accepted for processing by Midtrans. Funds are not yet confirmed received.", final: false };
  }
  if (input.compensationStatus) {
    return { stage: "operator_review", message: "Payment is under specialist review because seats are unavailable. Do not pay again; our support team is handling resolution.", final: false };
  }
  if (input.paymentStatus === "refunded") {
    return { stage: "refunded", message: "The payment provider reports a refund or chargeback. Bank completion can take additional time.", final: true };
  }
  if (input.paymentStatus === "paid" && (!input.bookingStatus || input.bookingStatus === "confirmed")) {
    return { stage: "confirmed", message: input.bookingStatus === "confirmed"
      ? "Payment verified and your expedition booking is confirmed."
      : "Your donation payment is verified.", final: true };
  }
  if (input.paymentStatus === "paid") {
    return { stage: "operator_review", message: "Payment was verified, but the booking has not been confirmed. Our team will review this.", final: false };
  }
  if (input.paymentStatus === "expired" || input.paymentStatus === "failed") {
    return { stage: "not_completed", message: "This payment was not completed according to the latest verified record. Contact support before paying again.", final: true };
  }
  return { stage: "pending", message: "Your checkout was recorded. Payment awaits verified provider confirmation; please do not pay twice.", final: false };
}

