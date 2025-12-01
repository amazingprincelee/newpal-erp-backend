import express from "express"
import authRoute from "./routes/authRoute.js"
import database from "./config/db.js"
import { config } from "dotenv"
config()


const app = express()


app.use(express.urlencoded({ extended: false }));
app.use(express.json())
 
database()
 
app.get('/', (req, res)=>{
    res.status(200).json({message: "Welcome to Newpal Admin ERP"})
})

app.use('/api/auth', authRoute)






const port = process.env.Port || 3002
app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
    
})



