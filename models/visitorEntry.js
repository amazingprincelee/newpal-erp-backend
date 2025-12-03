import mongoose from "mongoose";

/* ===========================================================
   VISITOR ENTRY MODEL
   =========================================================== */

const visitorEntrySchema = new mongoose.Schema(
  {
    entryType: {
      type: String,
      enum: ["Visitor", "Vendor", "Contractor", "Staff", "Driver"],
      required: true,
    },

    visitorName: { type: String, required: true },

    phone: { type: String, required: true },

    visitingWho: { type: String, required: true },

    purposeOfVisit: { type: String, required: true },

    timeIn: { type: String, required: true },
    timeOut: { type: String, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approved: { type: Boolean, default: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: { type: Date, default: null },

    passId: { type: String, default: null },

  
printedAt: { type: Date },           
printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ["pending", "approved", "exited", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);





/* ===========================================================
   EXPORT MODELS (Your Style)
   =========================================================== */

const VisitorEntry = mongoose.model("VisitorEntry", visitorEntrySchema);
export  default VisitorEntry
  




