const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Mongoose Schema & Model
const messageSchema = new mongoose.Schema({
  email: String,
  content: String,
  mood: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model("Message", messageSchema);

// ✅ Initialize Firebase Admin SDK
const serviceAccount = require("./portal-b5d46-firebase-adminsdk-fbsvc-754f2e2365.json");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ Middleware to verify Firebase token
const authenticateToken = async (req, res, next) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // attach user info to the request
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ✅ Firebase Login Route (Verify ID Token)
app.post("/api/firebase-login", async (req, res) => {
  const idToken = req.body.token;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    return res.status(200).json({ uid, email, message: "User authenticated" });
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// ✅ Upload Message Route (Protected)
app.post("/upload-message", authenticateToken, async (req, res) => {
  try {
    const { content, mood } = req.body;
    const email = req.user.email;

    await Message.create({
      email,
      content,
      mood
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("MongoDB insert error", err);
    res.status(500).json({ error: "DB insert failed" });
  }
});

// ✅ Start Server
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
