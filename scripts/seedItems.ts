import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/community-fund";

const GiveawayItemSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  description: { type: String, default: "" },
  estimatedValue: { type: Number, default: 0 },
}, { timestamps: true });

const GiveawayItem = mongoose.models.GiveawayItem || mongoose.model("GiveawayItem", GiveawayItemSchema);

const ITEMS = [
  { name: "Ambient Lights", description: "Interior RGB ambient lighting kit", estimatedValue: 3500 },
  { name: "LED Headlights", description: "High-performance LED headlight upgrade", estimatedValue: 8000 },
  { name: "Body Kit", description: "Front & rear bumper body kit", estimatedValue: 25000 },
  { name: "Car Perfume Set", description: "Premium car freshener set (3 pieces)", estimatedValue: 1200 },
  { name: "Steering Wheel Cover", description: "Leather-grip steering wheel cover", estimatedValue: 800 },
  { name: "Dash Cam", description: "1080p front & rear dash camera", estimatedValue: 6500 },
  { name: "Seat Covers", description: "Full set premium seat covers", estimatedValue: 4500 },
  { name: "Car Polish Kit", description: "Professional car detailing & polish kit", estimatedValue: 2200 },
];

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);

  let added = 0;
  let skipped = 0;

  for (const item of ITEMS) {
    const exists = await GiveawayItem.findOne({ name: item.name });
    if (exists) {
      console.log(`  Skipped (already exists): ${item.name}`);
      skipped++;
    } else {
      await GiveawayItem.create(item);
      console.log(`  Added: ${item.name}`);
      added++;
    }
  }

  console.log(`\n✅ Done — ${added} added, ${skipped} skipped.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
