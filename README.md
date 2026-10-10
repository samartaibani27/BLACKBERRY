# 🐾 BLACKBERRY Pet Shop

An online pet shop platform where users can explore pet products, register or log in, and browse available items. The project includes a frontend, backend API, and Firebase integration.

## 🌐 Live Demo

- **Frontend:** https://blackberry-rho.vercel.app

## ✨ Features

- User registration and login
- Product browsing
- Pet food and product categories
- Admin-side product management
- Backend API integration
- Firebase Authentication and Firestore integration
- Responsive web interface
- Backend health monitoring

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Angular | Frontend |
| Node.js | Backend runtime |
| Express.js | REST API |
| Firebase Authentication | User authentication |
| Cloud Firestore | Database |
| Vercel | Frontend hosting |
| Render | Backend hosting |
| UptimeRobot | Backend availability monitoring |

## 🚀 Live Deployment

The frontend is deployed on Vercel, and the backend API is hosted on Render.

Check backend health:

```text
https://blackberry-ruwx.onrender.com/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## 💻 Run Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/samartaibani27/BLACKBERRY.git
   cd BLACKBERRY
   ```

2. Open the frontend and backend directories and install their dependencies separately using `npm install`.

3. Configure the required environment variables for Firebase and the backend.

4. Start each application using the scripts defined in its respective `package.json`.

> Note: Confirm the actual frontend and backend folder names and available npm scripts in the repository before running these commands.

## 🔐 Environment Variables

Configure Firebase credentials and backend environment variables in your local environment or hosting dashboard.

**Never commit private keys, service-account JSON files, passwords, or other secrets to GitHub.**

## 📊 Monitoring

UptimeRobot can periodically check the backend health endpoint. Monitoring helps detect availability issues but does not guarantee uninterrupted service.

## 👨‍💻 Author

**Samar Taibani**

GitHub: [@samartaibani27](https://github.com/samartaibani27)

## 📄 License

Add a license file if you intend to distribute this project under an open-source license.
