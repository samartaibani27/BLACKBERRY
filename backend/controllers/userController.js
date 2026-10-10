const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
// Lazy init

exports.getProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const db = getFirestore();
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return res.status(404).json({ error: "User not found" });

        // Don't separate role Logic too much, allow Frontend to see role
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { name, address, phone } = req.body;
        let updates = { name };
        if (address) updates.address = address;
        if (phone) updates.phone = phone;

        if (req.file) {
            // Handle Profile Image Upload
            updates.profileImage = `http://blackberry-ruwx.onrender.com/uploads/${req.file.filename}`;
        }

        const db = getFirestore();
        await db.collection('users').doc(uid).update(updates);
        res.json({ message: "Profile updated successfully", profileImage: updates.profileImage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateAddresses = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { addresses } = req.body;

        const db = getFirestore();
        await db.collection('users').doc(uid).update({ addresses });
        res.json({ message: "Addresses updated successfully", addresses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const uid = req.user.uid;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }

        // Update the auth password directly
        await getAuth().updateUser(uid, {
            password: newPassword
        });

        res.json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({ error: error.message || "Failed to change password." });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Ideally also delete from Auth, but we need Admin SDK with service account for that.
        // For now, just remove from DB so they disappear from list.
        const db = getFirestore();
        await db.collection('users').doc(id).delete();
        await getAuth().deleteUser(id).catch(e => console.log('Auth delete failed (maybe mismatch):', e.message));

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
