import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path : "./env"
})

connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log("Server is running on port 8000")
    })
})
.catch((error) => {
    console.log("MongoDB Connection Failed in Index file" , error)
})