const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
// Lazy init
// const bucket = getStorage().bucket(); // Moved inside function
const fs = require('fs');
const path = require('path');

// Helper to upload file to Firebase Storage
async function uploadToFirebase(filePath, destination) {
    const bucket = getStorage().bucket(); // Init here
    const [file] = await bucket.upload(filePath, {
        destination: destination,
        public: true, // Make public
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    });
    return file.publicUrl();
}

exports.getAllProducts = async (req, res) => {
    try {
        const { type } = req.query;
        const db = getFirestore();
        let query = db.collection('products');

        if (type) {
            query = query.where('type', '==', type);
        }

        const snapshot = await query.get();
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Phase 4: Hide Adopted pets after 24 hours for public users
        // req.user might not exist for public routes. We'll check if the requester provided an admin token or a query param.
        const isAdmin = req.user && req.user.role === 1;

        if (!isAdmin) {
            const now = new Date();
            products = products.filter(p => {
                if (p.status !== 'Adopted') return true;
                if (!p.statusUpdatedAt) return true; // Keep old records visible if they lack a timer

                const adoptedTime = new Date(p.statusUpdatedAt);
                const diffHours = (now - adoptedTime) / (1000 * 60 * 60);
                return diffHours < 24; // Hide after 24 hours
            });
        }

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const db = getFirestore();
        const doc = await db.collection('products').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: "Product not found" });
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const {
            name, description, price, stock, categoryId,
            companyName, expiryDate, weight, flavor
        } = req.body;
        let images = [];
        let imageUrl = '';

        if (req.files && req.files.length > 0) {
            // Handle multiple files
            req.files.forEach(file => {
                const url = `https://blackberry-ruwx.onrender.com/uploads/${file.filename}`;                images.push(url);
            });
            imageUrl = images[0];
        }

        const db = getFirestore();
        const newDoc = db.collection('products').doc();

        let productData = {
            type: req.body.type || 'food', // Explicitly allow type parameter, fallback to food
            name: name || '',
            description: description || '',
            price: Number(price) || 0,
            stock: Number(stock) || 0,
            categoryId: categoryId || '',
            subCategoryId: req.body.subCategoryId || '',
            images: images,
            imageUrl: imageUrl || images[0] || '',
            companyName: companyName || '',
            expiryDate: expiryDate || '',
            weight: weight || '',
            dietary: req.body.dietary || '',
            foodType: req.body.foodType || '',
            flavor: flavor || '',
            breed: req.body.breed || '',
            age: req.body.age || '',
            healthStatus: req.body.healthStatus || '',
            birthDate: req.body.birthDate || '',
            dailyNeeds: req.body.dailyNeeds || '',
            documentation: req.body.documentation || '',
            sex: req.body.sex || '',
            neutered: req.body.neutered || '',
            temperament: req.body.temperament || '',
            energyLevel: req.body.energyLevel || '',
            goodWith: req.body.goodWith || '',
            training: req.body.training || '',
            status: req.body.status || 'Available',
            statusUpdatedAt: req.body.status === 'Adopted' ? new Date().toISOString() : null,
            createdAt: new Date().toISOString()
        };

        await newDoc.set(productData);

        res.status(201).json({ id: newDoc.id, message: "Product created" });
    } catch (error) {
        console.error("Create Product Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getFirestore();
        const updateData = { ...req.body };

        // Ensure numeric fields are numbers
        if (updateData.price) updateData.price = Number(updateData.price);
        if (updateData.stock) updateData.stock = Number(updateData.stock);

        // Phase 4: Track status updates to Adopted
        if (updateData.status === 'Adopted') {
            updateData.statusUpdatedAt = new Date().toISOString();
        } else if (updateData.status && updateData.status !== 'Adopted') {
            // Reset if changed away from Adopted
            updateData.statusUpdatedAt = null;
        }

        await db.collection('products').doc(id).update(updateData);
        res.json({ message: "Product updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const db = getFirestore();
        await db.collection('products').doc(id).delete();
        res.json({ message: "Product deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
