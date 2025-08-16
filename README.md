# OptiGrade: CGPA & Target Planner for IIT BHU

OptiGrade is a modern, full-stack web application designed to help IIT BHU students track, analyze, and optimize their academic performance. It provides a seamless experience for managing semester grades, planning future targets, and benchmarking against peers.

---

## 🚀 Features

### 1. **Authentication & User Management**
- **Google OAuth** and **Email/Password** authentication (Firebase Auth).
- Restricts signups to institute emails (`@iitbhu.ac.in`/`@itbhu.ac.in`).
- Secure, persistent login with protected routes.
- User profile stores branch, entry year, and privacy settings.

### 2. **Dashboard (HomePage)**
- **CGPA & SGPA Calculation:** Real-time computation and display of cumulative and semester GPAs.
- **Semester Management:** Add, edit, and delete semesters and courses with intuitive modals.
- **SPI Trend Visualization:** Interactive line chart (Chart.js) showing SPI progression.
- **Upcoming Targets:** View and manage planned SPI/CPI targets for future semesters.
- **Responsive UI:** Clean, mobile-friendly design with Tailwind CSS.

### 3. **Target Planner**
- **Target CPI/SPI Calculator:** Set a target CPI and instantly see the SPI required in the next semester.
- **Partial Grade Planning:** Enter known grades for upcoming courses; the app computes the minimum grades needed in remaining courses to hit your target (dynamic programming).
- **Save as Upcoming Target:** Store your plan for future reference and tracking.

### 4. **Leaderboard**
- **Peer Benchmarking:** See a ranked list of public users by CPI, filterable by branch and name.
- **Privacy Controls:** Users can choose to appear on the leaderboard or remain private.
- **Visual Accents:** Top ranks highlighted with gold, silver, and bronze.
  
## Features
- **Frameworks:** Built with React (Vite) and Firebase (Firestore, Auth, Analytics).
- **Componentization:** Modular, reusable React components for maintainability.
- **State Management:** React hooks (`useState`, `useEffect`, `useMemo`) and context for authentication.
- **Routing:** React Router v6 for SPA navigation and protected routes.
- **Accessibility:** Keyboard navigation, focus management, and ARIA labels.
- **Feedback:** Toast notifications for all user actions (success/error).
- **Security:** All sensitive routes are protected; only authenticated users can access dashboards and planners.
- **Performance:** Optimized with code-splitting, lazy loading, and efficient state updates.
- **Modern UI:** Tailwind CSS for rapid, consistent, and responsive styling.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Chart.js
- **Backend/DB:** Firebase Firestore, Firebase Auth, Firebase Analytics
- **Auth:** Google OAuth, Email/Password (Firebase)
- **Other:** React Router, React Toastify, ESLint

---

## 📈 How It Works

1. **Sign Up/Login:** Only IIT BHU emails allowed. Choose Google or email/password.
2. **Dashboard:** Add semesters, input grades, and instantly see your CGPA/SGPA and trends.
3. **Plan Ahead:** Use the Target Planner to set academic goals and see what you need to achieve them.
4. **Benchmark:** Check the leaderboard to see how you compare with peers (if public).
5. **Stay Organized:** Save upcoming targets and track your academic journey semester by semester.


## 📝 Setup & Run

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Set up Firebase project and add your config to `.env`.
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## Screenshots
<img width="1919" height="868" alt="image" src="https://github.com/user-attachments/assets/133b431b-dee0-435e-9d7d-98ec0d1d6851" />
<img width="1919" height="863" alt="image" src="https://github.com/user-attachments/assets/cad5b2a9-2a7c-4137-b52e-9da8a5dd7cc3" />
<img width="1919" height="661" alt="image" src="https://github.com/user-attachments/assets/dbba7090-e49a-41a2-bbf1-6e65cbc64a95" />
<img width="1919" height="799" alt="image" src="https://github.com/user-attachments/assets/1c5ab15a-e8f1-4394-a186-9a627b0ec58f" />
<img width="1213" height="656" alt="image" src="https://github.com/user-attachments/assets/430e7d01-1b3b-45f3-9b1b-5d7f6ec3c895" />
<img width="1273" height="549" alt="image" src="https://github.com/user-attachments/assets/2e8085dc-9392-4651-ac39-5073be119587" />
<img width="1919" height="868" alt="image" src="https://github.com/user-attachments/assets/0571d587-e9c4-439b-b64f-eb85267457f4" />




