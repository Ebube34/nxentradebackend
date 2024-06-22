import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();


async function dbConnect(){
    mongoose.set('strictQuery', true);
    mongoose.connect(
        process.env.DB_URL
    )
    .then(() => {
        console.log("successfully connected to mongoDB Atlas!");
    })
    .catch((error) => {
        console.log("unable to connect to mongoDB Atlas!");
        console.error(error);
    })
}

export default dbConnect;