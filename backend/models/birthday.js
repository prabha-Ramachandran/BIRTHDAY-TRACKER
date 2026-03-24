const mongoose = require('mongoose');

const BirthdaySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    birthdate: { type: String, required: true }
});

module.exports = mongoose.model('Birthday', BirthdaySchema);