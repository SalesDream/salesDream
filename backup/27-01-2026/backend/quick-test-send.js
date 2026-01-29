// quick-test-send.js
require("dotenv").config();
const { sendOtpEmail } = require("./src/utils/email");

(async () => {
  try {
    const info = await sendOtpEmail("your_test_email@example.com", "123456");
    console.log("Email sent:", info?.messageId || info);
  } catch (err) {
    console.error("Send failed:", err);
  }
})();
