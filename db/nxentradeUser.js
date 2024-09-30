import mongoose from "mongoose";

const NxentradeUserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: [true, "Email Exist"],
    },
    password: {
        type: String,
        unique: false,
    },
    confirmationCode: {
        type: String,
        unique: true
    },
    username: {
        type: String,
        unique: false
    },
    status: {
        type: String, 
        enum: ['Pending', 'Active'],
        default: 'Pending'
    },
})

const NxentradeUser = mongoose.model("NxentradeUsers", NxentradeUserSchema)
export default NxentradeUser