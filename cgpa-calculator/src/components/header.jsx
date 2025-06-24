import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Button,
  Box,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { FiUser } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../utils/firebase";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiAward, FiCalendar } from "react-icons/fi";

const Header = () => {
  const { user } = useAuth();
  const [capName, setCapName] = useState("User");
  const [isPublic, setIsPublic] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const fetchVisibility = async () => {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) setIsPublic(snap.data().isPublic || false);
      };
      fetchVisibility();
    }
  }, [user]);

  useEffect(() => {
    const fetchName = async () => {
      if (!user) return;
      let name = user.displayName;
      if (!name && user.uid) {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          name = snap.data().name || "User";
        }
      }
      const first = name?.split(" ")[0] || "User";
      const capitalized = first.charAt(0).toUpperCase() + first.slice(1);
      setCapName(capitalized);
    };
    fetchName();
  }, [user]);

  if (!user) return null;

  const handleLogout = async () => {
    await auth.signOut();
    toast.info("Logged out successfully");
    navigate("/");
  };

  const toggleVisibility = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { isPublic: !isPublic });
      setIsPublic(!isPublic);
    } catch (err) {
      console.error("Failed to update visibility:", err);
    }
  };

  const goToLeaderboard = () => {
    navigate("/leaderboard");
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "linear-gradient(90deg, #e0f2fe 0%, #f0f9ff 100%)",
        borderRadius: "0 0 2rem 2rem",
        boxShadow: "0 2px 16px rgba(56, 189, 248, 0.10)",
        mb: 4,
        px: { xs: 1, sm: 4 },
        py: 1,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          minHeight: { xs: 60, sm: 80 },
        }}
      >
        {/* User Greeting & Avatar */}
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            alt={capName}
            src={user.photoURL || ""}
            sx={{
              width: isMobile ? 36 : 48,
              height: isMobile ? 36 : 48,
              bgcolor: "#bae6fd",
              fontWeight: 700,
              fontSize: isMobile ? 18 : 22,
              color: "#0284c7",
            }}
          >
            {capName[0]}
          </Avatar>
          <Typography
            variant={isMobile ? "subtitle1" : "h6"}
            color="primary"
            fontWeight={700}
            sx={{ letterSpacing: 0.2 }}
          >
            Hello, {capName}!
          </Typography>
        </Box>

        {/* Actions */}
        <Box display="flex" alignItems="center" gap={isMobile ? 1 : 2}>
          {/* Friends Icon */}
          <Tooltip title="Friends" arrow>
            <IconButton
              onClick={() => navigate("/friends")}
              sx={{
                bgcolor: "#f0f9ff",
                color: "#0284c7",
                borderRadius: "50%",
                transition: "0.2s",
                ml: 1,
                "&:hover": {
                  bgcolor: "#bae6fd",
                  color: "#0369a1",
                },
              }}
              aria-label="Friends"
            >
              <FiUser size={22} />
            </IconButton>
          </Tooltip>
          {/* Exam Planner Icon */}
          <Tooltip title="Exam Planner" arrow>
            <IconButton
              onClick={() => navigate("/calendar")}
              sx={{
                bgcolor: "#f0f9ff",
                color: "#0284c7",
                borderRadius: "50%",
                transition: "0.2s",
                "&:hover": {
                  bgcolor: "#bae6fd",
                  color: "#0369a1",
                },
              }}
              aria-label="Exam Planner"
            >
              <FiCalendar size={22} />
            </IconButton>
          </Tooltip>
          {/* Leaderboard Icon */}
          <Tooltip title="Leaderboard" arrow>
            <IconButton
              onClick={goToLeaderboard}
              sx={{
                bgcolor: "#f0f9ff",
                color: "#0284c7",
                borderRadius: "50%",
                transition: "0.2s",
                "&:hover": {
                  bgcolor: "#bae6fd",
                  color: "#0369a1",
                },
              }}
            >
              <FiAward size={22} />
            </IconButton>
          </Tooltip>

          {/* Visibility Toggle */}
          <Tooltip
            title={
              isPublic ? "Visible on Leaderboard" : "Hidden from Leaderboard"
            }
            arrow
          >
            <IconButton
              onClick={toggleVisibility}
              sx={{
                bgcolor: isPublic ? "#dcfce7" : "#f3f4f6",
                color: isPublic ? "#16a34a" : "#6b7280",
                borderRadius: "50%",
                transition: "0.2s",
                "&:hover": {
                  bgcolor: isPublic ? "#bbf7d0" : "#e0e7ef",
                  color: isPublic ? "#15803d" : "#334155",
                },
              }}
            >
              {isPublic ? <FiEye size={20} /> : <FiEyeOff size={20} />}
            </IconButton>
          </Tooltip>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="contained"
            color="error"
            sx={{
              borderRadius: "999px",
              fontWeight: 600,
              textTransform: "none",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.08)",
              ml: isMobile ? 0 : 2,
              px: isMobile ? 2 : 3,
              py: isMobile ? 1 : 1.5,
              fontSize: isMobile ? 14 : 16,
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
