import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiUserPlus } from "react-icons/fi";
import GoogleAuthButton from "../components/GoogleAuth";
import EmailPasswordAuth from "../components/EmailPasswordAuth";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const extractBranch = (email) => {
  const match =
    email.match(/^[a-z]+\.[a-z]+\.([a-z]{2,5})\d{2}@iitbhu\.ac\.in$/i) ||
    email.match(/^[a-z]+\.[a-z]+\.([a-z]{2,5})\d{2}@itbhu\.ac\.in$/i);
  return match ? match[1].toUpperCase() : null;
};

const extractEntryYear = (email) => {
  const match = email.match(
    /^[^.]+\.[^.]+\.[a-z]+(\d{2})@(?:iitbhu|itbhu)\.ac\.in$/i
  );
  if (!match) return null;
  const yearSuffix = match[1];
  const year = 2000 + parseInt(yearSuffix);
  return year;
};

const Signup = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [branch, setBranch] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setBranch(extractBranch(email));
  }, [email]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard"); // or dashboard route
    }
  }, [user, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10 w-full max-w-md">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            {isSignup ? (
              <FiUserPlus className="text-4xl text-blue-600" />
            ) : (
              <FiUser className="text-4xl text-blue-600" />
            )}
          </div>

          <div className="text-center mt-6 mb-10">
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Welcome to <span className="text-blue-700">OptiGrade</span>
            </h2>
            <p className="mt-2 text-lg text-gray-600 font-medium">
              Your Academic Co‑Pilot at{" "}
              <span className="font-semibold text-indigo-600">IIT BHU</span>
            </p>
          </div>

          <div className="mt-5">
            {isSignup && (
              <>
                <label className="font-semibold text-sm text-gray-600 pb-1 block">
                  Name
                </label>
                <input
                  className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            )}

            <label className="font-semibold text-sm text-gray-600 pb-1 block">
              E-mail
            </label>
            <input
              className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="font-semibold text-sm text-gray-600 pb-1 block">
              Password
            </label>
            <input
              className="border rounded-lg px-3 py-2 mt-1 mb-5 text-sm w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  document.getElementById("auth-btn").click();
              }}
            />
          </div>

          <div className="mt-10 flex justify-center w-full items-center mb-4">
            <GoogleAuthButton isSignup={isSignup} />
          </div>

          <div>
            <EmailPasswordAuth
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              isSignup={isSignup}
              branch={branch}
              year={extractEntryYear(email)}
              isPublic={false}
            />
          </div>

          <div className="flex items-center justify-center mt-6">
            {isSignup ? (
              <span className="text-sm text-gray-600">
                Already have an account?{" "}
                <span
                  onClick={() => setIsSignup(false)}
                  className="font-semibold text-blue-700 underline cursor-pointer hover:text-blue-900 transition"
                  tabIndex={0}
                  role="button"
                >
                  Log In
                </span>
              </span>
            ) : (
              <span className="text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <span
                  onClick={() => setIsSignup(true)}
                  className="font-semibold text-blue-700 underline cursor-pointer hover:text-blue-900 transition"
                  tabIndex={0}
                  role="button"
                >
                  Sign Up
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
