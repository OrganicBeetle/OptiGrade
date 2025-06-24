import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FriendRequests from "../components/FriendRequests";
import FriendsLeaderboard from "../components/FriendsLeaderboard";
import AddFriend from "../components/AddFriends";
import { FiArrowLeft, FiUsers } from "react-icons/fi";

const Friends = () => {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [refreshFriendsKey, setRefreshFriendsKey] = useState(0);
  const navigate = useNavigate();

  const tabs = [
    { key: "leaderboard", label: "Leaderboard" },
    { key: "requests", label: "Requests" },
    { key: "add", label: "Add Friend" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-2">
      <div className="max-w-4xl mx-auto">
        {/* Floating Back Button */}
        <div className="sticky top-6 z-20 flex items-center mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-blue-100 text-blue-700 font-medium shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur"
            aria-label="Back to Dashboard"
          >
            <FiArrowLeft className="text-xl" />
            <span className="cursor-pointer hidden sm:inline">Back</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur rounded-3xl shadow-2xl px-0 sm:px-8 py-8 border border-blue-100 relative overflow-hidden">
          {/* Decorative Gradient Blob */}
          <div className="absolute right-[-80px] top-[-80px] w-64 h-64 bg-gradient-to-br from-blue-100 to-blue-200 opacity-30 rounded-full blur-2xl pointer-events-none" />

          {/* Section Heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-2">
              <FiUsers className="text-blue-400 text-2xl" />
              <h1 className="text-2xl sm:text-3xl font-semibold text-blue-900 tracking-tight">
                Friends
              </h1>
            </div>
            <p className="text-gray-500 text-base mt-1">
              Connect, compete, and grow with your academic circle.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-blue-50 rounded-full shadow-inner p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`px-5 py-2 rounded-full font-semibold transition-all duration-150 text-base focus:outline-none ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow"
                      : "text-blue-700 hover:bg-blue-100"
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mt-4 px-2 sm:px-0">
            {activeTab === "leaderboard" && <FriendsLeaderboard />}
            {activeTab === "requests" && (
              <FriendRequests
                onFriendChange={() => setRefreshFriendsKey((k) => k + 1)}
              />
            )}
            {activeTab === "add" && (
              <AddFriend refreshKey={refreshFriendsKey} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
