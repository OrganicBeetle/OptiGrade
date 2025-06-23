import { useState } from "react";
import { auth, db } from "../utils/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const EmailPasswordAuth = ({
  email,
  setEmail,
  password,
  setPassword,
  name,
  isSignup,
  branch,
  year,
  isPublic
}) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isInstituteEmail = (email) =>
    email.endsWith("@itbhu.ac.in") || email.endsWith("@iitbhu.ac.in");

  const handleAction = async () => {
  setLoading(true);
  try {
    if (!email || !password || (isSignup && !name)) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (isSignup && password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    const authFn = isSignup
      ? createUserWithEmailAndPassword
      : signInWithEmailAndPassword;
    const result = await authFn(auth, email, password);
    const user = result.user;

    // ✅ Reject right after account creation if not a valid institute email
    if (!isInstituteEmail(user.email)) {
      toast.error("Only institute emails are allowed!");
      await user.delete(); // Deletes the Firebase user that just got created
      return;
    }

    let userName = name;
    if (isSignup) {
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        branch,
        year,
        isPublic
      });
    } else {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        userName = userSnap.data().name;
      }
    }

    const capName = userName.charAt(0).toUpperCase() + userName.slice(1);
    toast.success(`Welcome, ${capName}!`);
    navigate("/dashboard");

  } catch (err) {
    console.error("🔥 Firebase error code:", err.code);
    toast.error(
      isSignup
        ? err.code === "auth/email-already-in-use"
          ? "This email is already in use."
          : "Signup failed. Try a stronger password or valid email."
        : "Invalid email or password."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`py-2 px-4 ${
        loading
          ? "bg-blue-400 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700"
      } text-white w-full transition ease-in duration-200 text-center text-base font-semibold shadow-md rounded-lg`}
    >
      {loading ? "Loading..." : isSignup ? "Sign up" : "Log in"}
    </button>
  );
};

export default EmailPasswordAuth;
