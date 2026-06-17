import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { startOfMonth, subMonths } from "date-fns";

config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/community-fund";

// ---- Inline schemas to avoid Next.js import issues ----
const AdminUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, default: "admin" },
}, { timestamps: true });

const MemberSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: { type: String, unique: true },
  passwordHash: String,
  joinDate: Date,
  queuePosition: { type: Number, default: null },
  status: { type: String, default: "ACTIVE" },
}, { timestamps: true });


const ContributionSchema = new mongoose.Schema({
  memberId: mongoose.Schema.Types.ObjectId,
  month: Number,
  year: Number,
  amount: Number,
  status: { type: String, default: "UNPAID" },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  recordedAt: { type: Date, default: null },
}, { timestamps: true });
ContributionSchema.index({ memberId: 1, month: 1, year: 1 }, { unique: true });

const GiveawaySchema = new mongoose.Schema({
  month: Number,
  year: Number,
  title: String,
  recipients: [{
    memberId: mongoose.Schema.Types.ObjectId,
    itemName: String,
    itemValue: { type: Number, default: 0 },
    queuePositionAtTime: Number,
  }],
  status: { type: String, default: "DRAFT" },
  notes: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  distributedAt: { type: Date, default: null },
}, { timestamps: true });

const GiveawayItemSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  description: { type: String, default: "" },
  estimatedValue: { type: Number, default: 0 },
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  communityName: String,
  monthlyFee: Number,
  currency: String,
}, { timestamps: true });

const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);
const Member = mongoose.models.Member || mongoose.model("Member", MemberSchema);
const Contribution = mongoose.models.Contribution || mongoose.model("Contribution", ContributionSchema);
const Giveaway = mongoose.models.Giveaway || mongoose.model("Giveaway", GiveawaySchema);
const GiveawayItem = mongoose.models.GiveawayItem || mongoose.model("GiveawayItem", GiveawayItemSchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

const MONTHLY_FEE = 100;

const MEMBERS = [
  { name: "Ahmed Khan", phone: "0300-1234567", email: "ahmed@example.com", monthsAgo: 6 },
  { name: "Ali Hassan", phone: "0301-2345678", email: "ali@example.com", monthsAgo: 6 },
  { name: "Bilal Raza", phone: "0302-3456789", email: "bilal@example.com", monthsAgo: 5 },
  { name: "Usman Tariq", phone: "0303-4567890", email: "usman@example.com", monthsAgo: 4 },
  { name: "Kamran Shah", phone: "0304-5678901", email: "kamran@example.com", monthsAgo: 4 },
  { name: "Faisal Mehmood", phone: "0305-6789012", email: "faisal@example.com", monthsAgo: 3 },
  { name: "Hassan Butt", phone: "0306-7890123", email: "hassan@example.com", monthsAgo: 3 },
  { name: "Imran Qureshi", phone: "0307-8901234", email: "imran@example.com", monthsAgo: 2 },
  { name: "Tariq Mahmood", phone: "0308-9012345", email: "tariq@example.com", monthsAgo: 2 },
  { name: "Omer Farooq", phone: "0309-0123456", email: "omer@example.com", monthsAgo: 1 },
];

function getMonthRange(joinDate: Date): Array<{ month: number; year: number }> {
  const months: Array<{ month: number; year: number }> = [];
  const now = new Date();
  let current = startOfMonth(new Date(joinDate));
  const end = startOfMonth(now);
  while (current <= end) {
    months.push({ month: current.getMonth() + 1, year: current.getFullYear() });
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return months;
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // Clear existing data
  await Promise.all([
    AdminUser.deleteMany({}),
    Member.deleteMany({}),
    Contribution.deleteMany({}),
    Giveaway.deleteMany({}),
    GiveawayItem.deleteMany({}),
    Settings.deleteMany({}),
  ]);
  console.log("Cleared existing data.");

  // Settings
  await Settings.create({
    communityName: "Karachi Car Enthusiasts Fund",
    monthlyFee: MONTHLY_FEE,
    currency: "Rs.",
  });
  console.log("Created settings.");

  // Admin
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await AdminUser.create({
    name: "Admin User",
    email: "admin@example.com",
    passwordHash: adminHash,
    role: "admin",
  });
  console.log(`Created admin: admin@example.com / admin123`);

  // Members
  const memberHash = await bcrypt.hash("member123", 12);
  const createdMembers = [];

  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const joinDate = startOfMonth(subMonths(new Date(), m.monthsAgo));
    const member = await Member.create({
      name: m.name,
      phone: m.phone,
      email: m.email,
      passwordHash: memberHash,
      joinDate,
      queuePosition: i + 1,
      status: "ACTIVE",
    });
    createdMembers.push(member);
    console.log(`  Created member #${i + 1}: ${m.name}`);
  }

  // Contributions — realistic paid/unpaid mix
  const paymentRates: Record<string, number> = {
    "Ahmed Khan": 1.0,    // Always pays
    "Ali Hassan": 1.0,
    "Bilal Raza": 0.8,
    "Usman Tariq": 0.75,
    "Kamran Shah": 1.0,
    "Faisal Mehmood": 0.67,
    "Hassan Butt": 1.0,
    "Imran Qureshi": 0.5,
    "Tariq Mahmood": 1.0,
    "Omer Farooq": 1.0,
  };

  for (const member of createdMembers) {
    const months = getMonthRange(member.joinDate);
    const rate = paymentRates[member.name as string] ?? 0.8;

    for (let idx = 0; idx < months.length; idx++) {
      const m = months[idx];
      const isPaid = idx < Math.floor(months.length * rate);
      await Contribution.create({
        memberId: member._id,
        month: m.month,
        year: m.year,
        amount: MONTHLY_FEE,
        status: isPaid ? "PAID" : "UNPAID",
        recordedBy: isPaid ? admin._id : null,
        recordedAt: isPaid ? new Date() : null,
      });
    }
  }
  console.log("Created contribution records.");

  // Giveaway Items catalog
  const itemsData = [
    { name: "Ambient Lights", description: "Interior RGB ambient lighting kit", estimatedValue: 3500 },
    { name: "LED Headlights", description: "High-performance LED headlight upgrade", estimatedValue: 8000 },
    { name: "Body Kit", description: "Front & rear bumper body kit", estimatedValue: 25000 },
    { name: "Car Perfume Set", description: "Premium car freshener set (3 pieces)", estimatedValue: 1200 },
    { name: "Steering Wheel Cover", description: "Leather-grip steering wheel cover", estimatedValue: 800 },
    { name: "Dash Cam", description: "1080p front & rear dash camera", estimatedValue: 6500 },
    { name: "Seat Covers", description: "Full set premium seat covers", estimatedValue: 4500 },
    { name: "Car Polish Kit", description: "Professional car detailing & polish kit", estimatedValue: 2200 },
  ];
  await GiveawayItem.insertMany(itemsData);
  console.log(`Created ${itemsData.length} giveaway items.`);

  // Giveaways — first three members already received
  const now = new Date();
  const prevMonth = subMonths(now, 1);
  const prevPrevMonth = subMonths(now, 2);

  await Giveaway.create({
    month: prevPrevMonth.getMonth() + 1,
    year: prevPrevMonth.getFullYear(),
    title: "Giveaway — " + prevPrevMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    recipients: [
      { memberId: createdMembers[0]._id, itemName: "Ambient Lights", itemValue: 3500, queuePositionAtTime: 1 },
      { memberId: createdMembers[1]._id, itemName: "Steering Wheel Cover", itemValue: 800, queuePositionAtTime: 2 },
    ],
    status: "DISTRIBUTED",
    notes: "",
    createdBy: admin._id,
    distributedAt: prevPrevMonth,
  });

  await Giveaway.create({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
    title: "Giveaway — " + prevMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    recipients: [
      { memberId: createdMembers[2]._id, itemName: "LED Headlights", itemValue: 8000, queuePositionAtTime: 3 },
    ],
    status: "DISTRIBUTED",
    notes: "",
    createdBy: admin._id,
    distributedAt: prevMonth,
  });

  console.log(`Created 2 distributed giveaways.`);

  console.log("\n✅ Seed complete!\n");
  console.log("Login credentials:");
  console.log("  Admin:  admin@example.com  / admin123");
  console.log("  Member: ahmed@example.com  / member123");
  console.log("  Member: ali@example.com    / member123");
  console.log("  (all members share password: member123)\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
