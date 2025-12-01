import mongoose from 'mongoose';
import { config } from "dotenv"
config()

const isMongoDbCloudConnection = true;





const connectDB = async () => {
  try {
     
    if(isMongoDbCloudConnection){

      const mongoDb = await mongoose.connect(process.env.MONGO_URI );
      console.log(`📦 MongoDB Connected: ${mongoDb.connection.host}`);
     

    }else{
      await mongoose.connect(process.env.LOCAL_URL);
        console.log("✅ Connected to Local MongoDB");
    }
      
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;