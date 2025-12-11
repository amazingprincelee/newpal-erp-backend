import mongoose from "mongoose"



const companyInfoSchema = new mongoose.Schema({
    name: String,
    description: String,
    address: String,
    logo: String,
    createdAt: {type: Date, default: Date.now}
})



const CompanyInfo = mongoose.model("CompanyInformation", companyInfoSchema)

export default CompanyInfo;