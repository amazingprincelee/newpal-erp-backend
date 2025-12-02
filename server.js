import express from "express"
import fileUpload from "express-fileupload";
import cors from "cors"
import database from "./config/db.js"
import authRoute from "./routes/authRoute.js"
import userRoute from "./routes/userRoute.js"
import vendorRoute from "./routes/vendorRoute.js"



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






const port = process.env.Port || 3002
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
    
})



