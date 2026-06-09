export default async function handler(req: any, res: any) {
  // Allow CORS / preflight requests if needed (optional but good practice for serverless)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { password } = req.body || {};

    if (!process.env.APP_PASSWORD) {
      return res.status(500).json({
        success: false,
        message: "Missing APP_PASSWORD environment variable",
      });
    }

    if (password === process.env.APP_PASSWORD) {
      // Generate standard token used by the frontend
      const token = Buffer.from(process.env.APP_PASSWORD).toString("base64");
      
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
      });
    }

    return res.status(401).json({
      success: false,
      message: "Sai mật khẩu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login error",
    });
  }
}
