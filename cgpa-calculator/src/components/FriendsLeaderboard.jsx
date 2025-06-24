import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";

const FriendsLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingFriend, setRemovingFriend] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const friends = userDoc.data()?.friends || [];
      const allIds = [...friends, user.uid];

      const users = [];
      for (const uid of allIds) {
        const friendDoc = await getDoc(doc(db, "users", uid));
        if (friendDoc.exists()) {
          const data = friendDoc.data();
          if (data?.cpi) {
            users.push({
              uid,
              name: data.name,
              email: data.email,
              cpi: parseFloat(data.cpi),
              avatar: data.photoURL || null,
            });
          }
        }
      }

      users.sort((a, b) => b.cpi - a.cpi);
      setLeaderboard(users);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!friendId || friendId === user.uid) return;
    setRemovingFriend(friendId);

    try {
      // Remove friend from current user's friends list
      await updateDoc(doc(db, "users", user.uid), {
        friends: arrayRemove(friendId),
      });

      // Remove current user from friend's friends list
      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(user.uid),
      });

      toast.success("Friend removed successfully");
      // Filter out removed friend from local state
      setLeaderboard((prev) => prev.filter((u) => u.uid !== friendId));
    } catch (err) {
      console.error("Failed to remove friend", err);
      toast.error("Failed to remove friend");
    } finally {
      setRemovingFriend(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-blue-700 mb-6">
        🏆 Friends Leaderboard
      </h2>
      <ul className="space-y-4">
        {leaderboard.map((u, index) => (
          <li
            key={u.uid}
            className={`flex items-center justify-between p-4 bg-white/90 shadow rounded-2xl border border-blue-100 group ${
              u.uid === user.uid ? "ring-2 ring-blue-400" : ""
            }`}
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="text-lg font-bold text-gray-700 w-8 text-center shrink-0">
                {index === 0
                  ? "🥇"
                  : index === 1
                  ? "🥈"
                  : index === 2
                  ? "🥉"
                  : index + 1}
              </div>
              {u.avatar && u.avatar.trim() !== "" ? (
                <img
                  src={u.avatar}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shadow shrink-0"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <span className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-lg border-2 border-blue-200 shadow shrink-0">
                  {u.name?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                <p className="text-sm text-gray-500 truncate">{u.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-2">
              <div className="text-blue-700 font-bold text-lg shrink-0 ">
                {u.cpi.toFixed(2)}
              </div>

              {/* Remove Friend Button (not shown for current user) */}
              {u.uid !== user.uid ? (
                <button
                  onClick={() => handleRemoveFriend(u.uid)}
                  disabled={removingFriend === u.uid}
                  className={`p-2 rounded-full text-red-500 hover:bg-red-100 transition ${
                    removingFriend === u.uid
                      ? "opacity-50 cursor-not-allowed"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label={`Remove ${u.name}`}
                >
                  {removingFriend === u.uid ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full"></span>
                  ) : (
                    <FiTrash2 />
                  )}
                </button>
              ) : (
                <span className="p-2 w-8" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FriendsLeaderboard;
