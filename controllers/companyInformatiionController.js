import CompanyInfo from "../models/companyInformation.js";
import { upload, deleteFromCloudinary } from "../config/cloudinary.js";

// =============================
//  GET COMPANY INFO
// =============================
export const getCompanyInfo = async (req, res) => {
  try {
    const info = await CompanyInfo.findOne();
    res.status(200).json({
      success: true,
      data: info || {},
    });
  } catch (error) {
    console.error("Get Company Info Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// =============================
//  CREATE / UPDATE COMPANY INFO
//  (Only one company record allowed)
// =============================
export const saveCompanyInfo = async (req, res) => {
  try {
    let { name, description, address } = req.body;
    let logoUrl = null;

    // Handle logo upload
    if (req.files && req.files.logo) {
      const uploaded = await upload(req.files.logo.tempFilePath, "company");
      logoUrl = uploaded.secure_url;
    }

    let existing = await CompanyInfo.findOne();

    // If NO company info exists → CREATE NEW
    if (!existing) {
      const newData = new CompanyInfo({
        name,
        description,
        address,
        logo: logoUrl,
      });

      await newData.save();

      return res.status(201).json({
        success: true,
        message: "Company information created successfully",
        data: newData,
      });
    }

    // If EXISTS → UPDATE IT
    // Delete old logo if new one uploaded
    if (logoUrl && existing.logo) {
      await deleteFromCloudinary(existing.logo);
    }

    existing.name = name || existing.name;
    existing.description = description || existing.description;
    existing.address = address || existing.address;

    if (logoUrl) existing.logo = logoUrl;

    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Company information updated successfully",
      data: existing,
    });

  } catch (error) {
    console.error("Save Company Info Error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};
