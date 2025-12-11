import express from "express"
import fileUpload from "express-fileupload";
import cors from "cors"
import database from "./config/db.js"
import authRoute from "./routes/authRoute.js"
import userRoute from "./routes/userRoute.js"
import vendorRoute from "./routes/vendorRoute.js"
import customerRoute from "./routes/customerRoute.js"
import incomingShipmentRoute from "./routes/incomingShipmentRoute.js"
import outgoingShipmentRoute from "./routes/outgoingShipmentRoute.js"
import visitorEntryRoute from "./routes/visitorEntryRoute.js"
import statsRoute from "./routes/statsRoutes.js"
import weighbridgeRoute from "./routes/weighbridgeRoute.js"
import qcRoute from "./routes/qcRoute.js"
import labRoute from "./routes/labRoute.js"
import adminApprovalRoute from "./routes/adminApprovalRoute.js"
import offloadingRoute from "./routes/offloadingRoute.js"
import companyInformationRoute from "./routes/companyInformationRoute.js"




const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(
    fileUpload({
      useTempFiles: true
    })
);
 
database()
 
app.get('/', (req, res)=>{
    res.status(200).json({message: "Welcome to Newpal Admin ERP"})
})

app.use('/api/auth', authRoute)
app.use('/api/users', userRoute)
app.use('/api/vendors', vendorRoute)
app.use('/api/customers', customerRoute)
app.use('/api/incoming-shipments', incomingShipmentRoute)
app.use('/api/outgoing-shipments', outgoingShipmentRoute)
app.use('/api/visitor-entries', visitorEntryRoute)
app.use('/api/stats', statsRoute)
app.use('/api/weighbridge', weighbridgeRoute)
app.use('/api/qc', qcRoute)
app.use('/api/lab', labRoute)
app.use('/api/admin-approval', adminApprovalRoute)
app.use('/api/offloading', offloadingRoute)
app.use('/api/company-info', companyInformationRoute)








const port = process.env.Port || 3002
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
    
})



